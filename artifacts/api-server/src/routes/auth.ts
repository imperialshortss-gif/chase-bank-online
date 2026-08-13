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
      `SELECT
        id,
        full_name,
        username,
        email,
        phone,
        address,
        account_number,
        account_type,
        account_status,
        available_balance,
        created_at,
        password
       FROM users
       WHERE username = $1
       LIMIT 1`,
      [username],
    );

    const user = result.rows[0];

    if (!user || user.password !== password) {
      return res.status(401).json({
        message: "Invalid credentials",
      });
    }

    return res.json({
      token: `user-${user.id}`,
      user: {
        id: user.id,
        fullName: user.full_name,
        username: user.username,
        email: user.email,
        phone: user.phone,
        address: user.address,
        accountNumber: user.account_number,
        accountType: user.account_type,
        accountStatus: user.account_status,
        availableBalance: Number(user.available_balance),
        createdAt: user.created_at,
      },
      isAdmin: false,
    });
  } catch (error) {
    console.error("Login failed:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

export default router;
