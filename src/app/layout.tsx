import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zoom 회의 일괄 생성기",
  description: "CSV 파일에서 Zoom 회의를 일괄 생성합니다",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
