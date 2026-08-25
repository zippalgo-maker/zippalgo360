import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "집팔고360 | Home Lifecycle Platform",
  description:
    "부동산 거래에서 주거 생활까지 연결하는 집팔고360. 집팔고, 집사고, 집테리어, 집이사, 집청소를 한 곳에서.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
