"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ThumbsUp,
  ThumbsDown,
  Reply,
  Pencil,
  Trash2,
  Send,
  X,
  MessageSquare,
  BadgeCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { API_URL } from "@/config/hosts";
import s from "./Comments.module.scss";

interface CommentDto {
  id: number;
  animeId: number;
  userId: number;
  username: string;
  displayName: string;
  hasAvatar: boolean;
  imageVersion: number;
  roleColor: string;
  effectVerifiedBadge: boolean;
  effectAvatarGlow: boolean;
  accentColor: string | null;
  text: string;
  parentId: number | null;
  replyToId: number | null;
  replyToUsername: string | null;
  likes: number;
  dislikes: number;
  myReaction: "LIKE" | "DISLIKE" | null;
  createdAt: string;
  updatedAt: string | null;
  edited: boolean;
  isOwn: boolean;
  replies?: CommentDto[];
}

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ч назад`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)} д назад`;
  return new Date(iso).toLocaleDateString("ru-RU");
}

function Avatar({
  username,
  displayName,
  hasAvatar,
  imageVersion,
  size = "md",
  roleColor,
  effectAvatarGlow,
  accentColor,
}: {
  username: string;
  displayName: string;
  hasAvatar: boolean;
  imageVersion: number;
  size?: "md" | "sm";
  roleColor?: string;
  effectAvatarGlow?: boolean;
  accentColor?: string | null;
}) {
  const cls = size === "sm" ? s.commentAvatarSm : s.commentAvatar;
  const glowColor = accentColor || roleColor || "var(--accent)";
  const glowStyle: React.CSSProperties = effectAvatarGlow
    ? {
        boxShadow: `0 0 0 2px ${glowColor}55, 0 0 10px ${glowColor}66`,
        borderColor: `${glowColor}88`,
      }
    : {};

  if (hasAvatar) {
    return (
      <img
        src={`${API_URL}/api/media/${username}/avatar?v=${imageVersion}`}
        alt={displayName}
        className={cls}
        style={{ borderRadius: "50%", objectFit: "cover", ...glowStyle }}
      />
    );
  }
  return (
    <div
      className={cls}
      style={{ color: roleColor || "var(--text-secondary)", ...glowStyle }}
    >
      {displayName.charAt(0).toUpperCase()}
    </div>
  );
}

function CommentText({
  text,
  replyToUsername,
}: {
  text: string;
  replyToUsername?: string | null;
}) {
  if (replyToUsername) {
    return (
      <p className={s.commentText}>
        <span className={s.mentionTag}>@{replyToUsername}</span> {text}
      </p>
    );
  }
  return <p className={s.commentText}>{text}</p>;
}

interface Props {
  animeId: number;
  accent: string;
}

