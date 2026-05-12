"use client";

import { Suspense, useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  User,
  Lock,
  Eye,
  EyeOff,
  Link2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config/hosts";
import s from "./OAuthCallback.module.scss";

type Phase = "loading" | "linking" | "success" | "error";

// ── SVG иконки провайдеров ────────────────────────────────────────────────────
function DiscordIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 127.14 96.36"
      fill="currentColor"
    >
      <path d="M107.7 8.07A105.15 105.15 0 0081.47 0a72.06 72.06 0 00-3.36 6.83 97.68 97.68 0 00-29.11 0A72.37 72.37 0 0045.64 0a105.89 105.89 0 00-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0032.17 16.15 77.7 77.7 0 006.89-11.11 68.42 68.42 0 01-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0064.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 01-10.87 5.19 77 77 0 006.89 11.1 105.25 105.25 0 0032.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.1 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.1 12.69-11.43 12.69z" />
    </svg>
  );
}

function TelegramIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z" />
    </svg>
  );
}

// ── Внутренний компонент ──────────────────────────────────────────────────────
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
  const [showPassword, setShowPassword] = useState(false);
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState("");

  const processed = useRef(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  // Focus username field when linking phase appears
  useEffect(() => {
    if (phase === "linking") {
      setTimeout(() => usernameRef.current?.focus(), 120);
    }
  }, [phase]);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const token = params.get("token");
    const error = params.get("error");

    if (error) {
      setErrorMsg(
        error === "cancelled"
          ? "Авторизация отменена"
          : "Произошла ошибка на сервере. Попробуйте снова.",
      );
      setPhase("error");
      return;
    }

    if (!token) {
      setErrorMsg("Неверный запрос. Попробуйте войти ещё раз.");
      setPhase("error");
      return;
    }

    fetch(`${API_URL}/api/auth/oauth/exchange?token=${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          setErrorMsg(data.error || "Токен истёк. Попробуйте снова.");
          setPhase("error");
          return;
        }

        if (!data.needsLink) {
          loginWithOAuthUser(data.user);
          setPhase("success");
          setTimeout(() => router.replace("/"), 1000);
        } else {
          setProvider(data.provider ?? "discord");
          setProviderUsername(data.username ?? "");
          setLinkToken(data.linkToken ?? "");
          setPhase("linking");
        }
      })
      .catch(() => {
        setErrorMsg("Ошибка соединения с сервером. Проверьте подключение.");
        setPhase("error");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLink = async () => {
    if (!username.trim() || !password || linking) return;
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
      setTimeout(() => router.replace("/"), 1000);
    } catch {
      setLinkError("Ошибка соединения с сервером");
      setLinking(false);
    }
  };

  const providerLabel = provider === "discord" ? "Discord" : "Telegram";
  const providerColor = provider === "discord" ? "#5865f2" : "#229ED9";
  const providerIcon =
    provider === "discord" ? (
      <DiscordIcon size={28} />
    ) : (
      <TelegramIcon size={26} />
    );

  return (
    <div className={s.page}>
      {/* Logo */}
      <Link href="/" className={s.logo}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Yumeko
      </Link>

      <div className={s.card}>
        {/* ── Loading ─────────────────────────────────────────────────────── */}
        {phase === "loading" && (
          <div className={s.phaseContent} key="loading">
            <div className={s.spinnerWrap}>
              <Loader2 size={28} className={s.spinner} />
            </div>
            <p className={s.loadingTitle}>Устанавливаем соединение</p>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: 13,
                margin: 0,
              }}
            >
              Проверяем данные авторизации…
            </p>
            <div className={s.loadingDots}>
              <span />
              <span />
              <span />
            </div>
          </div>
        )}

        {/* ── Success ─────────────────────────────────────────────────────── */}
        {phase === "success" && (
          <div className={s.phaseContent} key="success">
            <div className={s.successIcon}>
              <CheckCircle2 size={34} strokeWidth={1.8} />
            </div>
            <p className={s.successTitle}>Вход выполнен!</p>
            <p className={s.successSub}>Перенаправляем вас на главную…</p>
            <div className={s.progressBar} />
          </div>
        )}

        {/* ── Error ───────────────────────────────────────────────────────── */}
        {phase === "error" && (
          <div className={s.phaseContent} key="error">
            <div className={s.errorIcon}>
              <XCircle size={34} strokeWidth={1.8} />
            </div>
            <p className={s.errorTitle}>{errorMsg}</p>
            <button className={s.homeBtn} onClick={() => router.replace("/")}>
              <ArrowLeft size={16} strokeWidth={2.2} />
              На главную
            </button>
          </div>
        )}

        {/* ── Linking ─────────────────────────────────────────────────────── */}
        {phase === "linking" && (
          <div className={s.phaseContentLeft} key="linking">
            {/* Provider header */}
            <div className={s.providerHeader}>
              <div
                className={s.providerBadge}
                style={{ background: providerColor }}
              >
                <span style={{ color: "#fff" }}>{providerIcon}</span>
              </div>
              <p className={s.providerName}>{providerLabel}</p>
              {providerUsername && (
                <p className={s.providerUser} style={{ color: providerColor }}>
                  @{providerUsername}
                </p>
              )}
            </div>

            <div className={s.divider}>Привязка к аккаунту</div>

            <p className={s.formTitle}>Войдите в Yumeko</p>
            <p className={s.formSub}>
              Укажите данные своего аккаунта, чтобы привязать&nbsp;
              {providerLabel}
            </p>

            {/* Error alert */}
            {linkError && (
              <div className={s.errorAlert}>
                <AlertCircle size={15} strokeWidth={2} />
                {linkError}
              </div>
            )}

            {/* Username */}
            <div className={s.inputGroup}>
              <User size={15} className={s.inputIcon} />
              <input
                ref={usernameRef}
                type="text"
                className={s.input}
                placeholder="Логин"
                value={username}
                autoComplete="username"
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  document.getElementById("pwd-input")?.focus()
                }
              />
            </div>

            {/* Password */}
            <div className={s.inputGroup}>
              <Lock size={15} className={s.inputIcon} />
              <input
                id="pwd-input"
                type={showPassword ? "text" : "password"}
                className={`${s.input} ${s.inputWithEye}`}
                placeholder="Пароль"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLink()}
              />
              <button
                type="button"
                className={s.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff size={15} strokeWidth={2} />
                ) : (
                  <Eye size={15} strokeWidth={2} />
                )}
              </button>
            </div>

            {/* Submit */}
            <button
              className={s.submitBtn}
              style={{ background: providerColor }}
              onClick={handleLink}
              disabled={linking || !username.trim() || !password}
            >
              {linking ? (
                <>
                  <Loader2 size={16} className={s.submitBtnSpinner} />
                  Привязываем…
                </>
              ) : (
                <>
                  <Link2 size={16} strokeWidth={2.2} />
                  Привязать {providerLabel}
                </>
              )}
            </button>

            {/* Cancel */}
            <button
              className={s.cancelBtn}
              onClick={() => router.replace("/")}
              disabled={linking}
            >
              Отмена
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Обёртка с Suspense ────────────────────────────────────────────────────────
export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <Loader2
            size={28}
            style={{
              color: "var(--accent)",
              animation: "spin 0.9s linear infinite",
            }}
          />
          <p
            style={{ color: "var(--text-secondary)", fontSize: 14, margin: 0 }}
          >
            Загрузка…
          </p>
        </div>
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  );
}
