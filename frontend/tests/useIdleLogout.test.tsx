import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIdleLogout } from "../src/useIdleLogout";

const IDLE = 10_000;
const WARNING = 5_000;

describe("useIdleLogout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("avertit après l'inactivité puis déconnecte à la fin du délai", () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() => useIdleLogout(true, onTimeout, IDLE, WARNING));

    act(() => {
      vi.advanceTimersByTime(IDLE - 1000);
    });
    expect(result.current.warning).toBe(false);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.warning).toBe(true);
    expect(onTimeout).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(WARNING);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
    expect(result.current.warning).toBe(false);
  });

  it("repart de zéro quand la personne bouge avant l'avertissement", () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() => useIdleLogout(true, onTimeout, IDLE, WARNING));

    act(() => {
      vi.advanceTimersByTime(IDLE - 2000);
      window.dispatchEvent(new Event("mousemove"));
      vi.advanceTimersByTime(IDLE - 2000);
    });

    expect(result.current.warning).toBe(false);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("« Rester connecté » annule l'avertissement", () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() => useIdleLogout(true, onTimeout, IDLE, WARNING));

    act(() => {
      vi.advanceTimersByTime(IDLE + 1000);
    });
    expect(result.current.warning).toBe(true);

    act(() => {
      result.current.stay();
    });
    expect(result.current.warning).toBe(false);

    act(() => {
      vi.advanceTimersByTime(IDLE - 1000);
    });
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it("un simple mouvement ne ferme pas l'avertissement", () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() => useIdleLogout(true, onTimeout, IDLE, WARNING));

    act(() => {
      vi.advanceTimersByTime(IDLE + 1000);
      window.dispatchEvent(new Event("mousemove"));
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.warning).toBe(true);
  });

  it("ne fait rien quand personne n'est connecté", () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() => useIdleLogout(false, onTimeout, IDLE, WARNING));

    act(() => {
      vi.advanceTimersByTime(IDLE + WARNING + 5000);
    });

    expect(result.current.warning).toBe(false);
    expect(onTimeout).not.toHaveBeenCalled();
  });
});
