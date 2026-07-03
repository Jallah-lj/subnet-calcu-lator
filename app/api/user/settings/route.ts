import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/options";
import { getUserSettings, updateUserSettings } from "@/lib/auth/users";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ settings: getUserSettings(session.user.id) });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { defaultCidr?: number; theme?: "light" | "dark" | "system" };
  const next = updateUserSettings(session.user.id, {
    defaultCidr: typeof body.defaultCidr === "number" ? body.defaultCidr : undefined,
    theme: body.theme
  });

  return NextResponse.json({ settings: next });
}
