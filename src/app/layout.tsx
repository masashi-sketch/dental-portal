import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "テストデンタル歯科 患者様専用ポータル",
  description: "患者様専用ポータルサイト",
  openGraph: {
    title: "テストデンタル歯科 患者様専用ポータル",
    description: "患者様専用ポータルサイト",
    siteName: "テストデンタル歯科",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
