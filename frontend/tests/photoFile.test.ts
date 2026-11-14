import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_PHOTO_BYTES,
  photoProblem,
  shrinkPhoto,
} from "../src/photoFile";

function fileOf(size: number, type: string, name = "photo.png"): File {
  return new File([new Uint8Array(size)], name, { type });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("photoProblem", () => {
  it.each(["image/jpeg", "image/png", "image/webp"])("accepte %s", (type) => {
    expect(photoProblem(fileOf(1000, type))).toBeNull();
  });

  it("refuse un format inconnu", () => {
    expect(photoProblem(fileOf(1000, "image/gif"))).toContain("Format non pris en charge");
    expect(photoProblem(fileOf(1000, "application/pdf"))).toContain("JPEG, PNG ou WebP");
  });

  it("refuse une photo de plus d’un mégaoctet", () => {
    expect(photoProblem(fileOf(MAX_PHOTO_BYTES + 1, "image/png"))).toContain("1 Mo");
  });

  it("accepte une photo d’exactement un mégaoctet", () => {
    expect(photoProblem(fileOf(MAX_PHOTO_BYTES, "image/png"))).toBeNull();
  });
});

describe("shrinkPhoto", () => {
  it("laisse une photo légère telle quelle", async () => {
    const file = fileOf(1000, "image/png");

    expect(await shrinkPhoto(file)).toBe(file);
  });

  it("laisse un format inconnu tel quel", async () => {
    const file = fileOf(MAX_PHOTO_BYTES + 10, "image/gif");

    expect(await shrinkPhoto(file)).toBe(file);
  });

  it("rend la photo telle quelle si le navigateur ne sait pas la réduire", async () => {
    vi.stubGlobal("createImageBitmap", undefined);
    const file = fileOf(MAX_PHOTO_BYTES + 10, "image/png");

    expect(await shrinkPhoto(file)).toBe(file);
  });

  it("réduit une grande photo en JPEG sous la limite", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 4000, height: 3000, close }));
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) =>
      callback(new Blob([new Uint8Array(200_000)], { type: "image/jpeg" })),
    );

    const result = await shrinkPhoto(fileOf(MAX_PHOTO_BYTES + 10, "image/png", "vacances.png"));

    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("vacances.jpg");
    expect(result.size).toBe(200_000);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 1200);
    expect(close).toHaveBeenCalled();
  });

  it("réessaie en réduisant davantage quand c’est encore trop lourd", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 1000, height: 1000, close: vi.fn() }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const sizes = [MAX_PHOTO_BYTES + 5, 500_000];
    const toBlob = vi
      .spyOn(HTMLCanvasElement.prototype, "toBlob")
      .mockImplementation((callback) =>
        callback(new Blob([new Uint8Array(sizes.shift() ?? 1)])),
      );

    const result = await shrinkPhoto(fileOf(MAX_PHOTO_BYTES * 3, "image/jpeg", "a.jpeg"));

    expect(toBlob).toHaveBeenCalledTimes(2);
    expect(result.size).toBe(500_000);
  });

  it("rend la photo d’origine si rien ne passe sous la limite", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 100, height: 100, close }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) =>
      callback(new Blob([new Uint8Array(MAX_PHOTO_BYTES + 1)])),
    );
    const file = fileOf(MAX_PHOTO_BYTES * 2, "image/png");

    expect(await shrinkPhoto(file)).toBe(file);
    expect(close).toHaveBeenCalled();
  });

  it("rend la photo d’origine si elle est illisible", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("illisible")));
    const file = fileOf(MAX_PHOTO_BYTES + 10, "image/png");

    expect(await shrinkPhoto(file)).toBe(file);
  });

  it("rend la photo d’origine si le dessin n’est pas disponible", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 10, height: 10, close }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const file = fileOf(MAX_PHOTO_BYTES + 10, "image/png");

    expect(await shrinkPhoto(file)).toBe(file);
    expect(close).toHaveBeenCalled();
  });
});
