import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next-auth/react", () => ({
  useSession: () => ({ data: null, status: 'loading' }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));

describe("Providers", () => {
  it("セッション取得中でも本文をブロックせず表示する", async () => {
    const { default: Providers } = await import("./Providers");

    render(<Providers session={null}><p>本文</p></Providers>);

    expect(screen.getByText("本文")).toBeInTheDocument();
    expect(screen.queryByRole("status", { name: "画面を読み込んでいます" })).not.toBeInTheDocument();
  });
});
