import { PHASE_PRODUCTION_BUILD } from "next/constants";

const isProductionBuildStep = process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;

if (!process.env.NEXTAUTH_SECRET) {
  if (process.env.NODE_ENV === "production" && !isProductionBuildStep) {
    throw new Error("NEXTAUTH_SECRET must be set in production. Sessions cannot be signed securely without it.");
  }
  console.warn("NEXTAUTH_SECRET is not set; using an insecure development-only secret. Set it before deploying.");
}

export const AUTH_SECRET = process.env.NEXTAUTH_SECRET || "insecure-development-secret-do-not-use-in-production";
