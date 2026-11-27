import { useCallback, useEffect, useRef, useState } from "react";
import { localeOf, useLanguage, type Language } from "./i18n";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllRead,
  markRead,
  type AppNotification,
} from "./notificationsApi";
import "./styles/notifications.css";

const REFRESH_MS = 30_000;

function formatDate(value: string, language: Language): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString(localeOf(language), { dateStyle: "short", timeStyle: "short" });
}

/** Cloche des notifications : compteur de non lues (actualisé toutes les 30 s) et liste déroulante. */
export default function NotificationBell() {
  const { language, t } = useLanguage();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const container = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(() => {
    fetchUnreadCount()
      .then(setUnread)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = setInterval(refreshCount, REFRESH_MS);

    return () => clearInterval(timer);
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function handleClickOutside(event: MouseEvent) {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }

    setOpen(true);
    setLoading(true);
    setError("");

    fetchNotifications()
      .then(setItems)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }

  async function handleRead(notification: AppNotification) {
    if (notification.read) return;

    try {
      await markRead(notification.id);
      setItems((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, read: true } : item,
        ),
      );
      setUnread((count) => Math.max(0, count - 1));
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  async function handleReadAll() {
    try {
      await markAllRead();
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      setUnread(0);
    } catch (reason) {
      setError((reason as Error).message);
    }
  }

  const label =
    unread > 0 ? t(unread > 1 ? "notificationsLabelMany" : "notificationsLabel", { count: unread }) : t("notifications");

  return (
    <div className="notification-bell" ref={container}>
      <button
        type="button"
        className="notification-button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={toggle}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="notification-icon">
          <path
            d="M12 3a6 6 0 0 0-6 6v3.5L4.5 16h15L18 12.5V9a6 6 0 0 0-6-6Zm-2 15a2 2 0 0 0 4 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unread > 0 && (
          <span className="notification-badge" aria-hidden="true">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <section className="notification-panel" aria-label={t("yourNotifications")}>
          <header className="notification-panel-header">
            <h2>{t("notifications")}</h2>
            <button
              type="button"
              className="notification-read-all"
              onClick={() => void handleReadAll()}
              disabled={unread === 0}
            >
              {t("markAllRead")}
            </button>
          </header>

          {error && (
            <p className="notification-error" role="alert">
              {error}
            </p>
          )}

          {loading && <p className="notification-empty">{t("loadingShort")}</p>}

          {!loading && !error && items.length === 0 && (
            <p className="notification-empty">{t("noNotifications")}</p>
          )}

          <ul className="notification-list">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className={
                    item.read
                      ? "notification-item"
                      : "notification-item notification-item-unread"
                  }
                  onClick={() => void handleRead(item)}
                >
                  <span className="notification-message">{item.message}</span>
                  <span className="notification-date">
                    {formatDate(item.createdAt, language)}
                    {!item.read && <span className="visually-hidden">{t("unreadHidden")}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
