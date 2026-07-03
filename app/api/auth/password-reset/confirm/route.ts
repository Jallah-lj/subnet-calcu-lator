import { NextResponse } from "next/server";
import { consumeAuthToken, updateUserPassword } from "@/lib/auth/users";

type ResetConfirmPayload = {
  token?: string;
  password?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as ResetConfirmPayload;
  const token = payload.token?.trim();
  const password = payload.password ?? "";

  if (!token) {
    return NextResponse.json({ error: "Reset token is required." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const result = consumeAuthToken("reset-password", token);
  if (!result?.userId) {
    return NextResponse.json({ error: "Invalid or expired reset token." }, { status: 400 });
  }

  updateUserPassword(result.userId, password);
  return NextResponse.json({ ok: true });
}
