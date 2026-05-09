import type { Metadata } from "next";
import { API_URL } from "@/config/hosts";

type Props = {
  params: Promise<{ username: string }>;
  children: React.ReactNode;
};

function parseHex(hexDump: string): any {
  const bytes: number[] = [];
  for (const line of hexDump.split("\n")) {
    if (!line.trim()) continue;
    const hexPart = line.substring(10, 58).trim();
    for (const h of hexPart.split(/\s+/)) {
      if (h.length === 2) bytes.push(parseInt(h, 16));
    }
  }
  return JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  try {
    const res = await fetch(`${API_URL}/api/profile/${username}`, { cache: "no-store" });
    if (!res.ok) return { title: `@${username}` };
    const raw = await res.text();
    let data: any;
    try {
      data = JSON.parse(raw);
    } catch {
      data = parseHex(raw);
    }
    const user = data.user || data;
    const displayName = user.displayName && user.displayName !== user.username ? user.displayName : null;
    const bio = user.bio || "";
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://yumeko.ru";
    const avatarUrl = user.hasAvatar ? `${siteUrl}/api/media/${username}/avatar` : undefined;
    const bannerUrl = user.hasBanner ? `${siteUrl}/api/media/${username}/banner` : undefined;
    const ogImage = bannerUrl || avatarUrl;
    const titleName = displayName || `@${username}`;

    return {
      title: titleName,
      description: bio || `Профиль ${titleName} на YumekoStudio`,
      openGraph: {
        title: `${titleName} | YumekoStudio`,
        description: bio || `Профиль ${titleName} на YumekoStudio`,
        images: ogImage ? [{ url: ogImage, alt: titleName }] : [],
        type: "profile",
      },
      twitter: {
        card: bannerUrl ? "summary_large_image" : "summary",
        title: `${titleName} | YumekoStudio`,
        description: bio || `Профиль ${titleName} на YumekoStudio`,
        images: ogImage ? [ogImage] : [],
      },
    };
  } catch (e) {
    console.error("[ProfileLayout] metadata fetch error:", e);
    return { title: `@${username}` };
  }
}

export default function ProfileLayout({ children }: Props) {
  return <>{children}</>;
}
