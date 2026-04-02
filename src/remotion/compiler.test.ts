/**
 * Compiler Sandboxing Tests — Phase 2 & 3 Verification
 *
 * Validates that all injected scope items (CameraMotionBlur, MeshGradientBg,
 * random, useAudioSync, useBeat, SPRING_CONFIGS, EASINGS, etc.) are correctly
 * injected and accessible inside generated component bodies.
 *
 * KEY FIX: Tests actually EXECUTE the compiled component (not just compile it).
 * Validation code inside the component body runs via Component() call.
 * React hooks are mocked so Component() is safe to call outside React tree.
 *
 * Run: npm test
 */

import { describe, it, expect, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock all browser-only / Remotion packages BEFORE importing compiler.
// Without these mocks, importing compiler.ts in Node will crash on
// @remotion/three (WebGL), @remotion/lottie, etc.
// ---------------------------------------------------------------------------

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
  // Deterministic seeded random — same algorithm as Remotion's implementation
  random: (seed: string | number) => {
    let h = 2166136261;
    const s = String(seed);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) / 4294967296);
  },
}));

vi.mock("@remotion/lottie", () => ({ Lottie: () => null }));
vi.mock("@remotion/three", () => ({ ThreeCanvas: () => null }));
vi.mock("three", () => ({}));

vi.mock("@remotion/shapes", () => {
  const shape = () => null;
  const makeShape = () => ({ d: "", width: 0, height: 0, transformOrigin: "0 0" });
  return {
    Rect: shape, Circle: shape, Triangle: shape, Star: shape,
    Polygon: shape, Ellipse: shape, Heart: shape, Pie: shape,
    makeRect: makeShape, makeCircle: makeShape, makeTriangle: makeShape,
    makeStar: makeShape, makePolygon: makeShape, makeEllipse: makeShape,
    makeHeart: makeShape, makePie: makeShape,
  };
});

vi.mock("@remotion/transitions", () => ({
  TransitionSeries: ({ children }: any) => children ?? null,
  linearTiming: () => ({}),
  springTiming: () => ({}),
}));
vi.mock("@remotion/transitions/fade", () => ({ fade: () => null }));
vi.mock("@remotion/transitions/slide", () => ({ slide: () => null }));
vi.mock("@remotion/transitions/wipe", () => ({ wipe: () => null }));
vi.mock("@remotion/transitions/flip", () => ({ flip: () => null }));
vi.mock("@remotion/transitions/clock-wipe", () => ({ clockWipe: () => null }));

// ---------------------------------------------------------------------------
// Import compiler AFTER mocks are registered
// ---------------------------------------------------------------------------

// eslint-disable-next-line import/first
import { compileCode, extractComponentBody } from "./compiler";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wrap a snippet into a valid full component for compileCode. */
function makeComponent(body: string): string {
  return `export const MyAnimation = () => {\n${body}\nreturn null;\n};`;
}

/**
 * Compile AND execute the component.
 * This is the correct way to test scope injection — validation code
 * inside the component body only runs when Component() is called.
 * Throws if compilation fails OR if validation code throws.
 */
function executeComponent(
  code: string,
  images: string[] = [],
  brand: Record<string, string> = {},
  audio: string | null = null,
  timings: { word: string; startFrame: number; endFrame: number }[] = [],
): void {
  const result = compileCode(code, images, brand, audio, timings);
  if (result.error) throw new Error(`Compilation error: ${result.error}`);
  if (!result.Component) throw new Error("No Component returned");
  // Calling the component executes the validation body.
  // React hooks are mocked above so this is safe.
  (result.Component as () => unknown)();
}

// ---------------------------------------------------------------------------
// Phase 2: Spring configs & animation primitives
// ---------------------------------------------------------------------------

