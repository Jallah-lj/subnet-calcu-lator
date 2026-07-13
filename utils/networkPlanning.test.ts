import { test } from "node:test";
import assert from "node:assert/strict";
import { allocateVlsm, checkOverlap, rangeToCidrs, summarizeToSupernet } from "./networkPlanning";
import { ipToInt } from "./subnetCalculator";

test("allocateVlsm places largest-first and keeps every block aligned", () => {
  const result = allocateVlsm("192.168.1.0", 24, [
    { id: "1", name: "Sales", hosts: 100 },
    { id: "2", name: "Voice", hosts: 50 },
    { id: "3", name: "DMZ", hosts: 25 },
    { id: "4", name: "P2P", hosts: 2 }
  ]);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.allocations[0].network, "192.168.1.0");
  assert.equal(result.allocations[0].cidr, 25);
  assert.equal(result.allocations[1].network, "192.168.1.128");
  assert.equal(result.allocations[1].cidr, 26);
  assert.equal(result.allocations[2].network, "192.168.1.192");
  assert.equal(result.allocations[2].cidr, 27);
  assert.equal(result.allocations[3].network, "192.168.1.224");
  assert.equal(result.allocations[3].cidr, 31);
});

test("allocateVlsm reports an error when requirements exceed the base block", () => {
  const result = allocateVlsm("192.168.1.0", 27, [{ id: "1", name: "Too Big", hosts: 100 }]);
  assert.equal(result.ok, false);
});

test("checkOverlap distinguishes containment, overlap, and disjoint ranges", () => {
  assert.equal(checkOverlap({ ip: "10.0.0.0", cidr: 8 }, { ip: "10.1.0.0", cidr: 16 }), "a-contains-b");
  assert.equal(checkOverlap({ ip: "10.0.0.0", cidr: 24 }, { ip: "10.0.1.0", cidr: 24 }), "none");
  assert.equal(checkOverlap({ ip: "10.0.0.0", cidr: 23 }, { ip: "10.0.1.0", cidr: 24 }), "a-contains-b");
  assert.equal(checkOverlap({ ip: "10.0.0.0", cidr: 24 }, { ip: "10.0.0.0", cidr: 24 }), "equal");
});

test("summarizeToSupernet finds the smallest exact covering block", () => {
  const exact = summarizeToSupernet([
    { ip: "192.168.0.0", cidr: 24 },
    { ip: "192.168.1.0", cidr: 24 }
  ]);
  assert.equal(exact.ok, true);
  if (exact.ok) {
    assert.equal(exact.network, "192.168.0.0");
    assert.equal(exact.cidr, 23);
    assert.equal(exact.coversExtraAddresses, false);
  }
});

test("summarizeToSupernet flags coverage of unrequested address space", () => {
  const withGap = summarizeToSupernet([
    { ip: "192.168.0.0", cidr: 24 },
    { ip: "192.168.2.0", cidr: 24 }
  ]);
  assert.equal(withGap.ok, true);
  if (withGap.ok) assert.equal(withGap.coversExtraAddresses, true);
});

test("rangeToCidrs decomposes a range into minimal aligned blocks", () => {
  const start = ipToInt("192.168.1.226");
  const end = ipToInt("192.168.1.255");
  const blocks = rangeToCidrs(start, end);
  const totalAddresses = blocks.reduce((sum, b) => sum + b.addresses, 0);
  assert.equal(totalAddresses, end - start + 1);
  assert.equal(blocks[0].network, "192.168.1.226");
});
