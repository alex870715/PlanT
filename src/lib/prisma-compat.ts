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

/** P2022：資料庫缺少 schema 中的欄位（production 未 migrate） */
export function isPrismaMissingColumn(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  return error.code === "P2022";
}

export function isPrismaSchemaMismatch(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientValidationError) return true;
  return (
    isPrismaMissingTable(error) ||
    isPrismaMissingColumn(error) ||
    isPrismaUnknownField(error)
  );
}
