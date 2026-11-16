import type { Metadata } from "next";
import { onest } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Цифровой деканат",
  description: "Личный кабинет студента",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={onest.variable}>
      <body>{children}</body>
    </html>
  );
}
