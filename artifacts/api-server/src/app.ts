import express from "express";
import cors from "cors";
import dbHealth from "./routes/health.js";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(express.json());

app.use("/api/health", dbHealth);

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    message: "Chase Bank API is running"
  });
});

export default app;
