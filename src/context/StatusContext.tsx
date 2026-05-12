"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { Client, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { API_URL } from "@/config/hosts";
import { useAuth } from "@/context/AuthContext";

type UserStatus = "ONLINE" | "RECENTLY" | "OFFLINE";
type ManualStatus = "ONLINE" | "AWAY" | "DND" | "INVISIBLE";

interface StatusInfo {
  userId: number;
  status: UserStatus;
  manualStatus?: ManualStatus;
  lastSeen: string | null;
}

interface StatusContextType {
  statuses: Map<number, StatusInfo>;
  subscribeToUsers: (userIds: number[]) => void;
  unsubscribeFromUsers: (userIds: number[]) => void;
  getStatus: (userId: number) => StatusInfo | undefined;
  isOnline: (userId: number) => boolean;
  isConnected: boolean;
  manualStatus: ManualStatus;
  setUserManualStatus: (status: ManualStatus) => Promise<void>;
}

const StatusContext = createContext<StatusContextType | undefined>(undefined);

const HEARTBEAT_INTERVAL = 5000; // 5 seconds
const RECONNECT_DELAY = 3000;

const MANUAL_STATUS_KEY = "yumeko-manual-status";

export function StatusProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<Map<number, StatusInfo>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const subscriptionsRef = useRef<Map<number, StompSubscription>>(new Map());
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedUsersRef = useRef<Set<number>>(new Set());
  const userIdRef = useRef<number | null>(null);
  // Единственный источник правды для manualStatus — ref, не state
  const manualStatusRef = useRef<ManualStatus>(() => {
    if (typeof window === "undefined") return "ONLINE";
    const saved = localStorage.getItem(MANUAL_STATUS_KEY);
    return saved === "ONLINE" ||
      saved === "AWAY" ||
      saved === "DND" ||
      saved === "INVISIBLE"
      ? (saved as ManualStatus)
      : "ONLINE";
  });
  const userManualOverridesRef = useRef<Map<number, ManualStatus>>(new Map());

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  // Функция загрузки и применения статуса — в ref чтобы была доступна без stale closure
  const applyStoredStatusRef = useRef<(uid: number, client: Client) => void>(
    () => {},
  );
  applyStoredStatusRef.current = (uid: number, client: Client) => {
    fetch(`${API_URL}/api/status/manual/${uid}`)
      .then((r) => r.json())
      .then((data) => {
        const ms = data?.manualStatus as string | undefined;
        const valid = ["ONLINE", "AWAY", "DND", "INVISIBLE"];
        const resolved = (
          ms && valid.includes(ms) ? ms : "ONLINE"
        ) as ManualStatus;

        manualStatusRef.current = resolved;
        localStorage.setItem(MANUAL_STATUS_KEY, resolved);

        if (resolved === "ONLINE") {
          // Сразу применяем статус локально — WebSocket-событие от самого себя игнорируется,
          // поэтому без этого индикатор остаётся «Не в сети» до чужого обновления
          userManualOverridesRef.current.set(uid, resolved);
          setStatuses((prev) =>
            new Map(prev).set(uid, {
              userId: uid,
              status: "ONLINE",
              manualStatus: resolved,
              lastSeen: new Date().toISOString(),
            }),
          );
          client.publish({
            destination: "/app/heartbeat",
            body: JSON.stringify({ userId: uid, timestamp: Date.now() }),
          });
        } else {
          const publicStatus: UserStatus =
            resolved === "INVISIBLE" ? "OFFLINE" : "RECENTLY";
          userManualOverridesRef.current.set(uid, resolved);
          setStatuses((prev) =>
            new Map(prev).set(uid, {
              userId: uid,
              status: publicStatus,
              manualStatus: resolved,
              lastSeen: new Date().toISOString(),
            }),
          );
          client.publish({
            destination: "/app/set-status",
            body: JSON.stringify({
              userId: uid,
              status: publicStatus,
              originalStatus: resolved,
            }),
          });
        }
      })
      .catch(() => {
        // Фоллбэк: применяем ONLINE локально и отправляем heartbeat
        userManualOverridesRef.current.set(uid, "ONLINE");
        setStatuses((prev) =>
          new Map(prev).set(uid, {
            userId: uid,
            status: "ONLINE",
            manualStatus: "ONLINE",
            lastSeen: new Date().toISOString(),
          }),
        );
        client.publish({
          destination: "/app/heartbeat",
          body: JSON.stringify({ userId: uid, timestamp: Date.now() }),
        });
      });
  };

  // Если user появился после того как WebSocket уже подключён
  useEffect(() => {
    if (!user?.id || !isConnected) return;
    const client = clientRef.current;
    if (!client?.connected) return;
    applyStoredStatusRef.current(user.id, client);
  }, [user?.id, isConnected]);

  const connect = useCallback(() => {
    if (clientRef.current?.active) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${API_URL}/ws/status`),
      reconnectDelay: RECONNECT_DELAY,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setIsConnected(true);

        // Subscribe to status changes
        client.subscribe(
          "/topic/status-changes",
          (message: { body: string }) => {
            const data = JSON.parse(message.body);
            const uid = Number(data.userId);
            // Свой статус не перезаписываем из WebSocket — он уже выставлен локально
            if (uid === userIdRef.current) return;
            setStatuses((prev) =>
              new Map(prev).set(uid, {
                userId: uid,
                status: data.status,
                manualStatus: userManualOverridesRef.current.get(uid),
                lastSeen: new Date().toISOString(),
              }),
            );
          },
        );

        // Resubscribe to previously watched users
        if (subscribedUsersRef.current.size > 0) {
          const userIds = Array.from(subscribedUsersRef.current);
          client.publish({
            destination: "/app/subscribe-status",
            body: JSON.stringify({ subscriberId: 0, userIds }),
          });

          userIds.forEach((userId) => {
            if (subscriptionsRef.current.has(userId)) return;
            if (!client.connected) return;
            const sub = client.subscribe(
              `/topic/status/${userId}`,
              (msg: { body: string }) => {
                const data = JSON.parse(msg.body);
                const uid = Number(userId);
                // Свой статус не перезаписываем из WebSocket — он уже выставлен локально
                if (uid === userIdRef.current) return;
                setStatuses((prev) =>
                  new Map(prev).set(uid, {
                    ...data,
                    manualStatus: userManualOverridesRef.current.get(uid),
                  }),
                );
              },
            );
            subscriptionsRef.current.set(userId, sub);
          });
        }

        // Start heartbeat — сначала загружаем актуальный статус с сервера и потом запускаем интервал
        const sendHeartbeat = () => {
          if (!userIdRef.current) return;
          if (manualStatusRef.current !== "ONLINE") return;
          client.publish({
            destination: "/app/heartbeat",
            body: JSON.stringify({
              userId: userIdRef.current,
              timestamp: Date.now(),
            }),
          });
        };

        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

        // Загружаем статус с сервера и сразу применяем
        const uid = userIdRef.current;
        if (uid) {
          applyStoredStatusRef.current(uid, client);
        }
      },
      onDisconnect: () => {
        setIsConnected(false);
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
      },
      onStompError: () => {
        setIsConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      clientRef.current?.deactivate();
    };
  }, [connect]);

  const subscribeToUsers = useCallback((userIds: number[]) => {
    const client = clientRef.current;

    // Always track which users we want to subscribe to
    userIds.forEach((userId) => subscribedUsersRef.current.add(userId));

    // If client not ready, subscriptions will be processed in onConnect
    if (!client?.connected) {
      return;
    }

    userIds.forEach((userId) => {
      if (subscriptionsRef.current.has(userId)) return;
      if (!client.connected) return;

      const sub = client.subscribe(
        `/topic/status/${userId}`,
        (message: { body: string }) => {
          const data = JSON.parse(message.body);
          const uid = Number(userId);
          if (uid === userIdRef.current) return;
          setStatuses((prev) =>
            new Map(prev).set(uid, {
              ...data,
              manualStatus: userManualOverridesRef.current.get(uid),
            }),
          );
        },
      );
      subscriptionsRef.current.set(userId, sub);
    });

    // Batch subscribe
    client.publish({
      destination: "/app/subscribe-status",
      body: JSON.stringify({ subscriberId: 0, userIds }),
    });
  }, []);

  const unsubscribeFromUsers = useCallback((userIds: number[]) => {
    userIds.forEach((userId) => {
      const sub = subscriptionsRef.current.get(userId);
      if (sub) {
        sub.unsubscribe();
        subscriptionsRef.current.delete(userId);
      }
      subscribedUsersRef.current.delete(userId);
    });
  }, []);

  const setUserManualStatus = useCallback(async (status: ManualStatus) => {
    const uid = userIdRef.current;
    if (!uid) return;

    const publicStatus: UserStatus =
      status === "ONLINE"
        ? "ONLINE"
        : status === "INVISIBLE"
          ? "OFFLINE"
          : "RECENTLY";

    // Обновляем ref синхронно ДО любого setState
    manualStatusRef.current = status;
    userManualOverridesRef.current.set(uid, status);
    if (typeof window !== "undefined") {
      localStorage.setItem(MANUAL_STATUS_KEY, status);
    }

    // Один setStatuses — всё в одном батче, никакого промежуточного рендера
    setStatuses((prev) =>
      new Map(prev).set(uid, {
        userId: uid,
        status: publicStatus,
        manualStatus: status,
        lastSeen: new Date().toISOString(),
      }),
    );

    const client = clientRef.current;
    if (client?.connected) {
      client.publish({
        destination: "/app/set-status",
        // status — публичный (ONLINE/RECENTLY/OFFLINE), originalStatus — оригинальный для БД
        body: JSON.stringify({
          userId: uid,
          status: publicStatus,
          originalStatus: status,
        }),
      });
    }
  }, []);

  const getStatus = useCallback(
    (userId: number) => {
      return statuses.get(userId);
    },
    [statuses],
  );

  const isOnline = useCallback(
    (userId: number) => {
      return statuses.get(userId)?.status === "ONLINE";
    },
    [statuses],
  );

  // manualStatus — читаем из statuses текущего юзера (единый источник правды)
  const myUid = user?.id;
  const manualStatus: ManualStatus =
    (myUid ? statuses.get(myUid)?.manualStatus : undefined) ??
    manualStatusRef.current;

  return (
    <StatusContext.Provider
      value={{
        statuses,
        subscribeToUsers,
        unsubscribeFromUsers,
        getStatus,
        isOnline,
        isConnected,
        manualStatus,
        setUserManualStatus,
      }}
    >
      {children}
    </StatusContext.Provider>
  );
}

export function useStatus() {
  const ctx = useContext(StatusContext);
  if (!ctx) throw new Error("useStatus must be used within StatusProvider");
  return ctx;
}
