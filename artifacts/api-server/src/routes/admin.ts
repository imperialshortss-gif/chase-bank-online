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

/**
 * Update user balance
 */
router.put("/users/:id/balance", async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const { action, amount } = req.body;

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (!["set", "increase", "decrease"].includes(action)) {
      return res.status(400).json({ message: "Invalid balance action" });
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      return res.status(400).json({ message: "Invalid balance amount" });
    }

    const userResult = await pool.query(
      `SELECT available_balance
       FROM users
       WHERE id = $1`,
      [userId],
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const currentBalance = Number(userResult.rows[0].available_balance);

    let newBalance: number;

    if (action === "set") {
      newBalance = numericAmount;
    } else if (action === "increase") {
      newBalance = currentBalance + numericAmount;
    } else {
      newBalance = currentBalance - numericAmount;
    }

    if (newBalance < 0) {
      return res.status(400).json({
        message: "Insufficient balance for this deduction",
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET available_balance = $1
       WHERE id = $2
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
      [newBalance, userId],
    );

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("Update user balance failed:", error);

    return res.status(500).json({
      message: "Failed to update user balance",
    });
  }
});

/**
 * Add a manual debit/credit transaction for a user
 */
router.post("/users/:id/transactions", async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = Number(req.params.id);
    const { type, amount, description, transactionDate } = req.body;

    if (!Number.isInteger(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    if (!["debit", "credit"].includes(type)) {
      return res.status(400).json({
        message: "Transaction type must be debit or credit",
      });
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        message: "Invalid transaction amount",
      });
    }

    if (!description || !String(description).trim()) {
      return res.status(400).json({
        message: "Transaction description is required",
      });
    }

    const selectedDate = transactionDate
      ? new Date(`${transactionDate}T00:00:00`)
      : new Date();

    if (Number.isNaN(selectedDate.getTime())) {
      return res.status(400).json({
        message: "Invalid transaction date",
      });
    }

    await client.query("BEGIN");

    const userResult = await client.query(
      `SELECT id, available_balance
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId],
    );

    const user = userResult.rows[0];

    if (!user) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "User not found" });
    }

    const currentBalance = Number(user.available_balance);

    const newBalance =
      type === "credit"
        ? currentBalance + numericAmount
        : currentBalance - numericAmount;

    if (newBalance < 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Insufficient available balance for this debit",
      });
    }

    const transactionReference = `ADMIN-${Date.now()}-${Math.floor(
      Math.random() * 100000,
    )}`;

    const debitAmount = type === "debit" ? numericAmount : 0;
    const creditAmount = type === "credit" ? numericAmount : 0;

    const transactionResult = await client.query(
      `INSERT INTO transactions (
        user_id,
        transaction_reference,
        beneficiary_name,
        bank_name,
        account_number,
        routing_number,
        amount,
        currency,
        debit,
        credit,
        balance_after,
        description,
        status,
        transaction_date
      )
      VALUES (
        $1, $2, NULL, NULL, NULL, NULL, $3, 'USD',
        $4, $5, $6, $7, 'Completed', $8
      )
      RETURNING
        id,
        transaction_reference,
        amount,
        currency,
        debit,
        credit,
        balance_after,
        description,
        status,
        transaction_date`,
      [
        userId,
        transactionReference,
        numericAmount,
        debitAmount,
        creditAmount,
        newBalance,
        String(description).trim(),
        selectedDate,
      ],
    );

    await client.query(
      `UPDATE users
       SET available_balance = $1
       WHERE id = $2`,
      [newBalance, userId],
    );

    await client.query("COMMIT");

    const transaction = transactionResult.rows[0];

    return res.status(201).json({
      id: transaction.id,
      transactionReference: transaction.transaction_reference,
      amount: Number(transaction.amount),
      currency: transaction.currency,
      debit: Number(transaction.debit),
      credit: Number(transaction.credit),
      balanceAfter: Number(transaction.balance_after),
      description: transaction.description,
      status: transaction.status,
      transactionDate: transaction.transaction_date,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Add admin transaction failed:", error);

    return res.status(500).json({
      message: "Failed to add transaction",
    });
  } finally {
    client.release();
  }
});

