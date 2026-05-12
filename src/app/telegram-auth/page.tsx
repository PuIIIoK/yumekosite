"use client";

import { useEffect, useRef } from "react";

const BOT_USERNAME = "yumekoauth_bot";

export default function TelegramAuthPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Define the global callback that Telegram widget will call
    (window as any).onTelegramAuth = (user: Record<string, unknown>) => {
      if (window.opener) {
        window.opener.postMessage(
          { type: "TELEGRAM_AUTH", data: user },
          window.location.origin,
        );
      }
      window.close();
    };

    if (!containerRef.current) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "10");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");

    containerRef.current.appendChild(script);

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#0d0d10",
        gap: 20,
        padding: "32px 24px",
        zIndex: 9999,
      }}
    >
      {/* Logo + title */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="#229ED9">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
        </svg>
        <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>
          Yumeko
        </span>
      </div>

      <p
        style={{
          color: "rgba(255,255,255,0.6)",
          fontSize: 14,
          textAlign: "center",
          margin: 0,
        }}
      >
        Нажмите кнопку ниже для входа через Telegram
      </p>

      {/* Telegram widget container */}
      <div ref={containerRef} style={{ minHeight: 54 }} />

      <p
        style={{
          color: "rgba(255,255,255,0.25)",
          fontSize: 11,
          textAlign: "center",
          maxWidth: 280,
          lineHeight: 1.5,
          margin: 0,
        }}
      >
        После авторизации это окно закроется автоматически
      </p>
    </div>
  );
}
