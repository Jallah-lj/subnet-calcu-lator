import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/options";
import { createAuthToken, findUserById, updateUserProfile } from "@/lib/auth/users";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = findUserById(session.user.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    profile: {
      name: user.name,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt
    }
  });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { name?: string; email?: string };
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";

  if (name.length < 2) {
    return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
  }

  const updated = updateUserProfile(session.user.id, { name, email });
  if (!updated) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if ("conflict" in updated) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const verificationUrl = updated.emailChanged
    ? `/verify-email?token=${createAuthToken(session.user.id, "verify-email", { email }).token}`
    : "";

  return NextResponse.json({
    profile: {
      name: updated.user?.name ?? name,
      email: updated.user?.email ?? email,
      emailVerifiedAt: updated.user?.emailVerifiedAt ?? null
    },
    verificationUrl
  });
}
