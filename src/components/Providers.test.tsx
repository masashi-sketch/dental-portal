import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getSessionMock = vi.fn();

vi.mock("next-auth/react", () => ({
  getSession: (...args: unknown[]) => getSessionMock(...args),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("Providers", () => {
  beforeEach(() => {
    vi.resetModules();
    getSessionMock.mockReset();
  });

  it("セッションをBroadcastChannel通知なしで1回だけ取得してから本文を表示する", async () => {
    getSessionMock.mockResolvedValue(null);
    const { default: Providers } = await import("./Providers");

    render(<Providers><p>本文</p></Providers>);

    expect(screen.getByRole("status", { name: "画面を読み込んでいます" })).toBeInTheDocument();
    expect(await screen.findByText("本文")).toBeInTheDocument();
    expect(getSessionMock).toHaveBeenCalledTimes(1);
    expect(getSessionMock).toHaveBeenCalledWith({ broadcast: false });
  });
});
