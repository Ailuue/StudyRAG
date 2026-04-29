import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db } from "../db/client";

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(100),
  password: z.string().min(8),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function signToken(id: string, email: string) {
  return jwt.sign({ id, email }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  });
}

router.post("/register", async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, name, password } = parsed.data;

  const existing = await db.query("SELECT id FROM users WHERE email = $1", [email]);
  if (existing.rows.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const hash = await bcrypt.hash(password, 12);
  const result = await db.query(
    "INSERT INTO users (email, name, password) VALUES ($1, $2, $3) RETURNING id, email, name",
    [email, name, hash]
  );
  const user = result.rows[0];
  res.status(201).json({ token: signToken(user.id, user.email), user });
});

router.post("/login", async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { email, password } = parsed.data;

  const result = await db.query(
    "SELECT id, email, name, password FROM users WHERE email = $1",
    [email]
  );
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const { password: _pw, ...safeUser } = user;
  res.json({ token: signToken(user.id, user.email), user: safeUser });
});

router.get("/me", async (req, res) => {
  res.json({ user: req.user });
});

export default router;
