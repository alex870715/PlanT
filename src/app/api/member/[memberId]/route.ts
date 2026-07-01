import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { authorizeMember } from "@/lib/trip-auth";
import type { UpdateMemberBody } from "@/types/trip";

type RouteContext = { params: Promise<{ memberId: string }> };

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { memberId } = await context.params;

    const access = await authorizeMember(request, memberId);
    if (!access.ok) return jsonError(access.error, access.status);

    const body = (await request.json()) as UpdateMemberBody;

    if (body.name !== undefined && !body.name.trim()) {
      return jsonError("name cannot be empty", 400);
    }

    const updated = await prisma.member.update({
      where: { id: memberId },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.email !== undefined && {
          email: body.email?.trim() || null,
        }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
    });
  } catch (error) {
    console.error("PATCH /api/member/[memberId]", error);
    return jsonError("Failed to update member", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { memberId } = await context.params;

    const access = await authorizeMember(request, memberId, {
      requireHost: true,
    });
    if (!access.ok) return jsonError(access.error, access.status);

    const member = await prisma.member.findUnique({
      where: { id: memberId },
      include: { spots: { select: { id: true } } },
    });
    if (!member) return jsonError("Member not found", 404);

    if (member.spots.length > 0) {
      return jsonError(
        "Cannot remove member with Sprout spots. Reassign or delete their spots first.",
        400
      );
    }

    await prisma.member.delete({ where: { id: memberId } });

    return NextResponse.json({ success: true, id: memberId });
  } catch (error) {
    console.error("DELETE /api/member/[memberId]", error);
    return jsonError("Failed to delete member", 500);
  }
}
