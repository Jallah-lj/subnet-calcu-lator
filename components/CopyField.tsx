"use client";

import { useState } from "react";

export default function CopyField({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group flex items-center justify-between gap-2 w-full text-left px-2 py-1 -mx-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors"
      title="Click to copy"
    >
      <span className="text-gray-800 dark:text-gray-200">
        <strong className="font-medium">{label}:</strong>{" "}
        <span className={mono ? "font-mono" : ""}>{value}</span>
      </span>
      <span className="text-xs text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {copied ? "Copied!" : "Copy"}
      </span>
    </button>
  );
}
