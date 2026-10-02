import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Fair Order",
  description: "Token sale allocated by HCS consensus order",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
