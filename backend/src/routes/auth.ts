import bcrypt from "bcryptjs";
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { teachers } from "../db/schema";
import {
  attachSession,
  clearSession,
  publicTeacher,
  requireAuth,
  type AuthedRequest,
} from "../middleware/auth";

export const authRouter = Router();

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

authRouter.post("/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password ?? "");

    if (!validateEmail(email) || !password) {
      res.status(400).json({ error: "Введите email и пароль" });
      return;
    }

    const [user] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.email, email))
      .limit(1);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Неверный email или пароль" });
      return;
    }

    if (user.role === "admin") {
      res.status(403).json({
        error: "Это админ-аккаунт. Войдите через админку: /admin/login",
      });
      return;
    }

    if (user.status === "pending") {
      res.status(403).json({
        error: "Аккаунт ждёт одобрения администратора. Зайдите позже.",
      });
      return;
    }

    if (user.status === "rejected") {
      res.status(403).json({
        error: "Заявку отклонили. Напишите администратору школы.",
      });
      return;
    }

    const teacher = publicTeacher(user);
    const token = attachSession(res, teacher);
    res.json({ token, teacher });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/admin/login", async (req, res, next) => {
  try {
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password ?? "");

    if (!validateEmail(email) || !password) {
      res.status(400).json({ error: "Введите email и пароль" });
      return;
    }

    const [user] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.email, email))
      .limit(1);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      res.status(401).json({ error: "Неверный email или пароль" });
      return;
    }

    if (user.role !== "admin") {
      res.status(403).json({
        error: "Это не админ. Учителя входят на обычной странице входа.",
      });
      return;
    }

    const teacher = publicTeacher(user);
    const token = attachSession(res, teacher);
    res.json({ token, teacher });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const name = String(req.body?.name ?? "").trim();
    const email = String(req.body?.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(req.body?.password ?? "");
    const school = String(req.body?.school ?? "").trim() || null;

    if (name.length < 2) {
      res.status(400).json({ error: "Введите имя (минимум 2 символа)" });
      return;
    }
    if (!validateEmail(email)) {
      res.status(400).json({ error: "Введите корректный email" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "Пароль должен содержать минимум 6 символов" });
      return;
    }

    const [existing] = await db
      .select({ id: teachers.id })
      .from(teachers)
      .where(eq(teachers.email, email))
      .limit(1);

    if (existing) {
      res.status(409).json({ error: "Пользователь с таким email уже существует" });
      return;
    }

    await db.insert(teachers).values({
      id: `teacher-${Date.now()}`,
      email,
      name,
      school,
      passwordHash: await bcrypt.hash(password, 10),
      role: "teacher",
      status: "pending",
    });

    res.status(201).json({
      pending: true,
      message:
        "Заявка отправлена. Администратор одобрит аккаунт — после этого можно войти.",
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const [user] = await db
      .select()
      .from(teachers)
      .where(eq(teachers.id, req.teacher!.id))
      .limit(1);

    if (!user) {
      clearSession(res);
      res.status(401).json({ error: "Нужно войти в аккаунт" });
      return;
    }

    if (user.role !== "admin" && user.status !== "approved") {
      clearSession(res);
      res.status(401).json({ error: "Аккаунт ещё не одобрен администратором" });
      return;
    }

    res.json({ teacher: publicTeacher(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});
