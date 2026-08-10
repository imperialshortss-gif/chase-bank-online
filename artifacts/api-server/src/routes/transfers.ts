import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable, transfersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireUser } from "../lib/auth";
import { generateTransactionRef } from "../lib/generateRef";

const router: IRouter = Router();

router.post("/transfers", requireUser, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: number }).userId;
  const { beneficiaryName, bankName, accountNumber, routingNumber, country, amount, reference } =
    req.body as {
      beneficiaryName: string;
      bankName: string;
      accountNumber: string;
      routingNumber: string;
      country: string;
      amount: number;
      reference?: string;
    };

  if (!beneficiaryName || !bankName || !accountNumber || !routingNumber || !country || !amount) {
    res.status(400).json({ error: "All beneficiary fields and amount are required" });
    return;
  }

  if (amount <= 0) {
    res.status(400).json({ error: "Amount must be positive" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const balance = parseFloat(user.availableBalance ?? "0");
  if (amount > balance) {
    res.status(400).json({ error: "Insufficient funds" });
    return;
  }

  const ref = generateTransactionRef();
  const newBalance = balance - amount;

  // Create transfer record
  const [transfer] = await db
    .insert(transfersTable)
    .values({
      userId,
      transactionReference: ref,
      beneficiaryName,
      bankName,
      accountNumber,
      routingNumber,
      country: country ?? "United States",
      amount: amount.toFixed(2),
      currency: "USD",
      reference: reference ?? null,
      status: "Processing",
      estimatedCompletion: "48 Hours",
    })
    .returning();

  // Create transaction record (debit)
  await db.insert(transactionsTable).values({
    userId,
    transactionReference: ref,
    beneficiaryName,
    bankName,
    accountNumber,
    routingNumber,
    amount: amount.toFixed(2),
    currency: "USD",
    debit: amount.toFixed(2),
    credit: "0.00",
    balanceAfter: newBalance.toFixed(2),
    description: `Transfer to ${beneficiaryName} at ${bankName}`,
    status: "Processing",
  });

  // Deduct balance
  await db
    .update(usersTable)
    .set({ availableBalance: newBalance.toFixed(2) })
    .where(eq(usersTable.id, userId));

  res.status(201).json({
    id: transfer.id,
    transactionReference: transfer.transactionReference,
    beneficiaryName: transfer.beneficiaryName,
    bankName: transfer.bankName,
    accountNumber: transfer.accountNumber,
    routingNumber: transfer.routingNumber,
    amount: parseFloat(transfer.amount),
    currency: transfer.currency,
    status: transfer.status,
    createdAt: transfer.createdAt,
    estimatedCompletion: transfer.estimatedCompletion,
  });
});

router.get("/transfers", requireUser, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: number }).userId;

  const transfers = await db
    .select()
    .from(transfersTable)
    .where(eq(transfersTable.userId, userId))
    .orderBy(sql`${transfersTable.createdAt} DESC`);

  res.json({
    transfers: transfers.map((t) => ({
      id: t.id,
      transactionReference: t.transactionReference,
      beneficiaryName: t.beneficiaryName,
      bankName: t.bankName,
      accountNumber: t.accountNumber,
      routingNumber: t.routingNumber,
      amount: parseFloat(t.amount),
      currency: t.currency,
      status: t.status,
      createdAt: t.createdAt,
      estimatedCompletion: t.estimatedCompletion,
    })),
    total: transfers.length,
  });
});

router.get("/transfers/:id/receipt", requireUser, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: number }).userId;
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [transfer] = await db
    .select()
    .from(transfersTable)
    .where(eq(transfersTable.id, id));

  if (!transfer || transfer.userId !== userId) {
    res.status(404).json({ error: "Transfer not found" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  res.json({
    transfer: {
      id: transfer.id,
      transactionReference: transfer.transactionReference,
      beneficiaryName: transfer.beneficiaryName,
      bankName: transfer.bankName,
      accountNumber: transfer.accountNumber,
      routingNumber: transfer.routingNumber,
      amount: parseFloat(transfer.amount),
      currency: transfer.currency,
      status: transfer.status,
      createdAt: transfer.createdAt,
      estimatedCompletion: transfer.estimatedCompletion,
    },
    senderName: user?.fullName ?? "",
    senderAccountNumber: user?.accountNumber ?? "",
  });
});

export default router;
