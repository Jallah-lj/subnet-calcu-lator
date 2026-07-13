"use client";

import { useMemo, useState } from "react";
import { allocateVlsm, type VlsmRequirement } from "@/utils/networkPlanning";
import { downloadCsv, rowsToCsv } from "@/utils/csv";

let nextId = 1;
const makeId = () => `req-${nextId++}`;

export default function VlsmPlanner({ baseIp, baseCidr }: { baseIp: string; baseCidr: number }) {
  const [requirements, setRequirements] = useState<VlsmRequirement[]>([
    { id: makeId(), name: "Subnet A", hosts: 50 },
    { id: makeId(), name: "Subnet B", hosts: 20 }
  ]);

  const result = useMemo(() => allocateVlsm(baseIp, baseCidr, requirements), [baseIp, baseCidr, requirements]);

  const addRequirement = () => {
    setRequirements((prev) => [...prev, { id: makeId(), name: `Subnet ${prev.length + 1}`, hosts: 10 }]);
  };

  const removeRequirement = (id: string) => {
    setRequirements((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRequirement = (id: string, patch: Partial<VlsmRequirement>) => {
    setRequirements((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const exportCsv = () => {
    if (!result.ok) return;
    const rows = result.allocations.map((a) => ({
      Name: a.name,
      "Hosts Requested": a.hostsRequested,
      Network: `${a.network}/${a.cidr}`,
      Mask: a.mask,
      "First Usable": a.firstUsable,
      "Last Usable": a.lastUsable,
      Broadcast: a.broadcast,
      "Hosts Available": a.hostsAvailable
    }));
    downloadCsv("vlsm-plan.csv", rowsToCsv(rows));
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Requirements for {baseIp}/{baseCidr}
          </h3>
          <button
            onClick={addRequirement}
            className="text-xs px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
          >
            + Add subnet
          </button>
        </div>

        <div className="space-y-2">
          {requirements.map((req) => (
            <div key={req.id} className="flex items-center gap-2">
              <input
                type="text"
                value={req.name}
                onChange={(e) => updateRequirement(req.id, { name: e.target.value })}
                placeholder="Name"
                className="flex-1 p-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
              />
              <input
                type="number"
                min="1"
                value={req.hosts}
                onChange={(e) => updateRequirement(req.id, { hosts: Math.max(1, Number(e.target.value) || 1) })}
                placeholder="Hosts"
                className="w-28 p-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-transparent dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900"
              />
              <button
                onClick={() => removeRequirement(req.id)}
                className="text-xs text-red-500 hover:text-red-700 px-2"
                aria-label={`Remove ${req.name}`}
              >
                Remove
              </button>
            </div>
          ))}
          {requirements.length === 0 && (
            <p className="text-sm text-gray-500">Add at least one subnet requirement to generate a plan.</p>
          )}
        </div>
      </div>

      {!result.ok && requirements.length > 0 && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          {result.error}
        </p>
      )}

      {result.ok && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Allocation Plan</span>
            <button
              onClick={exportCsv}
              className="text-xs px-3 py-1.5 rounded-md bg-gray-600 hover:bg-gray-700 text-white transition-colors"
            >
              Export CSV
            </button>
          </div>

          <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Network</th>
                  <th className="px-4 py-3">Usable Range</th>
                  <th className="px-4 py-3">Mask</th>
                  <th className="px-4 py-3">Hosts</th>
                </tr>
              </thead>
              <tbody>
                {result.allocations.map((a) => (
                  <tr key={a.id} className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{a.name}</td>
                    <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">
                      {a.network}/{a.cidr}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300">
                      {a.firstUsable} - {a.lastUsable}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-500">{a.mask}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {a.hostsAvailable} <span className="text-gray-400">(needed {a.hostsRequested})</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {result.remaining.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase">
                Unallocated space ({result.remaining.reduce((sum, r) => sum + r.addresses, 0).toLocaleString()} addresses)
              </p>
              <div className="flex flex-wrap gap-2">
                {result.remaining.map((block) => (
                  <span
                    key={block.network}
                    className="text-xs font-mono px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                  >
                    {block.network}/{block.cidr}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
