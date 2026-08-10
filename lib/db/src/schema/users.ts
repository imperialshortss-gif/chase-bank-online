import { pgTable, text, serial, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const accountStatusEnum = pgEnum("account_status", ["Active", "Suspended"]);
export const accountTypeEnum = pgEnum("account_type", ["Checking", "Savings", "Business", "Premium"]);

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  accountNumber: text("account_number").notNull().unique(),
  accountType: text("account_type").notNull().default("Checking"),
  accountStatus: text("account_status").notNull().default("Active"),
  availableBalance: numeric("available_balance", { precision: 20, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
