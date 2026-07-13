import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateSubnet,
  classifyAddress,
  isValidIpv4,
  maskToCidr,
  parseNetworkInput,
  reverseDnsZone,
  suggestCidrForHosts
} from "./subnetCalculator";

test("calculateSubnet computes a standard /24", () => {
  const result = calculateSubnet("192.168.1.10", 24);
  assert.equal(result.network, "192.168.1.0");
  assert.equal(result.broadcast, "192.168.1.255");
  assert.equal(result.mask, "255.255.255.0");
  assert.equal(result.wildcardMask, "0.0.0.255");
  assert.equal(result.usableHosts, "254");
  assert.equal(result.firstUsable, "192.168.1.1");
  assert.equal(result.lastUsable, "192.168.1.254");
});

test("calculateSubnet handles the /31 point-to-point special case (RFC 3021)", () => {
  const result = calculateSubnet("10.0.0.0", 31);
  assert.equal(result.usableHosts, "2");
  assert.equal(result.firstUsable, "10.0.0.0");
  assert.equal(result.lastUsable, "10.0.0.1");
});

test("calculateSubnet handles the /32 host route", () => {
  const result = calculateSubnet("10.0.0.5", 32);
  assert.equal(result.usableHosts, "1");
  assert.equal(result.firstUsable, "10.0.0.5");
  assert.equal(result.lastUsable, "10.0.0.5");
});

test("isValidIpv4 rejects out-of-range octets and garbage", () => {
  assert.equal(isValidIpv4("192.168.1.1"), true);
  assert.equal(isValidIpv4("256.1.1.1"), false);
  assert.equal(isValidIpv4("1.2.3"), false);
  assert.equal(isValidIpv4("abc"), false);
});

test("maskToCidr round-trips with cidrToMask and rejects non-contiguous masks", () => {
  assert.equal(maskToCidr("255.255.255.0"), 24);
  assert.equal(maskToCidr("255.255.255.128"), 25);
  assert.equal(maskToCidr("0.0.0.0"), 0);
  assert.equal(maskToCidr("255.255.255.255"), 32);
  assert.equal(maskToCidr("255.255.255.1"), null);
});

test("parseNetworkInput accepts CIDR, mask, and bare IP forms", () => {
  assert.deepEqual(parseNetworkInput("10.0.0.0/8"), { ip: "10.0.0.0", cidr: 8 });
  assert.deepEqual(parseNetworkInput("10.0.0.0 255.0.0.0"), { ip: "10.0.0.0", cidr: 8 });
  assert.deepEqual(parseNetworkInput("10.0.0.5"), { ip: "10.0.0.5", cidr: 24 });
  assert.equal(parseNetworkInput("not-an-ip"), null);
  assert.equal(parseNetworkInput("10.0.0.0/33"), null);
});

test("suggestCidrForHosts finds the smallest block that fits", () => {
  assert.equal(suggestCidrForHosts(1), 32);
  assert.equal(suggestCidrForHosts(2), 31);
  assert.equal(suggestCidrForHosts(3), 29);
  assert.equal(suggestCidrForHosts(254), 24);
  assert.equal(suggestCidrForHosts(255), 23);
});

test("classifyAddress flags RFC 1918 private space and public addresses", () => {
  assert.equal(classifyAddress("10.1.1.1").scopes.includes("Private-use (RFC 1918)"), true);
  assert.equal(classifyAddress("192.168.1.1").scopes.includes("Private-use (RFC 1918)"), true);
  assert.equal(classifyAddress("172.20.0.1").scopes.includes("Private-use (RFC 1918)"), true);
  assert.equal(classifyAddress("172.32.0.1").scopes.includes("Private-use (RFC 1918)"), false);
  assert.deepEqual(classifyAddress("8.8.8.8").scopes, ["Global unicast"]);
});

test("reverseDnsZone builds a classless zone for non-octet-aligned prefixes", () => {
  assert.equal(reverseDnsZone("192.168.1.0", 24), "1.168.192.in-addr.arpa");
  assert.equal(reverseDnsZone("192.168.1.64", 26), "64/26.1.168.192.in-addr.arpa");
});
