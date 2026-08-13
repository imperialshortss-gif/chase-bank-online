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

router.post("/user", async (req, res) => {
  try {
    const {
      fullName,
      username,
      password,
      email,
      phone,
      address,
      accountNumber,
      accountType,
      accountStatus,
      availableBalance,
    } = req.body;

    if (!fullName || !username || !password || !accountNumber) {
      return res.status(400).json({
        message:
          "Full name, username, password, and account number are required",
      });
    }

    const result = await pool.query(
      `INSERT INTO users
        (full_name, username, password, email, phone, address,
         account_number, account_type, account_status, available_balance)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING
         id,
         full_name AS "fullName",
         username,
         email,
         phone,
         address,
         account_number AS "accountNumber",
         account_type AS "accountType",
         account_status AS "accountStatus",
         available_balance AS "availableBalance",
         created_at AS "createdAt"`,
      [
        fullName,
        username,
        password,
        email || null,
        phone || null,
        address || null,
        accountNumber,
        accountType || "Checking",
        accountStatus || "Active",
        availableBalance || 0,
      ],
    );

    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Create user failed:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Username or account number already exists",
      });
    }

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

export default router;
