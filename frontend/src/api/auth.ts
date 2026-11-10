import api from './client';
import type {
  AdminOverviewStats,
  CandidateDashboardData,
  TokenResponse,
  User,
} from '../types/auth';

export const authApi = {
  login: async (email: string, password: string, expectedRole?: string): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/login', {
      email,
      password,
      expected_role: expectedRole,
    });
    return response.data;
  },

  registerCandidate: async (data: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>('/auth/register/candidate', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string; reset_token?: string }> => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (data: {
    reset_token: string;
    new_password: string;
  }): Promise<{ message: string; success: boolean }> => {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Proceed even if backend call fails
    }
  },

  getAdminOverview: async (): Promise<AdminOverviewStats> => {
    const response = await api.get<AdminOverviewStats>('/admin/overview');
    return response.data;
  },

  getAdminUsers: async (): Promise<User[]> => {
    const response = await api.get<User[]>('/admin/users');
    return response.data;
  },

  getCandidateDashboard: async (): Promise<CandidateDashboardData> => {
    const response = await api.get<CandidateDashboardData>('/candidate/dashboard');
    return response.data;
  },
};
