import { Router, type Request, type Response } from "express";
import { pool } from "../db.js";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    message: "Chase Bank API is running",
  });
});

router.get("/db", async (_req: Request, res: Response) => {
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