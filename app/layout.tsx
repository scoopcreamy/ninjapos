import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { MainSidebar } from "@/components/MainSidebar";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "POS Ninja",
  description: "Modern AI POS System",
};

import { AuthGuard } from "@/components/AuthGuard";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${poppins.variable} antialiased flex h-screen overflow-hidden bg-gray-100 dark:bg-zinc-950 font-sans`}
      >
        <AuthGuard>
          <MainSidebar />
          <main className="flex-1 h-full overflow-hidden relative">
            {children}
          </main>
        </AuthGuard>
      </body>
    </html>
  );
}
