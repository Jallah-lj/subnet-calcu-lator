"use client";

import { useMemo, useState } from "react";
import { generateSubnets } from "@/utils/subnetCalculator";

export default function SubnetMapper({ baseIp, baseCidr }: { baseIp: string; baseCidr: number }) {
  const [targetCidr, setTargetCidr] = useState(baseCidr + 1 > 32 ? 32 : baseCidr + 1);

  const mappedData = useMemo(() => {
    try {
      return generateSubnets(baseIp, baseCidr, targetCidr);
    } catch {
      return null;
    }
  }, [baseIp, baseCidr, targetCidr]);

  if (baseCidr >= 32) {
    return <div className="text-gray-500 text-sm p-4">Cannot map subnets for a /32 address.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Divide into: /{targetCidr}
        </label>
        <input
          type="range"
          min={baseCidr + 1}
          max="32"
          value={targetCidr}
          onChange={(e) => setTargetCidr(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
        />
      </div>

      {mappedData && !Array.isArray(mappedData) && (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              Generated {mappedData.total.toLocaleString()} Subnets
            </span>
            {mappedData.total > 256 && (
              <span className="text-amber-600 dark:text-amber-400">Showing first 256</span>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 sticky top-0">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Network</th>
                  <th className="px-4 py-3">Usable Range</th>
                  <th className="px-4 py-3">Broadcast</th>
                </tr>
              </thead>
              <tbody>
                {mappedData.subnets.map((sub) => (
                  <tr key={sub.index} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-gray-500">{sub.index}</td>
                    <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">{sub.network}</td>
                    <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300">{sub.range}</td>
                    <td className="px-4 py-3 font-mono text-gray-500">{sub.broadcast}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
