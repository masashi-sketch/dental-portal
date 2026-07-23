import type { DefaultSession } from "next-auth";
import type { ClinicPortalPermissionKey, ClinicPortalRoleKey } from "@/lib/supabase/types";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      role: "bgj" | "clinic" | "patient";
      customerCode: string | null;
      patientId: string | null;
      clinicRole: ClinicPortalRoleKey | null;
      clinicPermissions: ClinicPortalPermissionKey[];
      clinicSessionVersion: number | null;
      accountDisabled: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "bgj" | "clinic" | "patient";
    customerCode?: string | null;
    patientId?: string | null;
    clinicRole?: ClinicPortalRoleKey | null;
    clinicPermissions?: ClinicPortalPermissionKey[];
    clinicSessionVersion?: number | null;
    accountDisabled?: boolean;
  }
}
