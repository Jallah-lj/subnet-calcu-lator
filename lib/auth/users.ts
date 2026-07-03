import crypto from "crypto";
import { getDb } from "@/lib/db";

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UserSettings = {
  defaultCidr: number;
  theme: "light" | "dark" | "system";
};

export type CalculatorHistoryEntry = {
  id: string;
  ip: string;
  cidr: number;
  network: string;
  broadcast: string;
  mask: string;
  usableHosts: string;
  createdAt: string;
};

export type AuthTokenType = "verify-email" | "reset-password";

const TOKEN_TTL_MS = {
  "verify-email": 1000 * 60 * 60 * 24,
  "reset-password": 1000 * 60 * 30
} as const;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const hashToken = (token: string) => crypto.createHash("sha256").update(token).digest("hex");

const nowIso = () => new Date().toISOString();

export function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;
  const hashedBuffer = crypto.scryptSync(password, salt, 64) as Buffer;
  const keyBuffer = Buffer.from(key, "hex");
  if (hashedBuffer.length !== keyBuffer.length) return false;
  return crypto.timingSafeEqual(hashedBuffer, keyBuffer);
}

function seedDemoUserIfNeeded() {
  const db = getDb();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get("admin@example.com");
  if (existing) return;

  const timestamp = nowIso();
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, email_verified_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    crypto.randomBytes(12).toString("hex"),
    "Admin User",
    "admin@example.com",
    hashPassword("password123"),
    timestamp,
    timestamp,
    timestamp
  );
}

seedDemoUserIfNeeded();

export function findUserByEmail(email: string): StoredUser | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, name, email, password_hash as passwordHash, email_verified_at as emailVerifiedAt,
              created_at as createdAt, updated_at as updatedAt
       FROM users
       WHERE email = ?`
    )
    .get(normalizeEmail(email)) as StoredUser | undefined;
  return row ?? null;
}

export function findUserById(userId: string): StoredUser | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, name, email, password_hash as passwordHash, email_verified_at as emailVerifiedAt,
              created_at as createdAt, updated_at as updatedAt
       FROM users
       WHERE id = ?`
    )
    .get(userId) as StoredUser | undefined;
  return row ?? null;
}

export function createUser(input: { name: string; email: string; password: string }) {
  const db = getDb();
  const email = normalizeEmail(input.email);
  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (exists) return null;

  const timestamp = nowIso();
  const userId = crypto.randomBytes(12).toString("hex");
  const passwordHash = hashPassword(input.password);

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, email_verified_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?)`
  ).run(userId, input.name.trim(), email, passwordHash, timestamp, timestamp);

  db.prepare(
    `INSERT INTO user_settings (user_id, default_cidr, theme, created_at, updated_at)
     VALUES (?, 24, 'system', ?, ?)`
  ).run(userId, timestamp, timestamp);

  return findUserById(userId);
}

export function markUserEmailVerified(userId: string) {
  const db = getDb();
  db.prepare("UPDATE users SET email_verified_at = ?, updated_at = ? WHERE id = ?").run(nowIso(), nowIso(), userId);
}

export function updateUserPassword(userId: string, password: string) {
  const db = getDb();
  db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(hashPassword(password), nowIso(), userId);
}

export function updateUserProfile(userId: string, input: { name: string; email: string }) {
  const db = getDb();
  const current = findUserById(userId);
  if (!current) return null;

  const nextName = input.name.trim();
  const nextEmail = normalizeEmail(input.email);
  const existing = db
    .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
    .get(nextEmail, userId);
  if (existing) return { conflict: true as const };

  const emailChanged = nextEmail !== current.email;
  db.prepare(
    `UPDATE users
     SET name = ?, email = ?, email_verified_at = CASE WHEN ? THEN NULL ELSE email_verified_at END, updated_at = ?
     WHERE id = ?`
  ).run(nextName, nextEmail, emailChanged ? 1 : 0, nowIso(), userId);

  return {
    user: findUserById(userId),
    emailChanged
  };
}

export function deleteUserAccount(userId: string) {
  const db = getDb();
  const user = findUserById(userId);
  if (!user) return null;

  db.prepare("DELETE FROM login_attempts WHERE email = ?").run(user.email);
  db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  return user;
}

export function getUserSettings(userId: string): UserSettings {
  const db = getDb();
  const row = db
    .prepare("SELECT default_cidr as defaultCidr, theme FROM user_settings WHERE user_id = ?")
    .get(userId) as UserSettings | undefined;
  if (row) return row;

  const timestamp = nowIso();
  db.prepare(
    `INSERT INTO user_settings (user_id, default_cidr, theme, created_at, updated_at)
     VALUES (?, 24, 'system', ?, ?)`
  ).run(userId, timestamp, timestamp);
  return { defaultCidr: 24, theme: "system" };
}

export function updateUserSettings(userId: string, settings: Partial<UserSettings>) {
  const db = getDb();
  const current = getUserSettings(userId);
  const next: UserSettings = {
    defaultCidr: typeof settings.defaultCidr === "number" ? settings.defaultCidr : current.defaultCidr,
    theme: settings.theme ?? current.theme
  };

  db.prepare(
    `INSERT INTO user_settings (user_id, default_cidr, theme, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       default_cidr = excluded.default_cidr,
       theme = excluded.theme,
       updated_at = excluded.updated_at`
  ).run(userId, next.defaultCidr, next.theme, nowIso(), nowIso());

  return next;
}

export function saveCalculatorHistory(userId: string, entry: Omit<CalculatorHistoryEntry, "id" | "createdAt">) {
  const db = getDb();
  const id = crypto.randomBytes(12).toString("hex");
  const timestamp = nowIso();
  db.prepare(
    `INSERT INTO calculator_history
      (id, user_id, ip, cidr, network, broadcast, mask, usable_hosts, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, userId, entry.ip, entry.cidr, entry.network, entry.broadcast, entry.mask, entry.usableHosts, timestamp);
  return { id, createdAt: timestamp };
}

