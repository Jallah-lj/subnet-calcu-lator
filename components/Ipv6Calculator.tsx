"use client";

import { useMemo, useState } from "react";
import {
  COMMON_IPV6_PREFIXES,
  calculateIpv6Subnet,
  compressIpv6,
  expandIpv6,
  generateEui64
} from "@/utils/ipv6Calculator";
import CopyField from "@/components/CopyField";

export default function Ipv6Calculator() {
  const [address, setAddress] = useState("2001:db8::");
  const [prefixLength, setPrefixLength] = useState(64);
  const [eui64Prefix, setEui64Prefix] = useState("fe80::");
  const [eui64Mac, setEui64Mac] = useState("00:1A:2B:3C:4D:5E");

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.includes("/")) {
      const [addr, prefix] = raw.split("/");
      const prefixNum = Number(prefix);
      if (addr && /^\d{1,3}$/.test(prefix) && prefixNum >= 0 && prefixNum <= 128) {
        setAddress(addr.trim());
        setPrefixLength(prefixNum);
        return;
      }
    }
    setAddress(raw);
  };

  const { result, error } = useMemo(() => {
    try {
      return { result: calculateIpv6Subnet(address, prefixLength), error: null as string | null };
    } catch (e) {
      return { result: null, error: e instanceof Error ? e.message : "Invalid address" };
    }
  }, [address, prefixLength]);

  const expanded = useMemo(() => {
    try {
      return expandIpv6(address);
    } catch {
      return null;
    }
  }, [address]);

  const { eui64, eui64Error } = useMemo(() => {
    try {
      return { eui64: generateEui64(eui64Prefix, eui64Mac), eui64Error: null as string | null };
    } catch (e) {
      return { eui64: null, eui64Error: e instanceof Error ? e.message : "Invalid input" };
    }
  }, [eui64Prefix, eui64Mac]);

  return (
    <div className="space-y-8">
      <div>
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
              IPv6 Address <span className="text-gray-400 font-normal">(paste "2001:db8::/32" to set both fields)</span>
            </label>
            <input
              type="text"
              value={address}
              onChange={handleAddressChange}
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
              Prefix Length: /{prefixLength}
            </label>
            <div className="flex items-center gap-3 max-w-xl">
              <input
                type="range"
                min="0"
                max="128"
                value={prefixLength}
                onChange={(e) => setPrefixLength(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
              <input
                type="number"
                min="0"
                max="128"
                value={prefixLength}
                onChange={(e) => setPrefixLength(Math.min(128, Math.max(0, Math.round(Number(e.target.value) || 0))))}
                className="w-16 p-1.5 text-center border border-gray-300 dark:border-gray-700 rounded-md bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
              />
            </div>
          </div>
        </div>

        {result && (
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 text-sm space-y-1">
            {expanded && <CopyField label="Expanded" value={expanded} />}
            <CopyField label="Compressed" value={compressIpv6(address)} />
            <CopyField label="Network" value={`${result.network}/${result.prefixLength}`} />
            <CopyField label="First Address" value={result.firstAddress} />
            <CopyField label="Last Address" value={result.lastAddress} />
            <CopyField label="Total Addresses" value={result.totalAddresses} mono={false} />
            <CopyField label="Interface ID Bits" value={String(result.interfaceIdBits)} mono={false} />
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">EUI-64 Address Generator</h3>
        <div className="grid gap-3 md:grid-cols-2 mb-3">
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">Prefix (/64)</label>
            <input
              type="text"
              value={eui64Prefix}
              onChange={(e) => setEui64Prefix(e.target.value)}
              className="w-full p-2 text-sm font-mono border border-gray-300 dark:border-gray-700 rounded-md bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">MAC Address</label>
            <input
              type="text"
              value={eui64Mac}
              onChange={(e) => setEui64Mac(e.target.value)}
              className="w-full p-2 text-sm font-mono border border-gray-300 dark:border-gray-700 rounded-md bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
            />
          </div>
        </div>
        {eui64Error ? (
          <p className="text-red-500 text-xs">{eui64Error}</p>
        ) : eui64 ? (
          <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
            <CopyField label="Interface Address" value={eui64} />
          </div>
        ) : null}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Common Prefix Lengths</h3>
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              <tr>
                <th className="px-4 py-3">Prefix</th>
                <th className="px-4 py-3">Typical Use Case</th>
              </tr>
            </thead>
            <tbody>
              {COMMON_IPV6_PREFIXES.map((item) => (
                <tr key={item.prefix} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">{item.prefix}</td>
                  <td className="px-4 py-3 text-gray-500">{item.use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
