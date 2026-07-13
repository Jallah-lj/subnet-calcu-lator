const normalizeGroup = (group: string) => {
  if (!/^[0-9a-fA-F]{1,4}$/.test(group)) throw new Error(`Invalid hextet: "${group}"`);
  return group.toLowerCase().padStart(4, "0");
};

/** Expands an IPv6 address (with optional "::" compression) into its full 8-group form. */
export const expandIpv6 = (address: string): string => {
  const addr = address.trim();
  if (!addr) throw new Error("Address is empty");
  if (addr.includes(":::")) throw new Error("Invalid address: malformed \"::\"");

  const parts = addr.split("::");
  if (parts.length > 2) throw new Error('Invalid address: "::" can only appear once');

  if (parts.length === 1) {
    const groups = addr.split(":");
    if (groups.length !== 8) throw new Error("Invalid address: expected 8 groups");
    return groups.map(normalizeGroup).join(":");
  }

  const head = parts[0] ? parts[0].split(":") : [];
  const tail = parts[1] ? parts[1].split(":") : [];
  const missing = 8 - (head.length + tail.length);
  if (missing < 0) throw new Error("Invalid address: too many groups");

  const groups = [...head, ...Array(missing).fill("0"), ...tail];
  if (groups.length !== 8) throw new Error("Invalid address: wrong group count");
  return groups.map(normalizeGroup).join(":");
};

export const isValidIpv6 = (address: string) => {
  try {
    expandIpv6(address);
    return true;
  } catch {
    return false;
  }
};

/** Compresses an IPv6 address by shortening the longest run of zero groups to "::". */
export const compressIpv6 = (address: string): string => {
  const groups = expandIpv6(address)
    .split(":")
    .map((g) => g.replace(/^0+(?=.)/, ""));

  let bestStart = -1;
  let bestLen = 0;
  let curStart = -1;
  let curLen = 0;

  for (let i = 0; i < groups.length; i++) {
    if (groups[i] === "0") {
      if (curStart === -1) curStart = i;
      curLen++;
      if (curLen > bestLen) {
        bestLen = curLen;
        bestStart = curStart;
      }
    } else {
      curStart = -1;
      curLen = 0;
    }
  }

  if (bestLen < 2) return groups.join(":");

  const left = groups.slice(0, bestStart).join(":");
  const right = groups.slice(bestStart + bestLen).join(":");
  if (!left && !right) return "::";
  if (!left) return `::${right}`;
  if (!right) return `${left}::`;
  return `${left}::${right}`;
};

export const ipv6ToBigInt = (address: string): bigint =>
  expandIpv6(address)
    .split(":")
    .reduce((acc, group) => (acc << 16n) + BigInt(parseInt(group, 16)), 0n);

export const bigIntToIpv6 = (value: bigint): string => {
  let v = value;
  const groups: string[] = [];
  for (let i = 0; i < 8; i++) {
    groups.unshift((v & 0xffffn).toString(16).padStart(4, "0"));
    v >>= 16n;
  }
  return groups.join(":");
};

export type Ipv6SubnetResult = {
  address: string;
  prefixLength: number;
  network: string;
  networkExpanded: string;
  firstAddress: string;
  lastAddress: string;
  totalAddresses: string;
  interfaceIdBits: number;
};

export const calculateIpv6Subnet = (address: string, prefixLength: number): Ipv6SubnetResult => {
  if (!Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 128) {
    throw new Error("Prefix length must be between 0 and 128");
  }

  const addrInt = ipv6ToBigInt(address);
  const hostBits = 128n - BigInt(prefixLength);
  const maskInt = hostBits === 128n ? 0n : (((1n << BigInt(prefixLength)) - 1n) << hostBits);
  const networkInt = addrInt & maskInt;
  const totalAddresses = 1n << hostBits;
  const lastInt = networkInt + totalAddresses - 1n;
  const networkExpanded = bigIntToIpv6(networkInt);

  return {
    address: compressIpv6(address),
    prefixLength,
    network: compressIpv6(networkExpanded),
    networkExpanded,
    firstAddress: compressIpv6(networkExpanded),
    lastAddress: compressIpv6(bigIntToIpv6(lastInt)),
    totalAddresses: totalAddresses.toString(),
    interfaceIdBits: Number(hostBits)
  };
};

/** Derives a modified EUI-64 interface identifier from a 48-bit MAC and combines it with a /64 prefix. */
export const generateEui64 = (prefix: string, mac: string): string => {
  const macClean = mac.replace(/[:\-.]/g, "").toLowerCase();
  if (!/^[0-9a-f]{12}$/.test(macClean)) throw new Error("Invalid MAC address");

  const bytes = macClean.match(/.{2}/g) as string[];
  const firstByte = (parseInt(bytes[0], 16) ^ 0x02).toString(16).padStart(2, "0");
  const eui64Bytes = [firstByte, bytes[1], bytes[2], "ff", "fe", bytes[3], bytes[4], bytes[5]];

  const interfaceId = [
    eui64Bytes[0] + eui64Bytes[1],
    eui64Bytes[2] + eui64Bytes[3],
    eui64Bytes[4] + eui64Bytes[5],
    eui64Bytes[6] + eui64Bytes[7]
  ].join(":");

  const prefixGroups = expandIpv6(prefix).split(":").slice(0, 4).join(":");
  return compressIpv6(`${prefixGroups}:${interfaceId}`);
};

export const COMMON_IPV6_PREFIXES = [
  { prefix: "/128", use: "Single host / loopback route" },
  { prefix: "/64", use: "Standard LAN subnet (SLAAC-capable)" },
  { prefix: "/56", use: "Typical site/customer delegation" },
  { prefix: "/48", use: "Typical site allocation (multiple /64 subnets)" },
  { prefix: "/32", use: "Typical ISP allocation from a RIR" },
  { prefix: "/127", use: "Point-to-point link (RFC 6164)" }
];
