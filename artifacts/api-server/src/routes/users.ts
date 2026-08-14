import { Router } from "express";
import { Pool } from "pg";

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

router.get("/me/dashboard", async (req, res) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const token = authorization.replace(/^Bearer\s+/i, "");

    if (!token.startsWith("user-")) {
      return res.status(401).json({
        message: "Invalid authentication token",
      });
    }

    const userId = Number(token.replace("user-", ""));

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        message: "Invalid authentication token",
      });
    }

    const userResult = await pool.query(
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
        created_at
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId],
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const transactionsResult = await pool.query(
      `SELECT
        id,
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
       FROM transactions
       WHERE user_id = $1
       ORDER BY transaction_date DESC
       LIMIT 5`,
      [userId],
    );

    const totalsResult = await pool.query(
      `SELECT
        COUNT(*)::int AS total_transactions,
        COALESCE(SUM(
          CASE
            WHEN credit IS NOT NULL
              AND transaction_date >= date_trunc('month', CURRENT_DATE)
            THEN credit
            ELSE 0
          END
        ), 0) AS monthly_deposits,
        COALESCE(SUM(
          CASE
            WHEN debit IS NOT NULL
              AND transaction_date >= date_trunc('month', CURRENT_DATE)
            THEN debit
            ELSE 0
          END
        ), 0) AS monthly_withdrawals
       FROM transactions
       WHERE user_id = $1`,
      [userId],
    );

    const totals = totalsResult.rows[0];

    return res.json({
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
      currentBalance: Number(user.available_balance),
      monthlyDeposits: Number(totals.monthly_deposits),
      monthlyWithdrawals: Number(totals.monthly_withdrawals),
      totalTransactions: Number(totals.total_transactions),
      recentTransactions: transactionsResult.rows.map((txn) => ({
        id: txn.id,
        transactionReference: txn.transaction_reference,
        beneficiaryName: txn.beneficiary_name,
        bankName: txn.bank_name,
        accountNumber: txn.account_number,
        routingNumber: txn.routing_number,
        amount: Number(txn.amount),
        currency: txn.currency,
        debit: txn.debit === null ? undefined : Number(txn.debit),
        credit: txn.credit === null ? undefined : Number(txn.credit),
        balanceAfter: Number(txn.balance_after),
        description: txn.description,
        status: txn.status,
        transactionDate: txn.transaction_date,
      })),
    });
  } catch (error) {
    console.error("Dashboard request failed:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

export default router;
