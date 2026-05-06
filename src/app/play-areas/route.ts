import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import { zoneSchema } from "@/lib/formValidationSchemas";
import { NextResponse } from "next/server";

export async function GET() {
  const { role } = getAuthData();
  if (!role) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const items = await prisma.zone.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, capacity: true, description: true },
  });

  return NextResponse.json({ items }, { status: 200 });
}

export async function POST(req: Request) {
  const { role } = getAuthData();
  if (role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = zoneSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const created = await prisma.zone.create({
    data: {
      name: parsed.data.name.trim(),
      capacity: parsed.data.capacity,
      description: parsed.data.description?.trim() || null,
    },
    select: { id: true, name: true, capacity: true, description: true },
  });

  return NextResponse.json({ item: created }, { status: 201 });
}

