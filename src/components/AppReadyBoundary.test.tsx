import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import AppReadyBoundary from "./AppReadyBoundary";

vi.mock("next/navigation", () => ({ usePathname: () => "/test" }));

describe("AppReadyBoundary", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("初期描画が落ち着くまでは本文を隠し、完了後に一括表示する", async () => {
    render(<AppReadyBoundary><p>画面の内容</p></AppReadyBoundary>);

    expect(screen.getByRole("status", { name: "画面を読み込んでいます" })).toBeInTheDocument();
    expect(screen.getByText("画面の内容").parentElement).toHaveStyle({ visibility: "hidden" });

    await act(async () => vi.advanceTimersByTime(120));

    expect(screen.queryByRole("status", { name: "画面を読み込んでいます" })).not.toBeInTheDocument();
    expect(screen.getByText("画面の内容").parentElement).toHaveStyle({ visibility: "visible" });
  });

  it("初期API通信が完了するまでは待機表示を維持する", async () => {
    let resolveFetch!: () => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>((resolve) => {
      resolveFetch = () => resolve(new Response("{}"));
    })));

    function FetchingChild() {
      // 実画面と同じく、マウント後のeffectで初期データを取得する。
      useEffectForTest();
      return <p>APIの内容</p>;
    }
    function useEffectForTest() {
      useEffect(() => { void fetch("/api/test"); }, []);
    }

    render(<AppReadyBoundary><FetchingChild /></AppReadyBoundary>);
    await act(async () => vi.advanceTimersByTime(500));
    expect(screen.getByRole("status", { name: "画面を読み込んでいます" })).toBeInTheDocument();

    await act(async () => resolveFetch());
    await act(async () => vi.advanceTimersByTime(120));
    expect(screen.queryByRole("status", { name: "画面を読み込んでいます" })).not.toBeInTheDocument();
  });

  it("内部リンクを押した時点で待機表示へ戻す", async () => {
    render(
      <AppReadyBoundary>
        <a href="/next">次へ</a>
      </AppReadyBoundary>,
    );
    await act(async () => vi.advanceTimersByTime(120));

    fireEvent.click(screen.getByRole("link", { name: "次へ" }));
    expect(screen.getByRole("status", { name: "画面を読み込んでいます" })).toBeInTheDocument();
  });

  it("APIが応答しなくても15秒後には画面を操作できる", async () => {
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(() => undefined)));

    function HangingChild() {
      useEffect(() => { void fetch("/api/hanging"); }, []);
      return <p>復旧用の画面</p>;
    }

    render(<AppReadyBoundary><HangingChild /></AppReadyBoundary>);
    await act(async () => vi.advanceTimersByTime(14_999));
    expect(screen.getByRole("status", { name: "画面を読み込んでいます" })).toBeInTheDocument();

    await act(async () => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("status", { name: "画面を読み込んでいます" })).not.toBeInTheDocument();
    expect(screen.getByText("復旧用の画面").parentElement).toHaveAttribute("data-app-ready", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("一部のデータを取得できませんでした");
    expect(screen.getByRole("button", { name: "再読み込み" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "閉じる" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
