import "dotenv/config";
import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { seedDemoInterventions } from "./data/seed-interventions";
import { ensureSchema } from "./db/client";
import { seedAll } from "./db/seed";
import { requireAdmin, requireTeacher } from "./middleware/auth";
import { adminRouter } from "./routes/admin";
import { authRouter } from "./routes/auth";
import { classroomRouter } from "./routes/classroom";
import { interventionsRouter } from "./routes/interventions";
import { signalsRouter } from "./routes/signals";
import { loadAnalysis } from "./services/analysis";

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "tanymtor-backend" });
});

app.use("/api/auth", authRouter);
app.use("/api/admin", requireAdmin, adminRouter);
app.use("/api/classroom", requireTeacher, classroomRouter);
app.use("/api/signals", requireTeacher, signalsRouter);
app.use("/api/interventions", requireTeacher, interventionsRouter);

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error);
  res.status(500).json({ error: error.message });
});

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(label: string, fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const code = (error as { code?: string }).code;
      if (code !== "53300") throw error;
      console.warn(
        `${label}: Postgres переполнен соединениями, повтор ${attempt}/8`
      );
      await wait(1500 * attempt);
    }
  }
  throw lastError;
}

async function start() {
  app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
  });

  try {
    await withRetry("ensureSchema", ensureSchema);
    const seed = await withRetry("seed", () => seedAll());
    console.log(
      seed.seeded
        ? `База заполнена: классов ${seed.classCount}, уроков ${seed.lessonCount}, оценок ${seed.gradeCount}`
        : `Классов в базе: ${seed.classCount}, уроков: ${seed.lessonCount}, оценок: ${seed.gradeCount}`
    );

    const snapshot = await loadAnalysis();
    await seedDemoInterventions(snapshot.grades);
    console.log(`Grade source: ${snapshot.source.name}`);
  } catch (error) {
    console.error("Не удалось подключить базу:", error);
  }
}

start().catch((error) => {
  console.error("Не удалось запустить сервер:", error);
  process.exit(1);
});
