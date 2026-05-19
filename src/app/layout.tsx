import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "LifeHub | Your Personal Management Platform",
  description: "Organize your life, tasks, and finances with elegance and ease.",
};

import { NotificationProvider } from "@/components/notifications";
import { cookies } from "next/headers";
import { Toaster } from "sonner";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("theme")?.value || "light";

  return (
    <html lang="en" className={`scroll-smooth ${theme === "dark" ? "dark" : ""}`} suppressHydrationWarning>
      <body className={`${outfit.variable} font-sans antialiased`}>
        <NotificationProvider>
          <main className="min-h-screen">
            {children}
          </main>
          <Toaster position="top-right" richColors />
        </NotificationProvider>
      </body>
    </html>
  );
}
