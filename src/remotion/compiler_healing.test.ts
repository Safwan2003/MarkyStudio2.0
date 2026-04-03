
import { describe, it, expect, vi } from "vitest";

// Mock remotion before importing compiler
vi.mock("remotion", () => ({
  useCurrentFrame: () => 0,
  useVideoConfig: () => ({ fps: 30, width: 1920, height: 1080, durationInFrames: 300 }),
  spring: () => 1,
  interpolate: (_v: number, _i: number[], o: number[]) => o[0] ?? 0,
  interpolateColors: (_v: number, _i: number[], o: string[]) => o[0] ?? "#000000",
  AbsoluteFill: ({ children }: any) => children ?? null,
  Audio: () => null,
  Img: () => null,
  OffthreadVideo: () => null,
  Sequence: ({ children }: any) => children ?? null,
  random: () => 0.5,
}));

vi.mock("@remotion/lottie", () => ({ Lottie: () => null }));
vi.mock("@remotion/three", () => ({ ThreeCanvas: () => null }));
vi.mock("three", () => ({}));
vi.mock("@remotion/shapes", () => ({
  Rect: () => null,
  Circle: () => null,
  Triangle: () => null,
  Star: () => null,
  Polygon: () => null,
  Ellipse: () => null,
  Heart: () => null,
  Pie: () => null,
  makeRect: () => ({}),
  makeCircle: () => ({}),
  makeTriangle: () => ({}),
  makeStar: () => ({}),
  makePolygon: () => ({}),
  makeEllipse: () => ({}),
  makeHeart: () => ({}),
  makePie: () => ({}),
}));
vi.mock("@remotion/transitions", () => ({
  TransitionSeries: ({ children }: any) => children ?? null,
  linearTiming: () => ({}),
  springTiming: () => ({}),
}));
vi.mock("@remotion/transitions/fade", () => ({ fade: () => ({}) }));
vi.mock("@remotion/transitions/slide", () => ({ slide: () => ({}) }));
vi.mock("@remotion/transitions/wipe", () => ({ wipe: () => ({}) }));
vi.mock("@remotion/transitions/flip", () => ({ flip: () => ({}) }));
vi.mock("@remotion/transitions/clock-wipe", () => ({ clockWipe: () => ({}) }));

import { compileCode, extractComponentBody } from "./compiler";

function executeComponent(code: string): void {
  const result = compileCode(code);
  if (result.error) throw new Error(`Compilation error: ${result.error}`);
  if (!result.Component) throw new Error("No Component returned");
  (result.Component as () => unknown)();
}

