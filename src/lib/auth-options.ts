import type { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const providers: NextAuthOptions["providers"] = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    })
  );
}

providers.push(
  EmailProvider({
    from: process.env.EMAIL_FROM ?? "PlanT <onboarding@resend.dev>",
    sendVerificationRequest: async ({ identifier, url }) => {
      await sendEmail({
        to: identifier,
        subject: "PlanT 登入連結",
        text: `請點以下連結登入 PlanT（1 小時內有效）：\n${url}`,
        html: `<p>請點 <a href="${url}">此連結</a> 登入 PlanT（1 小時內有效）。</p>`,
      });
    },
  })
);

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers,
  pages: {
    signIn: "/login",
    verifyRequest: "/login?verify=1",
  },
  session: { strategy: "database" },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
};
