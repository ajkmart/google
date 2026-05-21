import { describe, it, expect } from "vitest";
import { generateId } from "../../lib/id.js";

describe("generateId", () => {
  it("returns a non-empty string", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("is unique across 10,000 calls (no collision)", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 10000; i++) {
      ids.add(generateId());
    }
    expect(ids.size).toBe(10000);
  });

  it("matches expected format: base-36 timestamp + 16 hex chars", () => {
    const id = generateId();
    // timestamp part: any length of base-36 digits
    const hexPart = id.slice(id.indexOf("f") > -1 ? id.search(/[a-f0-9]{16}$/) : id.length - 16);
    expect(hexPart).toMatch(/^[a-f0-9]{16}$/);
  });

  it("is URL-safe (no special characters)", () => {
    const id = generateId();
    expect(id).not.toMatch(/[<>"{}|\\^`\[\]]/);
  });

  it("is consistent length (within reasonable bounds)", () => {
    const lengths = new Set<number>();
    for (let i = 0; i < 100; i++) lengths.add(generateId().length);
    // All IDs should have the same structure, so length variation is minimal
    expect(lengths.size).toBeLessThanOrEqual(2);
  });
});
