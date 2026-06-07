import type { Metadata } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const mPlusRounded = M_PLUS_Rounded_1c({
  weight: ["400", "500", "700", "800"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-m-plus-rounded",
});

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
    <html lang="ja" className={mPlusRounded.className}>
      <body className="min-h-screen flex flex-col overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
