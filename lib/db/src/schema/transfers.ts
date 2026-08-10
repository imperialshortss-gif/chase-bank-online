import { pgTable, text, serial, numeric, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const transfersTable = pgTable("transfers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  transactionReference: text("transaction_reference").notNull().unique(),
  beneficiaryName: text("beneficiary_name").notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  routingNumber: text("routing_number").notNull(),
  country: text("country").notNull().default("United States"),
  amount: numeric("amount", { precision: 20, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  reference: text("reference"),
  status: text("status").notNull().default("Processing"),
  estimatedCompletion: text("estimated_completion").notNull().default("48 Hours"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTransferSchema = createInsertSchema(transfersTable).omit({ id: true, createdAt: true });
export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type Transfer = typeof transfersTable.$inferSelect;
