import type { Metadata } from "next";
import { M_PLUS_Rounded_1c } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import WebVitalsReporter from "@/components/WebVitalsReporter";
import { readHydratedSession } from '@/lib/auth/hydratedSession';

const mPlusRounded = M_PLUS_Rounded_1c({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-m-plus-rounded",
});

// 得意先ごとのクリニック名は各ポータルのlayout（admin/(patient)）がgenerateMetadataで
// 上書きする。ここはクリニック名が未確定な画面（ポータル選択・ログイン等）向けの汎用文言。
export const metadata: Metadata = {
  title: "患者様専用ポータル",
  description: "患者様専用ポータルサイト",
  openGraph: {
    title: "患者様専用ポータル",
    description: "患者様専用ポータルサイト",
    siteName: "患者様専用ポータル",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await readHydratedSession();
  return (
    <html lang="ja" className={mPlusRounded.className}>
      <body className="min-h-screen flex flex-col overflow-x-hidden" data-app-ready="true">
        <WebVitalsReporter />
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
