import { getServerSession } from "next-auth/next";
import { cookies, headers } from "next/headers";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "__Host-next-auth.session-token",
] as const;

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

/** App Router 下 getServerSession 有時讀不到 cookie，以 DB session 作為 fallback。 */
export async function getSessionUser(): Promise<SessionUser | null> {
  await cookies();
  await headers();

  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return session.user;
  }

  const cookieStore = await cookies();
  let sessionToken: string | undefined;
  for (const name of SESSION_COOKIE_NAMES) {
    const value = cookieStore.get(name)?.value;
    if (value) {
      sessionToken = value;
      break;
    }
  }
  if (!sessionToken) return null;

  const dbSession = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });
  if (!dbSession || dbSession.expires < new Date()) return null;

  return {
    id: dbSession.user.id,
    name: dbSession.user.name,
    email: dbSession.user.email,
    image: dbSession.user.image,
  };
}
