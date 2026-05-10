import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppearanceProvider } from "@/context/AppearanceContext";
import { AuthProvider } from "@/context/AuthContext";
import ParticleCanvas from "@/components/ParticleCanvas/ParticleCanvas";
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://yumeko.ru"),
  title: {
    default: "YumekoStudio - твоя любимая озвучка!",
    template: "%s | YumekoStudio",
  },
  description: "Смотрите аниме онлайн в качественной озвучке. Свежие релизы, расписание, огромная коллекция тайтлов.",
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    siteName: "YumekoStudio",
    locale: "ru_RU",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
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
          <ParticleCanvas />
          <AuthProvider>{children}</AuthProvider>
        </AppearanceProvider>
      </body>
    </html>
  );
}
