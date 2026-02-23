import { describe, it, expect } from "vitest";
import { urlPatternToRegex } from "../urlPattern";

describe("urlPatternToRegex", () => {
  it("matches an exact URL", () => {
    const re = urlPatternToRegex("https://example.com/api/data");
    expect(re.test("https://example.com/api/data")).toBe(true);
    expect(re.test("https://example.com/api/other")).toBe(false);
  });

  it("supports wildcard path matching", () => {
    const re = urlPatternToRegex("https://api.example.com/*");
    expect(re.test("https://api.example.com/")).toBe(true);
    expect(re.test("https://api.example.com/foo/bar")).toBe(true);
    expect(re.test("https://other.com/foo")).toBe(false);
  });

  it("supports wildcard subdomain matching", () => {
    const re = urlPatternToRegex("https://*.example.com/foo");
    expect(re.test("https://api.example.com/foo")).toBe(true);
    expect(re.test("https://www.example.com/foo")).toBe(true);
    expect(re.test("https://example.com/foo")).toBe(false);
  });

  it("escapes regex metacharacters as literals", () => {
    const re = urlPatternToRegex("https://example.com/path?q=1&r=2");
    expect(re.test("https://example.com/path?q=1&r=2")).toBe(true);
    // Without escaping, '?' would make 'h' optional and '.' would match any char
    expect(re.test("https://exampleXcom/pathXq=1&r=2")).toBe(false);
  });

  it("escapes parentheses and brackets", () => {
    const re = urlPatternToRegex("https://example.com/(foo)[bar]");
    expect(re.test("https://example.com/(foo)[bar]")).toBe(true);
  });

  it("is case-insensitive", () => {
    const re = urlPatternToRegex("https://Example.COM/Path");
    expect(re.test("https://example.com/path")).toBe(true);
    expect(re.test("HTTPS://EXAMPLE.COM/PATH")).toBe(true);
  });

  it("does not match partial URLs (anchored with ^ and $)", () => {
    const re = urlPatternToRegex("https://example.com");
    expect(re.test("https://example.com")).toBe(true);
    expect(re.test("https://example.com/extra")).toBe(false);
    expect(re.test("prefix-https://example.com")).toBe(false);
  });

  it("handles multiple wildcards", () => {
    const re = urlPatternToRegex("*://*/api/*");
    expect(re.test("https://example.com/api/data")).toBe(true);
    expect(re.test("http://localhost:3000/api/users/123")).toBe(true);
  });

  it("matches wildcard-wrapped domain pattern with query params", () => {
    const re = urlPatternToRegex("*api.example.com*");
    expect(re.test("https://api.example.com/v1/users?page=1&limit=10")).toBe(true);
    expect(re.test("https://api.example.com/")).toBe(true);
    expect(re.test("https://staging-api.example.com/data")).toBe(true);
    expect(re.test("https://other.com/api")).toBe(false);
  });
});
