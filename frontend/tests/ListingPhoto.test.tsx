import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setToken } from "../src/auth";
import ListingPhoto from "../src/ListingPhoto";
import { jsonResponse, listingId, mockFetch } from "./helpers";

const createObjectURL = vi.fn(() => "blob:photo-1");
const revokeObjectURL = vi.fn();

beforeEach(() => {
  vi.stubGlobal("URL", Object.assign(URL, { createObjectURL, revokeObjectURL }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

function photoResponse(): Response {
  return {
    ok: true,
    status: 200,
    blob: () => Promise.resolve(new Blob([new Uint8Array(4)], { type: "image/png" })),
  } as Response;
}

describe("ListingPhoto", () => {
  it("charge la photo avec le jeton puis l’affiche", async () => {
    setToken("jeton-123");
    const fetchMock = mockFetch(() => photoResponse());

    render(
      <ListingPhoto listingId={listingId} alt="Lot de timbres" fallback={<span>illustration</span>} />,
    );

    expect(screen.getByText("illustration")).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: "Lot de timbres" })).toHaveAttribute(
      "src",
      "blob:photo-1",
    );
    expect(screen.queryByText("illustration")).toBeNull();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/collectibles/${listingId}/photo`);
    expect(init?.headers).toEqual({ Authorization: "Bearer jeton-123" });
  });

  it("garde l’illustration quand la photo n’est pas accessible", async () => {
    const fetchMock = mockFetch(() => jsonResponse({}, 404));

    render(<ListingPhoto listingId={listingId} alt="x" fallback={<span>illustration</span>} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByText("illustration")).toBeInTheDocument();
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("garde l’illustration quand le réseau échoue", async () => {
    const fetchMock = vi.fn(() => Promise.reject(new Error("réseau")));
    vi.stubGlobal("fetch", fetchMock);

    render(<ListingPhoto listingId={listingId} alt="x" fallback={<span>illustration</span>} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.getByText("illustration")).toBeInTheDocument();
  });

  it("libère l’image au démontage", async () => {
    mockFetch(() => photoResponse());

    const { unmount } = render(
      <ListingPhoto listingId={listingId} alt="x" fallback={null} />,
    );
    await screen.findByRole("img");

    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:photo-1");
  });

  it("recharge la photo quand la version change", async () => {
    const fetchMock = mockFetch(() => photoResponse());

    const { rerender } = render(
      <ListingPhoto listingId={listingId} alt="x" version={0} fallback={null} />,
    );
    await screen.findByRole("img");

    rerender(<ListingPhoto listingId={listingId} alt="x" version={1} fallback={null} />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
