import express from "express";
import cors from "cors";
import healthRouter from "./routes/health.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req: any, res: any) => {
  res.json({
    status: "ok",
    message: "Chase Bank API is running",
  });
});

app.use("/api/health", healthRouter);

export default app;