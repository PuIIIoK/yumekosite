"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, ChevronLeft, ChevronRight, Shield, User as UserIcon, Pencil, ExternalLink, Trash2, AlertTriangle } from "lucide-react";
import { API_URL } from "@/config/hosts";
import styles from "./admin.module.scss";

interface AdminUser {
  id: number;
  username: string;
  displayName: string;
  bio: string | null;
  email: string | null;
  role: { name: string; displayName: string; color: string; priority: number };
  createdAt: string | null;
  avatarUrl: string | null;
}

interface RoleOption {
  id: number;
  name: string;
  displayName: string;
  color: string;
  priority: number;
}

const PER_PAGE = 12;

export default function UserManager() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [roleDropdown, setRoleDropdown] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [navigateId, setNavigateId] = useState<number | null>(null);
  const [imgVer, setImgVer] = useState(() => Date.now());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch(`${API_URL}/api/roles/users`),
        fetch(`${API_URL}/api/roles`),
      ]);
      setUsers(await usersRes.json());
      setRoles(await rolesRes.json());
      setImgVer(Date.now());
    } catch {
      setError("Не удалось загрузить данные");
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const onFocus = () => { fetchData(); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.trim().toLowerCase();
    return users.filter((u) =>
      u.username.toLowerCase().includes(q) ||
      u.displayName.toLowerCase().includes(q) ||
      String(u.id).includes(q) ||
      (u.email && u.email.toLowerCase().includes(q))
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  useEffect(() => { setPage(1); }, [search]);

  const assignRole = async (username: string, roleName: string) => {
    setAssigning(true);
    try {
      await fetch(`${API_URL}/api/roles/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, role: roleName }),
      });
      setRoleDropdown(null);
      await fetchData();
    } catch {
      setError("Ошибка назначения роли");
    }
    setAssigning(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`${API_URL}/api/roles/users/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      await fetchData();
    } catch {
      setError("Ошибка удаления");
    }
    setDeleting(false);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    const date = new Date(d);
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
  };

  if (loading) {
    return <div className={styles.contentPlaceholder}><p>Загрузка...</p></div>;
  }

  return (
    <div className={`${styles.animeManager} ${navigating ? styles.animeManagerOut : ''}`}>
      <div className={styles.animeManagerHeader}>
        <h2 className={styles.animeManagerTitle}>Пользователи</h2>
      </div>

      <div className={styles.animeToolbar}>
        <div className={styles.animeSearchWrap}>
          <Search size={14} className={styles.animeSearchIcon} />
          <input
            className={styles.animeSearchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени, username, email или ID..."
          />
          {search && (
            <button className={styles.animeSearchClear} onClick={() => setSearch("")}><X size={13} /></button>
          )}
        </div>
        <span className={styles.animeCount}>{filtered.length} из {users.length}</span>
      </div>

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.paginationBtn} disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              className={`${styles.paginationNum} ${p === currentPage ? styles.paginationNumActive : ""}`}
              onClick={() => setPage(p)}
            >
              {p}
            </button>
          ))}
          <button className={styles.paginationBtn} disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {error && <div className={styles.animeError}>{error}</div>}

      <div className={styles.userGrid}>
        {paged.map((user) => (
          <div key={user.id} className={styles.userCard}>
            <div className={styles.userCardAvatar}>
              {user.avatarUrl ? (
                <img src={`${user.avatarUrl}${user.avatarUrl.includes('?') ? '&' : '?'}v=${imgVer}`} alt="" className={styles.userCardAvatarImg} />
              ) : (
                <UserIcon size={20} />
              )}
            </div>
            <div className={styles.userCardBody}>
              <div className={styles.userCardTop}>
                <span className={styles.userCardId}>#{user.id}</span>
                <span className={styles.userCardName}>{user.displayName}</span>
                <span className={styles.userCardUsername}>@{user.username}</span>
              </div>
              <div className={styles.userCardInfo}>
                {user.email && <span className={styles.userCardEmail}>{user.email}</span>}
                <span className={styles.userCardDate}>{formatDate(user.createdAt)}</span>
              </div>
            </div>
            <div className={styles.userCardActions}>
              <button className={styles.userActionBtn} onClick={() => window.open(`/profile/${user.username}`, "_blank")} title="Просмотр профиля">
                <ExternalLink size={14} />
              </button>
              <button className={`${styles.userActionBtn} ${styles.userActionBtnEdit}`} onClick={() => {
                setNavigateId(user.id);
                setNavigating(true);
                setTimeout(() => router.push(`/admin/edit-user?id=${user.id}`), 400);
              }} title="Редактировать">
                <Pencil size={14} />
              </button>
              <button className={`${styles.userActionBtn} ${styles.userActionBtnDanger}`} onClick={() => setDeleteTarget(user)} title="Удалить">
                <Trash2 size={14} />
              </button>
            </div>
            <div className={styles.userCardRole} style={{ position: "relative" }}>
              <button
                className={styles.userRoleBtn}
                style={{ borderColor: user.role.color, color: user.role.color }}
                onClick={() => setRoleDropdown(roleDropdown === user.id ? null : user.id)}
              >
                <Shield size={12} /> {user.role.displayName}
              </button>
              {roleDropdown === user.id && (
                <div className={styles.roleDropdown}>
                  {roles.map((r) => (
                    <button
                      key={r.id}
                      className={`${styles.roleDropdownItem} ${r.name === user.role.name ? styles.roleDropdownItemActive : ""}`}
                      style={{ "--role-color": r.color } as React.CSSProperties}
                      onClick={() => assignRole(user.username, r.name)}
                      disabled={assigning || r.name === user.role.name}
                    >
                      <span className={styles.roleDropdownDot} style={{ background: r.color }} />
                      {r.displayName}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && (
        <div className={styles.animeTableEmpty}>
          {search ? "Пользователь не найден" : "Нет пользователей"}
        </div>
      )}
      {deleteTarget && (
        <div className={styles.deleteOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={styles.deleteModal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.deleteModalClose} onClick={() => setDeleteTarget(null)}><X size={16} /></button>
            <div className={styles.deleteModalIcon}>
              <AlertTriangle size={32} />
            </div>
            <h3 className={styles.deleteModalTitle}>Удалить пользователя?</h3>
            <p className={styles.deleteModalText}>
              <strong>{deleteTarget.displayName}</strong> (@{deleteTarget.username}) будет удалён без возможности восстановления.
            </p>
            <div className={styles.deleteModalActions}>
              <button className={styles.deleteModalCancel} onClick={() => setDeleteTarget(null)} disabled={deleting}>Отмена</button>
              <button className={styles.deleteModalConfirm} onClick={confirmDelete} disabled={deleting}>
                <Trash2 size={13} /> {deleting ? "Удаление..." : "Удалить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
