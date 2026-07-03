import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/options";
import { listCalculatorHistory, saveCalculatorHistory } from "@/lib/auth/users";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({ history: listCalculatorHistory(session.user.id, 10) });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    ip?: string;
    cidr?: number;
    network?: string;
    broadcast?: string;
    mask?: string;
    usableHosts?: string;
  };

  if (!body.ip || typeof body.cidr !== "number") {
    return NextResponse.json({ error: "Invalid history payload." }, { status: 400 });
  }

  const saved = saveCalculatorHistory(session.user.id, {
    ip: body.ip,
    cidr: body.cidr,
    network: body.network ?? "",
    broadcast: body.broadcast ?? "",
    mask: body.mask ?? "",
    usableHosts: body.usableHosts ?? ""
  });

  return NextResponse.json({ ok: true, ...saved });
}
