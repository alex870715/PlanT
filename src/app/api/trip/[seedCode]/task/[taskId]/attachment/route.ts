import { NextRequest, NextResponse } from "next/server";
import { isValidSeedCode, jsonError, normalizeSeedCode } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { serializeTaskAttachment } from "@/lib/task-serializer";
import {
  attachmentSizeError,
  isAllowedAttachmentMime,
} from "@/lib/task-attachment";

type RouteContext = {
  params: Promise<{ seedCode: string; taskId: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { seedCode: raw, taskId } = await context.params;
    const seedCode = normalizeSeedCode(raw);
    if (!isValidSeedCode(seedCode)) {
      return jsonError("Invalid seed code format", 400);
    }

    const trip = await prisma.trip.findUnique({
      where: { seedCode },
      select: { id: true },
    });
    if (!trip) return jsonError("Trip not found", 404);

    const task = await prisma.tripTask.findFirst({
      where: { id: taskId, tripId: trip.id },
    });
    if (!task) return jsonError("Task not found", 404);

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonError("請選擇要上傳的檔案", 400);
    }

    if (!isAllowedAttachmentMime(file.type)) {
      return jsonError("僅支援 JPG、PNG、WebP、GIF、PDF", 400);
    }

    const sizeErr = attachmentSizeError(file.size);
    if (sizeErr) return jsonError(sizeErr, 400);

    const uploadedBy = String(formData.get("uploadedBy") ?? "").trim() || null;
    const buffer = Buffer.from(await file.arrayBuffer());
    const data = buffer.toString("base64");

    const attachment = await prisma.tripTaskAttachment.create({
      data: {
        taskId: task.id,
        fileName: file.name.slice(0, 200),
        mimeType: file.type,
        data,
        uploadedBy,
      },
    });

    return NextResponse.json(
      serializeTaskAttachment(attachment, seedCode, task.id),
      { status: 201 }
    );
  } catch (error) {
    console.error("POST task attachment", error);
    return jsonError("Failed to upload attachment", 500);
  }
}
