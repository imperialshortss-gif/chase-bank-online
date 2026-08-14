import { Router, type Request } from "express";
import { Pool } from "pg";

const router = Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function getUserId(req: Request): number | null {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return null;
  }

  const token = authorization.replace(/^Bearer\s+/i, "");

  if (!token.startsWith("user-")) {
    return null;
  }

  const userId = Number(token.replace("user-", ""));

  if (!Number.isInteger(userId) || userId <= 0) {
    return null;
  }

  return userId;
}

router.post("/", async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const {
      beneficiaryName,
      bankName,
      accountNumber,
      routingNumber,
      country,
      amount,
      reference,
      transferDate,
    } = req.body;

    if (
      !beneficiaryName ||
      !bankName ||
      !accountNumber ||
      !routingNumber ||
      !country ||
      amount === undefined
    ) {
      return res.status(400).json({
        message: "All required transfer details are required",
      });
    }

    const transferAmount = Number(amount);

    if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
      return res.status(400).json({
        message: "Invalid transfer amount",
      });
    }

    const selectedTransferDate = transferDate
      ? new Date(`${transferDate}T00:00:00`)
      : new Date();

    if (Number.isNaN(selectedTransferDate.getTime())) {
      return res.status(400).json({
        message: "Invalid transfer date",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedTransferDate < today) {
      return res.status(400).json({
        message: "Transfer date cannot be in the past",
      });
    }

    await client.query("BEGIN");

    const userResult = await client.query(
      `SELECT
        id,
        full_name,
        account_number,
        available_balance
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId],
    );

    const user = userResult.rows[0];

    if (!user) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "User not found",
      });
    }

    const currentBalance = Number(user.available_balance);

    if (currentBalance < transferAmount) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Insufficient available balance",
      });
    }

    const newBalance = currentBalance - transferAmount;

    const transactionReference = `TRX-${Date.now()}-${Math.floor(
      Math.random() * 100000,
    )}`;

    const transferResult = await client.query(
      `INSERT INTO transfers (
        user_id,
        transaction_reference,
        beneficiary_name,
        bank_name,
        account_number,
        routing_number,
        country,
        amount,
        currency,
        status,
        reference,
        transfer_date
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'USD', 'Processing', $9, $10)
      RETURNING
        id,
        transaction_reference,
        beneficiary_name,
        bank_name,
        account_number,
        routing_number,
        amount,
        currency,
        status,
        created_at,
        estimated_completion`,
      [
        userId,
        transactionReference,
        beneficiaryName,
        bankName,
        accountNumber,
        routingNumber,
        country,
        transferAmount,
        reference ?? null,
        selectedTransferDate,
      ],
    );

    const transfer = transferResult.rows[0];

    await client.query(
      `UPDATE users
       SET available_balance = $1
       WHERE id = $2`,
      [newBalance, userId],
    );

    await client.query(
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
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        'USD',
        $7,
        0,
        $8,
        $9,
        'Processing'
      )`,
      [
        userId,
        transactionReference,
        beneficiaryName,
        bankName,
        accountNumber,
        routingNumber,
        transferAmount,
        newBalance,
        reference || `Transfer to ${beneficiaryName}`,
      ],
    );

    await client.query("COMMIT");

    return res.status(201).json({
      id: transfer.id,
      transactionReference: transfer.transaction_reference,
      beneficiaryName: transfer.beneficiary_name,
      bankName: transfer.bank_name,
      accountNumber: transfer.account_number,
      routingNumber: transfer.routing_number,
      amount: Number(transfer.amount),
      currency: transfer.currency,
      status: transfer.status,
      createdAt: transfer.created_at,
      estimatedCompletion: transfer.estimated_completion,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Transfer submission failed:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
});

router.get("/", async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const result = await pool.query(
      `SELECT
        id,
        transaction_reference,
        beneficiary_name,
        bank_name,
        account_number,
        routing_number,
        amount,
        currency,
        status,
        created_at,
        estimated_completion
       FROM transfers
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId],
    );

    return res.json({
      transfers: result.rows.map((transfer) => ({
        id: transfer.id,
        transactionReference: transfer.transaction_reference,
        beneficiaryName: transfer.beneficiary_name,
        bankName: transfer.bank_name,
        accountNumber: transfer.account_number,
        routingNumber: transfer.routing_number,
        amount: Number(transfer.amount),
        currency: transfer.currency,
        status: transfer.status,
        createdAt: transfer.created_at,
        estimatedCompletion: transfer.estimated_completion,
      })),
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Get transfers failed:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

router.get("/:id/receipt", async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    const transferId = Number(req.params.id);

    if (!Number.isInteger(transferId) || transferId <= 0) {
      return res.status(400).json({
        message: "Invalid transfer ID",
      });
    }

    const result = await pool.query(
      `SELECT
        t.id,
        t.transaction_reference,
        t.beneficiary_name,
        t.bank_name,
        t.account_number,
        t.routing_number,
        t.amount,
        t.currency,
        t.status,
        t.created_at,
        t.estimated_completion,
        u.full_name,
        u.account_number AS sender_account_number
       FROM transfers t
       JOIN users u ON u.id = t.user_id
       WHERE t.id = $1 AND t.user_id = $2
       LIMIT 1`,
      [transferId, userId],
    );

    const transfer = result.rows[0];

    if (!transfer) {
      return res.status(404).json({
        message: "Transfer not found",
      });
    }

    return res.json({
      transfer: {
        id: transfer.id,
        transactionReference: transfer.transaction_reference,
        beneficiaryName: transfer.beneficiary_name,
        bankName: transfer.bank_name,
        accountNumber: transfer.account_number,
        routingNumber: transfer.routing_number,
        amount: Number(transfer.amount),
        currency: transfer.currency,
        status: transfer.status,
        createdAt: transfer.created_at,
        estimatedCompletion: transfer.estimated_completion,
      },
      senderName: transfer.full_name,
      senderAccountNumber: transfer.sender_account_number,
    });
  } catch (error) {
    console.error("Get transfer receipt failed:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
});

export default router;
