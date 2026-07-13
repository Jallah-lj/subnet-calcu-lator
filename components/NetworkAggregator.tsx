"use client";

import { useMemo, useState } from "react";
import { parseNetworkInput } from "@/utils/subnetCalculator";
import { checkOverlap, summarizeToSupernet, type OverlapResult } from "@/utils/networkPlanning";

let nextId = 1;
const makeId = () => `net-${nextId++}`;

type Entry = { id: string; value: string };

const OVERLAP_LABEL: Record<Exclude<OverlapResult, "none">, string> = {
  equal: "identical networks",
  "a-contains-b": "first contains second",
  "b-contains-a": "second contains first",
  overlap: "partially overlapping"
};

export default function NetworkAggregator() {
  const [entries, setEntries] = useState<Entry[]>([
    { id: makeId(), value: "192.168.0.0/24" },
    { id: makeId(), value: "192.168.1.0/24" }
  ]);

  const parsed = useMemo(
    () =>
      entries.map((entry) => ({
        entry,
        result: entry.value.trim() ? parseNetworkInput(entry.value) : null
      })),
    [entries]
  );

  const validEntries = useMemo(
    () => parsed.filter((p) => p.result !== null) as { entry: Entry; result: { ip: string; cidr: number } }[],
    [parsed]
  );

  const conflicts = useMemo(() => {
    const found: { a: Entry; b: Entry; relation: Exclude<OverlapResult, "none"> }[] = [];
    for (let i = 0; i < validEntries.length; i++) {
      for (let j = i + 1; j < validEntries.length; j++) {
        const relation = checkOverlap(validEntries[i].result, validEntries[j].result);
        if (relation !== "none") found.push({ a: validEntries[i].entry, b: validEntries[j].entry, relation });
      }
    }
    return found;
  }, [validEntries]);

  const supernet = useMemo(
    () => (validEntries.length > 0 ? summarizeToSupernet(validEntries.map((v) => v.result)) : null),
    [validEntries]
  );

  const addEntry = () => setEntries((prev) => [...prev, { id: makeId(), value: "" }]);
  const removeEntry = (id: string) => setEntries((prev) => prev.filter((e) => e.id !== id));
  const updateEntry = (id: string, value: string) =>
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, value } : e)));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Networks</h3>
          <button
            onClick={addEntry}
            className="text-xs px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 transition-colors"
          >
            + Add network
          </button>
        </div>

        <div className="space-y-2">
          {parsed.map(({ entry, result }) => (
            <div key={entry.id} className="flex items-center gap-2">
              <input
                type="text"
                value={entry.value}
                onChange={(e) => updateEntry(entry.id, e.target.value)}
                placeholder="e.g. 10.0.0.0/24"
                className={`flex-1 p-2 text-sm font-mono border rounded-md bg-transparent dark:text-white focus:outline-none focus:ring-2 ${
                  entry.value.trim() && !result
                    ? "border-red-500 focus:ring-red-200 dark:focus:ring-red-900"
                    : "border-gray-300 dark:border-gray-700 focus:ring-blue-200 dark:focus:ring-blue-900"
                }`}
              />
              <button
                onClick={() => removeEntry(entry.id)}
                className="text-xs text-red-500 hover:text-red-700 px-2"
                aria-label="Remove network"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Overlap Check</h3>
        {validEntries.length < 2 ? (
          <p className="text-sm text-gray-500">Add at least two valid networks to check for overlap.</p>
        ) : conflicts.length === 0 ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
            No overlaps detected between the {validEntries.length} networks.
          </p>
        ) : (
          <ul className="space-y-2">
            {conflicts.map((c, idx) => (
              <li
                key={idx}
                className="text-sm text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3"
              >
                <span className="font-mono">{c.a.value}</span> and <span className="font-mono">{c.b.value}</span>{" "}
                {OVERLAP_LABEL[c.relation]}.
              </li>
            ))}
          </ul>
        )}
      </div>

      {supernet && supernet.ok && (
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Route Summarization</h3>
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 text-sm space-y-1">
            <p className="text-gray-800 dark:text-gray-200">
              <strong>Smallest covering supernet:</strong>{" "}
              <span className="font-mono text-blue-600 dark:text-blue-400">
                {supernet.network}/{supernet.cidr}
              </span>
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Mask:</strong> <span className="font-mono">{supernet.mask}</span>
            </p>
            {supernet.coversExtraAddresses && (
              <p className="text-amber-600 dark:text-amber-400 text-xs">
                Note: this supernet also covers address space outside the networks you listed, since they don&apos;t
                pack into a single aligned block on their own.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
