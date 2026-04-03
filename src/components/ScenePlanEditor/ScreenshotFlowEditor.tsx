"use client";

import type { CursorWaypoint, ScenePlan, ScreenFlow, ScreenTransition, TransitionType } from "@/types/generation";
import { Check, ChevronDown, MousePointerClick, RefreshCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { CursorWaypointEditor } from "./CursorWaypointEditor";

/** Max auto-detected waypoints per image — keep enough real targets without overwhelming the editor */
const MAX_WAYPOINTS = 10;

const TRANSITION_ICONS: Record<TransitionType, string> = {
  search:   "🔍",
  click:    "🖱️",
  scroll:   "📜",
  navigate: "→",
  submit:   "✅",
  hover:    "⬜",
};

const TRANSITION_TYPES: TransitionType[] = ["click", "search", "scroll", "navigate", "submit", "hover"];

interface ScreenshotFlowEditorProps {
  images: string[];
  initialFlow?: ScreenFlow & {
    keyFrameIndices?: number[];
    narrativeSummary?: string;
    productFeature?: string;
    isVideoRecording?: boolean;
    totalFrames?: number;
  };
  initialDescriptions?: string[];
  initialWaypointsByImage?: Record<number, CursorWaypoint[]>;
  scenes?: ScenePlan[];
  /** When true, renders inline (fills container) instead of as a fixed modal. */
  inline?: boolean;
  /** External detecting state (e.g. initial auto-detection from parent). Shows the detecting overlay. */
  isDetectingProp?: boolean;
  onSave: (
    flow: ScreenFlow,
    descriptions: string[],
    waypointsByImage: Record<number, CursorWaypoint[]>,
    keyFrameIndices?: number[],
  ) => void;
  onClose?: () => void;
}

function buildDefaultFlow(count: number): ScreenFlow {
  return {
    screens: Array.from({ length: count }, (_, i) => ({ index: i, description: "" })),
    transitions: Array.from({ length: count - 1 }, (_, i) => ({
      from: i,
      to: i + 1,
      action: "",
      type: "click" as TransitionType,
    })),
  };
}

export function ScreenshotFlowEditor({
  images,
  initialFlow,
  initialDescriptions,
  initialWaypointsByImage,
  scenes,
  inline = false,
  isDetectingProp = false,
  onSave,
  onClose,
}: ScreenshotFlowEditorProps) {
  // Video recording metadata from flow-analyze
  const isVideoRecording = initialFlow?.isVideoRecording ?? false;
  const [keyFrameIndices] = useState<number[]>(
    initialFlow?.keyFrameIndices ?? [],
  );
  const [narrativeSummary, setNarrativeSummary] = useState(
    initialFlow?.narrativeSummary ?? "",
  );
  const productFeature = initialFlow?.productFeature ?? "";
  const totalFrames = initialFlow?.totalFrames ?? images.length;

  // User can exclude individual frames they don't want
  const [excludedSet, setExcludedSet] = useState<Set<number>>(() => new Set());

  // For video recordings, the "active" images shown in the storyboard are key frames only
  // For screenshots, show all images as before
  const baseIndices = isVideoRecording && keyFrameIndices.length >= 2
    ? keyFrameIndices
    : Array.from({ length: images.length }, (_, i) => i);
  const activeIndices = baseIndices.filter((i) => !excludedSet.has(i));
  const activeImages = activeIndices.map((i) => images[i]);

  const removeFrame = (origIdx: number) => {
    setExcludedSet((prev) => {
      const next = new Set(Array.from(prev));
      next.add(origIdx);

      setLocalFlow((prevFlow) => {
        // Derive old/new active indices from the excluded sets directly — avoids
        // closing over outer `activeIndices` which may be stale inside a state updater.
        const oldActiveIndices = baseIndices.filter((i) => !prev.has(i));
        const newActiveIndices = baseIndices.filter((i) => !next.has(i));
        if (newActiveIndices.length < 2) {
          return { ...prevFlow, transitions: [] };
        }

        // Try to preserve existing transition data (actions/types) by matching pairs
        // The old flow transitions were based on the PREVIOUS activeIndices.
        const newTransitions: ScreenTransition[] = [];

        for (let j = 0; j < newActiveIndices.length - 1; j++) {
          const fromIdx = newActiveIndices[j];
          const toIdx = newActiveIndices[j + 1];
          
          // Look for an existing transition in the current flow that matched this specific sequence
          const oldFromPos = oldActiveIndices.indexOf(fromIdx);
          const oldToPos = oldActiveIndices.indexOf(toIdx);
          
          let existingT = null;
          if (oldFromPos !== -1 && oldToPos === oldFromPos + 1) {
            existingT = prevFlow.transitions[oldFromPos];
          }

          newTransitions.push({
            from: j,
            to: j + 1,
            action: existingT?.action ?? "",
            type: (existingT?.type ?? "click") as TransitionType,
          });
        }

        return { ...prevFlow, transitions: newTransitions };
      });
      return next;
    });
    setSelectedTransitionIdx(null);
  };

  const [localFlow, setLocalFlow] = useState<ScreenFlow>(
    initialFlow && initialFlow.screens.length > 0
      ? { screens: initialFlow.screens, transitions: initialFlow.transitions }
      : buildDefaultFlow(activeImages.length),
  );
  const [localDescriptions, setLocalDescriptions] = useState<string[]>(
    () => activeImages.map((_, i) => initialDescriptions?.[activeIndices[i]] ?? ""),
  );
  const [isDetecting, setIsDetecting] = useState(false);
  const [selectedTransitionIdx, setSelectedTransitionIdx] = useState<number | null>(null);
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [localWaypointsByImage, setLocalWaypointsByImage] = useState<Record<number, CursorWaypoint[]>>(
    initialWaypointsByImage ?? {},
  );
  const [cursorEditorImageIdx, setCursorEditorImageIdx] = useState<number | null>(null);
  /** Per-image vision detection loading state */
  const [visionLoading, setVisionLoading] = useState<Record<number, boolean>>({});
  /** Track which images we already attempted vision on to avoid re-fetching */
  const visionFetchedRef = useRef<Set<number>>(new Set());

  // Auto-detect waypoints for active (key moment) images only.
  // Runs once on mount so all storyboard cards arrive pre-populated.
  useEffect(() => {
    activeIndices.forEach((origIdx, pos) => {
      const imgIdx = origIdx; // waypoints are keyed by original index
      const img = images[origIdx];
      if ((initialWaypointsByImage?.[imgIdx]?.length ?? 0) > 0) return;
      if (visionFetchedRef.current.has(imgIdx)) return;
      visionFetchedRef.current.add(imgIdx);

      setVisionLoading((prev) => ({ ...prev, [imgIdx]: true }));
      fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: img }),
      })
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (!data?.elements?.length) return;
          const waypoints: CursorWaypoint[] = data.elements
            .slice(0, MAX_WAYPOINTS)
            .map((el: { label: string; x: number; y: number; w?: number; h?: number; elementType?: string; id?: string }) => {
              const w = el.w ?? 0.12;
              const h = el.h ?? 0.06;
              return {
                label: el.label,
                x: parseFloat(el.x.toFixed(3)),
                y: parseFloat(el.y.toFixed(3)),
                id: el.id,
                elementType: el.elementType as CursorWaypoint["elementType"],
                box: {
                  x: parseFloat((el.x - w / 2).toFixed(3)),
                  y: parseFloat((el.y - h / 2).toFixed(3)),
                  w: parseFloat(w.toFixed(3)),
                  h: parseFloat(h.toFixed(3)),
                },
              } satisfies CursorWaypoint;
            });
          setLocalWaypointsByImage((prev) => {
            if (prev[imgIdx]?.length > 0) return prev; // don't overwrite user-confirmed
            return { ...prev, [imgIdx]: waypoints };
          });
        })
        .catch(() => {/* non-fatal */})
        .finally(() => setVisionLoading((prev) => ({ ...prev, [imgIdx]: false })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When parent provides a detected flow after async detection completes, apply it
  useEffect(() => {
    if (!initialFlow || initialFlow.screens.length !== images.length) return;
    setLocalFlow(initialFlow);
    if (Array.isArray(initialFlow.screens)) {
      setLocalDescriptions((prev) =>
        initialFlow.screens.map((s, i) => s.description?.trim() || prev[i] || ""),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFlow]);

  // Close type dropdown whenever the selected transition changes
  useEffect(() => {
    setTypeDropdownOpen(false);
  }, [selectedTransitionIdx]);

  const updateTransition = (idx: number, patch: Partial<ScreenTransition>) => {
    setLocalFlow((prev) => ({
      ...prev,
      transitions: prev.transitions.map((t, i) => i === idx ? { ...t, ...patch } : t),
    }));
  };

  const updateScreenDescription = (idx: number, desc: string) => {
    setLocalFlow((prev) => ({
      ...prev,
      screens: prev.screens.map((s, i) => i === idx ? { ...s, description: desc } : s),
    }));
  };

  const detectFlow = async () => {
    setIsDetecting(true);
    try {
      // IMPORTANT:
      // - The Flow editor operates on "activeImages" (key moments after exclusions), not the full original frame list.
      // - If we send the full `images` array but only send active descriptions, the server may misalign
      //   descriptions with frames and infer an incorrect flow ("customized" / wrong cursor navigation).
      // So we always analyze the active storyboard set.
      const imagesToAnalyze = activeImages;
      const descriptionsToAnalyze = localDescriptions;
      const res = await fetch("/api/flow-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: imagesToAnalyze, userDescriptions: descriptionsToAnalyze }),
      });
      if (!res.ok) return;
      const data = await res.json();

      // We intentionally do NOT update keyFrameIndices here because we analyzed the already-selected key moments.
      // (keyFrameIndices refers to original indices in the raw recording, and changing it here would desync the editor.)
      if (typeof data.narrativeSummary === "string" && data.narrativeSummary.trim()) {
        setNarrativeSummary(data.narrativeSummary);
      }

      // Merge descriptions
      if (Array.isArray(data.screens)) {
        const mergedDescs = [...localDescriptions];
        const mergedScreens = [...localFlow.screens];
        (data.screens as { index: number; description: string }[]).forEach(({ index, description }) => {
          if (index < 0 || index >= activeImages.length) return;
          if (!mergedDescs[index]?.trim()) mergedDescs[index] = description;
          if (mergedScreens[index]) mergedScreens[index] = { ...mergedScreens[index], description };
        });
        setLocalDescriptions(mergedDescs);
        setLocalFlow((prev) => ({ ...prev, screens: mergedScreens }));
      }

      // Update transitions
      if (Array.isArray(data.transitions) && data.transitions.length > 0) {
        const validTypes = new Set(TRANSITION_TYPES);
        const newTransitions: ScreenTransition[] = data.transitions
          .slice(0, activeImages.length - 1)
          .map((t: { from: number; to: number; action: string; type: string }) => ({
            from: t.from,
            to: t.to,
            action: t.action || "",
            type: (validTypes.has(t.type as TransitionType) ? t.type : "click") as TransitionType,
          }));
        const fullTransitions = Array.from({ length: activeImages.length - 1 }, (_, i) => {
          const found = newTransitions.find((t) => t.from === i && t.to === i + 1);
          return found ?? { from: i, to: i + 1, action: "", type: "click" as TransitionType };
        });
        setLocalFlow((prev) => ({ ...prev, transitions: fullTransitions }));
      }
    } catch (err) {
      console.warn("flow detect failed:", err);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSave = () => {
    // CRITICAL: Waypoints are keyed by original index in local state, but the
    // generator resolves them by relative index (0, 1, 2...) matching the
    // *planning image set* (the storyboard the user approved).
    // We must map the keys here before passing to onSave.
    const mappedWaypoints: Record<number, CursorWaypoint[]> = {};
    activeIndices.forEach((origIdx, pos) => {
      if (localWaypointsByImage[origIdx]) {
        mappedWaypoints[pos] = localWaypointsByImage[origIdx];
      }
    });

    // Ensure the plan/generation layer uses the same image subset/order the user saw here.
    // We pass `activeIndices` as "keyFrameIndices" so approveFlow() will plan on exactly this set.
    // (For non-recording screenshots this also enables the "hide frame" behavior to persist.)
    onSave(localFlow, localDescriptions, mappedWaypoints, activeIndices);
    onClose?.();
  };

  const selectedTransition = selectedTransitionIdx !== null
    ? localFlow.transitions[selectedTransitionIdx]
    : null;

  const suggestedSkillForInspector =
    selectedTransition?.type === "scroll"
      ? "premium-scroll-demo"
      : selectedTransition?.type === "search" || selectedTransition?.type === "submit" || selectedTransition?.elementType === "input"
        ? "premium-chameleon-ui"
        : "premium-cursor-engine";
  const connectedScenesForInspector =
    selectedTransition !== null
      ? (scenes ?? []).filter(
          (s) => s.imageIndex === selectedTransition.from || s.imageIndex === selectedTransition.to,
        )
      : [];

  const removedCount = excludedSet.size;
  const summary = isVideoRecording && keyFrameIndices.length >= 2
    ? `${totalFrames} frames → ${activeImages.length} key moments · ${localFlow.transitions.length} transitions`
    : `${activeImages.length} screen${activeImages.length !== 1 ? "s" : ""}${removedCount > 0 ? ` (${removedCount} hidden)` : ""} · ${localFlow.transitions.length} transition${localFlow.transitions.length !== 1 ? "s" : ""}`;

  const inner = (
    <div className={inline ? "flex flex-col h-full overflow-hidden bg-[#12121e]" : "bg-[#12121e] border border-white/10 rounded-2xl shadow-2xl flex flex-col w-full max-w-5xl max-h-[90vh] overflow-hidden"}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
        <div>
          <span className="text-sm font-semibold text-white">
            {inline ? "Step 1 — User Journey Flow" : "User Journey Flow"}
          </span>
          <span className="text-xs text-white/40 ml-2">{summary}</span>
        </div>
        {!inline && onClose && (
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Storyboard — left */}
          <div className="flex-1 overflow-auto p-5 relative">
            {/* Detecting overlay — shown for both user-triggered and auto-detection */}
            {(isDetecting || isDetectingProp) && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#12121e]/80 backdrop-blur-sm rounded-xl">
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                  {isDetectingProp && !isDetecting ? "Analyzing your screenshots..." : "Detecting transitions..."}
                </div>
              </div>
            )}

            {/* Smart Narrative banner — shown for video recordings */}
            {isVideoRecording && (narrativeSummary || productFeature) && (
              <div className="mb-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3 flex gap-3 items-start">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <span className="text-[10px]">✦</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-semibold text-indigo-300 uppercase tracking-wider">AI Narrative</span>
                    {productFeature && (
                      <span className="text-[9px] bg-indigo-500/15 text-indigo-300 rounded-full px-2 py-0.5 border border-indigo-500/20">
                        {productFeature}
                      </span>
                    )}
                    <span className="text-[9px] text-white/25 ml-auto">
                      {totalFrames} frames → {activeImages.length} key moments extracted
                    </span>
                  </div>
                  {narrativeSummary && (
                    <p className="text-[11px] text-white/60 leading-relaxed">{narrativeSummary}</p>
                  )}
                </div>
              </div>
            )}

            {/* Storyboard row */}
            <div className="flex items-start gap-0 min-w-max">
              {activeImages.map((img, pos) => {
                const origIdx = activeIndices[pos];
                const imgIdx = origIdx; // waypoints keyed by original index
                const transition = pos < activeImages.length - 1 ? localFlow.transitions[pos] : null;
                const isSelectedTransition = selectedTransitionIdx === pos;

                return (
                  <div key={origIdx} className="flex items-center gap-0">
                    {/* Screenshot card */}
                    <div className="flex flex-col items-center gap-2 w-[140px] shrink-0">
                      {/* Thumbnail */}
                      <div className="relative w-full rounded-lg overflow-hidden border border-white/10 bg-white/5 group" style={{ aspectRatio: "16/10" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img} alt={`Moment ${pos + 1}`} className="w-full h-full object-cover" />
                        {/* Number badge */}
                        <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                          {pos + 1}
                        </div>
                        {/* Remove button — shown on hover */}
                        {activeImages.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeFrame(origIdx)}
                            title="Remove this frame"
                            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600/80"
                          >
                            <X className="w-2.5 h-2.5 text-white" />
                          </button>
                        )}
                        {/* Original frame label for video recordings */}
                        {isVideoRecording && (
                          <div className="absolute bottom-1 right-1 text-[8px] text-white/30 bg-black/40 rounded px-1">
                            f{origIdx + 1}
                          </div>
                        )}
                      </div>

                      {/* Description textarea */}
                      <textarea
                        value={localDescriptions[pos] ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setLocalDescriptions((prev) => prev.map((d, i) => i === pos ? v : d));
                          updateScreenDescription(pos, v);
                        }}
                        rows={2}
                        placeholder="What does this screen show?"
                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] text-white/80 placeholder:text-white/25 resize-none outline-none focus:border-indigo-500/50 transition-colors"
                      />

                      {/* Cursor path button */}
                      <button
                        type="button"
                        onClick={() => !visionLoading[imgIdx] && setCursorEditorImageIdx(imgIdx)}
                        className={`w-full flex items-center justify-center gap-1.5 text-[10px] px-2 py-1 rounded border transition-all ${
                          visionLoading[imgIdx]
                            ? "border-white/10 text-white/30 cursor-wait"
                            : (localWaypointsByImage[imgIdx]?.length ?? 0) > 0
                            ? "border-indigo-500/40 text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 cursor-pointer"
                            : "border-white/10 text-white/40 hover:text-white/70 cursor-pointer"
                        }`}
                      >
                        {visionLoading[imgIdx] ? (
                          <>
                            <span className="w-2.5 h-2.5 rounded-full border border-current border-t-transparent animate-spin shrink-0" />
                            Detecting...
                          </>
                        ) : (
                          <>
                            <MousePointerClick className="w-2.5 h-2.5" />
                            {(localWaypointsByImage[imgIdx]?.length ?? 0) > 0
                              ? `${localWaypointsByImage[imgIdx].length} waypoints ✎`
                              : "Add Cursor Path"}
                          </>
                        )}
                      </button>
                    </div>

                    {/* Arrow + transition */}
                    {transition && (
                      <div className="flex flex-col items-center px-2 shrink-0 w-[120px]">
                        <button
                          type="button"
                          onClick={() => setSelectedTransitionIdx(isSelectedTransition ? null : pos)}
                          className={`w-full rounded-lg border px-2 py-1.5 text-center transition-all ${
                            isSelectedTransition
                              ? "border-indigo-500/60 bg-indigo-500/10"
                              : "border-white/10 bg-white/[0.03] hover:border-white/20"
                          }`}
                        >
                          <div className="text-base leading-none mb-1">
                            {TRANSITION_ICONS[transition.type]}
                          </div>
                          <div className={`text-[9px] font-medium mb-1 ${isSelectedTransition ? "text-indigo-300" : "text-white/50"}`}>
                            {transition.type}
                          </div>
                          <div className="text-[9px] text-white/35 leading-tight line-clamp-2">
                            {transition.action || "click to edit"}
                          </div>
                        </button>
                        <div className="flex items-center w-full mt-1">
                          <div className="flex-1 h-px bg-white/15" />
                          <div className="w-0 h-0 border-t-[3px] border-b-[3px] border-l-[5px] border-transparent border-l-white/25" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inspector — right */}
          <div className="w-56 border-l border-white/8 flex flex-col shrink-0">
            <div className="px-3 py-2 border-b border-white/8">
              <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                {selectedTransition ? `Transition ${selectedTransitionIdx! + 1}→${selectedTransitionIdx! + 2}` : "Inspector"}
              </span>
            </div>

            {selectedTransition && selectedTransitionIdx !== null ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {/* Action text */}
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">User action</label>
                  <textarea
                    autoFocus
                    value={selectedTransition.action}
                    onChange={(e) => updateTransition(selectedTransitionIdx, { action: e.target.value })}
                    rows={3}
                    placeholder="e.g. types 'BMW' and presses search"
                    className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] text-white/80 placeholder:text-white/25 resize-none outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>

                {/* Type selector */}
                <div>
                  <label className="text-[10px] text-white/40 block mb-1">Transition type</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setTypeDropdownOpen((v) => !v)}
                      className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded px-2 py-1.5 text-[11px] text-white/80 hover:border-white/20 transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <span>{TRANSITION_ICONS[selectedTransition.type]}</span>
                        <span>{selectedTransition.type}</span>
                      </span>
                      <ChevronDown className="w-3 h-3 text-white/30" />
                    </button>
                    {typeDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[#1e1e35] border border-white/10 rounded-lg shadow-xl z-10 overflow-hidden">
                        {TRANSITION_TYPES.map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => {
                              updateTransition(selectedTransitionIdx, { type });
                              setTypeDropdownOpen(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] transition-colors ${
                              selectedTransition.type === type
                                ? "bg-indigo-500/15 text-indigo-300"
                                : "text-white/60 hover:bg-white/5"
                            }`}
                          >
                            <span>{TRANSITION_ICONS[type]}</span>
                            <span>{type}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Connected scenes inspector */}
                <div className="rounded-lg bg-white/[0.03] border border-white/8 p-2 space-y-1.5">
                  <p className="text-[9px] text-white/30 mb-1">
                    Connected scenes
                    <span className="ml-1 text-white/20">(suggested: {suggestedSkillForInspector.replace("premium-", "")})</span>
                  </p>
                  {connectedScenesForInspector.length === 0 ? (
                    <p className="text-[9px] text-white/20 italic">No scenes use these images</p>
                  ) : connectedScenesForInspector.map((s) => {
                    const matches = s.skills?.includes(suggestedSkillForInspector) ?? false;
                    return (
                      <div key={s.id} className="flex items-center justify-between gap-1">
                        <span className="text-[10px] text-white/70 truncate flex-1">{s.title}</span>
                        <span
                          className={`text-[9px] font-medium shrink-0 ${matches ? "text-teal-400" : "text-amber-400"}`}
                          title={matches ? "Skill matches" : `Uses ${(s.skills?.[0] ?? "").replace("premium-", "")}`}
                        >
                          {matches ? "✓" : "⚠"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTransitionIdx(null)}
                  className="w-full text-[10px] text-white/30 hover:text-white/60 transition-colors py-1"
                >
                  ↩ Back
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <p className="text-[11px] text-white/25 text-center">
                  Click a transition<br />arrow to edit it
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-5 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={detectFlow}
              disabled={isDetecting}
              className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 border border-white/10 hover:border-white/20 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isDetecting ? "animate-spin" : ""}`} />
              {isDetecting ? "Detecting..." : "Detect Flow"}
            </button>
            {removedCount > 0 && (
              <button
                type="button"
                onClick={() => setExcludedSet(new Set())}
                className="text-[10px] text-white/30 hover:text-white/60 border border-white/10 hover:border-white/20 rounded-lg px-2.5 py-1.5 transition-colors"
              >
                Restore {removedCount} hidden
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-white/30">{summary}</span>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 text-xs bg-teal-600 hover:bg-teal-500 text-white rounded-lg px-4 py-1.5 font-medium transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              {inline ? "Approve Flow → Generate Plan" : "Save Flow"}
            </button>
          </div>
        </div>
    </div>
  );

  // cursorEditorImageIdx is an original image index
  const cursorEditorNode = cursorEditorImageIdx !== null ? (
    <CursorWaypointEditor
      image={images[cursorEditorImageIdx]}
      waypoints={localWaypointsByImage[cursorEditorImageIdx] ?? []}
      onChange={(waypoints) =>
        setLocalWaypointsByImage((prev) => ({ ...prev, [cursorEditorImageIdx]: waypoints }))
      }
      onClose={() => setCursorEditorImageIdx(null)}
    />
  ) : null;

  if (inline) {
    return (
      <>
        {inner}
        {cursorEditorNode}
      </>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      {inner}
      {cursorEditorNode}
    </div>
  );
}
