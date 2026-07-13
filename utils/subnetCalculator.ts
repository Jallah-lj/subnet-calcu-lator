export const IPV4_REGEX =
  /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

export const isValidIpv4 = (value: string) => IPV4_REGEX.test(value.trim());

export const ipToInt = (ip: string) => {
  const octets = ip.split(".").map(Number);
  return (octets[0] * 16777216 + octets[1] * 65536 + octets[2] * 256 + octets[3]) >>> 0;
};

export const intToIp = (num: number) =>
  [(num >>> 24) & 0xff, (num >>> 16) & 0xff, (num >>> 8) & 0xff, num & 0xff].join(".");

export const cidrToMaskInt = (cidr: number) => (cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0);

export const cidrToMask = (cidr: number) => intToIp(cidrToMaskInt(cidr));

/** Converts a dotted-decimal subnet mask back to a CIDR prefix length, or null if not a valid contiguous mask. */
export const maskToCidr = (mask: string): number | null => {
  if (!isValidIpv4(mask)) return null;
  const maskInt = ipToInt(mask);
  const inverted = ~maskInt >>> 0;
  // A valid mask, inverted, must be all 1s followed by (all 0s), i.e. (inverted+1) is a power of two (or 0).
  if ((inverted & (inverted + 1)) !== 0) return null;
  let cidr = 0;
  let value = maskInt;
  for (let i = 0; i < 32; i++) {
    if ((value & 0x80000000) !== 0) cidr++;
    value = (value << 1) >>> 0;
  }
  return cidr;
};

export const toBinaryOctets = (ip: string) =>
  ip
    .split(".")
    .map((octet) => Number(octet).toString(2).padStart(8, "0"))
    .join(".");

export const toHex = (ip: string) =>
  ip
    .split(".")
    .map((octet) => Number(octet).toString(16).padStart(2, "0").toUpperCase())
    .join(":");

type Classification = {
  ipClass: "A" | "B" | "C" | "D" | "E";
  scopes: string[];
};

/** Classifies an address by its legacy class and any applicable special-use registry entries (RFC 6890). */
export const classifyAddress = (ip: string): Classification => {
  const octets = ip.split(".").map(Number);
  const [a, b] = octets;
  const scopes: string[] = [];

  let ipClass: Classification["ipClass"] = "E";
  if (a < 128) ipClass = "A";
  else if (a < 192) ipClass = "B";
  else if (a < 224) ipClass = "C";
  else if (a < 240) ipClass = "D";
  else ipClass = "E";

  if (a === 0) scopes.push("This network (RFC 791)");
  if (a === 10) scopes.push("Private-use (RFC 1918)");
  if (a === 127) scopes.push("Loopback (RFC 1122)");
  if (a === 100 && b >= 64 && b <= 127) scopes.push("Carrier-grade NAT (RFC 6598)");
  if (a === 169 && b === 254) scopes.push("Link-local (RFC 3927)");
  if (a === 172 && b >= 16 && b <= 31) scopes.push("Private-use (RFC 1918)");
  if (a === 192 && b === 0 && octets[2] === 0) scopes.push("IETF Protocol Assignments (RFC 6890)");
  if (a === 192 && b === 0 && octets[2] === 2) scopes.push("Documentation TEST-NET-1 (RFC 5737)");
  if (a === 192 && b === 88 && octets[2] === 99) scopes.push("6to4 Relay Anycast (RFC 3068)");
  if (a === 192 && b === 168) scopes.push("Private-use (RFC 1918)");
  if (a === 198 && (b === 18 || b === 19)) scopes.push("Benchmarking (RFC 2544)");
  if (a === 198 && b === 51 && octets[2] === 100) scopes.push("Documentation TEST-NET-2 (RFC 5737)");
  if (a === 203 && b === 0 && octets[2] === 113) scopes.push("Documentation TEST-NET-3 (RFC 5737)");
  if (a >= 224 && a <= 239) scopes.push("Multicast (RFC 5771)");
  if (a === 255 && b === 255 && octets[2] === 255 && octets[3] === 255) scopes.push("Limited broadcast (RFC 919)");
  else if (a >= 240) scopes.push("Reserved for future use (RFC 1112)");

  if (scopes.length === 0) scopes.push("Global unicast");

  return { ipClass, scopes };
};

/** Best-effort reverse DNS zone. Non-octet-aligned prefixes use RFC 2317 classless delegation notation. */
export const reverseDnsZone = (networkIp: string, cidr: number) => {
  const [a, b, c, d] = networkIp.split(".").map(Number);
  if (cidr >= 24) {
    const zone = `${c}.${b}.${a}.in-addr.arpa`;
    return cidr === 24 ? zone : `${d}/${cidr}.${zone}`;
  }
  if (cidr >= 16) return `${b}.${a}.in-addr.arpa`;
  if (cidr >= 8) return `${a}.in-addr.arpa`;
  return "in-addr.arpa";
};