export function listCalculatorHistory(userId: string, limit = 10) {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, ip, cidr, network, broadcast, mask, usable_hosts as usableHosts, created_at as createdAt
       FROM calculator_history
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(userId, limit) as CalculatorHistoryEntry[];
}

export function createAuthToken(userId: string | null, type: AuthTokenType, payload: Record<string, unknown> = {}) {
  const db = getDb();
  const token = generateToken();
  const timestamp = nowIso();
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS[type]).toISOString();

  db.prepare(
    `INSERT INTO auth_tokens (id, user_id, type, token_hash, payload_json, expires_at, used_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`
  ).run(
    crypto.randomBytes(12).toString("hex"),
    userId,
    type,
    hashToken(token),
    JSON.stringify(payload),
    expiresAt,
    timestamp
  );

  return { token, expiresAt };
}

export function consumeAuthToken(type: AuthTokenType, token: string) {
  const db = getDb();
  const tokenHash = hashToken(token);
  const row = db
    .prepare(
      `SELECT id, user_id as userId, type, payload_json as payloadJson, expires_at as expiresAt, used_at as usedAt
       FROM auth_tokens
       WHERE token_hash = ? AND type = ?`
    )
    .get(tokenHash, type) as
    | { id: string; userId: string | null; payloadJson: string | null; expiresAt: string; usedAt: string | null }
    | undefined;

  if (!row || row.usedAt) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) return null;

  db.prepare("UPDATE auth_tokens SET used_at = ? WHERE id = ?").run(nowIso(), row.id);

  return {
    userId: row.userId,
    payload: row.payloadJson ? (JSON.parse(row.payloadJson) as Record<string, unknown>) : {}
  };
}

export function getTokenByTypeAndUser(type: AuthTokenType, userId: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, user_id as userId, type, token_hash as tokenHash, payload_json as payloadJson, expires_at as expiresAt, used_at as usedAt
       FROM auth_tokens
       WHERE type = ? AND user_id = ? AND used_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(type, userId) as
    | {
        id: string;
        userId: string;
        type: AuthTokenType;
        tokenHash: string;
        payloadJson: string | null;
        expiresAt: string;
        usedAt: string | null;
      }
    | undefined;
}

export function getLoginStatus(email: string) {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT email, failed_count as failedCount, locked_until as lockedUntil, last_failed_at as lastFailedAt, updated_at as updatedAt
       FROM login_attempts
       WHERE email = ?`
    )
    .get(normalizeEmail(email)) as
    | { email: string; failedCount: number; lockedUntil: string | null; lastFailedAt: string | null; updatedAt: string }
    | undefined;

  return (
    row ?? {
      email: normalizeEmail(email),
      failedCount: 0,
      lockedUntil: null,
      lastFailedAt: null,
      updatedAt: nowIso()
    }
  );
}

export function recordLoginFailure(email: string) {
  const db = getDb();
  const normalized = normalizeEmail(email);
  const current = getLoginStatus(normalized);
  const failedCount = current.failedCount + 1;
  const lockedUntil = failedCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : current.lockedUntil;
  const timestamp = nowIso();

  db.prepare(
    `INSERT INTO login_attempts (email, failed_count, locked_until, last_failed_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       failed_count = excluded.failed_count,
       locked_until = excluded.locked_until,
       last_failed_at = excluded.last_failed_at,
       updated_at = excluded.updated_at`
  ).run(normalized, failedCount, lockedUntil, timestamp, timestamp);

  return { failedCount, lockedUntil };
}

export function clearLoginFailures(email: string) {
  const db = getDb();
  const normalized = normalizeEmail(email);
  db.prepare("DELETE FROM login_attempts WHERE email = ?").run(normalized);
}

export function isLoginLocked(email: string) {
  const current = getLoginStatus(email);
  if (!current.lockedUntil) return false;
  return new Date(current.lockedUntil).getTime() > Date.now();
}

export function getResetTokenForUser(userId: string) {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, user_id as userId, type, token_hash as tokenHash, payload_json as payloadJson, expires_at as expiresAt, used_at as usedAt
       FROM auth_tokens
       WHERE user_id = ? AND type = 'reset-password' AND used_at IS NULL
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(userId);
}
