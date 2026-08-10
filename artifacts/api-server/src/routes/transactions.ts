import { Router, type IRouter } from "express";
import { db, transactionsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireUser } from "../lib/auth";

const router: IRouter = Router();

router.get("/transactions", requireUser, async (req, res): Promise<void> => {
  const userId = (req as typeof req & { userId: number }).userId;
  const page = parseInt(String(req.query.page ?? "1"), 10);
  const limit = parseInt(String(req.query.limit ?? "20"), 10);
  const status = req.query.status as string | undefined;
  const offset = (page - 1) * limit;

  const conditions = [eq(transactionsTable.userId, userId)];
  if (status) {
    conditions.push(eq(transactionsTable.status, status));
  }

  const where = conditions.length > 1 ? and(...conditions) : conditions[0];

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactionsTable)
    .where(where);

  const total = Number(countResult?.count ?? 0);

  const txns = await db
    .select()
    .from(transactionsTable)
    .where(where)
    .orderBy(sql`${transactionsTable.createdAt} DESC`)
    .limit(limit)
    .offset(offset);

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
    total,
    page,
    limit,
  });
});

export default router;
