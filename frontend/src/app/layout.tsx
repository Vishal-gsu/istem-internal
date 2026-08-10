import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import AuthProvider from "../components/AuthProvider";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";

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
      <body className={`${inter.className} bg-background text-foreground flex h-screen overflow-hidden`}>
        <AuthProvider>
          <Header />
          <div className="flex pt-16 w-full h-full">
            <Sidebar />
            <main className="flex-1 ml-16 p-4 md:p-8 h-full overflow-y-auto bg-rust-50/50 custom-scrollbar relative">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
