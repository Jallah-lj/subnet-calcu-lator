import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import {
  clearLoginFailures,
  findUserByEmail,
  isLoginLocked,
  recordLoginFailure,
  verifyPassword
} from "@/lib/auth/users";

if (!process.env.NEXTAUTH_URL && process.env.NODE_ENV !== "production") {
  process.env.NEXTAUTH_URL = "http://localhost:3000";
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        if (isLoginLocked(email)) return null;

        const user = findUserByEmail(email);
        if (!user) {
          recordLoginFailure(email);
          return null;
        }

        if (!user.emailVerifiedAt) return null;

        const valid = verifyPassword(password, user.passwordHash);
        if (!valid) {
          recordLoginFailure(email);
          return null;
        }

        clearLoginFailures(email);
        return { id: user.id, name: user.name, email: user.email };
      }
    })
  ],
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.userId = user.id ?? token.sub;
        token.name = user.name;
        token.email = user.email;
      }

      if (trigger === "update" && session?.user) {
        if (session.user.name) token.name = session.user.name;
        if (session.user.email) token.email = session.user.email;
      }
      return token;
    },
    async session({ session, token }) {
      const userId = token.userId ?? token.sub;
      if (session.user && userId) {
        session.user.id = userId;
        session.user.name = token.name ?? session.user.name;
        session.user.email = token.email ?? session.user.email;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-key-for-development"
};
