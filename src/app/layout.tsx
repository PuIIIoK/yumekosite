import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppearanceProvider } from "@/context/AppearanceContext";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.scss";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "YumekoStudio - твоя любимая озвучка!",
    template: "%s | YumekoStudio",
  },
  description: "Смотрите аниме онлайн в качественной озвучке. Свежие релизы, расписание, огромная коллекция тайтлов.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <AppearanceProvider>
          <AuthProvider>{children}</AuthProvider>
        </AppearanceProvider>
      </body>
    </html>
  );
}