describe("Compiler scope — Phase 2: spring physics", () => {
  it("SPRING_CONFIGS.entrance has pro-standard damping:200", () => {
    expect(() => executeComponent(makeComponent(`
      const s = SPRING_CONFIGS.entrance;
      if (s.damping !== 200) throw new Error('damping should be 200, got ' + s.damping);
    `))).not.toThrow();
  });

  it("SPRING_CONFIGS.cinematic has damping:200", () => {
    expect(() => executeComponent(makeComponent(`
      const s = SPRING_CONFIGS.cinematic;
      if (s.damping !== 200) throw new Error('cinematic damping should be 200, got ' + s.damping);
    `))).not.toThrow();
  });

  it("SPRING_CONFIGS.pop has damping:8 (playful elastic)", () => {
    expect(() => executeComponent(makeComponent(`
      const s = SPRING_CONFIGS.pop;
      if (s.damping !== 8) throw new Error('pop damping should be 8, got ' + s.damping);
    `))).not.toThrow();
  });

  it("EASINGS.easeOutCubic returns 0 at t=0 and 1 at t=1", () => {
    expect(() => executeComponent(makeComponent(`
      const f = EASINGS.easeOutCubic;
      if (typeof f !== 'function') throw new Error('easeOutCubic not a function');
      if (Math.abs(f(0)) > 0.001) throw new Error('f(0) should be ~0');
      if (Math.abs(f(1) - 1) > 0.001) throw new Error('f(1) should be ~1');
    `))).not.toThrow();
  });

  it("EASINGS has all three curves", () => {
    expect(() => executeComponent(makeComponent(`
      if (typeof EASINGS.easeOutCubic !== 'function') throw new Error('easeOutCubic missing');
      if (typeof EASINGS.easeInOutCubic !== 'function') throw new Error('easeInOutCubic missing');
      if (typeof EASINGS.easeInQuad !== 'function') throw new Error('easeInQuad missing');
    `))).not.toThrow();
  });

});

// ---------------------------------------------------------------------------
// Phase 2: Deterministic random
// ---------------------------------------------------------------------------

