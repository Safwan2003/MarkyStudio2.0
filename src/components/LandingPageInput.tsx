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
  ) => void;
  isNavigating?: boolean;
  showCodeExamplesLink?: boolean;
}

export function LandingPageInput({
  onNavigate,
  isNavigating = false,
}: LandingPageInputProps) {
  const [productName, setProductName] = useState("Far East Trading");
  const [description, setDescription] = useState(
    "Japan's largest online used car export marketplace. Browse over 10,000 verified Japanese vehicles — sedans, SUVs, hybrids, and sports cars — from trusted dealers with transparent FOB pricing and worldwide shipping direct from Japan.",
  );
  const [audience, setAudience] = useState("International car buyers & importers worldwide");
  const [features, setFeatures] = useState([
    "10,000+ verified Japanese vehicles",
    "Transparent FOB pricing from $500",
    "Worldwide export & door-to-door shipping",
  ]);
  const [cta, setCta] = useState("Find Your Car");
  const [model, setModel] = useState<ModelId>("gemini-2.5-flash:none");
  const [brandColors, setBrandColors] = useState<string[]>(["#e8192c", "#1a1a2e"]);
  const [targetUrl, setTargetUrl] = useState("https://fareasttrading.jp");

  const {
    attachedImages,
    isDragging,
    fileInputRef,
    removeImage,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    canAddMore,
    error,
    clearError,
  } = useImageAttachments();

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
    onNavigate(
      buildProductPrompt(),
      model,
      attachedImages.length > 0 ? attachedImages : undefined,
    );
  };

  const setFeature = (index: number, value: string) => {
    const next = [...features];
    next[index] = value;
    setFeatures(next);
  };

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4">
      <h1 className="text-5xl font-bold text-white mb-3 text-center">
        Create your product demo video
      </h1>
      <p className="text-lg text-muted-foreground mb-10 text-center">
        Fill in the details. We&apos;ll handle the rest.
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
                placeholder="e.g. Acme Analytics"
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
                placeholder="e.g. SaaS founders"
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
              placeholder="e.g. Acme Analytics helps growth teams track user behaviour across the entire funnel in real time."
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
                placeholder="e.g. Start free trial"
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

            {/* Uploaded previews */}
            {attachedImages.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-1">
                {attachedImages.map((img, index) => (
                  <div key={index} className="relative flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`Attached ${index + 1}`}
                      className="h-16 w-auto rounded border border-border object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-1.5 -right-1.5 bg-background border border-border rounded-full p-0.5 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
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
                <span>Drop screenshots or screen recording, or click to browse</span>
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
              className="bg-foreground text-background hover:bg-gray-200 px-5"
            >
              Generate →
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
