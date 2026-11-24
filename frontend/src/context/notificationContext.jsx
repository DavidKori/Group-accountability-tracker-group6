import React, { createContext, useContext, useState, useCallback } from "react";
import api from "../api/axios.js";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 50,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchNotifications = useCallback(async (query = {}) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(query).toString();
      const response = await api.get(
        `/notifications${params ? `?${params}` : ""}`,
      );

      const raw = response?.data;

      // Handle three shapes:
      // 1. Paginated: { items, total, page, limit }
      // 2. Data-wrapped: { data: [...] }
      // 3. Plain array
      const items = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.items)
          ? raw.items
          : Array.isArray(raw?.data)
            ? raw.data
            : [];

      setNotifications(items);

      if (raw && !Array.isArray(raw)) {
        setPagination({
          total: raw.total ?? items.length,
          page: raw.page ?? 1,
          limit: raw.limit ?? items.length,
        });
      } else {
        setPagination({
          total: items.length,
          page: 1,
          limit: items.length,
        });
      }

      return items;
    } catch (err) {
      //console.error("Failed to fetch notifications:", err);
      setError(err.response?.data?.message || err.message || "Failed to load.");
      setNotifications([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await api.get("/notifications/unread-count");
      const count = response?.data?.count ?? 0;
      setUnreadCount(count);
      return count;
    } catch (err) {
      //console.error("Failed to fetch unread count:", err);
      return 0;
    }
  }, []);

  const markRead = useCallback(async (id) => {
    const response = await api.put(`/notifications/${id}/read`);
    const updated = response?.data ?? null;
    if (updated) {
      setNotifications((prev) => prev.map((n) => (n._id === id ? updated : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
    return updated;
  }, []);

  const markAllRead = useCallback(async () => {
    await api.put("/notifications/read-all");
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        read: true,
        readAt: n.readAt ?? new Date().toISOString(),
      })),
    );
    setUnreadCount(0);
  }, []);

  const deleteNotification = useCallback(async (id) => {
    await api.delete(`/notifications/${id}`);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
  }, []);

  const value = {
    notifications,
    setNotifications,
    unreadCount,
    setUnreadCount,
    pagination,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markRead,
    markAllRead,
    deleteNotification,
    setLoading,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error(
      "useNotification must be used inside a NotificationProvider",
    );
  }
  return ctx;
}
