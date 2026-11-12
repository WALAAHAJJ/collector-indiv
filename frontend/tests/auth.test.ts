import { describe, expect, it } from "vitest";
import { clearToken, getToken, setToken } from "../src/auth";

describe("auth", () => {
  it("n’a pas de jeton au départ", () => {
    expect(getToken()).toBeNull();
  });

  it("enregistre puis relit le jeton", () => {
    setToken("jeton-test");

    expect(getToken()).toBe("jeton-test");
  });

  it("efface le jeton", () => {
    setToken("jeton-test");
    clearToken();

    expect(getToken()).toBeNull();
  });
});
