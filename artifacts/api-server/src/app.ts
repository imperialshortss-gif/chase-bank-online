import express from "express";
import cors from "cors";
import healthRouter from "./routes/health.js";
import authRouter from "./routes/auth.js";
import adminRouter from "./routes/admin.js";
import usersRouter from "./routes/users.js";
import transfersRouter from "./routes/transfers.js";
import { Pool } from "pg";
const app = express();

const migrationPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

migrationPool
  .query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_notice TEXT`)
  .catch((error) => console.error("Custom notice migration failed:", error));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/users", usersRouter);
app.use("/api/transfers", transfersRouter);

export default app;
