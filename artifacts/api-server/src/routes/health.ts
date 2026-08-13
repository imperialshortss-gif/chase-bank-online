import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

router.get("/", (_req: any, res: any) => {
  res.json({
    status: "ok",
    message: "Chase Bank API is running",
  });
});

router.get("/db", async (_req: any, res: any) => {
  try {
    const result = await pool.query("SELECT NOW() AS time");

    res.json({
      status: "ok",
      database: "connected",
      time: result.rows[0].time,
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

export default router;