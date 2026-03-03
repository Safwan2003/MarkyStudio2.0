"use client";

import type { CursorWaypoint, WaypointAction } from "@/types/generation";
import {
    ArrowDown,
    ArrowUp,
    MousePointerClick,
    Plus,
    Redo2,
    Trash2,
    Undo2,
    X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface CursorWaypointEditorProps {
    image: string;
    waypoints: CursorWaypoint[];
    onChange: (waypoints: CursorWaypoint[]) => void;
    onClose: () => void;
}

const PIN_COLORS = [
    "#6366f1",
    "#f59e0b",
    "#22c55e",
    "#ef4444",
    "#06b6d4",
    "#a855f7",
    "#f97316",
    "#10b981",
];

const ACTION_OPTIONS: { value: WaypointAction; label: string; emoji: string }[] = [
    { value: "click", label: "Click", emoji: "🖱️" },
    { value: "hover", label: "Hover", emoji: "⬜" },
    { value: "double-click", label: "Double-Click", emoji: "⚡" },
    { value: "scroll", label: "Scroll", emoji: "📜" },
];

function getNormalized(
    e: { clientX: number; clientY: number },
    rect: DOMRect,
): { x: number; y: number } {
    return {
        x: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
    };
}

export function CursorWaypointEditor({
    image,
    waypoints,
    onChange,
    onClose,
}: CursorWaypointEditorProps) {
    const [local, setLocal] = useState<CursorWaypoint[]>(waypoints);
    const [history, setHistory] = useState<CursorWaypoint[][]>([waypoints]);
    const [historyIdx, setHistoryIdx] = useState(0);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [labelingAt, setLabelingAt] = useState<{ x: number; y: number; label: string } | null>(null);
    const [editingLabelIdx, setEditingLabelIdx] = useState<number | null>(null);
    const [editingLabelVal, setEditingLabelVal] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    // Drag-reorder state
    const [reorderDragIdx, setReorderDragIdx] = useState<number | null>(null);
    const [reorderOverIdx, setReorderOverIdx] = useState<number | null>(null);

    // ── History helpers ───────────────────────────────────────────────────────

    const commit = useCallback((pts: CursorWaypoint[]) => {
        setLocal(pts);
        setHistory((h) => [...h.slice(0, historyIdx + 1), pts]);
        setHistoryIdx((i) => i + 1);
    }, [historyIdx]);

    const undo = useCallback(() => {
        if (historyIdx <= 0) return;
        const prev = history[historyIdx - 1];
        setLocal(prev);
        setHistoryIdx((i) => i - 1);
    }, [history, historyIdx]);

    const redo = useCallback(() => {
        if (historyIdx >= history.length - 1) return;
        const next = history[historyIdx + 1];
        setLocal(next);
        setHistoryIdx((i) => i + 1);
    }, [history, historyIdx]);

    // ── Keyboard shortcuts ────────────────────────────────────────────────────

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            const mod = e.metaKey || e.ctrlKey;
            if (mod && e.key === "z") { e.preventDefault(); undo(); }
            if (mod && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); redo(); }
            if ((e.key === "Delete" || e.key === "Backspace") && selectedIndex !== null && !editingLabelIdx) {
                e.preventDefault();
                commit(local.filter((_, i) => i !== selectedIndex));
                setSelectedIndex(null);
            }
            if (e.key === "Escape") { setLabelingAt(null); setEditingLabelIdx(null); }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [undo, redo, selectedIndex, local, commit, editingLabelIdx]);

    // ── Canvas drag ───────────────────────────────────────────────────────────

    const handlePinMouseDown = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        e.preventDefault();
        setDraggingIndex(index);
        setSelectedIndex(index);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (draggingIndex === null || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const { x, y } = getNormalized(e, rect);
        setLocal((prev) =>
            prev.map((wp, i) => (i === draggingIndex ? { ...wp, x, y } : wp)),
        );
    };

    const handleMouseUp = () => {
        if (draggingIndex !== null) {
            commit(local); // commit the drag to history
            setDraggingIndex(null);
        }
    };

    const handleBackgroundClick = (e: React.MouseEvent) => {
        if (draggingIndex !== null) return;
        setSelectedIndex(null);
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const { x, y } = getNormalized(e, rect);
        setLabelingAt({ x, y, label: `Step ${local.length + 1}` });
    };

    const confirmNewPin = () => {
        if (!labelingAt) return;
        commit([
            ...local,
            { label: labelingAt.label, x: labelingAt.x, y: labelingAt.y, action: "click", dwellFrames: 18 },
        ]);
        setLabelingAt(null);
    };

    const deletePin = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        commit(local.filter((_, i) => i !== index));
        if (selectedIndex === index) setSelectedIndex(null);
    };

    // ── Field updates ─────────────────────────────────────────────────────────

    const updateField = <K extends keyof CursorWaypoint>(
        index: number,
        field: K,
        value: CursorWaypoint[K],
    ) => {
        const updated = local.map((wp, i) =>
            i === index ? { ...wp, [field]: value } : wp,
        );
        commit(updated);
    };

    // ── Label inline editing ──────────────────────────────────────────────────

    const startEditLabel = (i: number) => {
        setEditingLabelIdx(i);
        setEditingLabelVal(local[i].label);
    };

    const confirmEditLabel = () => {
        if (editingLabelIdx === null) return;
        updateField(editingLabelIdx, "label", editingLabelVal.trim() || local[editingLabelIdx].label);
        setEditingLabelIdx(null);
    };

    // ── Reorder drag ──────────────────────────────────────────────────────────

    const handleReorderDragStart = (i: number) => setReorderDragIdx(i);

    const handleReorderDragOver = (e: React.DragEvent, i: number) => {
        e.preventDefault();
        setReorderOverIdx(i);
    };

    const handleReorderDrop = () => {
        if (reorderDragIdx === null || reorderOverIdx === null || reorderDragIdx === reorderOverIdx) {
            setReorderDragIdx(null); setReorderOverIdx(null); return;
        }
        const pts = [...local];
        const [moved] = pts.splice(reorderDragIdx, 1);
        pts.splice(reorderOverIdx, 0, moved);
        commit(pts);
        setReorderDragIdx(null); setReorderOverIdx(null);
    };

    // ── SVG path ──────────────────────────────────────────────────────────────
    const svgPoints = local.map((wp) => `${wp.x * 100},${wp.y * 100}`).join(" ");

    const canUndo = historyIdx > 0;
    const canRedo = historyIdx < history.length - 1;

    const selectedWp = selectedIndex !== null ? local[selectedIndex] : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#12121e] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-w-5xl w-full max-h-[92vh] overflow-hidden">

                {/* ── Header ──────────────────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-2">
                        <MousePointerClick className="w-4 h-4 text-indigo-400" />
                        <span className="text-sm font-semibold text-white">Cursor Path Editor</span>
                        <span className="text-xs text-white/30 ml-1">{local.length} waypoints</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        {/* Undo / Redo */}
                        <button type="button" onClick={undo} disabled={!canUndo}
                            className="p-1.5 rounded hover:bg-white/5 text-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Undo (Cmd+Z)">
                            <Undo2 className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={redo} disabled={!canRedo}
                            className="p-1.5 rounded hover:bg-white/5 text-white/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Redo (Cmd+Y)">
                            <Redo2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-4 bg-white/10 mx-1" />
                        <button type="button" onClick={onClose} className="text-white/40 hover:text-white/70 transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ── Instructions ────────────────────────────────────────────────── */}
                <div className="px-5 py-1.5 bg-white/[0.02] shrink-0 flex items-center gap-3 text-[10.5px] text-white/35">
                    <span><span className="text-white/55">Click</span> canvas → add pin</span>
                    <span>·</span>
                    <span><span className="text-white/55">Drag</span> pin → reposition</span>
                    <span>·</span>
                    <span><span className="text-white/55">Delete</span> key → remove selected</span>
                    <span>·</span>
                    <span><span className="text-white/55">⌘Z / ⌘Y</span> → undo/redo</span>
                </div>

                {/* ── Main area: canvas + inspector ───────────────────────────────── */}
                <div className="flex flex-1 overflow-hidden min-h-0">

                    {/* Canvas */}
                    <div className="flex-1 overflow-auto p-4 flex items-start justify-center">
                        <div
                            ref={containerRef}
                            className="relative w-full select-none cursor-crosshair rounded-lg overflow-hidden"
                            style={{ aspectRatio: "16/9" }}
                            onClick={handleBackgroundClick}
                            onMouseMove={handleMouseMove}
                            onMouseUp={handleMouseUp}
                            onMouseLeave={handleMouseUp}
                        >
                            {/* Screenshot */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={image} alt="Screenshot" className="absolute inset-0 w-full h-full object-cover pointer-events-none" draggable={false} />

                            {/* SVG path */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                                {local.length > 1 && (
                                    <polyline
                                        points={svgPoints}
                                        fill="none"
                                        stroke="rgba(99,102,241,0.65)"
                                        strokeWidth="0.35"
                                        strokeDasharray="1.2 0.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                )}
                                {/* Arrow heads at each segment */}
                                {local.slice(1).map((wp, i) => {
                                    const prev = local[i];
                                    const dx = (wp.x - prev.x) * 100;
                                    const dy = (wp.y - prev.y) * 100;
                                    const len = Math.sqrt(dx * dx + dy * dy) || 1;
                                    const mx = prev.x * 100 + dx * 0.62;
                                    const my = prev.y * 100 + dy * 0.62;
                                    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                                    return (
                                        <g key={i} transform={`translate(${mx},${my}) rotate(${angle})`}>
                                            <polygon points="-1.2,-0.6 0,0 -1.2,0.6" fill="rgba(99,102,241,0.7)" />
                                        </g>
                                    );
                                })}
                            </svg>

                            {/* Pins */}
                            {local.map((wp, i) => {
                                const color = PIN_COLORS[i % PIN_COLORS.length];
                                const isSelected = selectedIndex === i;
                                const actionEmoji = ACTION_OPTIONS.find((a) => a.value === (wp.action ?? "click"))?.emoji ?? "🖱️";
                                return (
                                    <div
                                        key={i}
                                        className="absolute flex flex-col items-center gap-0.5"
                                        style={{
                                            left: `${wp.x * 100}%`,
                                            top: `${wp.y * 100}%`,
                                            transform: "translate(-50%, -50%)",
                                            cursor: draggingIndex === i ? "grabbing" : "grab",
                                            zIndex: isSelected ? 25 : draggingIndex === i ? 20 : 10,
                                            userSelect: "none",
                                        }}
                                        onMouseDown={(e) => handlePinMouseDown(e, i)}
                                    >
                                        {/* Selection ring */}
                                        {isSelected && (
                                            <div className="absolute inset-0 rounded-full ring-2 ring-white/50 scale-150 pointer-events-none" />
                                        )}
                                        {/* Pin */}
                                        <div
                                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg ring-2 ring-white/20 transition-transform"
                                            style={{
                                                backgroundColor: color,
                                                transform: draggingIndex === i || isSelected ? "scale(1.25)" : "scale(1)",
                                            }}
                                        >
                                            {i + 1}
                                        </div>
                                        {/* Label + action emoji tooltip */}
                                        <div
                                            className="absolute bottom-full mb-1.5 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-medium text-white pointer-events-none flex items-center gap-1"
                                            style={{ backgroundColor: color, opacity: 0.92 }}
                                        >
                                            <span>{actionEmoji}</span>
                                            <span>{wp.label}</span>
                                        </div>
                                        {/* Delete */}
                                        <button
                                            type="button"
                                            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center opacity-0 hover:opacity-100 text-white transition-opacity z-30"
                                            onClick={(e) => deletePin(e, i)}
                                            title="Delete"
                                        >
                                            <Trash2 className="w-2 h-2" />
                                        </button>
                                    </div>
                                );
                            })}

                            {/* New pin label dialog */}
                            {labelingAt && (
                                <div
                                    className="absolute z-30 bg-[#1e1e35] border border-indigo-500/50 rounded-lg shadow-xl p-3 min-w-[180px]"
                                    style={{ left: `${Math.min(labelingAt.x * 100, 72)}%`, top: `${Math.min(labelingAt.y * 100, 72)}%` }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <p className="text-[10px] text-white/40 mb-1.5">New waypoint label</p>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={labelingAt.label}
                                        onChange={(e) => setLabelingAt((prev) => prev ? { ...prev, label: e.target.value } : prev)}
                                        onKeyDown={(e) => { if (e.key === "Enter") confirmNewPin(); if (e.key === "Escape") setLabelingAt(null); }}
                                        className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500/60"
                                        placeholder="e.g. Click Dashboard"
                                    />
                                    <div className="flex gap-1.5 mt-2">
                                        <button type="button" onClick={confirmNewPin}
                                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-medium py-1 rounded transition-colors flex items-center justify-center gap-1">
                                            <Plus className="w-3 h-3" /> Add
                                        </button>
                                        <button type="button" onClick={() => setLabelingAt(null)}
                                            className="px-2 bg-white/5 hover:bg-white/10 text-white/50 text-[10px] rounded">
                                            Esc
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Inspector panel ──────────────────────────────────────────── */}
                    <div className="w-64 border-l border-white/8 flex flex-col shrink-0 overflow-hidden">
                        <div className="px-3 py-2 border-b border-white/8">
                            <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                                {selectedWp ? `Step ${selectedIndex! + 1} — Inspector` : "Waypoints"}
                            </span>
                        </div>

                        {selectedWp && selectedIndex !== null ? (
                            /* ── Per-waypoint inspector ── */
                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {/* Label */}
                                <div>
                                    <label className="text-[10px] text-white/40 block mb-1">Label</label>
                                    {editingLabelIdx === selectedIndex ? (
                                        <input
                                            autoFocus
                                            value={editingLabelVal}
                                            onChange={(e) => setEditingLabelVal(e.target.value)}
                                            onBlur={confirmEditLabel}
                                            onKeyDown={(e) => { if (e.key === "Enter") confirmEditLabel(); if (e.key === "Escape") setEditingLabelIdx(null); }}
                                            className="w-full bg-white/5 border border-indigo-500/40 rounded px-2 py-1 text-xs text-white outline-none"
                                        />
                                    ) : (
                                        <button type="button" onClick={() => startEditLabel(selectedIndex)}
                                            className="w-full text-left bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white hover:border-white/25 transition-colors">
                                            {selectedWp.label}
                                            <span className="text-white/25 text-[9px] ml-1">✎</span>
                                        </button>
                                    )}
                                </div>

                                {/* Action type */}
                                <div>
                                    <label className="text-[10px] text-white/40 block mb-1">Action</label>
                                    <div className="grid grid-cols-2 gap-1">
                                        {ACTION_OPTIONS.map((opt) => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                onClick={() => updateField(selectedIndex, "action", opt.value)}
                                                className={`text-[10px] py-1 px-1.5 rounded border flex items-center justify-center gap-1 transition-colors ${(selectedWp.action ?? "click") === opt.value
                                                        ? "border-indigo-500/60 bg-indigo-500/15 text-indigo-300"
                                                        : "border-white/10 text-white/40 hover:text-white/70 hover:border-white/20"
                                                    }`}
                                            >
                                                <span>{opt.emoji}</span>
                                                <span>{opt.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Dwell time */}
                                <div>
                                    <label className="text-[10px] text-white/40 block mb-1">
                                        Dwell — <span className="text-white/60">{selectedWp.dwellFrames ?? 18}f</span>
                                        <span className="text-white/30"> ({(((selectedWp.dwellFrames ?? 18)) / 30).toFixed(1)}s)</span>
                                    </label>
                                    <input
                                        type="range"
                                        min={6}
                                        max={90}
                                        step={6}
                                        value={selectedWp.dwellFrames ?? 18}
                                        onChange={(e) => updateField(selectedIndex, "dwellFrames", parseInt(e.target.value))}
                                        className="w-full accent-indigo-500"
                                    />
                                    <div className="flex justify-between text-[9px] text-white/20 mt-0.5">
                                        <span>0.2s</span><span>3s</span>
                                    </div>
                                </div>

                                {/* Position */}
                                <div>
                                    <label className="text-[10px] text-white/40 block mb-1">Position (normalized)</label>
                                    <div className="grid grid-cols-2 gap-1">
                                        {(["x", "y"] as const).map((axis) => (
                                            <div key={axis} className="flex items-center gap-1 bg-white/5 border border-white/10 rounded px-2 py-1">
                                                <span className="text-[9px] text-white/30 uppercase">{axis}</span>
                                                <input
                                                    type="number"
                                                    min={0} max={1} step={0.01}
                                                    value={selectedWp[axis].toFixed(3)}
                                                    onChange={(e) => updateField(selectedIndex, axis, parseFloat(e.target.value))}
                                                    className="w-full bg-transparent text-[11px] text-white/80 outline-none text-right"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Delete */}
                                <button
                                    type="button"
                                    onClick={() => { commit(local.filter((_, i) => i !== selectedIndex)); setSelectedIndex(null); }}
                                    className="w-full flex items-center justify-center gap-1.5 text-[10px] text-red-400/70 hover:text-red-400 border border-red-500/20 hover:border-red-500/40 rounded py-1.5 transition-colors"
                                >
                                    <Trash2 className="w-3 h-3" /> Delete Waypoint
                                </button>
                            </div>
                        ) : (
                            /* ── Waypoint list (reorderable) ── */
                            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                                {local.length === 0 && (
                                    <p className="text-[11px] text-white/25 text-center py-6">
                                        Click the screenshot<br />to add waypoints
                                    </p>
                                )}
                                {local.map((wp, i) => {
                                    const color = PIN_COLORS[i % PIN_COLORS.length];
                                    const actionEmoji = ACTION_OPTIONS.find((a) => a.value === (wp.action ?? "click"))?.emoji ?? "🖱️";
                                    return (
                                        <div
                                            key={i}
                                            draggable
                                            onDragStart={() => handleReorderDragStart(i)}
                                            onDragOver={(e) => handleReorderDragOver(e, i)}
                                            onDrop={handleReorderDrop}
                                            onDragEnd={() => { setReorderDragIdx(null); setReorderOverIdx(null); }}
                                            onClick={() => setSelectedIndex(i)}
                                            className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all ${reorderOverIdx === i ? "bg-indigo-500/10 border-indigo-500/30 border" : "hover:bg-white/5 border border-transparent"
                                                }`}
                                        >
                                            {/* Number badge */}
                                            <div
                                                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                                                style={{ backgroundColor: color }}
                                            >
                                                {i + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[11px] text-white/80 truncate">{wp.label}</div>
                                                <div className="text-[9px] text-white/30">{actionEmoji} {wp.action ?? "click"} · {wp.dwellFrames ?? 18}f</div>
                                            </div>
                                            {/* Reorder arrows */}
                                            <div className="flex flex-col gap-0.5 shrink-0">
                                                <button type="button" disabled={i === 0}
                                                    onClick={(e) => { e.stopPropagation(); const pts = [...local];[pts[i - 1], pts[i]] = [pts[i], pts[i - 1]]; commit(pts); }}
                                                    className="text-white/20 hover:text-white/50 disabled:opacity-10 transition-colors">
                                                    <ArrowUp className="w-2.5 h-2.5" />
                                                </button>
                                                <button type="button" disabled={i === local.length - 1}
                                                    onClick={(e) => { e.stopPropagation(); const pts = [...local];[pts[i], pts[i + 1]] = [pts[i + 1], pts[i]]; commit(pts); }}
                                                    className="text-white/20 hover:text-white/50 disabled:opacity-10 transition-colors">
                                                    <ArrowDown className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* ── Inspector footer ── */}
                        {selectedIndex !== null && (
                            <div className="p-2 border-t border-white/8">
                                <button type="button" onClick={() => setSelectedIndex(null)}
                                    className="w-full text-[10px] text-white/30 hover:text-white/60 transition-colors py-1">
                                    ↩ Back to list
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Footer ──────────────────────────────────────────────────────── */}
                <div className="border-t border-white/10 px-5 py-3 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => commit([])}
                            className="text-[11px] text-white/25 hover:text-red-400 transition-colors">
                            Clear all
                        </button>
                        <span className="text-[10px] text-white/20">
                            {local.length} step{local.length !== 1 ? "s" : ""} · ~{Math.round(local.reduce((s, w) => s + (w.dwellFrames ?? 18), 0) / 30)}s dwell
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={onClose}
                            className="text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-1.5 rounded border border-white/10">
                            Cancel
                        </button>
                        <button type="button" onClick={() => { onChange(local); onClose(); }}
                            className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-colors px-4 py-1.5 rounded font-medium">
                            Save Path
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
