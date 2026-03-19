"use client";

import { ErrorDisplay } from "@/components/ErrorDisplay";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useImageAttachments } from "@/hooks/useImageAttachments";
import { MODELS, type ModelId } from "@/types/generation";
import { Upload, X } from "lucide-react";
import { useEffect, useState } from "react";

interface LandingPageInputProps {
  onNavigate: (
    prompt: string,
    model: ModelId,
    attachedImages?: string[],
    imageUserDescriptions?: string[],
  ) => void;
  isNavigating?: boolean;
  showCodeExamplesLink?: boolean;
}

export function LandingPageInput({
  onNavigate,
  isNavigating = false,
}: LandingPageInputProps) {
  const [productName, setProductName] = useState("MarkyTech");
  const [description, setDescription] = useState(
    "A Karachi-based digital agency delivering cutting-edge AI-powered solutions, custom web & mobile development, and performance-driven digital marketing — helping businesses worldwide transform, scale, and grow.",
  );
  const [audience, setAudience] = useState("Enterprises & growth-stage startups seeking digital transformation");
  const [features, setFeatures] = useState([
    "Agentic AI & intelligent process automation",
    "Custom web, mobile & AWS cloud solutions",
    "Digital marketing: SEO, PPC & social media",
  ]);
  const [cta, setCta] = useState("Start Your Project");
  const [model, setModel] = useState<ModelId>("gemini-2.5-flash:none");
  const [brandColors, setBrandColors] = useState<string[]>(["#2563EB", "#7C3AED"]);
  const [targetUrl, setTargetUrl] = useState("https://markytech.com");

  const [imageUserDescriptions, setImageUserDescriptions] = useState<string[]>([]);

  const {
    attachedImages,
    isDragging,
    fileInputRef,
    videoInfo,
    isExtracting,
    extractProgress,
    removeImage: removeImageBase,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    canAddMore,
    error,
    clearError,
  } = useImageAttachments();

  // Wrap removeImage to also remove the corresponding description
  const removeImage = (index: number) => {
    removeImageBase(index);
    setImageUserDescriptions((prev) => prev.filter((_, i) => i !== index));
  };

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(clearError, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  const buildProductPrompt = () => {
    const lines: string[] = [];

    lines.push(`Create a premium SaaS product demo video for ${productName.trim()}.`);
    lines.push("");
    lines.push(description.trim());

    if (audience.trim()) {
      lines.push("");
      lines.push(`Target audience: ${audience.trim()}`);
    }

    const activeFeatures = features.filter((f) => f.trim());
    if (activeFeatures.length > 0) {
      lines.push("");
      lines.push("Key features:");
      activeFeatures.forEach((f) => lines.push(`- ${f.trim()}`));
    }

    if (cta.trim()) {
      lines.push("");
      lines.push(`Call to action: "${cta.trim()}"`);
    }

    const activeBrandColors = brandColors.filter((c) => c.trim());
    if (activeBrandColors.length > 0) {
      lines.push("");
      lines.push(`Brand colors: ${activeBrandColors.join(", ")}`);
    }

    if (targetUrl.trim()) {
      lines.push("");
      lines.push(`Product URL: ${targetUrl.trim()}`);
    }

    return lines.join("\n");
  };

  const isValid = productName.trim().length > 0 && description.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isNavigating) return;
    const activeDescriptions = imageUserDescriptions.filter((_, i) => i < attachedImages.length);
    onNavigate(
      buildProductPrompt(),
      model,
      attachedImages.length > 0 ? attachedImages : undefined,
      activeDescriptions.some((d) => d.trim()) ? activeDescriptions : undefined,
    );
  };

  const setFeature = (index: number, value: string) => {
    const next = [...features];
    next[index] = value;
    setFeatures(next);
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4">
      <div className="flex items-center gap-2 mb-4 justify-center">
        <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground border border-border rounded-full px-3 py-1">
          Powered by MarkyTech
        </span>
      </div>
      <h1 className="text-5xl font-bold text-white mb-3 text-center leading-tight">
        Generate agency-quality<br />
        <span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
          product demo videos
        </span>
      </h1>
      <p className="text-lg text-muted-foreground mb-10 text-center max-w-xl">
        Describe your product. Upload screenshots. Get a WhatAStory-quality explainer video in minutes.
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-3xl">
        <div className="bg-background-elevated rounded-xl border border-border p-5 flex flex-col gap-4">
          {/* Error message */}
          {error && (
            <ErrorDisplay
              error={error}
              variant="inline"
              size="md"
              onDismiss={clearError}
            />
          )}

          {/* Row 1: Product name + Audience */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5" style={{ flex: "3" }}>
              <label className="text-xs font-medium text-muted-foreground">
                Product name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. MarkyTech, Stripe, Notion"
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground-dim focus:outline-none focus:border-foreground/40 transition-colors"
                disabled={isNavigating}
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-1.5" style={{ flex: "2" }}>
              <label className="text-xs font-medium text-muted-foreground">
                Who is it for?
              </label>
              <input
                type="text"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                placeholder="e.g. Enterprise CTOs & startup founders"
                className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground-dim focus:outline-none focus:border-foreground/40 transition-colors"
                disabled={isNavigating}
              />
            </div>
          </div>

          {/* Row 2: Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              What does it do? <span className="text-destructive">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. MarkyTech builds AI-powered web & mobile solutions that help businesses automate workflows, scale faster, and outperform competition."
              rows={2}
              className="bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground-dim focus:outline-none focus:border-foreground/40 resize-none transition-colors"
              disabled={isNavigating}
            />
          </div>

          {/* Row 3: Key features */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Key features <span className="text-muted-foreground-dim">(optional)</span>
            </label>
            <div className="flex gap-2">
              {features.map((f, i) => (
                <input
                  key={i}
                  type="text"
                  value={f}
                  onChange={(e) => setFeature(i, e.target.value)}
                  placeholder={`Feature ${i + 1}`}
                  className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground-dim focus:outline-none focus:border-foreground/40 transition-colors"
                  disabled={isNavigating}
                />
              ))}
            </div>
          </div>

          {/* Row 4: CTA */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Call to action <span className="text-muted-foreground-dim">(optional)</span>
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="e.g. Start Your Project"
                className="w-1/2 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground-dim focus:outline-none focus:border-foreground/40 transition-colors"
                disabled={isNavigating}
              />
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://yourproduct.com"
                className="w-1/2 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground-dim focus:outline-none focus:border-foreground/40 transition-colors"
                disabled={isNavigating}
              />
            </div>
          </div>

          {/* Row 5: Media upload */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Screenshots / Screen recording <span className="text-muted-foreground-dim">(optional)</span>
            </label>

            {/* Video extraction progress */}
            {isExtracting && extractProgress && (
              <div className="rounded-lg border border-border p-3 bg-background/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Extracting frames…</span>
                  <span className="text-xs text-foreground font-medium tabular-nums">
                    {extractProgress.current}/{extractProgress.total}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-teal-500 rounded-full transition-all duration-150"
                    style={{ width: `${(extractProgress.current / extractProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Video mode: frame strip */}
            {videoInfo && attachedImages.length > 0 && !isExtracting && (
              <div className="rounded-lg border border-border p-2.5 bg-background/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-foreground font-medium truncate max-w-[200px]">
                      {videoInfo.fileName}
                    </span>
                    <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-2 py-0.5 flex-shrink-0">
                      {Math.round(videoInfo.duration)}s · {videoInfo.frameCount} frames
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { removeImage(0); }}
                    className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                    title="Remove video"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {/* Show 5 evenly-spaced frame thumbnails */}
                <div className="flex gap-1.5">
                  {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                    const idx = Math.min(Math.round(t * (attachedImages.length - 1)), attachedImages.length - 1);
                    return (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        key={idx}
                        src={attachedImages[idx]}
                        alt={`Frame ${idx + 1}`}
                        className="flex-1 h-12 rounded object-cover border border-border/50"
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Regular image previews */}
            {!videoInfo && attachedImages.length > 0 && (
              <div className="flex gap-3 flex-wrap mb-1">
                {attachedImages.map((img, index) => (
                  <div key={index} className="flex flex-col gap-1 flex-shrink-0 w-24">
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img}
                        alt={`Attached ${index + 1}`}
                        className="h-16 w-full rounded border border-border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -top-1.5 -right-1.5 bg-background border border-border rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={imageUserDescriptions[index] ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        setImageUserDescriptions((prev) => {
                          const next = [...prev];
                          while (next.length <= index) next.push("");
                          next[index] = v;
                          return next;
                        });
                      }}
                      placeholder="What's shown?"
                      disabled={isNavigating}
                      className="w-full bg-background border border-border rounded px-1.5 py-0.5 text-[10px] text-foreground placeholder:text-muted-foreground-dim focus:outline-none focus:border-foreground/40 transition-colors"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Drop zone */}
            {canAddMore && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                disabled={isNavigating}
                className={`flex items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-4 text-sm transition-colors ${
                  isDragging
                    ? "border-blue-500 bg-blue-500/10 text-blue-400"
                    : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Drop product screenshots or a screen recording here — or click to browse</span>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*, video/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Row 6: Brand colors */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Brand colors <span className="text-muted-foreground-dim">(optional)</span>
            </label>
            <div className="flex gap-2 flex-wrap items-center">
              {brandColors.map((color, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      const next = [...brandColors];
                      next[i] = e.target.value;
                      setBrandColors(next);
                    }}
                    className="w-7 h-7 rounded cursor-pointer border border-border bg-transparent"
                    disabled={isNavigating}
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => {
                      const next = [...brandColors];
                      next[i] = e.target.value;
                      setBrandColors(next);
                    }}
                    placeholder="#6366f1"
                    className="w-20 bg-transparent text-xs text-foreground border border-border rounded px-2 py-1 focus:outline-none focus:border-foreground/40"
                    disabled={isNavigating}
                  />
                  {brandColors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setBrandColors(brandColors.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      disabled={isNavigating}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              {brandColors.length < 4 && (
                <button
                  type="button"
                  onClick={() => setBrandColors([...brandColors, "#000000"])}
                  className="text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded px-2 py-1 transition-colors"
                  disabled={isNavigating}
                >
                  + Add color
                </button>
              )}
            </div>
          </div>

          {/* Row 7: Model + Generate */}
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <Select
              value={model}
              onValueChange={(value) => setModel(value as ModelId)}
              disabled={isNavigating}
            >
              <SelectTrigger className="w-auto bg-transparent border-none text-muted-foreground hover:text-foreground transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-background-elevated border-border">
                {MODELS.map((m) => (
                  <SelectItem
                    key={m.id}
                    value={m.id}
                    className="text-foreground focus:bg-secondary focus:text-foreground"
                  >
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="submit"
              disabled={!isValid || isNavigating}
              loading={isNavigating}
              className="bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-400 hover:to-violet-400 text-white font-semibold px-6 border-0"
            >
              {isNavigating ? "Generating…" : "Generate Video →"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
