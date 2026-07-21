"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import FullScreenLoading from "@/components/ui/FullScreenLoading";

const NETWORK_IDLE_MS = 120;
const MAX_LOADING_MS = 15_000;

function isInternalNavigation(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }

  const link = (event.target as Element | null)?.closest("a[href]") as HTMLAnchorElement | null;
  if (!link || link.target === "_blank" || link.hasAttribute("download")) return false;

  const destination = new URL(link.href, window.location.href);
  const current = new URL(window.location.href);
  return destination.origin === current.origin
    && `${destination.pathname}${destination.search}` !== `${current.pathname}${current.search}`;
}

async function waitForVisualAssets(container: HTMLElement | null) {
  if ("fonts" in document) {
    await document.fonts.ready;
  }

  const images = Array.from(container?.querySelectorAll("img") ?? []).filter(
    (image) => image.loading !== "lazy" && !image.complete,
  );
  await Promise.all(images.map((image) => new Promise<void>((resolve) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => resolve(), { once: true });
  })));

  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

export default function AppReadyBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const pendingRequests = useRef(0);
  const cycleActive = useRef(true);
  const cycleId = useRef(0);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maximumTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearRevealTimer = useCallback(() => {
    if (revealTimer.current !== null) {
      clearTimeout(revealTimer.current);
      revealTimer.current = null;
    }
  }, []);

  const clearMaximumTimer = useCallback(() => {
    if (maximumTimer.current !== null) {
      clearTimeout(maximumTimer.current);
      maximumTimer.current = null;
    }
  }, []);

  const reveal = useCallback(() => {
    cycleActive.current = false;
    clearRevealTimer();
    clearMaximumTimer();
    setReady(true);
  }, [clearMaximumTimer, clearRevealTimer]);

  const revealAfterTimeout = useCallback(() => {
    setTimedOut(true);
    reveal();
  }, [reveal]);

  const scheduleReveal = useCallback(() => {
    clearRevealTimer();
    if (!cycleActive.current || pendingRequests.current > 0) return;

    const currentCycle = cycleId.current;
    revealTimer.current = setTimeout(async () => {
      await waitForVisualAssets(contentRef.current);
      if (!cycleActive.current || currentCycle !== cycleId.current || pendingRequests.current > 0) return;
      reveal();
    }, NETWORK_IDLE_MS);
  }, [clearRevealTimer, reveal]);

  const startCycle = useCallback(() => {
    cycleId.current += 1;
    cycleActive.current = true;
    setReady(false);
    setTimedOut(false);
    clearMaximumTimer();
    maximumTimer.current = setTimeout(revealAfterTimeout, MAX_LOADING_MS);
    scheduleReveal();
  }, [clearMaximumTimer, revealAfterTimeout, scheduleReveal]);

  useLayoutEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = (...args: Parameters<typeof fetch>) => {
      if (!cycleActive.current) return originalFetch(...args);

      clearRevealTimer();
      pendingRequests.current += 1;
      return originalFetch(...args).finally(() => {
        pendingRequests.current -= 1;
        scheduleReveal();
      });
    };

    scheduleReveal();
    maximumTimer.current = setTimeout(revealAfterTimeout, MAX_LOADING_MS);
    return () => {
      window.fetch = originalFetch;
      clearRevealTimer();
      clearMaximumTimer();
    };
  }, [clearMaximumTimer, clearRevealTimer, revealAfterTimeout, scheduleReveal]);

  useEffect(() => {
    const timer = setTimeout(startCycle, 0);
    return () => clearTimeout(timer);
  }, [pathname, startCycle]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (isInternalNavigation(event)) startCycle();
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [startCycle]);

  return (
    <>
      {!ready && <FullScreenLoading />}
      {timedOut && (
        <div
          className="fixed inset-x-4 top-4 z-[9998] mx-auto flex max-w-2xl flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-lg"
          role="alert"
        >
          <p className="min-w-52 flex-1">一部のデータを取得できませんでした。表示内容が最新でない可能性があります。</p>
          <button
            type="button"
            className="rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white hover:bg-amber-700"
            onClick={() => window.location.reload()}
          >
            再読み込み
          </button>
          <button
            type="button"
            className="px-2 py-1.5 font-bold text-amber-700 hover:text-amber-900"
            onClick={() => setTimedOut(false)}
          >
            閉じる
          </button>
        </div>
      )}
      <div
        ref={contentRef}
        aria-hidden={!ready}
        data-app-ready={ready}
        style={{ visibility: ready ? "visible" : "hidden" }}
      >
        {children}
      </div>
    </>
  );
}
