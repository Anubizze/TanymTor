import type { CookieOptions, NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export type UserRole = "teacher" | "admin";
export type AccountStatus = "pending" | "approved" | "rejected";

export interface AuthTeacher {
  id: string;
  email: string;
  name: string;
  school?: string | null;
  role: UserRole;
  status: AccountStatus;
}

export interface AuthedRequest extends Request {
  teacher?: AuthTeacher;
}

export const AUTH_COOKIE = "tanymtor_token";

function secret(): string {
  const value = process.env.JWT_SECRET;
  if (!value) {
    throw new Error("Не задан JWT_SECRET. Добавьте его в backend/.env");
  }
  return value;
}

const cookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export function signToken(teacher: AuthTeacher): string {
  return jwt.sign(
    {
      id: teacher.id,
      email: teacher.email,
      name: teacher.name,
      school: teacher.school ?? null,
      role: teacher.role,
      status: teacher.status,
    },
    secret(),
    { expiresIn: "7d" }
  );
}

export function attachSession(res: Response, teacher: AuthTeacher): string {
  const token = signToken(teacher);
  res.cookie(AUTH_COOKIE, token, cookieOptions);
  return token;
}

export function clearSession(res: Response): void {
  res.clearCookie(AUTH_COOKIE, { path: "/" });
}

function tokenFromRequest(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);

  const raw = req.headers.cookie ?? "";
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === AUTH_COOKIE) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): void {
  const token = tokenFromRequest(req);

  if (!token) {
    res.status(401).json({ error: "Нужно войти в аккаунт" });
    return;
  }

  try {
    const payload = jwt.verify(token, secret()) as AuthTeacher & {
      role?: UserRole;
      status?: AccountStatus;
    };
    req.teacher = {
      id: payload.id,
      email: payload.email,
      name: payload.name,
      school: payload.school ?? null,
      role: payload.role ?? "teacher",
      status: payload.status ?? "approved",
    };
    next();
  } catch {
    res.status(401).json({ error: "Сессия истекла, войдите снова" });
  }
}

export function requireTeacher(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): void {
  requireAuth(req, res, () => {
    const user = req.teacher;
    if (!user) return;
    if (user.role === "admin") {
      res.status(403).json({ error: "Админ работает в /admin, не в журнале учителя" });
      return;
    }
    if (user.status !== "approved") {
      res.status(403).json({ error: "Аккаунт ещё не одобрен администратором" });
      return;
    }
    next();
  });
}

export function requireAdmin(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): void {
  requireAuth(req, res, () => {
    const user = req.teacher;
    if (!user) return;
    if (user.role !== "admin") {
      res.status(403).json({ error: "Нужны права администратора" });
      return;
    }
    next();
  });
}

export function publicTeacher(teacher: {
  id: string;
  email: string;
  name: string;
  school: string | null;
  role?: string | null;
  status?: string | null;
}): AuthTeacher {
  return {
    id: teacher.id,
    email: teacher.email,
    name: teacher.name,
    school: teacher.school,
    role: teacher.role === "admin" ? "admin" : "teacher",
    status:
      teacher.status === "pending" || teacher.status === "rejected"
        ? teacher.status
        : "approved",
  };
}
