export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CANDIDATE';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  is_verified: boolean;
  company_id?: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface AdminOverviewStats {
  admin_name: string;
  admin_role: string;
  total_candidates: number;
  total_admins: number;
  active_jobs_count: number;
  completed_interviews: number;
  system_status: string;
  database: string;
}

export interface CandidateDashboardData {
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  applied_jobs_count: number;
  pending_interviews_count: number;
  completed_interviews_count: number;
  profile_completed: boolean;
}

