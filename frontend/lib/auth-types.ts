export type UserRole = "teacher" | "admin";
export type AccountStatus = "pending" | "approved" | "rejected";

export interface Teacher {
  id: string;
  email: string;
  name: string;
  school?: string | null;
  role: UserRole;
  status: AccountStatus;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  school?: string;
}

export interface AuthResult {
  success: boolean;
  pending?: boolean;
  error?: string;
}
