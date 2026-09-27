import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, ApiError, setApiToken, setUnauthorizedHandler } from "@/lib/api";
import type { AuthResult, RegisterData, Teacher } from "@/lib/auth-types";
import {
  validateEmail,
  validateName,
  validatePassword,
} from "@/lib/auth-utils";

const DEMO_PASSWORD = "teacher123";
const ADMIN_PASSWORD = "admin123";

interface AuthState {
  currentUser: Teacher | null;
  token: string | null;
  isHydrated: boolean;

  restoreSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthResult>;
  adminLogin: (email: string, password: string) => Promise<AuthResult>;
  register: (data: RegisterData) => Promise<AuthResult>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => {
      setUnauthorizedHandler(() => {
        setApiToken(null);
        set({ currentUser: null, token: null });
      });

      return {
        currentUser: null,
        token: null,
        isHydrated: false,

        restoreSession: async () => {
          setApiToken(get().token);
          try {
            const data = await api<{ teacher: Teacher }>("/api/auth/me");
            set({ currentUser: data.teacher, isHydrated: true });
          } catch (error) {
            if (error instanceof ApiError && error.status === 401) {
              setApiToken(null);
              set({ currentUser: null, token: null, isHydrated: true });
              return;
            }
            set({ isHydrated: true });
          }
        },

        login: async (email, password) => {
          return signIn("/api/auth/login", email, password, set);
        },

        adminLogin: async (email, password) => {
          return signIn("/api/auth/admin/login", email, password, set);
        },

        register: async (data) => {
          const nameError = validateName(data.name);
          if (nameError) return { success: false, error: nameError };

          const email = data.email.trim().toLowerCase();
          if (!validateEmail(email)) {
            return { success: false, error: "Введите корректный email" };
          }

          const passwordError = validatePassword(data.password);
          if (passwordError) return { success: false, error: passwordError };

          try {
            await api("/api/auth/register", {
              method: "POST",
              body: JSON.stringify({
                name: data.name.trim(),
                email,
                password: data.password,
                school: data.school?.trim() || undefined,
              }),
            });
            return { success: true, pending: true };
          } catch (error) {
            return {
              success: false,
              error:
                error instanceof Error
                  ? error.message
                  : "Не удалось зарегистрироваться",
            };
          }
        },

        logout: () => {
          void api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
          setApiToken(null);
          set({ currentUser: null, token: null });
        },
      };
    },
    {
      name: "tanymtor-auth",
      version: 4,
      migrate: () => ({ currentUser: null, token: null }),
      partialize: (state) => ({
        currentUser: state.currentUser,
        token: state.token,
      }),
      onRehydrateStorage: () => () => {
        void useAuthStore.getState().restoreSession();
      },
    }
  )
);

async function signIn(
  path: string,
  email: string,
  password: string,
  set: (partial: Partial<AuthState>) => void
): Promise<AuthResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!validateEmail(normalizedEmail)) {
    return { success: false, error: "Введите корректный email" };
  }
  if (!password) {
    return { success: false, error: "Введите пароль" };
  }

  try {
    const data = await api<{ token: string; teacher: Teacher }>(path, {
      method: "POST",
      body: JSON.stringify({
        email: normalizedEmail,
        password,
      }),
    });
    setApiToken(data.token);
    set({
      token: data.token,
      currentUser: data.teacher,
      isHydrated: true,
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Не удалось войти",
    };
  }
}

export const DEMO_CREDENTIALS = {
  email: "teacher@tanymtor.kz",
  password: DEMO_PASSWORD,
};

export const ADMIN_CREDENTIALS = {
  email: "admin@tanymtor.kz",
  password: ADMIN_PASSWORD,
};
