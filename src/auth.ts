import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CLINIC_USER_COLUMNS } from "@/lib/supabase/types";
import { verifyPassword } from "@/lib/auth/password";
import type { ClinicUser } from "@/lib/supabase/types";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      id: "clinic-credentials",
      name: "医院ログイン",
      credentials: {
        loginId: { label: "ログインID", type: "text" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        const loginId = credentials?.loginId as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!loginId || !password) return null;

        const supabase = getSupabaseServerClient();
        const { data } = await supabase
          .from("clinic_users")
          .select(CLINIC_USER_COLUMNS)
          .eq("login_id", loginId)
          .eq("status", "有効")
          .maybeSingle<ClinicUser>();
        if (!data) return null;

        const valid = verifyPassword(password, data.password_hash);
        if (!valid) return null;

        return {
          id: data.id,
          name: data.name ?? data.login_id,
          role: "clinic" as const,
          customerCode: data.customer_code,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "google") {
        if (!profile?.email) return false;
        // @biogaia.jp ドメインのみアクセスを許可
        return profile.email.endsWith("@biogaia.jp");
      }
      // clinic-credentials は authorize() 内で既に検証済み
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: "clinic" }).role ?? "bgj";
        token.customerCode = (user as { customerCode?: string }).customerCode ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = (token.role as "bgj" | "clinic") ?? "bgj";
      session.user.customerCode = (token.customerCode as string | null) ?? null;
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
});
