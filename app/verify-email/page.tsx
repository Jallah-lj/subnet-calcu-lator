"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function VerifyEmailPage() {
  const [message, setMessage] = useState("Verifying your email...");
  const [error, setError] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setError("Missing verification token.");
      setMessage("");
      return;
    }

    const run = async () => {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(payload.error || "Verification failed.");
        setMessage("");
        return;
      }

      setMessage("Email verified. You can now log in.");
    };

    void run();
  }, []);

  return (
    <main className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 transition-colors text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Verify Email</h1>
        {message && <p className="text-gray-700 dark:text-gray-300">{message}</p>}
        {error && <p className="text-red-600 dark:text-red-400">{error}</p>}
        <div className="mt-6">
          <Link href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">
            Go to login
          </Link>
        </div>
      </div>
    </main>
  );
}
