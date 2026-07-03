"use client";

import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "@/components/ThemeContext";

type HistoryEntry = {
  ip: string;
  cidr: number;
  timestamp: string;
  network: string;
  broadcast: string;
  mask: string;
  usableHosts: string;
};

type Profile = {
  name: string;
  email: string;
  emailVerifiedAt: string | null;
};

export default function SettingsPage() {
  const { data: session, update } = useSession();
  const { isDarkMode, toggleTheme } = useTheme();
  const [defaultMask, setDefaultMask] = useState("24");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [profile, setProfile] = useState<Profile>({ name: "", email: "", emailVerifiedAt: null });
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileVerificationUrl, setProfileVerificationUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    const savedMask = localStorage.getItem("defaultMask") || "24";
    setDefaultMask(savedMask);

    try {
      const savedHistory = JSON.parse(localStorage.getItem("calcHistory") || "[]") as HistoryEntry[];
      setHistory(savedHistory);
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;

    const loadProfile = async () => {
      const response = await fetch("/api/account/profile");
      if (!response.ok) {
        setLoadingProfile(false);
        return;
      }

      const payload = (await response.json()) as { profile?: Profile };
      if (payload.profile) {
        setProfile(payload.profile);
      } else {
        setProfile({
          name: session.user?.name || "",
          email: session.user?.email || "",
          emailVerifiedAt: null
        });
      }
      setLoadingProfile(false);
    };

    void loadProfile();
  }, [session?.user?.email, session?.user?.id, session?.user?.name]);

  const handleMaskChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDefaultMask(val);
    localStorage.setItem("defaultMask", val);
  };

  const clearHistory = () => {
    localStorage.removeItem("calcHistory");
    setHistory([]);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    setProfileMessage("");
    setProfileVerificationUrl("");
    setSavingProfile(true);

    const response = await fetch("/api/account/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile)
    });

    const payload = (await response.json()) as { error?: string; profile?: Profile; verificationUrl?: string };
    if (!response.ok) {
      setProfileError(payload.error || "Could not update profile.");
      setSavingProfile(false);
      return;
    }

    if (payload.profile) {
      setProfile(payload.profile);
      await update?.({
        user: {
          name: payload.profile.name,
          email: payload.profile.email
        }
      });
    }

    if (payload.verificationUrl) {
      setProfileVerificationUrl(payload.verificationUrl);
      setProfileMessage("Profile updated. Please verify your new email address.");
    } else {
      setProfileMessage("Profile updated successfully.");
    }

    setSavingProfile(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setSavingPassword(true);
    const response = await fetch("/api/account/password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setPasswordError(payload.error || "Could not update password.");
      setSavingPassword(false);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Password updated successfully.");
    setSavingPassword(false);
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError("");
    setDeletingAccount(true);

    const response = await fetch("/api/account/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: deletePassword })
    });

    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setDeleteError(payload.error || "Could not delete account.");
      setDeletingAccount(false);
      return;
    }

    await signOut({ callbackUrl: "/signup" });
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>

        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 transition-colors overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Account Control</h2>

            <div className="space-y-6">
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                    <input
                      value={profile.name}
                      onChange={(e) => setProfile((prev) => ({ ...prev, name: e.target.value }))}
                      className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                      className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {loadingProfile ? "Loading profile..." : profile.emailVerifiedAt ? "Email verified" : "Email not verified"}
                  </div>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingProfile ? "Saving..." : "Save profile"}
                  </button>
                </div>
              </form>

              {profileError && <p className="text-sm text-red-600 dark:text-red-400">{profileError}</p>}
              {profileMessage && <p className="text-sm text-emerald-600 dark:text-emerald-400">{profileMessage}</p>}
              {profileVerificationUrl && (
                <a href={profileVerificationUrl} className="text-sm text-blue-600 dark:text-blue-400 underline">
                  Verify your new email
                </a>
              )}
            </div>
          </div>

          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Change Password</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full max-w-md p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={savingPassword}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {savingPassword ? "Updating..." : "Update password"}
              </button>
            </form>
            {passwordError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{passwordError}</p>}
            {passwordMessage && <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{passwordMessage}</p>}
          </div>

          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Appearance</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300">Theme Preference</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Toggle between light and dark mode</p>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                  isDarkMode ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span className="sr-only">Toggle dark mode</span>
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isDarkMode ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Calculator Defaults</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Default Subnet Mask
              </label>
              <select
                value={defaultMask}
                onChange={handleMaskChange}
                className="w-full max-w-xs p-2 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="24">/24 (255.255.255.0)</option>
                <option value="16">/16 (255.255.0.0)</option>
                <option value="8">/8 (255.0.0.0)</option>
                <option value="19">/19 (255.255.224.0)</option>
              </select>
            </div>
          </div>

          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Recent Calculations</h2>
              {history.length > 0 && (
                <button onClick={clearHistory} className="text-sm text-red-500 hover:text-red-700">
                  Clear All
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-sm text-gray-500">No recent calculations found.</p>
            ) : (
              <div className="space-y-4">
                {history.map((calc, idx) => (
                  <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between mb-2">
                      <strong className="text-blue-600 dark:text-blue-400">
                        {calc.ip}/{calc.cidr}
                      </strong>
                      <span className="text-xs text-gray-500">{new Date(calc.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                      <p>Network: {calc.network}</p>
                      <p>Broadcast: {calc.broadcast}</p>
                      <p>Mask: {calc.mask}</p>
                      <p>Usable Hosts: {calc.usableHosts}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">Delete Account</h2>
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full max-w-md p-2.5 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
              <button
                type="submit"
                disabled={deletingAccount}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingAccount ? "Deleting..." : "Delete account"}
              </button>
            </form>
            {deleteError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{deleteError}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
