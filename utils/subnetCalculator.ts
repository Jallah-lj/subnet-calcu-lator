const ipToInt = (ip: string) => {
  const octets = ip.split(".").map(Number);
  return ((octets[0] * 16777216) + (octets[1] * 65536) + (octets[2] * 256) + octets[3]) >>> 0;
};

const intToIp = (num: number) =>
  [(num >>> 24) & 0xff, (num >>> 16) & 0xff, (num >>> 8) & 0xff, num & 0xff].join(".");

export const calculateSubnet = (ip: string, cidr: number) => {
  const ipInt = ipToInt(ip);
  const mask = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
  const networkInt = (ipInt & mask) >>> 0;
  const broadcastInt = (networkInt | ~mask) >>> 0;

  let usableHosts = 0;
  if (cidr === 32) usableHosts = 1;
  else if (cidr === 31) usableHosts = 2;
  else usableHosts = Math.max(0, Math.pow(2, 32 - cidr) - 2);

  return {
    network: intToIp(networkInt),
    broadcast: intToIp(broadcastInt),
    mask: intToIp(mask),
    usableHosts: usableHosts.toLocaleString(),
    firstUsable: cidr < 31 ? intToIp(networkInt + 1) : intToIp(networkInt),
    lastUsable: cidr < 31 ? intToIp(broadcastInt - 1) : intToIp(broadcastInt)
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
    const netInt = networkInt + (i * increment);
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
