"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { calculateSubnet, isValidIpv4, parseNetworkInput, suggestCidrForHosts } from "@/utils/subnetCalculator";
import SubnetMapper from "@/components/SubnetMapper";
import CidrCheatSheet from "@/components/CidrCheatSheet";
import CopyField from "@/components/CopyField";
import VlsmPlanner from "@/components/VlsmPlanner";
import NetworkAggregator from "@/components/NetworkAggregator";
import Ipv6Calculator from "@/components/Ipv6Calculator";

const GUEST_FREE_CALCULATIONS = 6;
type Tab = "calculator" | "planner" | "ipv6" | "reference";
type PlannerMode = "split" | "vlsm" | "aggregate";
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
  const [plannerMode, setPlannerMode] = useState<PlannerMode>("split");
  const [hostsNeeded, setHostsNeeded] = useState("");
  const [guestCalculationCount, setGuestCalculationCount] = useState(0);
  const [lastTrackedInput, setLastTrackedInput] = useState<string | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const results = useMemo(() => {
    if (!isValidIpv4(ip)) return null;
    return calculateSubnet(ip, cidr);
  }, [ip, cidr]);

  const suggestedCidr = useMemo(() => {
    const hosts = Number(hostsNeeded);
    return hostsNeeded && hosts > 0 ? suggestCidrForHosts(hosts) : null;
  }, [hostsNeeded]);

  const handleIpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.includes("/")) {
      const parsed = parseNetworkInput(raw);
      if (parsed) {
        setIp(parsed.ip);
        setCidr(parsed.cidr);
        setError("");
        return;
      }
    }
    setIp(raw);
    setError(isValidIpv4(raw) ? "" : "Invalid IPv4 format");
  };

  const handleCidrInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    if (Number.isNaN(raw)) return;
    setCidr(Math.min(32, Math.max(0, Math.round(raw))));
  };

  const copyToClipboard = () => {
    if (!results) return;
    navigator.clipboard.writeText(JSON.stringify(results, null, 2));
  };

  const copyLink = async () => {
    if (typeof window === "undefined") return;
    await navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1500);
  };

  // Prefill from a shared link, e.g. /?ip=10.0.0.0&cidr=8
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const qIp = params.get("ip");
    const qCidr = params.get("cidr");
    if (qIp && isValidIpv4(qIp)) setIp(qIp);
    if (qCidr && /^\d{1,2}$/.test(qCidr)) setCidr(Math.min(32, Math.max(0, Number(qCidr))));
  }, []);

  // Keep the URL in sync so the current calculation is always shareable.
  useEffect(() => {
    if (!results || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("ip", ip);
    params.set("cidr", String(cidr));
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [ip, cidr, results]);

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
      network: results.network,
      broadcast: results.broadcast,
      mask: results.mask,
      usableHosts: results.usableHosts
    };

    const currentHistory = JSON.parse(localStorage.getItem("calcHistory") || "[]") as HistoryEntry[];
    const isNewEntry = currentHistory.length === 0 || currentHistory[0].ip !== ip || currentHistory[0].cidr !== cidr;
    if (!isNewEntry) return;

    const newHistory = [historyItem, ...currentHistory].slice(0, 10);
    localStorage.setItem("calcHistory", JSON.stringify(newHistory));

    if (status === "authenticated") {
      void fetch("/api/user/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(historyItem)
      });
    }
  }, [activeTab, cidr, ip, results, settingsLoaded, status]);

  const freeCalculationsLeft = Math.max(0, GUEST_FREE_CALCULATIONS - guestCalculationCount);
  const showLoginPrompt = status === "unauthenticated" && freeCalculationsLeft === 0;
  const showIpv4Input = activeTab === "calculator" || (activeTab === "planner" && plannerMode !== "aggregate");

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-950 p-4 md:p-8 transition-colors">
      <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 transition-colors overflow-hidden">
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          {(["calculator", "planner", "ipv6", "reference"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-4 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? "border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {tab === "ipv6" ? "IPv6" : tab}
            </button>
          ))}
        </div>

        <div className="p-6">
          {showIpv4Input && (
            <div className="mb-8 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                  IPv4 Address <span className="text-gray-400 font-normal">(paste "10.0.0.0/24" to set both fields at once)</span>
                </label>
                <input
                  type="text"
                  value={ip}
                  onChange={handleIpChange}
                  className={`w-full max-w-xl p-2 border rounded-md focus:outline-none focus:ring-2 bg-transparent dark:text-white transition-colors font-mono ${
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
                <div className="flex items-center gap-3 max-w-xl">
                  <input
                    type="range"
                    min="0"
                    max="32"
                    value={cidr}
                    onChange={(e) => setCidr(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="32"
                    value={cidr}
                    onChange={handleCidrInputChange}
                    className="w-16 p-1.5 text-center border border-gray-300 dark:border-gray-700 rounded-md bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
                  />
                </div>
              </div>

              <div className="flex items-end gap-2 flex-wrap">
                <div>
                  <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">
                    Need a specific host count?
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 500"
                    value={hostsNeeded}
                    onChange={(e) => setHostsNeeded(e.target.value)}
                    className="w-32 p-1.5 border border-gray-300 dark:border-gray-700 rounded-md bg-transparent dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
                  />
                </div>
                {suggestedCidr !== null && (
                  <button
                    type="button"
                    onClick={() => setCidr(suggestedCidr)}
                    className="px-3 py-1.5 text-sm rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    Use /{suggestedCidr}
                  </button>
                )}
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
            <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm space-y-1 relative border border-gray-200 dark:border-gray-700">
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  onClick={copyLink}
                  className="text-xs bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded transition-colors"
                >
                  {linkCopied ? "Link copied!" : "Copy Link"}
                </button>
                <button
                  onClick={copyToClipboard}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition-colors"
                >
                  Copy JSON
                </button>
              </div>

              <div className="mb-3 pr-40">
                <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 mr-1">
                  Class {results.ipClass}
                </span>
                {results.scopes.map((scope) => (
                  <span
                    key={scope}
                    className="inline-block text-xs px-2 py-0.5 rounded bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 mr-1 mb-1"
                  >
                    {scope}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                <CopyField label="Network" value={results.network} />
                <CopyField label="Broadcast" value={results.broadcast} />
                <CopyField label="Subnet Mask" value={results.mask} />
                <CopyField label="Wildcard Mask" value={results.wildcardMask} />
                <CopyField label="Usable Hosts" value={results.usableHosts} mono={false} />
                <CopyField label="Total Addresses" value={results.totalHosts} mono={false} />
                <CopyField label="First Usable" value={results.firstUsable} />
                <CopyField label="Last Usable" value={results.lastUsable} />
                <CopyField label="Reverse DNS Zone" value={results.reverseDns} />
              </div>

              <div className="pt-2 mt-2 border-t border-gray-200 dark:border-gray-700 space-y-1">
                <CopyField label="Network (binary)" value={results.binary.network} />
                <CopyField label="Mask (binary)" value={results.binary.mask} />
                <CopyField label="Network (hex)" value={results.hex.network} />
              </div>
            </div>
          )}

          {activeTab === "planner" && (
            <div>
              <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-800">
                {(
                  [
                    ["split", "Equal Split"],
                    ["vlsm", "VLSM Planner"],
                    ["aggregate", "Aggregate & Overlap"]
                  ] as [PlannerMode, string][]
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    onClick={() => setPlannerMode(mode)}
                    className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                      plannerMode === mode
                        ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                        : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {plannerMode === "split" && results && <SubnetMapper baseIp={results.network} baseCidr={cidr} />}
              {plannerMode === "vlsm" && results && <VlsmPlanner baseIp={results.network} baseCidr={cidr} />}
              {plannerMode === "aggregate" && <NetworkAggregator />}
            </div>
          )}

          {activeTab === "ipv6" && <Ipv6Calculator />}

          {activeTab === "reference" && <CidrCheatSheet />}
        </div>
      </div>
    </main>
  );
}