describe("Compiler scope — Phase 2: random() determinism", () => {
  it("random() is injected and returns a number in [0,1]", () => {
    expect(() => executeComponent(makeComponent(`
      const val = random('test-seed');
      if (typeof val !== 'number') throw new Error('random should return number, got ' + typeof val);
      if (val < 0 || val > 1) throw new Error('random out of range: ' + val);
    `))).not.toThrow();
  });

  it("random() is deterministic with same seed", () => {
    expect(() => executeComponent(makeComponent(`
      const a = random('my-seed');
      const b = random('my-seed');
      if (a !== b) throw new Error('Not deterministic: ' + a + ' vs ' + b);
    `))).not.toThrow();
  });

  it("random() gives different values for different seeds", () => {
    expect(() => executeComponent(makeComponent(`
      const a = random('seed-A');
      const b = random('seed-B');
      if (a === b) throw new Error('Different seeds returned same value: ' + a);
    `))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Phase 2: Visual components
// ---------------------------------------------------------------------------

describe("Compiler scope — Phase 2: visual components", () => {
  it("MeshGradientBg is a function", () => {
    expect(() => executeComponent(makeComponent(`
      if (typeof MeshGradientBg !== 'function') throw new Error('MeshGradientBg not a function');
    `))).not.toThrow();
  });

  it("CameraMotionBlur is a function", () => {
    expect(() => executeComponent(makeComponent(`
      if (typeof CameraMotionBlur !== 'function') throw new Error('CameraMotionBlur not a function');
    `))).not.toThrow();
  });

  it("getGlassCard includes saturate(150%) in backdropFilter", () => {
    expect(() => executeComponent(makeComponent(`
      const styles = getGlassCard({ style: 'dark' });
      if (!styles.backdropFilter.includes('saturate(150%)'))
        throw new Error('Missing saturate(150%). Got: ' + styles.backdropFilter);
    `))).not.toThrow();
  });

  it("getGlassCard dark mode has correct gradient", () => {
    expect(() => executeComponent(makeComponent(`
      const s = getGlassCard({ style: 'dark' });
      if (!s.background.includes('rgba(255,255,255,0.08)'))
        throw new Error('Dark glass card gradient wrong: ' + s.background);
    `))).not.toThrow();
  });

  it("getGlassCard light mode has correct gradient", () => {
    expect(() => executeComponent(makeComponent(`
      const s = getGlassCard({ style: 'light' });
      if (!s.background.includes('rgba(255,255,255,0.8)'))
        throw new Error('Light glass card gradient wrong: ' + s.background);
    `))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Phase 3: Audio sync
// ---------------------------------------------------------------------------

describe("Compiler scope — Phase 3: audio sync hooks", () => {
  it("useAudioSync is a function", () => {
    expect(() => executeComponent(makeComponent(`
      if (typeof useAudioSync !== 'function') throw new Error('useAudioSync not a function');
    `))).not.toThrow();
  });

  it("useBeat is a function", () => {
    expect(() => executeComponent(makeComponent(`
      if (typeof useBeat !== 'function') throw new Error('useBeat not a function');
    `))).not.toThrow();
  });

  it("WORD_TIMINGS defaults to empty array", () => {
    expect(() => executeComponent(makeComponent(`
      if (!Array.isArray(WORD_TIMINGS)) throw new Error('WORD_TIMINGS should be array');
      if (WORD_TIMINGS.length !== 0) throw new Error('Should default to empty, got ' + WORD_TIMINGS.length);
    `))).not.toThrow();
  });

  it("WORD_TIMINGS receives passed word timings", () => {
    const wordTimings = [
      { word: "Hello", startFrame: 0, endFrame: 15 },
      { word: "World", startFrame: 16, endFrame: 30 },
    ];
    expect(() => executeComponent(
      makeComponent(`
        if (WORD_TIMINGS.length !== 2) throw new Error('Expected 2, got ' + WORD_TIMINGS.length);
        if (WORD_TIMINGS[0].word !== 'Hello') throw new Error('First word wrong: ' + WORD_TIMINGS[0].word);
        if (WORD_TIMINGS[1].endFrame !== 30) throw new Error('endFrame wrong: ' + WORD_TIMINGS[1].endFrame);
      `),
      [], {}, null, wordTimings,
    )).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Phase 4: Syntax recovery regressions (real-world LLM failures)
// ---------------------------------------------------------------------------

describe("Compiler recovery — unclosed literals", () => {
  it("repairs unclosed CURSOR_STEPS array before next const (Unexpected token)", () => {
    expect(() =>
      executeComponent(
        `export const MyAnimation = () => {
  const { fps } = useVideoConfig();
  const PAIN_CARDS_DATA = [
    { title: "One", value: 1 },
  const frame = useCurrentFrame();
  // should not throw syntax error after repair
  if (typeof frame !== "number") throw new Error("frame not number");
  if (typeof fps !== "number") throw new Error("fps not number");
  return null;
};`,
      ),
    ).not.toThrow();
  });

  it("repairs unclosed CURSOR_STEPS before next const (Unexpected token)", () => {
    expect(() =>
      executeComponent(
        `export const MyAnimation = () => {
  const CURSOR_STEPS = [
    { time: 0, x: 0.1, y: 0.2, action: "move", label: "A" },
  const GENERAL_STIFFNESS = 100;
  if (GENERAL_STIFFNESS !== 100) throw new Error("bad");
  return null;
};`,
      ),
    ).not.toThrow();
  });

  it("repairs CURSOR_STEPS when SFX_EVENTS starts before it closes", () => {
    expect(() =>
      executeComponent(
        `export const MyAnimation = () => {
  const CURSOR_STEPS = [
  const SFX_EVENTS = [
    { time: 0, id: "click" },
  ];
  const frame = useCurrentFrame();
  if (typeof frame !== "number") throw new Error("bad frame");
  return null;
};`,
      ),
    ).not.toThrow();
  });

  it("repairs CURSOR_STEPS when a helper function starts before it closes", () => {
    expect(() =>
      executeComponent(
        `export const MyAnimation = () => {
  const CURSOR_STEPS = [
  const CursorGuidedWorkflow = () => {
    return 1;
  };
  const frame = useCurrentFrame();
  if (typeof CursorGuidedWorkflow !== "function") throw new Error("missing fn");
  if (typeof frame !== "number") throw new Error("bad frame");
  return null;
};`,
      ),
    ).not.toThrow();
  });

  it("repairs unclosed Array.from initializer before next const (Unexpected keyword 'const')", () => {
    expect(() =>
      executeComponent(
        `export const MyAnimation = () => {
  const ITEMS = Array.from({ length: 3 }, (_, i) => ({
    i,
    label: "Item " + i,
  // missing close: }));
  const NEXT = 123;
  if (NEXT !== 123) throw new Error("bad");
  return null;
};`,
      ),
    ).not.toThrow();
  });

  it("repairs unclosed Array.from initializer for single-param arrow (i => ({ ... }))", () => {
    expect(() =>
      executeComponent(
        `export const MyAnimation = () => {
  const ITEMS = Array.from({ length: 3 }, i => ({
    i,
  // missing close: }));
  const NEXT = 123;
  if (NEXT !== 123) throw new Error("bad");
  return null;
};`,
      ),
    ).not.toThrow();
  });

  it("strips broken AUDIO_STIFFNESS precompute blocks (dangling ternary)", () => {
    expect(() =>
      executeComponent(
        `export const MyAnimation = () => {
  // Calculate AUDIO_STIFFNESS and AUDIO_DAMPING based on WORD_TIMINGS
    ? (WORD_TIMINGS[WORD_TIMINGS.length - 1].startFrame - WORD_TIMINGS[0].startFrame) / (WORD_TIMINGS.length - 1)
    : 20;
  return null;
};`,
      ),
    ).not.toThrow();
  });

  it("drops orphan template-literal .replace chain fragments", () => {
    expect(() =>
      executeComponent(
        `export const MyAnimation = () => {
  \`.replace(/0\\.\\d+/g, (match) => {
    // Replace random numbers with mock foreign language words
  }));
  }));
  const OK = 1;
  if (OK !== 1) throw new Error("bad");
  return null;
};`,
      ),
    ).not.toThrow();
  });

  it("drops orphan bare brace-only lines (}}) that can appear after recovery", () => {
    expect(() =>
      executeComponent(
        `export const MyAnimation = () => {
  const frame = useCurrentFrame();
  if (typeof frame !== "number") throw new Error("bad");
  return null;
};
}}
`,
      ),
    ).not.toThrow();
  });
});

describe("extractComponentBody", () => {
  it("prefers the candidate that actually returns an AbsoluteFill scene", () => {
    const code = `const Scene0 = () => {
  const helper = true;
};

export const DynamicAnimation = () => {
  return (
    <AbsoluteFill>
      <div>Hello</div>
    </AbsoluteFill>
  );
};`;

    const body = extractComponentBody(code);
    expect(body).toContain("<AbsoluteFill>");
    expect(body).not.toContain("export const DynamicAnimation");
  });
});

// ---------------------------------------------------------------------------
// Scope: attached images & brand tokens
// ---------------------------------------------------------------------------

describe("Compiler scope — ATTACHED_IMAGES and BRAND", () => {
  it("ATTACHED_IMAGES defaults to empty array", () => {
    expect(() => executeComponent(makeComponent(`
      if (!Array.isArray(ATTACHED_IMAGES)) throw new Error('ATTACHED_IMAGES not array');
      if (ATTACHED_IMAGES.length !== 0) throw new Error('Should be empty by default');
    `))).not.toThrow();
  });

  it("ATTACHED_IMAGES receives passed images", () => {
    expect(() => executeComponent(
      makeComponent(`
        if (ATTACHED_IMAGES[0] !== 'data:image/png;base64,test123')
          throw new Error('Image not passed: ' + ATTACHED_IMAGES[0]);
      `),
      ["data:image/png;base64,test123"],
    )).not.toThrow();
  });

  it("BRAND receives passed brand tokens", () => {
    expect(() => executeComponent(
      makeComponent(`
        if (BRAND.primary !== '#ff0000') throw new Error('primary wrong: ' + BRAND.primary);
        if (BRAND.bg !== '#000000') throw new Error('bg wrong: ' + BRAND.bg);
      `),
      [], { primary: "#ff0000", bg: "#000000" },
    )).not.toThrow();
  });

  it("VOICEOVER_AUDIO_URL receives passed audio", () => {
    expect(() => executeComponent(
      makeComponent(`
        if (VOICEOVER_AUDIO_URL !== 'data:audio/mpeg;base64,abc')
          throw new Error('Audio URL wrong: ' + VOICEOVER_AUDIO_URL);
      `),
      [], {}, "data:audio/mpeg;base64,abc",
    )).not.toThrow();
  });

  it("hex() helper is injected", () => {
    expect(() => executeComponent(makeComponent(`
      const v = hex("#ff0000", 0.5);
      if (typeof v !== "string") throw new Error("hex returned non-string");
      if (!v.includes("rgba(")) throw new Error("hex did not rgba(): " + v);
    `))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Scope: chameleon components
// ---------------------------------------------------------------------------

describe("Compiler scope — Chameleon & App Shell components", () => {
  it("all chameleon components are injected", () => {
    expect(() => executeComponent(makeComponent(`
      const comps = {
        ChameleonInput,
        ChameleonHighlight,
        DropdownMenu,
        CinematicCamera,
        TaskDetailPanel,
        ModalOverlay,
        InputField,
        ChatBubble,
        SidebarNav,
        AppShell,
      };
      for (const [n, v] of Object.entries(comps)) {
        if (typeof v !== 'function') throw new Error(n + ' is not a function: ' + typeof v);
      }
    `))).not.toThrow();
  });

  it("motion primitives are injected", () => {
    expect(() => executeComponent(makeComponent(`
      if (typeof SheenOverlay !== 'function') throw new Error('SheenOverlay missing');
      if (typeof ParallaxLayer !== 'function') throw new Error('ParallaxLayer missing');
      if (typeof MotionBlurWhip !== 'function') throw new Error('MotionBlurWhip missing');
    `))).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

describe("Compiler error handling", () => {
  it("returns error and null Component for invalid JSX", () => {
    const { Component, error } = compileCode(
      `export const MyAnimation = () => { return <div unclosed; };`,
    );
    expect(error).not.toBeNull();
    expect(Component).toBeNull();
  });

  it("returns error for empty code", () => {
    const { error } = compileCode("");
    expect(error).not.toBeNull();
  });

  it("returns a Component (not null) for valid minimal code", () => {
    const { Component, error } = compileCode(
      `export const MyAnimation = () => { return null; };`,
    );
    expect(error).toBeNull();
    expect(Component).not.toBeNull();
    expect(typeof Component).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// Alignment utility — pure logic, no mocks needed
// ---------------------------------------------------------------------------

import { alignSceneDurations } from "../lib/alignScenes";

describe("alignSceneDurations", () => {
  it("extends a short scene to fit audio + 35f tail", () => {
    const scenes = [{
      id: 1, title: "Intro", prompt: "", skill: "test",
      durationInFrames: 90,
      wordTimings: [
        { word: "Hello", startFrame: 0, endFrame: 20 },
        { word: "World", startFrame: 22, endFrame: 100 },
      ],
    }] as any;

    const { scenes: aligned, adjustments } = alignSceneDurations(scenes);
    expect(adjustments).toHaveLength(1);
    expect(aligned[0].durationInFrames).toBe(135); // 100 + 35 tail
    expect(adjustments[0].audioDurationFrames).toBe(100);
  });

  it("does not shrink below MIN_SCENE_FRAMES (90f) for very short audio", () => {
    const scenes = [{
      id: 1, title: "Short", prompt: "", skill: "test",
      durationInFrames: 200,
      wordTimings: [{ word: "Hi", startFrame: 0, endFrame: 10 }],
    }] as any;

    const { scenes: aligned } = alignSceneDurations(scenes);
    // 10 + 35 = 45 < MIN_SCENE_FRAMES (90) — so stays at 90
    expect(aligned[0].durationInFrames).toBe(90);
  });

  it("does not modify scenes with no wordTimings", () => {
    const scenes = [{
      id: 1, title: "No audio", prompt: "", skill: "test",
      durationInFrames: 180,
    }] as any;

    const { scenes: aligned, adjustments } = alignSceneDurations(scenes);
    expect(adjustments).toHaveLength(0);
    expect(aligned[0].durationInFrames).toBe(180);
  });

  it("does not modify scenes with empty wordTimings array", () => {
    const scenes = [{
      id: 1, title: "Empty timings", prompt: "", skill: "test",
      durationInFrames: 180,
      wordTimings: [],
    }] as any;

    const { scenes: aligned, adjustments } = alignSceneDurations(scenes);
    expect(adjustments).toHaveLength(0);
    expect(aligned[0].durationInFrames).toBe(180);
  });

  it("does not log adjustment when duration already matches", () => {
    const scenes = [{
      id: 1, title: "Exact", prompt: "", skill: "test",
      durationInFrames: 135, // already = 100 + 35
      wordTimings: [{ word: "Word", startFrame: 0, endFrame: 100 }],
    }] as any;

    const { adjustments } = alignSceneDurations(scenes);
    expect(adjustments).toHaveLength(0);
  });

  it("handles multiple scenes independently", () => {
    const scenes = [
      {
        id: 1, title: "Scene 1", prompt: "", skill: "test",
        durationInFrames: 90,
        wordTimings: [{ word: "A", startFrame: 0, endFrame: 150 }],
      },
      {
        id: 2, title: "Scene 2", prompt: "", skill: "test",
        durationInFrames: 200,
        // no wordTimings
      },
    ] as any;

    const { scenes: aligned, adjustments } = alignSceneDurations(scenes);
    expect(adjustments).toHaveLength(1);
    expect(aligned[0].durationInFrames).toBe(185); // 150 + 35
    expect(aligned[1].durationInFrames).toBe(200); // unchanged
  });
});
