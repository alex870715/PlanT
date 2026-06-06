import { Prisma } from "@prisma/client";

export function isPrismaMissingTable(
  error: unknown,
  table?: string
): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== "P2021") return false;
  if (!table) return true;
  const modelName = error.meta?.modelName;
  const message = String(error.message ?? "");
  return modelName === table || message.includes(table);
}

export function isPrismaUnknownField(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("Unknown field") ||
      error.message.includes("Unknown arg"))
  );
}

export function isPrismaSchemaMismatch(error: unknown): boolean {
  return isPrismaMissingTable(error) || isPrismaUnknownField(error);
}
