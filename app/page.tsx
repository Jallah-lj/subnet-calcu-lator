"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { calculateSubnet } from "@/utils/subnetCalculator";
import SubnetMapper from "@/components/SubnetMapper";
import CidrCheatSheet from "@/components/CidrCheatSheet";

const GUEST_FREE_CALCULATIONS = 6;
type Tab = "calculator" | "mapper" | "reference";
type HistoryEntry = {
  ip: string;
  cidr: number;
  timestamp: string;
  network: string;
  broadcast: string;
  mask: string;
  usableHosts: string;
};

export default function SubnetCalculator() {
  const { status } = useSession();
  const [ip, setIp] = useState("192.168.1.0");
  const [cidr, setCidr] = useState(24);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("calculator");
  const [guestCalculationCount, setGuestCalculationCount] = useState(0);
  const [lastTrackedInput, setLastTrackedInput] = useState<string | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const isValidIp = (value: string) =>
    /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
      value
    );

  const results = useMemo(() => {
    if (!isValidIp(ip)) return null;
    return calculateSubnet(ip, cidr);
  }, [ip, cidr]);

  const handleIpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setIp(val);
    setError(isValidIp(val) ? "" : "Invalid IPv4 format");
  };

  const copyToClipboard = () => {
    if (!results) return;
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
  };

  useEffect(() => {
    const defaultMask = localStorage.getItem("defaultMask");
    if (defaultMask) setCidr(Number(defaultMask));
  }, []);

  useEffect(() => {
    const storedCount = Number(localStorage.getItem("guestCalculationCount") || "0");
    setGuestCalculationCount(Number.isFinite(storedCount) ? storedCount : 0);
    setSettingsLoaded(true);
  }, [status]);

  useEffect(() => {
    if (status !== "unauthenticated" || !results) return;

    const inputKey = `${ip}/${cidr}`;

    if (lastTrackedInput === null) {
      setLastTrackedInput(inputKey);
      return;
    }

    if (lastTrackedInput === inputKey) return;

    const nextCount = guestCalculationCount + 1;
    setGuestCalculationCount(nextCount);
    setLastTrackedInput(inputKey);
    localStorage.setItem("guestCalculationCount", String(nextCount));
  }, [cidr, guestCalculationCount, ip, lastTrackedInput, results, status]);

  useEffect(() => {
    if (activeTab !== "calculator" || !results || !settingsLoaded) return;

    const historyItem = {
      ip,
      cidr,
      timestamp: new Date().toISOString(),
      ...results
    };

    const currentHistory = JSON.parse(localStorage.getItem("calcHistory") || "[]") as HistoryEntry[];
    if (currentHistory.length === 0 || currentHistory[0].ip !== ip || currentHistory[0].cidr !== cidr) {
      const newHistory = [historyItem, ...currentHistory].slice(0, 10);
      localStorage.setItem("calcHistory", JSON.stringify(newHistory));
    }
  }, [activeTab, cidr, ip, results, settingsLoaded]);

  const freeCalculationsLeft = Math.max(0, GUEST_FREE_CALCULATIONS - guestCalculationCount);
  const showLoginPrompt = status === "unauthenticated" && freeCalculationsLeft === 0;

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950 p-4 md:p-8 transition-colors">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 transition-colors overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {(["calculator", "mapper", "reference"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab !== "reference" && (
            <div className="mb-8 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Target IPv4 Address / Network Base
                </label>
                <input
                  type="text"
                  value={ip}
                  onChange={handleIpChange}
                  className={`w-full max-w-xl p-2 border rounded-md focus:outline-none focus:ring-2 bg-transparent dark:text-white transition-colors ${
                    error
                      ? "border-red-500 focus:ring-red-200 dark:focus:ring-red-900"
                      : "border-gray-300 dark:border-gray-700 focus:ring-blue-200 dark:focus:ring-blue-900"
                  }`}
                />
                {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  Base CIDR: /{cidr}
                </label>
                <input
                  type="range"
                  min="0"
                  max="32"
                  value={cidr}
                  onChange={(e) => setCidr(Number(e.target.value))}
                  className="w-full max-w-xl h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          )}

          {activeTab === "calculator" && status === "unauthenticated" && (
            <div
              className={`mb-4 p-3 rounded-lg border text-sm ${
                showLoginPrompt
                  ? "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300"
                  : "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300"
              }`}
            >
              {showLoginPrompt ? (
                <p>
                  Guest mode limit reached.{" "}
                  <Link href="/login?callbackUrl=/" className="underline font-medium">
                    Sign in
                  </Link>{" "}
                  to keep your work safe and continue without limits.
                </p>
              ) : (
                <p>
                  Guest mode active: {freeCalculationsLeft} free calculation{freeCalculationsLeft === 1 ? "" : "s"} left
                  before login is recommended.
                </p>
              )}
            </div>
          )}

          {activeTab === "calculator" && results && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm space-y-3 relative border border-gray-200 dark:border-gray-700">
              <button
                onClick={copyToClipboard}
                className="absolute top-3 right-3 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition-colors"
              >
                Copy JSON
              </button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <p className="text-gray-800 dark:text-gray-200">
                  <strong>Network:</strong>{" "}
                  <span className="font-mono text-blue-600 dark:text-blue-400">{results.network}</span>
                </p>
                <p className="text-gray-800 dark:text-gray-200">
                  <strong>Broadcast:</strong> <span className="font-mono">{results.broadcast}</span>
                </p>
                <p className="text-gray-800 dark:text-gray-200">
                  <strong>Subnet Mask:</strong> <span className="font-mono">{results.mask}</span>
                </p>
                <p className="text-gray-800 dark:text-gray-200">
                  <strong>Usable Hosts:</strong> {results.usableHosts}
                </p>
                <p className="text-gray-800 dark:text-gray-200">
                  <strong>Host Range:</strong>{" "}
                  <span className="font-mono">
                    {results.firstUsable} - {results.lastUsable}
                  </span>
                </p>
              </div>
            </div>
          )}

          {activeTab === "mapper" && results && <SubnetMapper baseIp={results.network} baseCidr={cidr} />}

          {activeTab === "reference" && <CidrCheatSheet />}
        </div>
      </div>
    </main>
  );
}
