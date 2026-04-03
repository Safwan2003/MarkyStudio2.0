import { describe, expect, it } from "vitest";

import { extractComponentCode } from "./sanitize-response";

describe("extractComponentCode", () => {
  it("prefers the exported main scene over helper arrow functions", () => {
    const input = `
const hexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return \`rgba(\${r},\${g},\${b},\${alpha})\`;
};

export const DynamicAnimation = () => {
  return <AbsoluteFill style={{backgroundColor: hexToRgba("#112233", 0.8)}} />;
};

Trailing commentary that should be removed.
    `;

    const output = extractComponentCode(input);

    expect(output).toContain("const hexToRgba");
    expect(output).toContain("export const DynamicAnimation");
    expect(output).not.toContain("Trailing commentary");
  });

  it("falls back to the first arrow-function component when no main export exists", () => {
    const input = `
const Scene0 = () => {
  return <AbsoluteFill />;
};

Some trailing note
    `;

    const output = extractComponentCode(input);

    expect(output).toContain("const Scene0");
    expect(output).not.toContain("Some trailing note");
  });

  it("prefixes export when the main scene is const MyAnimation without export", () => {
    const input = `
const MyAnimation = () => {
  return <AbsoluteFill />;
};
`;

    const output = extractComponentCode(input);

    expect(output.trimStart()).toMatch(/^export const MyAnimation\s*=/);
  });
});
