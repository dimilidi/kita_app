import { getAuthData } from "@/lib/utils";
import { zoneSchema } from "@/lib/formValidationSchemas";
import { deleteZoneById } from "@/lib/zoneDelete";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { role } = getAuthData();
  if (role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = zoneSchema.safeParse({ ...body, id: params.id });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await prisma.zone.update({
    where: { id: params.id },
    data: {
      name: parsed.data.name.trim(),
      capacity: parsed.data.capacity,
      description: parsed.data.description?.trim() || null,
    },
    select: { id: true, name: true, capacity: true, description: true },
  });

  return NextResponse.json({ item: updated }, { status: 200 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { role } = getAuthData();
  if (role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const result = await deleteZoneById(params.id);
  if (!result.ok) {
    if (result.reason === "in_use") {
      return NextResponse.json({ error: "in_use" }, { status: 409 });
    }
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

