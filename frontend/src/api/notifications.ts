import api from './client';

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationListResponse {
  unread_count: number;
  total: number;
  items: NotificationItem[];
}

export const notificationsApi = {
  getMyNotifications: async (unreadOnly: boolean = false, limit: number = 30): Promise<NotificationListResponse> => {
    const response = await api.get<NotificationListResponse>('/notifications/my', {
      params: { unread_only: unreadOnly, limit },
    });
    return response.data;
  },

  markAsRead: async (notificationId: string): Promise<NotificationItem> => {
    const response = await api.put<NotificationItem>(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async (): Promise<{ message: string; count: number }> => {
    const response = await api.put<{ message: string; count: number }>('/notifications/read-all');
    return response.data;
  },
};
