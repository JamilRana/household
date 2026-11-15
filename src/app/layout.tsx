import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "LifeHub", template: "%s · LifeHub" },
  description: "Tasks, groceries, and money for your household, in one place.",
  applicationName: "LifeHub",
};

import { NotificationProvider } from "@/components/notifications";
import { cookies } from "next/headers";
import { Toaster } from "sonner";
import { ConfirmProvider } from "@/components/confirm-provider";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const savedTheme = cookieStore.get("theme")?.value;
  const theme = savedTheme === "dark" ? "dark" : "light";

  return (
    <html
      lang="en"
      className={`scroll-smooth ${theme === "dark" ? "dark" : ""}`}
      data-theme={theme}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:ital,wght@0,400..800;1,400..800&family=Spline+Sans+Mono:wght@400..600&display=swap"
        />
        {/* No saved choice yet: follow the device's light/dark setting before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var c=document.cookie.match(/(?:^|; )theme=([^;]+)/);var t=c?c[1]:(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.classList.toggle("dark",t==="dark");document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <NotificationProvider>
          <ConfirmProvider>
            <main className="min-h-screen">
              {children}
            </main>
            <Toaster position="bottom-center" richColors closeButton mobileOffset={{ bottom: 80 }} />
          </ConfirmProvider>
        </NotificationProvider>
      </body>
    </html>
  );
}
