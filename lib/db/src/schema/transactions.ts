import { pgTable, text, serial, numeric, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  transactionReference: text("transaction_reference").notNull().unique(),
  beneficiaryName: text("beneficiary_name"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  routingNumber: text("routing_number"),
  amount: numeric("amount", { precision: 20, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  debit: numeric("debit", { precision: 20, scale: 2 }).default("0.00"),
  credit: numeric("credit", { precision: 20, scale: 2 }).default("0.00"),
  balanceAfter: numeric("balance_after", { precision: 20, scale: 2 }).notNull(),
  description: text("description"),
  status: text("status").notNull().default("Completed"),
  transactionDate: timestamp("transaction_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
