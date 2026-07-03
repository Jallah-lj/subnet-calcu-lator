import { NextResponse } from "next/server";
import { createAuthToken, createUser } from "@/lib/auth/users";

type RegisterPayload = {
  name?: string;
  email?: string;
  password?: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const payload = (await request.json()) as RegisterPayload;
  const name = payload.name?.trim() ?? "";
  const email = payload.email?.trim().toLowerCase() ?? "";
  const password = payload.password ?? "";

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const user = await createUser({ name, email, password });
  if (!user) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const verification = createAuthToken(user.id, "verify-email", { email: user.email });
  const verificationUrl = `/verify-email?token=${verification.token}`;

  return NextResponse.json(
    {
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      verificationUrl
    },
    { status: 201 }
  );
}
