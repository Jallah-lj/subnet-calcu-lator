import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/options";
import { deleteUserAccount, findUserById, verifyPassword } from "@/lib/auth/users";

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const password = body.password ?? "";
  const user = findUserById(session.user.id);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (!verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "Password confirmation is required." }, { status: 400 });
  }

  deleteUserAccount(session.user.id);
  return NextResponse.json({ ok: true });
}
