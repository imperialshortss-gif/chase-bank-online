import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { db, usersTable, adminsTable, transactionsTable, transfersTable } from "@workspace/db";
import { eq, and, or, ilike, sql } from "drizzle-orm";
import { signAdminToken, requireAdmin } from "../lib/auth";
import { generateTransactionRef, generateAccountNumber } from "../lib/generateRef";

const router: IRouter = Router();

// Admin login
router.post("/admin/login", async (req, res): Promise<void> => {
  const { username, password } = req.body as { username: string; password: string };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.username, username));

  if (!admin) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signAdminToken(admin.id);

  res.json({
    token,
    isAdmin: true,
    user: null,
  });
});

// Stats
router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable);
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.accountStatus === "Active").length;
  const suspendedUsers = users.filter((u) => u.accountStatus === "Suspended").length;

  const txns = await db.select().from(transactionsTable);
  let totalDeposits = 0;
  let totalWithdrawals = 0;
  for (const t of txns) {
    totalDeposits += parseFloat(t.credit ?? "0");
    totalWithdrawals += parseFloat(t.debit ?? "0");
  }

  const transfers = await db.select().from(transfersTable);
  const pendingTransfers = transfers.filter((t) => t.status === "Processing").length;
  const completedTransfers = transfers.filter((t) => t.status === "Completed").length;

  res.json({
    totalUsers,
    activeUsers,
    suspendedUsers,
    totalDeposits,
    totalWithdrawals,
    pendingTransfers,
    completedTransfers,
  });
});

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    fullName: u.fullName,
    username: u.username,
    email: u.email,
    phone: u.phone,
    address: u.address,
    accountNumber: u.accountNumber,
    accountType: u.accountType,
    accountStatus: u.accountStatus,
    availableBalance: parseFloat(u.availableBalance ?? "0"),
    createdAt: u.createdAt,
  };
}

// List users
router.get("/admin/users", requireAdmin, async (req, res): Promise<void> => {
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const limit = parseInt(String(req.query.limit ?? "20"), 10);
  const search = req.query.search as string | undefined;
  const offset = (page - 1) * limit;

  let query = db.select().from(usersTable);
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(usersTable);

  if (search) {
    const like = `%${search}%`;
    const condition = or(
      ilike(usersTable.fullName, like),
      ilike(usersTable.username, like),
      ilike(usersTable.accountNumber, like),
    );
    query = query.where(condition) as typeof query;
    countQuery = countQuery.where(condition) as typeof countQuery;
  }

  const [countResult] = await countQuery;
  const total = Number(countResult?.count ?? 0);
  const users = await query.limit(limit).offset(offset);

  res.json({
    users: users.map(formatUser),
    total,
    page,
    limit,
  });
});

// Create user
router.post("/admin/users", requireAdmin, async (req, res): Promise<void> => {
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
  } = req.body as {
    fullName: string;
    username: string;
    password: string;
    email?: string;
    phone?: string;
    address?: string;
    accountNumber?: string;
    accountType: string;
    accountStatus: string;
    availableBalance: number;
  };

  const hashed = await bcrypt.hash(password, 10);
  const acctNum = accountNumber || generateAccountNumber();

  const [user] = await db
    .insert(usersTable)
    .values({
      fullName,
      username,
      password: hashed,
      email: email ?? null,
      phone: phone ?? null,
      address: address ?? null,
      accountNumber: acctNum,
      accountType: accountType ?? "Checking",
      accountStatus: accountStatus ?? "Active",
      availableBalance: (availableBalance ?? 0).toFixed(2),
    })
    .returning();

  res.status(201).json(formatUser(user));
});

// Get single user
router.get("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

// Update user
router.put("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const { fullName, email, phone, address, accountType, accountStatus } = req.body as {
    fullName?: string;
    email?: string;
    phone?: string;
    address?: string;
    accountType?: string;
    accountStatus?: string;
  };

  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (address !== undefined) updates.address = address;
  if (accountType !== undefined) updates.accountType = accountType;
  if (accountStatus !== undefined) updates.accountStatus = accountStatus;

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

// Delete user
router.delete("/admin/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.json({ message: "User deleted successfully" });
});

// Update status
router.put("/admin/users/:id/status", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const { status } = req.body as { status: "Active" | "Suspended" };

  const [user] = await db
    .update(usersTable)
    .set({ accountStatus: status })
    .where(eq(usersTable.id, id))
    .returning();

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

// Update balance
router.put("/admin/users/:id/balance", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const { action, amount } = req.body as { action: "set" | "increase" | "decrease"; amount: number };

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const current = parseFloat(user.availableBalance ?? "0");
  let newBalance: number;
  if (action === "set") {
    newBalance = amount;
  } else if (action === "increase") {
    newBalance = current + amount;
  } else {
    newBalance = Math.max(0, current - amount);
  }

  const [updated] = await db
    .update(usersTable)
    .set({ availableBalance: newBalance.toFixed(2) })
    .where(eq(usersTable.id, id))
    .returning();

  res.json(formatUser(updated));
});

