import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "積読の住処",
  description: "際限なく増える蔵書を、楽しく管理するための本棚",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
