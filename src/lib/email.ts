type SendMagicLinkInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type ResendErrorBody = {
  statusCode?: number;
  message?: string;
  name?: string;
};

const DEFAULT_FROM = "PlanT <onboarding@resend.dev>";

function resolveFromAddress(): string {
  return process.env.EMAIL_FROM?.trim() || DEFAULT_FROM;
}

async function parseResendError(res: Response): Promise<ResendErrorBody> {
  try {
    return (await res.json()) as ResendErrorBody;
  } catch {
    return { message: await res.text() };
  }
}

function isResendSandboxRestriction(err: ResendErrorBody): boolean {
  const msg = err.message ?? "";
  return (
    err.statusCode === 403 &&
    (msg.includes("testing emails") ||
      msg.includes("not verified") ||
      msg.includes("verify a domain") ||
      msg.includes("verify your domain"))
  );
}

/** 將 Resend API 錯誤轉成使用者可理解的說明 */
export function formatResendError(err: ResendErrorBody): string {
  const msg = err.message ?? "";
  if (msg.includes("testing emails")) {
    return (
      "Resend 測試模式：未驗證網域時，只能寄到你在 Resend 註冊的 Email。" +
      "要寄給其他人，請到 resend.com/domains 驗證網域，並將 EMAIL_FROM 改為該網域信箱。"
    );
  }
  if (msg.includes("not verified") || msg.includes("verify your domain")) {
    return (
      "EMAIL_FROM 的網域尚未在 Resend 驗證。" +
      "測試請設 EMAIL_FROM=\"PlanT <onboarding@resend.dev>\"，正式環境請完成網域驗證。"
    );
  }
  return msg || "寄信失敗，請稍後再試";
}

export async function sendEmail(
  input: SendMagicLinkInput
): Promise<{ sent: boolean; devPreview?: string }> {
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const from = resolveFromAddress();

  if (
    resendKey &&
    !from.includes("resend.dev") &&
    process.env.NODE_ENV === "development"
  ) {
    console.warn(
      "[PlanT] EMAIL_FROM 使用自訂網域，需在 Resend 驗證後才能寄信。" +
        "本地測試建議：EMAIL_FROM=\"PlanT <onboarding@resend.dev>\""
    );
  }

  if (resendKey) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });
    if (!res.ok) {
      const err = await parseResendError(res);
      console.error("Resend error", err);

      if (
        process.env.NODE_ENV === "development" &&
        isResendSandboxRestriction(err)
      ) {
        console.info(
          "[PlanT dev email] Resend 沙盒限制，登入連結改輸出至終端機 →",
          input.to
        );
        console.info(input.text);
        return { sent: false, devPreview: input.text };
      }

      throw new Error(formatResendError(err));
    }
    return { sent: true };
  }

  console.info("[PlanT dev email]", input.to, input.text);
  return { sent: false, devPreview: input.text };
}

export function buildMagicLinkUrl(token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000";
  return `${base}/auth/verify?token=${encodeURIComponent(token)}`;
}

export async function sendMagicLinkEmail(input: {
  email: string;
  tripTitle: string;
  memberName: string;
  purpose: "host_bind" | "member_claim";
  token: string;
}): Promise<{ sent: boolean; devLink?: string }> {
  const url = buildMagicLinkUrl(input.token);
  const purposeLabel =
    input.purpose === "host_bind" ? "主辦人驗證" : "身份認領";
  const subject = `PlanT ${purposeLabel}：${input.tripTitle}`;
  const text = [
    `你好 ${input.memberName}，`,
    ``,
    `請點以下連結完成 PlanT 旅程「${input.tripTitle}」的${purposeLabel}（1 小時內有效）：`,
    url,
    ``,
    `若不是你本人操作，請忽略此信。`,
  ].join("\n");

  const result = await sendEmail({
    to: input.email,
    subject,
    text,
    html: `<p>你好 ${input.memberName}，</p>
<p>請點 <a href="${url}">此連結</a> 完成 PlanT 旅程「${input.tripTitle}」的${purposeLabel}（1 小時內有效）。</p>
<p>若不是你本人操作，請忽略此信。</p>`,
  });

  return { sent: result.sent, devLink: result.devPreview ? url : undefined };
}