// Add transaction for user
router.post("/admin/users/:id/transactions", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const { type, amount, description, transactionDate } = req.body as {
    type: "deposit" | "withdrawal" | "debit" | "credit";
    amount: number;
    description?: string;
    transactionDate?: string;
  };

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const balance = parseFloat(user.availableBalance ?? "0");
  let newBalance = balance;
  let debit = 0;
  let credit = 0;

  if (type === "deposit" || type === "credit") {
    credit = amount;
    newBalance = balance + amount;
  } else {
    debit = amount;
    newBalance = Math.max(0, balance - amount);
  }

  const ref = generateTransactionRef();

  const [txn] = await db
    .insert(transactionsTable)
    .values({
      userId: id,
      transactionReference: ref,
      amount: amount.toFixed(2),
      currency: "USD",
      debit: debit.toFixed(2),
      credit: credit.toFixed(2),
      balanceAfter: newBalance.toFixed(2),
      description: description ?? `Admin ${type}`,
      status: "Completed",
      ...(transactionDate ? { createdAt: new Date(transactionDate) } : {}),
    })
    .returning();

  await db
    .update(usersTable)
    .set({ availableBalance: newBalance.toFixed(2) })
    .where(eq(usersTable.id, id));

  res.status(201).json({
    id: txn.id,
    transactionReference: txn.transactionReference,
    beneficiaryName: txn.beneficiaryName,
    bankName: txn.bankName,
    accountNumber: txn.accountNumber,
    routingNumber: txn.routingNumber,
    amount: parseFloat(txn.amount),
    currency: txn.currency,
    debit: parseFloat(txn.debit ?? "0"),
    credit: parseFloat(txn.credit ?? "0"),
    balanceAfter: parseFloat(txn.balanceAfter),
    description: txn.description,
    status: txn.status,
    createdAt: txn.createdAt,
  });
});

// Get user transactions
router.get("/admin/users/:id/transactions/list", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);

  const txns = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, id))
    .orderBy(sql`${transactionsTable.createdAt} DESC`);

  res.json({
    transactions: txns.map((t) => ({
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
    total: txns.length,
    page: 1,
    limit: txns.length,
  });
});

// List all transfers (admin)
router.get("/admin/transfers", requireAdmin, async (req, res): Promise<void> => {
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  let query = db
    .select({
      transfer: transfersTable,
      user: { fullName: usersTable.fullName, accountNumber: usersTable.accountNumber },
    })
    .from(transfersTable)
    .leftJoin(usersTable, eq(transfersTable.userId, usersTable.id));

  const conditions = [];
  if (status) {
    conditions.push(eq(transfersTable.status, status));
  }
  if (search) {
    const like = `%${search}%`;
    conditions.push(
      or(
        ilike(usersTable.accountNumber, like),
        ilike(transfersTable.transactionReference, like),
        ilike(transfersTable.beneficiaryName, like),
      ),
    );
  }

  if (conditions.length === 1) {
    query = query.where(conditions[0]) as typeof query;
  } else if (conditions.length > 1) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const results = await query.orderBy(sql`${transfersTable.createdAt} DESC`);

  res.json({
    transfers: results.map(({ transfer: t, user: u }) => ({
      id: t.id,
      transactionReference: t.transactionReference,
      userId: t.userId,
      userName: u?.fullName ?? "",
      userAccountNumber: u?.accountNumber ?? "",
      beneficiaryName: t.beneficiaryName,
      bankName: t.bankName,
      accountNumber: t.accountNumber,
      routingNumber: t.routingNumber,
      amount: parseFloat(t.amount),
      currency: t.currency,
      status: t.status,
      reference: t.reference,
      createdAt: t.createdAt,
    })),
    total: results.length,
  });
});

// Update transfer status
router.put("/admin/transfers/:id/status", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId, 10);
  const { status } = req.body as { status: "Completed" | "Cancelled" };

  const [transfer] = await db
    .update(transfersTable)
    .set({ status })
    .where(eq(transfersTable.id, id))
    .returning();

  if (!transfer) {
    res.status(404).json({ error: "Transfer not found" });
    return;
  }

  // Update corresponding transaction status too
  await db
    .update(transactionsTable)
    .set({ status })
    .where(eq(transactionsTable.transactionReference, transfer.transactionReference));

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, transfer.userId));

  res.json({
    id: transfer.id,
    transactionReference: transfer.transactionReference,
    userId: transfer.userId,
    userName: user?.fullName ?? "",
    userAccountNumber: user?.accountNumber ?? "",
    beneficiaryName: transfer.beneficiaryName,
    bankName: transfer.bankName,
    accountNumber: transfer.accountNumber,
    routingNumber: transfer.routingNumber,
    amount: parseFloat(transfer.amount),
    currency: transfer.currency,
    status: transfer.status,
    reference: transfer.reference,
    createdAt: transfer.createdAt,
  });
});

export default router;
