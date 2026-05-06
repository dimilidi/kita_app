import prisma from "@/lib/prisma";
import { getAuthData } from "@/lib/utils";
import { zoneSchema } from "@/lib/formValidationSchemas";
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

  const id = params.id;
  const [lessons, activities, studentZones, teacherZones, history] =
    await Promise.all([
      prisma.lesson.count({ where: { zoneId: id } }),
      prisma.activity.count({ where: { zoneId: id } }),
      prisma.studentZone.count({ where: { zoneId: id } }),
      prisma.teacherZone.count({ where: { zoneId: id } }),
      prisma.zoneHistory.count({ where: { zoneId: id } }),
    ]);

  if (lessons + activities + studentZones + teacherZones + history > 0) {
    return NextResponse.json({ error: "in_use" }, { status: 409 });
  }

  await prisma.zone.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}

