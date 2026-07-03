import { NextResponse } from "next/server";
import { createAuthToken, findUserByEmail } from "@/lib/auth/users";

type ResetRequestPayload = {
  email?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const payload = (await request.json()) as ResetRequestPayload;
  const email = payload.email?.trim().toLowerCase() ?? "";

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return NextResponse.json({ ok: true });
  }

  const token = createAuthToken(user.id, "reset-password", { email: user.email });
  return NextResponse.json({
    ok: true,
    resetUrl: `/reset-password?token=${token.token}`
  });
}
