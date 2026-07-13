import { calculateSubnet, cidrToMask, intToIp, ipToInt, suggestCidrForHosts } from "@/utils/subnetCalculator";

export type NetworkRange = { start: number; end: number };

export const networkRange = (ip: string, cidr: number): NetworkRange => {
  const calc = calculateSubnet(ip, cidr);
  const start = ipToInt(calc.network);
  const end = ipToInt(calc.broadcast);
  return { start, end };
};

export type OverlapResult = "equal" | "a-contains-b" | "b-contains-a" | "overlap" | "none";

export const checkOverlap = (a: { ip: string; cidr: number }, b: { ip: string; cidr: number }): OverlapResult => {
  const ra = networkRange(a.ip, a.cidr);
  const rb = networkRange(b.ip, b.cidr);

  if (ra.start === rb.start && ra.end === rb.end) return "equal";
  if (ra.start <= rb.start && ra.end >= rb.end) return "a-contains-b";
  if (rb.start <= ra.start && rb.end >= ra.end) return "b-contains-a";
  if (ra.start <= rb.end && rb.start <= ra.end) return "overlap";
  return "none";
};

/** Decomposes an address range into the minimal set of CIDR-aligned blocks that exactly cover it. */
export const rangeToCidrs = (startInt: number, endInt: number) => {
  const blocks: { network: string; cidr: number; addresses: number }[] = [];
  let cursor = startInt;

  while (cursor <= endInt) {
    let maxBits = 32;
    for (let bits = 0; bits <= 32; bits++) {
      const size = Math.pow(2, bits);
      if (cursor % size !== 0) break;
      maxBits = bits;
    }
    while (cursor + Math.pow(2, maxBits) - 1 > endInt) maxBits--;

    const size = Math.pow(2, maxBits);
    blocks.push({ network: intToIp(cursor), cidr: 32 - maxBits, addresses: size });
    cursor += size;
  }

  return blocks;
};

export type VlsmRequirement = { id: string; name: string; hosts: number };

export type VlsmAllocation = {
  id: string;
  name: string;
  hostsRequested: number;
  cidr: number;
  mask: string;
  network: string;
  broadcast: string;
  firstUsable: string;
  lastUsable: string;
  hostsAvailable: number;
};

export type VlsmResult =
  | {
      ok: true;
      allocations: VlsmAllocation[];
      totalAddressesUsed: number;
      remaining: { network: string; cidr: number; addresses: number }[];
    }
  | { ok: false; error: string };

/** Allocates variable-length subnets from a base block using the standard largest-first VLSM method. */
export const allocateVlsm = (baseIp: string, baseCidr: number, requirements: VlsmRequirement[]): VlsmResult => {
  if (requirements.length === 0) return { ok: false, error: "Add at least one subnet requirement." };

  const base = calculateSubnet(baseIp, baseCidr);
  const baseStart = ipToInt(base.network);
  const baseEnd = ipToInt(base.broadcast);
  const baseSize = baseEnd - baseStart + 1;

  const sized = requirements.map((req) => {
    const cidr = suggestCidrForHosts(req.hosts);
    return { ...req, cidr };
  });

  const invalid = sized.find((req) => req.cidr === null);
  if (invalid) return { ok: false, error: `"${invalid.name}" requests more hosts than a single IPv4 network can hold.` };

  // Largest block first = smallest CIDR number first; this ordering keeps every
  // subsequent block naturally aligned to its own prefix boundary.
  const ordered = [...sized].sort((a, b) => (a.cidr as number) - (b.cidr as number));

  const totalNeeded = ordered.reduce((sum, req) => sum + Math.pow(2, 32 - (req.cidr as number)), 0);
  if (totalNeeded > baseSize) {
    return {
      ok: false,
      error: `Requirements need ${totalNeeded.toLocaleString()} addresses but ${baseIp}/${baseCidr} only has ${baseSize.toLocaleString()}.`
    };
  }

  const allocations: VlsmAllocation[] = [];
  let cursor = baseStart;

  for (const req of ordered) {
    const cidr = req.cidr as number;
    const size = Math.pow(2, 32 - cidr);
    const network = intToIp(cursor);
    const calc = calculateSubnet(network, cidr);

    allocations.push({
      id: req.id,
      name: req.name,
      hostsRequested: req.hosts,
      cidr,
      mask: calc.mask,
      network: calc.network,
      broadcast: calc.broadcast,
      firstUsable: calc.firstUsable,
      lastUsable: calc.lastUsable,
      hostsAvailable: cidr === 32 ? 1 : cidr === 31 ? 2 : size - 2
    });

    cursor += size;
  }

  const remaining = cursor <= baseEnd ? rangeToCidrs(cursor, baseEnd) : [];

  return {
    ok: true,
    allocations,
    totalAddressesUsed: cursor - baseStart,
    remaining
  };
};

export type SupernetResult =
  | { ok: true; network: string; cidr: number; mask: string; coversExtraAddresses: boolean }
  | { ok: false; error: string };

/** Finds the smallest single CIDR block that contains every given network (classic route summarization). */
export const summarizeToSupernet = (entries: { ip: string; cidr: number }[]): SupernetResult => {
  if (entries.length === 0) return { ok: false, error: "Add at least one network to summarize." };

  const ranges = entries.map((e) => networkRange(e.ip, e.cidr));
  const start = Math.min(...ranges.map((r) => r.start));
  const end = Math.max(...ranges.map((r) => r.end));

  for (let cidr = 32; cidr >= 0; cidr--) {
    const size = Math.pow(2, 32 - cidr);
    const maskInt = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
    const networkStart = (start & maskInt) >>> 0;
    if (networkStart <= start && networkStart + size - 1 >= end) {
      const coversExtraAddresses = networkStart !== start || networkStart + size - 1 !== end;
      return { ok: true, network: intToIp(networkStart), cidr, mask: cidrToMask(cidr), coversExtraAddresses };
    }
  }

  return { ok: true, network: "0.0.0.0", cidr: 0, mask: cidrToMask(0), coversExtraAddresses: true };
};
