import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "업무→실행 자동화기 — 조언이 아니라 실행",
  description:
    "반복 업무를 말로 적으면 AI가 단계로 분해하고, 샘플 데이터로 그 자리에서 실제로 실행해 결과물을 보여줍니다.",
  openGraph: {
    title: "업무→실행 자동화기",
    description:
      "조언이 아니라 실행 — 반복 업무를 AI가 분해하고 샘플 데이터로 실제로 실행해 결과물을 보여줍니다.",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-background antialiased">
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {children}
      </body>
    </html>
  );
}
