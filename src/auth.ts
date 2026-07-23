import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { CLINIC_USER_COLUMNS, PATIENT_COLUMNS } from "@/lib/supabase/types";
import { verifyPassword } from "@/lib/auth/password";
import { isLocked, recordFailedLoginAttempt, resetLoginAttempts } from "@/lib/auth/loginLockout";
import { consumeLoginToken } from "@/lib/auth/loginToken";
import type { ClinicPortalPermissionKey, ClinicPortalRoleKey, ClinicUser, Patient } from "@/lib/supabase/types";

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
        if (isLocked(data.locked_until)) return null;

        const valid = verifyPassword(password, data.password_hash);
        if (!valid) {
          await recordFailedLoginAttempt(supabase, "clinic_users", data.id, data.failed_login_attempts);
          return null;
        }
        if (data.failed_login_attempts > 0 || data.locked_until) {
          await resetLoginAttempts(supabase, "clinic_users", data.id);
        }
        const { data: sessionRows } = await supabase.rpc("get_clinic_session_state", {
          p_clinic_user_id: data.id,
        }) as { data: Array<{
          role_key: ClinicPortalRoleKey;
          permissions: ClinicPortalPermissionKey[];
        }> | null };
        const clinicAccess = sessionRows?.[0];
        await supabase.from("clinic_users").update({ last_login_at: new Date().toISOString() }).eq("id", data.id);

        return {
          id: data.id,
          name: data.name ?? data.login_id,
          role: "clinic" as const,
          customerCode: data.customer_code,
          clinicRole: clinicAccess?.role_key ?? "admin",
          clinicPermissions: clinicAccess?.permissions ?? ['view_contacts', 'manage_contacts', 'manage_logins'],
          clinicSessionVersion: data.session_version,
        };
      },
    }),
    Credentials({
      id: "patient-credentials",
      name: "患者様ログイン",
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
          .from("patients")
          .select(PATIENT_COLUMNS)
          .eq("login_id", loginId)
          .eq("status", "有効")
          .maybeSingle<Patient>();
        if (!data) return null;
        if (isLocked(data.locked_until)) return null;

        const valid = verifyPassword(password, data.password_hash);
        if (!valid) {
          await recordFailedLoginAttempt(supabase, "patients", data.id, data.failed_login_attempts);
          return null;
        }
        if (data.failed_login_attempts > 0 || data.locked_until) {
          await resetLoginAttempts(supabase, "patients", data.id);
        }

        return {
          id: data.id,
          name: data.name,
          role: "patient" as const,
          customerCode: data.customer_code,
          patientId: data.id,
        };
      },
    }),
    // 患者様のワンクリックログイン（初回登録メール本文のリンク）専用。
    // パスワードの代わりに使い捨てトークン（src/lib/auth/loginToken.ts）を検証する。
    Credentials({
      id: "patient-magiclink",
      name: "患者様ワンクリックログイン",
      credentials: {
        token: { label: "token", type: "text" },
      },
      async authorize(credentials) {
        const token = credentials?.token as string | undefined;
        if (!token) return null;

        const supabase = getSupabaseServerClient();
        const result = await consumeLoginToken(supabase, token, "first_login");
        if (!result) return null;

        const { data } = await supabase
          .from("patients")
          .select(PATIENT_COLUMNS)
          .eq("id", result.patientId)
          .eq("status", "有効")
          .maybeSingle<Patient>();
        if (!data) return null;

        return {
          id: data.id,
          name: data.name,
          role: "patient" as const,
          customerCode: data.customer_code,
          patientId: data.id,
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
        token.role = (user as { role?: "clinic" | "patient" }).role ?? "bgj";
        token.customerCode = (user as { customerCode?: string }).customerCode ?? null;
        token.patientId = (user as { patientId?: string }).patientId ?? null;
        token.clinicRole = (user as { clinicRole?: ClinicPortalRoleKey }).clinicRole ?? null;
        token.clinicPermissions = (user as { clinicPermissions?: ClinicPortalPermissionKey[] }).clinicPermissions ?? [];
        token.clinicSessionVersion = (user as { clinicSessionVersion?: number }).clinicSessionVersion ?? null;
        token.accountDisabled = false;
      } else if (token.role === "clinic" && token.sub) {
        const supabase = getSupabaseServerClient();
        const { data: sessionRows } = await supabase.rpc("get_clinic_session_state", {
          p_clinic_user_id: token.sub,
        }) as { data: Array<{
          status: "有効" | "無効";
          session_version: number;
          role_key: ClinicPortalRoleKey;
          permissions: ClinicPortalPermissionKey[];
        }> | null };
        const clinicUser = sessionRows?.[0];
        token.accountDisabled = !clinicUser || clinicUser.status !== "有効"
          || clinicUser.session_version !== token.clinicSessionVersion;
        token.clinicRole = clinicUser?.role_key ?? "admin";
        token.clinicPermissions = clinicUser?.permissions ?? [];
      }
      return token;
    },
    async session({ session, token }) {
      session.user.role = (token.role as "bgj" | "clinic" | "patient") ?? "bgj";
      session.user.customerCode = (token.customerCode as string | null) ?? null;
      session.user.patientId = (token.patientId as string | null) ?? null;
      session.user.clinicRole = (token.clinicRole as ClinicPortalRoleKey | null) ?? null;
      session.user.clinicPermissions = (token.clinicPermissions as ClinicPortalPermissionKey[] | undefined) ?? [];
      session.user.clinicSessionVersion = (token.clinicSessionVersion as number | null) ?? null;
      session.user.accountDisabled = Boolean(token.accountDisabled);
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