export default function Comments({ animeId, accent }: Props) {
  const { user, isAuthenticated, refreshUser } = useAuth();
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [newText, setNewText] = useState("");
  const [posting, setPosting] = useState(false);

  // reply state: { parentId, replyToId, replyToUsername }
  const [replyTo, setReplyTo] = useState<{
    parentId: number;
    replyToId: number;
    replyToUsername: string;
  } | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyPosting, setReplyPosting] = useState(false);

  // edit state
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editPosting, setEditPosting] = useState(false);

  const replyInputRef = useRef<HTMLTextAreaElement>(null);

  const fetchComments = useCallback(async () => {
    try {
      const url = user
        ? `${API_URL}/api/comments/anime/${animeId}?userId=${user.id}`
        : `${API_URL}/api/comments/anime/${animeId}`;
      const res = await fetch(url);
      if (res.ok) setComments(await res.json());
    } catch {}
    setLoading(false);
  }, [animeId, user?.id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Focus reply textarea when replyTo changes
  useEffect(() => {
    if (replyTo) setTimeout(() => replyInputRef.current?.focus(), 60);
  }, [replyTo]);

  // ── Post root comment ──
  const handlePost = async () => {
    if (!user || !newText.trim() || posting) return;
    setPosting(true);
    try {
      const res = await fetch(`${API_URL}/api/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          animeId,
          text: newText.trim(),
          parentId: null,
          replyToId: null,
          replyToUsername: null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setComments((prev) => [{ ...data.comment, replies: [] }, ...prev]);
        setNewText("");
        // Обновляем пользователя для детекции повышения уровня
        refreshUser();
      }
    } catch {}
    setPosting(false);
  };

  // ── Post reply ──
  const handleReply = async () => {
    if (!user || !replyText.trim() || !replyTo || replyPosting) return;
    setReplyPosting(true);
    try {
      const res = await fetch(`${API_URL}/api/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          animeId,
          text: replyText.trim(),
          parentId: replyTo.parentId,
          replyToId: replyTo.replyToId,
          replyToUsername: replyTo.replyToUsername,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyTo.parentId
              ? { ...c, replies: [...(c.replies || []), data.comment] }
              : c,
          ),
        );
        setReplyText("");
        setReplyTo(null);
        // Обновляем пользователя для детекции повышения уровня
        refreshUser();
      }
    } catch {}
    setReplyPosting(false);
  };

  // ── Edit ──
  const startEdit = (c: CommentDto) => {
    setEditId(c.id);
    setEditText(c.text);
  };
  const cancelEdit = () => {
    setEditId(null);
    setEditText("");
  };
  const handleEdit = async (commentId: number, parentId: number | null) => {
    if (!user || !editText.trim() || editPosting) return;
    setEditPosting(true);
    try {
      const res = await fetch(`${API_URL}/api/comments/${commentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, text: editText.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        const update = (c: CommentDto) =>
          c.id === commentId
            ? { ...c, text: editText.trim(), edited: true }
            : c;
        if (parentId === null) {
          setComments((prev) => prev.map(update));
        } else {
          setComments((prev) =>
            prev.map((c) =>
              c.id === parentId
                ? { ...c, replies: (c.replies || []).map(update) }
                : c,
            ),
          );
        }
        cancelEdit();
      }
    } catch {}
    setEditPosting(false);
  };

  // ── Delete ──
  const handleDelete = async (commentId: number, parentId: number | null) => {
    if (!user) return;
    try {
      const res = await fetch(
        `${API_URL}/api/comments/${commentId}?userId=${user.id}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (data.ok) {
        if (parentId === null) {
          setComments((prev) => prev.filter((c) => c.id !== commentId));
        } else {
          setComments((prev) =>
            prev.map((c) =>
              c.id === parentId
                ? {
                    ...c,
                    replies: (c.replies || []).filter(
                      (r) => r.id !== commentId,
                    ),
                  }
                : c,
            ),
          );
        }
      }
    } catch {}
  };

  // ── React ──
  const handleReact = async (
    commentId: number,
    parentId: number | null,
    type: "LIKE" | "DISLIKE",
  ) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_URL}/api/comments/${commentId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, type }),
      });
      const data = await res.json();
      if (data.ok) {
        const newReaction = data.action === "removed" ? null : type;
        const update = (c: CommentDto) =>
          c.id === commentId
            ? {
                ...c,
                likes: data.likes,
                dislikes: data.dislikes,
                myReaction: newReaction,
              }
            : c;
        if (parentId === null) {
          setComments((prev) => prev.map(update));
        } else {
          setComments((prev) =>
            prev.map((c) =>
              c.id === parentId
                ? { ...c, replies: (c.replies || []).map(update) }
                : c,
            ),
          );
        }
      }
    } catch {}
  };

  // ── Single comment row ──
  const renderComment = (c: CommentDto, parentId: number | null) => {
    const isEditing = editId === c.id;
    return (
      <div key={c.id}>
        <div className={parentId === null ? s.commentCard : s.replyCard}>
          <Link href={`/profile/${c.username}`} tabIndex={-1}>
            <Avatar
              username={c.username}
              displayName={c.displayName}
              hasAvatar={c.hasAvatar}
              imageVersion={c.imageVersion}
              size={parentId === null ? "md" : "sm"}
              roleColor={c.roleColor}
              effectAvatarGlow={c.effectAvatarGlow}
              accentColor={c.accentColor}
            />
          </Link>
          <div className={s.commentBody}>
            <div className={s.commentHeader}>
              <Link
                href={`/profile/${c.username}`}
                className={s.commentAuthor}
                style={{ color: c.roleColor || "var(--text-primary)" }}
              >
                {c.displayName}
              </Link>
              {c.effectVerifiedBadge && (
                <BadgeCheck
                  size={14}
                  strokeWidth={2.2}
                  style={{
                    color: c.accentColor || c.roleColor || "var(--accent)",
                    flexShrink: 0,
                  }}
                />
              )}
              <span className={s.commentTime}>{timeAgo(c.createdAt)}</span>
              {c.edited && <span className={s.editedBadge}>(ред.)</span>}
            </div>

            {isEditing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <textarea
                  className={`${s.textarea} ${s.textareaSmall}`}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  maxLength={2000}
                  autoFocus
                />
                <div className={s.formActions}>
                  <button className={s.btnGhost} onClick={cancelEdit}>
                    Отмена
                  </button>
                  <button
                    className={s.btnPrimary}
                    disabled={editPosting || !editText.trim()}
                    onClick={() => handleEdit(c.id, parentId)}
                  >
                    {editPosting ? "…" : "Сохранить"}
                  </button>
                </div>
              </div>
            ) : (
              <CommentText text={c.text} replyToUsername={c.replyToUsername} />
            )}

            {!isEditing && (
              <div className={s.commentActions}>
                <button
                  className={`${s.reactionBtn} ${c.myReaction === "LIKE" ? s.reactionBtnLikeActive : ""}`}
                  onClick={() => handleReact(c.id, parentId, "LIKE")}
                  disabled={!isAuthenticated}
                  title={
                    isAuthenticated ? "Нравится" : "Войдите, чтобы оценить"
                  }
                >
                  <ThumbsUp size={13} strokeWidth={2} />
                  {c.likes > 0 && <span>{c.likes}</span>}
                </button>
                <button
                  className={`${s.reactionBtn} ${c.myReaction === "DISLIKE" ? s.reactionBtnDislikeActive : ""}`}
                  onClick={() => handleReact(c.id, parentId, "DISLIKE")}
                  disabled={!isAuthenticated}
                  title={
                    isAuthenticated ? "Не нравится" : "Войдите, чтобы оценить"
                  }
                >
                  <ThumbsDown size={13} strokeWidth={2} />
                  {c.dislikes > 0 && <span>{c.dislikes}</span>}
                </button>

                {isAuthenticated && (
                  <>
                    <div className={s.actionSep} />
                    <button
                      className={s.actionBtn}
                      onClick={() => {
                        const rootId = parentId ?? c.id;
                        setReplyTo({
                          parentId: rootId,
                          replyToId: c.id,
                          replyToUsername: c.username,
                        });
                        setReplyText("");
                      }}
                    >
                      <Reply size={13} strokeWidth={2} /> Ответить
                    </button>
                  </>
                )}

                {c.isOwn && (
                  <>
                    <div className={s.actionSep} />
                    <button
                      className={s.actionBtn}
                      onClick={() => startEdit(c)}
                    >
                      <Pencil size={12} strokeWidth={2} />
                    </button>
                    <button
                      className={`${s.actionBtn} ${s.actionBtnDanger}`}
                      onClick={() => handleDelete(c.id, parentId)}
                    >
                      <Trash2 size={12} strokeWidth={2} />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={s.comments}>
      {/* ── New comment form ── */}
      {isAuthenticated && user ? (
        <div className={s.newComment}>
          <Avatar
            username={user.username}
            displayName={user.displayName}
            hasAvatar={user.hasAvatar}
            imageVersion={user.imageVersion}
          />
          <div className={s.newCommentBox}>
            <textarea
              className={s.textarea}
              placeholder="Напишите комментарий…"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              maxLength={2000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handlePost();
              }}
            />
            <div className={s.formActions}>
              <span
                style={{
                  fontSize: 11,
                  color: "var(--text-muted)",
                  marginRight: "auto",
                }}
              >
                Ctrl+Enter для отправки
              </span>
              <button
                className={s.btnPrimary}
                disabled={posting || !newText.trim()}
                onClick={handlePost}
              >
                <Send size={13} strokeWidth={2} />
                {posting ? "…" : "Отправить"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={s.authPrompt}>
          <MessageSquare
            size={18}
            style={{ color: "var(--accent)", flexShrink: 0 }}
          />
          <span>Войдите, чтобы оставить комментарий</span>
        </div>
      )}

      {/* ── Comments list ── */}
      {loading ? (
        <p className={s.loading}>Загрузка комментариев…</p>
      ) : comments.length === 0 ? (
        <p className={s.empty}>Комментариев пока нет. Будьте первым!</p>
      ) : (
        <div className={s.commentList}>
          {comments.map((c) => (
            <div key={c.id} className={s.commentRoot}>
              {renderComment(c, null)}

              {/* ── Replies ── */}
              {((c.replies && c.replies.length > 0) ||
                replyTo?.parentId === c.id) && (
                <div className={s.repliesSection}>
                  {(c.replies || []).map((r) => renderComment(r, c.id))}

                  {/* ── Reply form (inside repliesSection, when there are already replies) ── */}
                  {replyTo?.parentId === c.id && (
                    <div style={{ paddingTop: 10 }}>
                      <div
                        className={s.replyFormWrap}
                        style={{ marginLeft: 0 }}
                      >
                        {user && (
                          <Avatar
                            username={user.username}
                            displayName={user.displayName}
                            hasAvatar={user.hasAvatar}
                            imageVersion={user.imageVersion}
                            size="sm"
                          />
                        )}
                        <div className={s.replyFormBox}>
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--text-muted)",
                              marginBottom: 4,
                            }}
                          >
                            Ответ для{" "}
                            <span
                              style={{
                                color: "var(--accent)",
                                fontWeight: 600,
                              }}
                            >
                              @{replyTo.replyToUsername}
                            </span>
                            <button
                              onClick={() => setReplyTo(null)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "var(--text-muted)",
                                cursor: "pointer",
                                marginLeft: 6,
                                padding: 0,
                              }}
                            >
                              <X size={12} />
                            </button>
                          </div>
                          <textarea
                            ref={replyInputRef}
                            className={`${s.textarea} ${s.textareaSmall}`}
                            placeholder={`Ответить @${replyTo.replyToUsername}…`}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            maxLength={2000}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
                                handleReply();
                            }}
                          />
                          <div className={s.formActions}>
                            <button
                              className={s.btnGhost}
                              onClick={() => {
                                setReplyTo(null);
                                setReplyText("");
                              }}
                            >
                              Отмена
                            </button>
                            <button
                              className={s.btnPrimary}
                              disabled={replyPosting || !replyText.trim()}
                              onClick={handleReply}
                            >
                              {replyPosting ? "…" : "Ответить"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
