import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { clearToken } from "../src/auth";

afterEach(() => {
  cleanup();
  sessionStorage.clear();
  clearToken();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
