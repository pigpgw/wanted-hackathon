import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "업무→실행 자동화기",
  description:
    "반복 업무를 말로 적으면 AI가 단계로 분해하고, 샘플 데이터로 그 자리에서 실제로 실행해 결과물을 보여줍니다.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-background antialiased">{children}</body>
    </html>
  );
}
