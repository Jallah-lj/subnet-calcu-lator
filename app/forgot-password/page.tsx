"use client";

import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setResetUrl("");

    const response = await fetch("/api/auth/password-reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });

    const payload = (await response.json()) as { error?: string; resetUrl?: string };
    if (!response.ok) {
      setError(payload.error || "Could not start password reset.");
      setIsLoading(false);
      return;
    }

    setResetUrl(payload.resetUrl || "");
    setIsLoading(false);
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 transition-colors">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">Forgot Password</h1>
        {error && <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/30 rounded-lg text-center">{error}</div>}
        {resetUrl && (
          <div className="mb-4 p-3 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
            Reset link ready:{" "}
            <Link href={resetUrl} className="font-medium underline">
              open reset page
            </Link>
          </div>
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
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      </div>
    </main>
  );
}
