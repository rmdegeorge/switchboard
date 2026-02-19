import { describe, it, expect } from "vitest";
import { toBase64, fromBase64 } from "../encoding";

describe("toBase64 / fromBase64", () => {
  it("round-trips ASCII strings", () => {
    const input = "hello world";
    expect(fromBase64(toBase64(input))).toBe(input);
  });

  it("encodes a known ASCII vector", () => {
    expect(toBase64("hello")).toBe("aGVsbG8=");
  });

  it("round-trips unicode / emoji", () => {
    const input = "Hello 🌍🚀 世界";
    expect(fromBase64(toBase64(input))).toBe(input);
  });

  it("round-trips CJK characters", () => {
    const input = "漢字テスト한국어";
    expect(fromBase64(toBase64(input))).toBe(input);
  });

  it("handles empty string", () => {
    expect(toBase64("")).toBe("");
    expect(fromBase64("")).toBe("");
  });

  it("round-trips strings with special characters", () => {
    const input = 'line1\nline2\ttab\r\n"quotes" & <tags>';
    expect(fromBase64(toBase64(input))).toBe(input);
  });
});