/** Smallest CIDR prefix (largest block) whose usable host count covers the requested number of hosts. */
export const suggestCidrForHosts = (hostsNeeded: number): number | null => {
  if (!Number.isFinite(hostsNeeded) || hostsNeeded <= 0) return null;
  for (let cidr = 32; cidr >= 0; cidr--) {
    const usable = cidr === 32 ? 1 : cidr === 31 ? 2 : Math.pow(2, 32 - cidr) - 2;
    if (usable >= hostsNeeded) return cidr;
  }
  return 0;
};

/**
 * Parses flexible network input: "ip/cidr", "ip cidr", "ip" with a dotted mask, or a bare IP.
 * Returns null when the string can't be resolved to an ip + prefix length.
 */
export const parseNetworkInput = (input: string): { ip: string; cidr: number } | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const slashParts = trimmed.split("/");
  if (slashParts.length === 2) {
    const [ip, cidrOrMask] = [slashParts[0].trim(), slashParts[1].trim()];
    if (!isValidIpv4(ip)) return null;
    if (/^\d{1,2}$/.test(cidrOrMask)) {
      const cidr = Number(cidrOrMask);
      return cidr >= 0 && cidr <= 32 ? { ip, cidr } : null;
    }
    const cidr = maskToCidr(cidrOrMask);
    return cidr === null ? null : { ip, cidr };
  }

  const spaceParts = trimmed.split(/\s+/);
  if (spaceParts.length === 2) {
    const [ip, cidrOrMask] = spaceParts;
    if (!isValidIpv4(ip)) return null;
    if (/^\d{1,2}$/.test(cidrOrMask)) {
      const cidr = Number(cidrOrMask);
      return cidr >= 0 && cidr <= 32 ? { ip, cidr } : null;
    }
    const cidr = maskToCidr(cidrOrMask);
    return cidr === null ? null : { ip, cidr };
  }

  return isValidIpv4(trimmed) ? { ip: trimmed, cidr: 24 } : null;
};

export type SubnetResult = {
  ip: string;
  cidr: number;
  network: string;
  broadcast: string;
  mask: string;
  wildcardMask: string;
  usableHosts: string;
  totalHosts: string;
  firstUsable: string;
  lastUsable: string;
  binary: {
    network: string;
    mask: string;
  };
  hex: {
    network: string;
  };
  ipClass: Classification["ipClass"];
  scopes: string[];
  reverseDns: string;
};

export const calculateSubnet = (ip: string, cidr: number): SubnetResult => {
  const ipInt = ipToInt(ip);
  const maskInt = cidrToMaskInt(cidr);
  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | (~maskInt >>> 0)) >>> 0;
  const network = intToIp(networkInt);
  const mask = intToIp(maskInt);

  let usableHosts = 0;
  if (cidr === 32) usableHosts = 1;
  else if (cidr === 31) usableHosts = 2;
  else usableHosts = Math.max(0, Math.pow(2, 32 - cidr) - 2);

  const totalHosts = Math.pow(2, 32 - cidr);
  const classification = classifyAddress(network);

  return {
    ip,
    cidr,
    network,
    broadcast: intToIp(broadcastInt),
    mask,
    wildcardMask: intToIp((~maskInt) >>> 0),
    usableHosts: usableHosts.toLocaleString(),
    totalHosts: totalHosts.toLocaleString(),
    firstUsable: cidr < 31 ? intToIp(networkInt + 1) : network,
    lastUsable: cidr < 31 ? intToIp(broadcastInt - 1) : intToIp(broadcastInt),
    binary: {
      network: toBinaryOctets(network),
      mask: toBinaryOctets(mask)
    },
    hex: {
      network: toHex(network)
    },
    ipClass: classification.ipClass,
    scopes: classification.scopes,
    reverseDns: reverseDnsZone(network, cidr)
  };
};

export const generateSubnets = (ip: string, baseCidr: number, targetCidr: number) => {
  if (targetCidr <= baseCidr || targetCidr > 32) return [];

  const baseCalc = calculateSubnet(ip, baseCidr);
  const networkInt = ipToInt(baseCalc.network);

  const numSubnets = Math.pow(2, targetCidr - baseCidr);
  const limit = Math.min(numSubnets, 256);
  const increment = Math.pow(2, 32 - targetCidr);

  const subnets = [];
  for (let i = 0; i < limit; i++) {
    const netInt = networkInt + i * increment;
    const calc = calculateSubnet(intToIp(netInt), targetCidr);
    subnets.push({
      index: i + 1,
      network: calc.network,
      broadcast: calc.broadcast,
      range: `${calc.firstUsable} - ${calc.lastUsable}`,
      hosts: calc.usableHosts
    });
  }

  return {
    total: numSubnets,
    displayed: limit,
    subnets
  };
};
