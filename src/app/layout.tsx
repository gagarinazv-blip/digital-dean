import type { Metadata } from "next";
import { onest } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "АКСИУМ",
  description: "Единая система университетских процессов",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      className={onest.variable}
      data-scroll-behavior="smooth"
    >
      <body>{children}</body>
    </html>
  );
}
