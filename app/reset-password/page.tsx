"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("token") || "";
    setToken(value);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setMessage("");

    const response = await fetch("/api/auth/password-reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password })
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "Could not reset password.");
      setIsLoading(false);
      return;
    }

    setMessage("Password updated. You can now sign in.");
    setIsLoading(false);
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 transition-colors">
        <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">Reset Password</h1>
        {error && <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 dark:bg-red-900/30 rounded-lg text-center">{error}</div>}
        {message && <div className="mb-4 p-3 text-sm text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg text-center">{message}</div>}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="At least 8 characters"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isLoading ? "Updating..." : "Update password"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
