import { Router } from "express";
import { Pool } from "pg";

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Admin login
 */
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

/**
 * Get admin users
 *
 * GET /api/admin/users
 * GET /api/admin/users?search=john
 * GET /api/admin/users?page=1&limit=20
 * GET /api/admin/users?search=john&page=1&limit=20
 */
router.get("/users", async (req, res) => {
  try {
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";

    const pageParam =
      typeof req.query.page === "string" ? parseInt(req.query.page, 10) : 1;

    const limitParam =
      typeof req.query.limit === "string"
        ? parseInt(req.query.limit, 10)
        : 20;

    const page =
      Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

    const limit =
      Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 100
        ? limitParam
        : 20;

    const offset = (page - 1) * limit;

    const searchPattern = `%${search}%`;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM users
       WHERE
         $1 = ''
         OR full_name ILIKE $2
         OR username ILIKE $2
         OR email ILIKE $2
         OR phone ILIKE $2
         OR account_number ILIKE $2`,
      [search, searchPattern],
    );

    const total = countResult.rows[0]?.total ?? 0;

    const result = await pool.query(
      `SELECT
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
         created_at AS "createdAt"
       FROM users
       WHERE
         $1 = ''
         OR full_name ILIKE $2
         OR username ILIKE $2
         OR email ILIKE $2
         OR phone ILIKE $2
         OR account_number ILIKE $2
       ORDER BY created_at DESC
       LIMIT $3
       OFFSET $4`,
      [search, searchPattern, limit, offset],
    );

    return res.json({
      users: result.rows,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("Get admin users failed:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

/**
 * Create user
 */
router.post("/users", async (req, res) => {
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

    if (
      !fullName ||
      !username ||
      !password ||
      !accountType ||
      !accountStatus ||
      availableBalance === undefined
    ) {
      return res.status(400).json({
        message: "Required user fields are missing",
      });
    }

    const generatedAccountNumber =
      accountNumber ||
      `ACCT${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const result = await pool.query(
      `INSERT INTO users
        (
          full_name,
          username,
          password,
          email,
          phone,
          address,
          account_number,
          account_type,
          account_status,
          available_balance
        )
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
        generatedAccountNumber,
        accountType,
        accountStatus,
        availableBalance,
      ],
    );

    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Create admin user failed:", error);

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