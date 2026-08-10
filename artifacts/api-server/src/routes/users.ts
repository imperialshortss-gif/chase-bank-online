import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, and, sql, gte } from "drizzle-orm";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();

router.get("/users/me", requireUser, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: number }).userId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    phone: user.phone,
    address: user.address,
    accountNumber: user.accountNumber,
    accountType: user.accountType,
    accountStatus: user.accountStatus,
    availableBalance: parseFloat(user.availableBalance ?? "0"),
    createdAt: user.createdAt,
  });
});

router.put("/users/me", requireUser, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: number }).userId;
  const { fullName, email, phone, address } = req.body as {
    fullName?: string;
    email?: string;
    phone?: string;
    address?: string;
  };

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (address !== undefined) updates.address = address;

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: updated.id,
    fullName: updated.fullName,
    username: updated.username,
    email: updated.email,
    phone: updated.phone,
    address: updated.address,
    accountNumber: updated.accountNumber,
    accountType: updated.accountType,
    accountStatus: updated.accountStatus,
    availableBalance: parseFloat(updated.availableBalance ?? "0"),
    createdAt: updated.createdAt,
  });
});

router.get("/users/me/dashboard", requireUser, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: number }).userId;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const monthlyTxns = await db
    .select()
    .from(transactionsTable)
    .where(and(eq(transactionsTable.userId, userId), gte(transactionsTable.createdAt, startOfMonth)));

  let monthlyDeposits = 0;
  let monthlyWithdrawals = 0;
  for (const t of monthlyTxns) {
    monthlyDeposits += parseFloat(t.credit ?? "0");
    monthlyWithdrawals += parseFloat(t.debit ?? "0");
  }

  const allTxns = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId));

  const totalTransactions = Number(allTxns[0]?.count ?? 0);

  const recentTxns = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .orderBy(sql`${transactionsTable.createdAt} DESC`)
    .limit(10);

  const userBalance = parseFloat(user.availableBalance ?? "0");

  res.json({
    user: {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      phone: user.phone,
      address: user.address,
      accountNumber: user.accountNumber,
      accountType: user.accountType,
      accountStatus: user.accountStatus,
      availableBalance: userBalance,
      createdAt: user.createdAt,
    },
    currentBalance: userBalance,
    monthlyDeposits,
    monthlyWithdrawals,
    totalTransactions,
    recentTransactions: recentTxns.map((t) => ({
      id: t.id,
      transactionReference: t.transactionReference,
      beneficiaryName: t.beneficiaryName,
      bankName: t.bankName,
      accountNumber: t.accountNumber,
      routingNumber: t.routingNumber,
      amount: parseFloat(t.amount),
      currency: t.currency,
      debit: parseFloat(t.debit ?? "0"),
      credit: parseFloat(t.credit ?? "0"),
      balanceAfter: parseFloat(t.balanceAfter),
      description: t.description,
      status: t.status,
      createdAt: t.createdAt,
    })),
  });
});

export default router;
