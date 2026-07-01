"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Leaf, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const verify = searchParams.get("verify") === "1";
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogle() {
    setBusy(true);
    setError(null);
    await signIn("google", { callbackUrl });
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await signIn("email", {
        email: email.trim(),
        callbackUrl,
        redirect: false,
      });
      if (res?.error) throw new Error(res.error);
      window.location.href = `/login?verify=1&callbackUrl=${encodeURIComponent(callbackUrl)}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "寄送失敗");
    } finally {
      setBusy(false);
    }
  }

  if (verify) {
    return (
      <div className="space-y-4 text-center">
        <Mail className="mx-auto h-10 w-10 text-emerald-600" />
        <h1 className="text-xl font-bold text-emerald-950">請查收 Email</h1>
        <p className="text-sm text-emerald-800/80">
          登入連結已寄出。若未收到，請看終端機 dev log（Resend
          未驗證網域時，本地只能寄到註冊信箱，其他地址會改在終端機顯示連結）。
        </p>
        <Link href={callbackUrl} className="text-sm text-emerald-700 underline">
          返回
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
          <Leaf className="h-8 w-8 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-emerald-950">登入 PlanT</h1>
        <p className="text-sm text-emerald-800/80">
          登入後輸入名字加入旅程，即可編輯行程
        </p>
      </div>

      {process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== "false" && (
        <Button
          type="button"
          className="w-full"
          disabled={busy}
          onClick={() => void handleGoogle()}
        >
          使用 Google 登入
        </Button>
      )}

      <div className="relative text-center text-xs text-emerald-700/70">
        <span className="bg-white px-2">或</span>
        <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-emerald-200" />
      </div>

      <form onSubmit={(e) => void handleEmail(e)} className="space-y-3">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Button type="submit" variant="outline" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Email 魔法連結登入"}
        </Button>
      </form>

      {error && <p className="text-center text-sm text-red-600">{error}</p>}

      <p className="text-center text-xs text-emerald-700/70">
        <Link href={callbackUrl} className="underline">
          稍後再登入（僅檢視）
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-emerald-200 bg-white/90 p-6 shadow-lg">
        <Suspense fallback={<Loader2 className="mx-auto h-6 w-6 animate-spin" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
