import { NextRequest, NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { authorizeTripBySeedCode } from "@/lib/trip-auth";

type RouteContext = {
  params: Promise<{ seedCode: string; taskId: string; attachmentId: string }>;
};

async function findAttachment(
  seedCode: string,
  taskId: string,
  attachmentId: string
) {
  const trip = await prisma.trip.findUnique({
    where: { seedCode },
    select: { id: true },
  });
  if (!trip) return { error: jsonError("Trip not found", 404) };

  const attachment = await prisma.tripTaskAttachment.findFirst({
    where: {
      id: attachmentId,
      taskId,
      task: { tripId: trip.id },
    },
  });
  if (!attachment) return { error: jsonError("Attachment not found", 404) };

  return { attachment };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { seedCode: raw, taskId, attachmentId } = await context.params;
    const seedCode = normalizeSeedCode(raw);
    if (!isValidSeedCode(seedCode)) {
      return jsonError("Invalid seed code format", 400);
    }

    const result = await findAttachment(seedCode, taskId, attachmentId);
    if ("error" in result && result.error) return result.error;
    const { attachment } = result;

    const buffer = Buffer.from(attachment!.data, "base64");
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": attachment!.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(attachment!.fileName)}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error("GET task attachment", error);
    return jsonError("Failed to load attachment", 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { seedCode: raw, taskId, attachmentId } = await context.params;
    const seedCode = normalizeSeedCode(raw);
    if (!isValidSeedCode(seedCode)) {
      return jsonError("Invalid seed code format", 400);
    }

    const auth = await authorizeTripBySeedCode(request, seedCode);
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const result = await findAttachment(seedCode, taskId, attachmentId);
    if ("error" in result && result.error) return result.error;

    await prisma.tripTaskAttachment.delete({
      where: { id: attachmentId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE task attachment", error);
    return jsonError("Failed to delete attachment", 500);
  }
}
