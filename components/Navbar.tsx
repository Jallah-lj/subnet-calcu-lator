"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const navLinks = [
    { name: "Calculator", href: "/" },
    { name: "Settings", href: "/settings" }
  ];

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-colors">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex-shrink-0 font-bold text-xl text-blue-600 dark:text-blue-400">NetCalc</div>
          <div className="flex items-center space-x-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-blue-50 text-blue-700 dark:bg-gray-800 dark:text-blue-400"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
              >
                {link.name}
              </Link>
            ))}
            {status !== "loading" && !session && (
              <>
                <Link
                  href="/signup"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === "/signup"
                      ? "bg-blue-50 text-blue-700 dark:bg-gray-800 dark:text-blue-400"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  Sign up
                </Link>
                <Link
                  href="/login"
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === "/login"
                      ? "bg-blue-50 text-blue-700 dark:bg-gray-800 dark:text-blue-400"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  Login
                </Link>
              </>
            )}
            {status !== "loading" && session && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
