"use client";

import { useEffect, useState, useRef } from "react";
import styles from "./ProtectedImage.module.scss";

type Props = {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallback?: React.ReactNode;
};

export default function ProtectedImage({ src, alt, className, style, fallback }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const blobRef = useRef<string | null>(null);

  useEffect(() => {
    if (!src) return;

    let cancelled = false;

    fetch(src)
      .then((res) => {
        if (!res.ok) throw new Error("Failed");
        return res.text();
      })
      .then((hexDump) => {
        if (cancelled) return;
        const bytes: number[] = [];
        for (const line of hexDump.split("\n")) {
          if (!line.trim()) continue;
          const hexPart = line.substring(10, 58).trim();
          for (const h of hexPart.split(/\s+/)) {
            if (h.length === 2) bytes.push(parseInt(h, 16));
          }
        }
        const blob = new Blob([new Uint8Array(bytes)]);
        const url = URL.createObjectURL(blob);
        blobRef.current = url;
        setBlobUrl(url);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, [src]);

  if (!blobUrl) return fallback ? <>{fallback}</> : null;

  return (
    <div
      className={`${styles.protectedImage} ${className || ""}`}
      style={{
        ...style,
        backgroundImage: `url(${blobUrl})`,
      }}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      role="img"
      aria-label={alt}
    />
  );
}
