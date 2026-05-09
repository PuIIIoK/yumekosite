import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url", { status: 400 });

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return new NextResponse("Image not found", { status: 404 });

    const buffer = Buffer.from(await res.arrayBuffer());
    const sharp = (await import("sharp")).default;
    const jpg = await sharp(buffer).jpeg({ quality: 85 }).toBuffer();

    return new NextResponse(new Uint8Array(jpg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    return new NextResponse("Error", { status: 500 });
  }
}
