import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signUserToken, requireUser } from "../lib/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const { username, password, rememberMe } = req.body as {
    username: string;
    password: string;
    rememberMe?: boolean;
  };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username));

  if (!user) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  if (user.accountStatus === "Suspended") {
    res.status(401).json({ error: "Account suspended. Contact your administrator." });
    return;
  }

  const token = signUserToken(user.id, rememberMe ?? false);

  res.json({
    token,
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
      availableBalance: parseFloat(user.availableBalance ?? "0"),
      createdAt: user.createdAt,
    },
    isAdmin: false,
  });
});

router.post("/auth/logout", requireUser, async (_req, res): Promise<void> => {
  res.json({ message: "Logged out successfully" });
});

router.get("/auth/me", requireUser, async (req, res): Promise<void> => {
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

export default router;
