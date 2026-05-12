"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config/hosts";

type Phase = "loading" | "linking" | "success" | "error";

// Внутренний компонент использует useSearchParams — должен быть внутри Suspense
function OAuthCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { loginWithOAuthUser } = useAuth();

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [provider, setProvider] = useState<"discord" | "telegram">("discord");
  const [providerUsername, setProviderUsername] = useState("");
  const [linkToken, setLinkToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState("");
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const token = params.get("token");
    const error = params.get("error");
    const isNew = params.get("new") === "true";

    if (error) {
      setErrorMsg(
        error === "cancelled"
          ? "Авторизация отменена"
          : "Ошибка сервера. Попробуйте снова.",
      );
      setPhase("error");
      return;
    }

    if (!token) {
      setErrorMsg("Неверный запрос");
      setPhase("error");
      return;
    }

    // Exchange temp token for user data
    fetch(`${API_URL}/api/auth/oauth/exchange?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          setErrorMsg(data.error || "Токен истёк. Попробуйте снова.");
          setPhase("error");
          return;
        }

        if (!data.needsLink) {
          // Already linked — log in immediately
          loginWithOAuthUser(data.user);
          setTimeout(() => router.replace("/"), 500);
          setPhase("success");
        } else {
          // Need to link to existing account
          setProvider(data.provider ?? "discord");
          setProviderUsername(data.username ?? "");
          setLinkToken(data.linkToken ?? "");
          setPhase("linking");
        }
      })
      .catch(() => {
        setErrorMsg("Ошибка соединения с сервером");
        setPhase("error");
      });
  }, []);

  const handleLink = async () => {
    if (!username.trim() || !password) return;
    setLinking(true);
    setLinkError("");

    try {
      const res = await fetch(`${API_URL}/api/auth/oauth/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkToken,
          username: username.trim(),
          password,
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        setLinkError(data.error || "Неверный логин или пароль");
        setLinking(false);
        return;
      }

      loginWithOAuthUser(data.user);
      setPhase("success");
      setTimeout(() => router.replace("/"), 800);
    } catch {
      setLinkError("Ошибка соединения с сервером");
      setLinking(false);
    }
  };

  const providerLabel = provider === "discord" ? "Discord" : "Telegram";
  const providerColor = provider === "discord" ? "#5865f2" : "#2aabee";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-primary, #0a0a0c)",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "var(--bg-elevated, #141418)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: 40,
          textAlign: "center",
        }}
      >
        {/* ── Loading ── */}
        {phase === "loading" && (
          <>
            <div style={{ fontSize: 40, marginBottom: 16 }}>⏳</div>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 15 }}>
              Подключаемся...
            </p>
          </>
        )}

        {/* ── Success ── */}
        {phase === "success" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p style={{ color: "#22c55e", fontSize: 16, fontWeight: 600 }}>
              Вход выполнен!
            </p>
            <p
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 13,
                marginTop: 6,
              }}
            >
              Переадресация...
            </p>
          </>
        )}

        {/* ── Error ── */}
        {phase === "error" && (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
            <p style={{ color: "#ef4444", fontSize: 15, fontWeight: 600 }}>
              {errorMsg}
            </p>
            <button
              onClick={() => router.replace("/")}
              style={{
                marginTop: 24,
                padding: "10px 28px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              На главную
            </button>
          </>
        )}

        {/* ── Link to existing account ── */}
        {phase === "linking" && (
          <>
            {/* Provider icon */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: providerColor,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                fontSize: 28,
              }}
            >
              {provider === "discord" ? "🎮" : "✈️"}
            </div>

            <h2
              style={{
                color: "#fff",
                fontSize: 20,
                fontWeight: 700,
                margin: "0 0 8px",
              }}
            >
              Привязка {providerLabel}
            </h2>
            {providerUsername && (
              <p
                style={{
                  color: providerColor,
                  fontSize: 13,
                  margin: "0 0 6px",
                }}
              >
                @{providerUsername}
              </p>
            )}
            <p
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 13,
                margin: "0 0 28px",
                lineHeight: 1.5,
              }}
            >
              Войдите в свой аккаунт Yumeko, чтобы привязать {providerLabel}
            </p>

            {linkError && (
              <div
                style={{
                  padding: "10px 14px",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  borderRadius: 10,
                  color: "#ff6b6b",
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                {linkError}
              </div>
            )}

            <input
              type="text"
              placeholder="Логин"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLink()}
              style={{ ...inputStyle, marginTop: 10 }}
            />

            <button
              onClick={handleLink}
              disabled={linking || !username.trim() || !password}
              style={{
                width: "100%",
                marginTop: 16,
                padding: "13px",
                borderRadius: 10,
                background: providerColor,
                border: "none",
                color: "#fff",
                fontSize: 15,
                fontWeight: 700,
                cursor: linking ? "not-allowed" : "pointer",
                opacity: linking ? 0.6 : 1,
                transition: "opacity 0.2s",
              }}
            >
              {linking ? "Привязываем..." : `Привязать ${providerLabel}`}
            </button>

            <button
              onClick={() => router.replace("/")}
              style={{
                width: "100%",
                marginTop: 10,
                padding: "11px",
                borderRadius: 10,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.5)",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Отмена
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Внешняя обёртка с Suspense — экспортируем как default
export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--bg-primary, #0a0a0c)",
            color: "rgba(255,255,255,0.5)",
            fontSize: 15,
          }}
        >
          Подключаемся...
        </div>
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};
