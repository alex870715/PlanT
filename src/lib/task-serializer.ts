import type {
  TripTask,
  TripTaskAttachment,
  TripTaskConfirmation,
} from "@prisma/client";
import type { TripTaskAttachmentDto, TripTaskConfirmationDto, TripTaskDto } from "@/types/trip";

type TaskWithRelations = TripTask & {
  attachments?: TripTaskAttachment[];
  confirmations?: TripTaskConfirmation[];
};

export function serializeTaskAttachment(
  attachment: TripTaskAttachment,
  seedCode: string,
  taskId: string
): TripTaskAttachmentDto {
  return {
    id: attachment.id,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    url: `/api/trip/${seedCode}/task/${taskId}/attachment/${attachment.id}`,
    uploadedBy: attachment.uploadedBy,
    createdAt: attachment.createdAt.toISOString(),
  };
}

export function serializeTaskConfirmation(
  confirmation: TripTaskConfirmation
): TripTaskConfirmationDto {
  return {
    memberId: confirmation.memberId,
    memberName: confirmation.memberName,
    confirmedAt: confirmation.createdAt.toISOString(),
  };
}

export function serializeTask(
  task: TaskWithRelations,
  seedCode: string
): TripTaskDto {
  return {
    id: task.id,
    title: task.title,
    category: task.category,
    assignee: task.assignee,
    amount: task.amount == null ? null : Number(task.amount),
    notes: task.notes,
    done: task.done,
    sortOrder: task.sortOrder,
    attachments: (task.attachments ?? []).map((a) =>
      serializeTaskAttachment(a, seedCode, task.id)
    ),
    confirmations: (task.confirmations ?? []).map(serializeTaskConfirmation),
  };
}
