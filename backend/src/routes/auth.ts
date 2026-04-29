import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db } from "../db/client";

const router = Router();

interface UserRow { id: string; username: string; password: string; }

const RegisterSchema = z.object({
  username: z.string().min(2).max(30).regex(/^\S+$/, "No spaces allowed"),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string(),
});

function signToken(id: string, username: string) {
  return jwt.sign({ id, username }, process.env.JWT_SECRET!, {
    expiresIn: "7d",
  } as jwt.SignOptions);
}

router.post("/register", async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { username, password } = parsed.data;

  const existing = await db.query<{ id: string }>(
    "SELECT id FROM users WHERE username = $1",
    [username]
  );
  if (existing.rows.length > 0) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  const result = await db.query<UserRow>(
    "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username",
    [username, hash]
  );
  const user = result.rows[0];
  res.status(201).json({ token: signToken(user.id, user.username), user });
});

router.post("/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { username, password } = parsed.data;

  const result = await db.query<UserRow>(
    "SELECT id, username, password FROM users WHERE username = $1",
    [username]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const { password: _pw, ...safeUser } = user;
  res.json({ token: signToken(user.id, user.username), user: safeUser });
});

router.get("/me", async (req, res) => {
  res.json({ user: req.user });
});

export default router;
