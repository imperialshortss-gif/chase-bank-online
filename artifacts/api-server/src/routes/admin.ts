import { Router } from "express";
import { Pool } from "pg";

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }

    const result = await pool.query(
      `SELECT id, username, role
       FROM admins
       WHERE username = $1 AND password = $2
       LIMIT 1`,
      [username, password],
    );

    const admin = result.rows[0];

    if (!admin) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    return res.json({
      token: `admin-${admin.id}`,
      user: null,
      isAdmin: true,
    });
  } catch (error) {
    console.error("Admin login failed:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

export default router;
