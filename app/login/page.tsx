"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [router, status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false
    });

    if (res?.error) {
      setError("Invalid email or password");
      setIsLoading(false);
      return;
    }

    const callbackUrl = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("callbackUrl") : null;
    router.push(callbackUrl || "/");
    router.refresh();
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 transition-colors">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">Welcome Back</h1>

        {error && (
          <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/30 rounded-lg text-center">{error}</div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors mt-2 disabled:opacity-50"
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>
        </form>
        <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">Try: admin@example.com / password123</p>
        <p className="mt-2 text-sm text-center text-gray-500 dark:text-gray-400">
          <Link href="/forgot-password" className="text-blue-600 dark:text-blue-400 hover:underline">
            Forgot password?
          </Link>
        </p>
        <p className="mt-2 text-sm text-center text-gray-500 dark:text-gray-400">
          No account yet?{" "}
          <Link href="/signup" className="text-blue-600 dark:text-blue-400 hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
