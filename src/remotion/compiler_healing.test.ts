
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
});