describe("Compiler Healing — New Patterns", () => {
  it("strips standalone 'javascript' label from generated code", () => {
    const code = `
export const MyAnimation = () => {
  const Scene0 = () => {
    const WORD_TIMINGS = [];
javascript
    return null;
  };
  return <Scene0 />;
};
    `;
    const result = compileCode(code);
    expect(result.error).toBeNull();
    expect(result.Component).toBeTruthy();
  });

  it("strips 'javascript' even with trailing spaces", () => {
    const code = `
export const MyAnimation = () => {
  const Scene0 = () => {
    const WORD_TIMINGS = [];
javascript                                                                   
    return null;
  };
  return <Scene0 />;
};
    `;
    const result = compileCode(code);
    expect(result.error).toBeNull();
    expect(result.Component).toBeTruthy();
  });

  it("strips standalone 'typescript' label too", () => {
    const code = `
export const MyAnimation = () => {
  const Scene0 = () => {
    const WORD_TIMINGS = [];
typescript
    return null;
  };
  return <Scene0 />;
};
    `;
    const result = compileCode(code);
    expect(result.error).toBeNull();
    expect(result.Component).toBeTruthy();
  });

  it("does not break nested const declarations in preRepairUnclosedArrays", () => {
    // Before the fix, preRepairUnclosedArrays would see `const x = 1` and 
    // prematurely close `MyAnimation` because it has an unclosed `{`.
    const code = `
export const MyAnimation = () => {
  const x = 1;
  const y = 2;
  return null;
};
    `;
    expect(() => executeComponent(code)).not.toThrow();
  });

  it("still repairs unclosed top-level arrays at level 0", () => {
    const code = `
const CURSOR_STEPS = [
  { x: 0, y: 0 }
export const MyAnimation = () => {
  return null;
};
    `;
    // This should work because CURSOR_STEPS is closed by the fixup before MyAnimation
    expect(() => executeComponent(code)).not.toThrow();
  });

  it("extracts the main component body when helper scene components appear before it", () => {
    const code = `
const Scene0 = () => {
  return <div>Intro</div>;
};

const Scene1 = () => {
  return <div>Middle</div>;
};

export const MyAnimation = () => {
  return (
    <AbsoluteFill>
      <Scene0 />
      <Scene1 />
    </AbsoluteFill>
  );
};

// EOF
    `;

    const body = extractComponentBody(code);
    expect(body).toContain("const Scene0 = () =>");
    expect(body).toContain("const Scene1 = () =>");
    expect(body).toContain("return (");
    expect(body).not.toContain("export const MyAnimation");
  });

  it("compiles exported main component with helper scenes and EOF sentinel", () => {
    const code = `
const Scene0 = () => {
  return <div>Intro</div>;
};

const Scene1 = () => {
  return <div>Middle</div>;
};

export const FragmentedScene = () => {
  return (
    <AbsoluteFill>
      <Scene0 />
      <Scene1 />
    </AbsoluteFill>
  );
};

// EOF
    `;

    const result = compileCode(code);
    expect(result.error).toBeNull();
    expect(result.Component).toBeTruthy();
  });

  it("prefers the renderable component over uppercase helper utilities during extraction", () => {
    const code = `
const HexToRgba = (hex: string, alpha: number) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return \`rgba(\${r},\${g},\${b},\${alpha})\`;
};

export const MyAnimation = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: HexToRgba("#ffffff", 0.5) }}>
      <div>Hello</div>
    </AbsoluteFill>
  );
};
    `;

    const body = extractComponentBody(code);
    expect(body).toContain("const HexToRgba");
    expect(body).toContain("return (");

    const result = compileCode(code);
    expect(result.error).toBeNull();
    expect(result.Component).toBeTruthy();
  });

  it("rejects repeated ALL_CAPS const declarations inside component scope", () => {
    const code = `
export const MyAnimation = () => {
  const BRAND_PRIMARY = BRAND.primary || "#D7383C";
  const BRAND_PRIMARY = BRAND.primary || "#D7383C";
  return <AbsoluteFill style={{ backgroundColor: BRAND_PRIMARY }} />;
};
    `;

    const result = compileCode(code);
    expect(result.error).not.toBeNull();
    expect(result.error).toContain("duplicate same-scope declaration");
    expect(result.Component).toBeNull();
  });

  it("rejects repeated ALL_CAPS let declarations inside component scope", () => {
    const code = `
export const MyAnimation = () => {
  let LABEL_START_FRAME = 10;
  let LABEL_START_FRAME = 10;
  return <AbsoluteFill style={{ opacity: LABEL_START_FRAME > 0 ? 1 : 0 }} />;
};
    `;

    const result = compileCode(code);
    expect(result.error).not.toBeNull();
    expect(result.error).toContain("duplicate same-scope declaration");
    expect(result.Component).toBeNull();
  });

  it("rejects repeated camelCase and mixed-case const declarations at the same depth", () => {
    const code = `
export const MyAnimation = () => {
  const screenshotWidth = 1920;
  const screenshotWidth = 1080;
  const BUTTON_NEW_APP_CENTER_X = 0.2;
  const BUTTON_NEW_APP_CENTER_X = 0.3;
  return <AbsoluteFill style={{ width: screenshotWidth, left: BUTTON_NEW_APP_CENTER_X }} />;
};
    `;

    const result = compileCode(code);
    expect(result.error).not.toBeNull();
    expect(result.error).toContain("duplicate same-scope declaration");
    expect(result.Component).toBeNull();
  });

  it("rejects same-scope forward references in const initializers", () => {
    const code = `
export const MyAnimation = () => {
  const derivedOpacity = baseOpacity * 0.8;
  const baseOpacity = 1;
  return <AbsoluteFill style={{ opacity: derivedOpacity }} />;
};
    `;

    const result = compileCode(code);
    expect(result.error).not.toBeNull();
    expect(result.error).toContain("references later-declared");
    expect(result.Component).toBeNull();
  });

  it("allows declarations that are out of narrative order but dependency-safe", () => {
    const code = `
export const MyAnimation = () => {
  const dashboardNavTargetCoords = { x: 0.4, y: 0.3 };
  const rippleScale = dashboardNavTargetCoords.x * width;
  const headline = "Ready";
  return <AbsoluteFill style={{ opacity: rippleScale > 0 ? 1 : 0 }}>{headline}</AbsoluteFill>;
};
    `;

    const result = compileCode(code);
    expect(result.error).toBeNull();
    expect(result.Component).toBeTruthy();
  });

  it("injects COMPANY_LOGO and size inside the component when used but not declared", () => {
    const code = `
export const MyAnimation = () => {
  return (
    <AbsoluteFill>
      <Img src={COMPANY_LOGO} style={{ width: size, height: size }} />
    </AbsoluteFill>
  );
};
    `;

    expect(() => executeComponent(code)).not.toThrow();
  });

  it("strips model-emitted COMPANY_LOGO bindings and uses a single BRAND_LOGO alias", () => {
    const code = `
export const MyAnimation = () => {
  const COMPANY_LOGO = "https://example.com/wrong.png";
  const COMPANY_LOGO = "https://example.com/wrong2.png";
  return (
    <AbsoluteFill>
      <Img src={COMPANY_LOGO} style={{ width: 40, height: 40 }} />
    </AbsoluteFill>
  );
};
    `;

    expect(() => executeComponent(code)).not.toThrow();
  });

  it("hoists UPPER_SNAKE numeric timing consts so they are not used before initialization", () => {
    const code = `
export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const t = frame + HOLD_AFTER_CLICK;
  const HOLD_AFTER_CLICK = 10;
  return <AbsoluteFill style={{ opacity: t > 0 ? 1 : 0 }} />;
};
    `;

    expect(() => executeComponent(code)).not.toThrow();
  });

  it("hoists UPPER_SNAKE expression timing consts (e.g. ACT1_END) so they are not used before initialization", () => {
    const code = `
export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const before = frame < ACT1_END;
  const ACT1_END = Math.round(durationInFrames * 0.25);
  return <AbsoluteFill style={{ opacity: before ? 1 : 0 }} />;
};
    `;

    expect(() => executeComponent(code)).not.toThrow();
  });

  it("hoists const cur so it is not used before initialization", () => {
    const code = `
export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const x = cur.x * width;
  const cur = { x: 0.5, y: 0.5 };
  return <AbsoluteFill style={{ left: x }} />;
};
    `;

    expect(() => executeComponent(code)).not.toThrow();
  });

  it("hoists *Coords bindings (e.g. dashboardNavTargetCoords) used before initialization", () => {
    const code = `
export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const y = dashboardNavTargetCoords.y * width;
  const dashboardNavTargetCoords = { x: 0.1, y: 0.2 };
  return <AbsoluteFill style={{ top: y }} />;
};
    `;

    expect(() => executeComponent(code)).not.toThrow();
  });

  it("hoists multi-line const …Coords declarations (object literal across lines)", () => {
    const code = `
export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const y = dashboardNavTargetCoords.y * width;
  const dashboardNavTargetCoords = {
    x: 0.1,
    y: 0.2,
  };
  return <AbsoluteFill style={{ top: y }} />;
};
    `;

    expect(() => executeComponent(code)).not.toThrow();
  });

  it("orders multiple *Coords hoists by dependency", () => {
    const code = `
export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const x = innerCoords.x * width;
  const outerCoords = { x: 0.2, y: 0.2 };
  const innerCoords = { x: outerCoords.x * 0.5, y: 0.1 };
  return <AbsoluteFill style={{ left: x }} />;
};
    `;

    expect(() => executeComponent(code)).not.toThrow();
  });

  it("repairs CURSOR_STEPS when timing consts (CLICK_DUR, ACT1_END) were wrongly nested inside the array", () => {
    const code = `
export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const TRAVEL = 22;
  const CURSOR_STEPS = [
  const CLICK_DUR = 4;
  const HOLD_AFTER_CLICK = 30;
  const ACT1_END = 30;
  const ACT2_END = 120;
  if (typeof frame !== "number") throw new Error("bad");
  return <AbsoluteFill style={{ opacity: frame < ACT1_END ? 1 : 0 }} />;
};
    `;

    expect(() => executeComponent(code)).not.toThrow();
  });

  it("repairs CURSOR_STEPS when the first wrongly nested line has a trailing // comment", () => {
    const code = `
export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const TRAVEL = 22;
  const CURSOR_STEPS = [
  const CLICK_DUR = 4; // Duration of the click animation itself
  const HOLD_AFTER_CLICK = 30; // Hold after click
  const ACT1_END = 30; // 20% of 150 frames
  const ACT2_END = 120;
  if (typeof frame !== "number") throw new Error("bad");
  return <AbsoluteFill style={{ opacity: frame < ACT1_END ? 1 : 0 }} />;
};
    `;

    expect(() => executeComponent(code)).not.toThrow();
  });

  it("hoists numeric UPPER_SNAKE timing lines when they include trailing // comments (avoids TDZ vs use before decl)", () => {
    const code = `
export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const before = frame < ACT1_END;
  const ACT1_END = 30; // 20% of duration
  return <AbsoluteFill style={{ opacity: before ? 1 : 0 }} />;
};
    `;

    expect(() => executeComponent(code)).not.toThrow();
  });

  it("orders hoisted UPPER_SNAKE expr consts so dependencies initialize before dependents", () => {
    const code = `
export const MyAnimation = () => {
  const frame = useCurrentFrame();
  const { width } = useVideoConfig();
  const x = PARENT_REF * width;
  const PARENT_REF = CHILD_REF + 1;
  const CHILD_REF = 0.25;
  return <AbsoluteFill style={{ opacity: x > 0 ? 1 : 0 }} />;
};
    `;

    expect(() => executeComponent(code)).not.toThrow();
  });

  it("injects interpolateColors alias for generated scenes", () => {
    const code = `
export const MyAnimation = () => {
  const bg = interpolateColors(0.5, [0, 1], ["#000000", "#ffffff"]);
  return <AbsoluteFill style={{ backgroundColor: bg }} />;
};
    `;

    expect(() => executeComponent(code)).not.toThrow();
  });

  it("injects safe defaults for undeclared target coordinate scalars", () => {
    const code = `
export const MyAnimation = () => {
  const x = laptopTargetX * 100;
  const y = heroTargetY * 100;
  return <AbsoluteFill style={{ transform: \`translate(\${x}px, \${y}px)\` }} />;
};
    `;

    expect(() => executeComponent(code)).not.toThrow();
  });

  it("renames self-shadowing useCurrentFrame declarations before runtime", () => {
    const code = `
export const MyAnimation = () => {
  const useCurrentFrame = useCurrentFrame();
  return <AbsoluteFill style={{ opacity: useCurrentFrame === 0 ? 1 : 0.5 }} />;
};
    `;

    expect(() => executeComponent(code)).not.toThrow();
  });
});
