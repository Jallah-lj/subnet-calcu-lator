import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateIpv6Subnet, compressIpv6, expandIpv6, generateEui64, isValidIpv6 } from "./ipv6Calculator";

test("expandIpv6 fully expands compressed addresses", () => {
  assert.equal(expandIpv6("::1"), "0000:0000:0000:0000:0000:0000:0000:0001");
  assert.equal(expandIpv6("fe80::1"), "fe80:0000:0000:0000:0000:0000:0000:0001");
  assert.equal(expandIpv6("::"), "0000:0000:0000:0000:0000:0000:0000:0000");
});

test("isValidIpv6 rejects malformed compression", () => {
  assert.equal(isValidIpv6("2001:db8::"), true);
  assert.equal(isValidIpv6("2001:db8:::1"), false);
  assert.equal(isValidIpv6("1::2::3"), false);
  assert.equal(isValidIpv6("not-an-address"), false);
});

test("compressIpv6 shortens the longest run of zero groups", () => {
  assert.equal(compressIpv6("2001:0db8:0000:0000:0000:0000:0000:0001"), "2001:db8::1");
  assert.equal(compressIpv6("0:0:0:0:0:0:0:0"), "::");
});

test("calculateIpv6Subnet derives network and range for a /64", () => {
  const result = calculateIpv6Subnet("2001:db8::1", 64);
  assert.equal(result.network, "2001:db8::");
  assert.equal(result.firstAddress, "2001:db8::");
  assert.equal(result.lastAddress, "2001:db8::ffff:ffff:ffff:ffff");
  assert.equal(result.totalAddresses, (2n ** 64n).toString());
});

test("generateEui64 matches the standard worked example", () => {
  assert.equal(generateEui64("fe80::", "00:1A:2B:3C:4D:5E"), "fe80::21a:2bff:fe3c:4d5e");
});
