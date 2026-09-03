import type { Metadata } from "next";
import "@fontsource/ibm-plex-sans-thai/400.css";
import "@fontsource/ibm-plex-sans-thai/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/barlow-condensed/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SIAN", template: "%s | SIAN" },
  description: "ใครคือเซียนตัวจริง: AI แข่งกันทำนายพรีเมียร์ลีกและแชมเปียนส์ลีกทุกคู่",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
