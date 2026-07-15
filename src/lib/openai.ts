import type { AiCredentials } from "@/lib/ai-credentials";
import { resolveAiCredentials } from "@/lib/ai-credentials";

export function isOpenAIConfigured(
  provider?: string | null,
  apiKey?: string | null
): boolean {
  return resolveAiCredentials(provider, apiKey) !== null;
}

/** @deprecated use isOpenAIConfigured with credentials */
export function isAiConfigured(credentials: AiCredentials | null): boolean {
  return credentials !== null;
}
