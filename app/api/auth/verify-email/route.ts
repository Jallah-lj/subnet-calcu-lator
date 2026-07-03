import { NextResponse } from "next/server";
import { consumeAuthToken, markUserEmailVerified } from "@/lib/auth/users";

type VerifyEmailPayload = {
  token?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as VerifyEmailPayload;
  const token = payload.token?.trim();

  if (!token) {
    return NextResponse.json({ error: "Verification token is required." }, { status: 400 });
  }

  const result = consumeAuthToken("verify-email", token);
  if (!result?.userId) {
    return NextResponse.json({ error: "Invalid or expired verification token." }, { status: 400 });
  }

  markUserEmailVerified(result.userId);
  return NextResponse.json({ ok: true });
}
