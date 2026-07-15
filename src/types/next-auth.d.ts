import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      role: "bgj" | "clinic";
      customerCode: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: "bgj" | "clinic";
    customerCode?: string | null;
  }
}
