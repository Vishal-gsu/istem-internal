import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import DevTools from "@/components/DevTools";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "I-STEM Internal | Scheduling Hub",
  description: "Enterprise scheduling and task management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-background text-foreground`}>
        {children}
        <DevTools />
      </body>
    </html>
  );
}
