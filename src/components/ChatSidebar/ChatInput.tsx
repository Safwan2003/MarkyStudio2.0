"use client";

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
import { Film, ImageIcon, X } from "lucide-react";
import { useRef } from "react";

interface ChatInputProps {
  prompt: string;
  onPromptChange: (prompt: string) => void;
  model: ModelId;
  onModelChange: (model: ModelId) => void;
  isLoading: boolean;
  onGenerate: (model: ModelId, images?: string[]) => void;
}

export function ChatInput({
  prompt,
  onPromptChange,
  model,
  onModelChange,
  isLoading,
  onGenerate,
}: ChatInputProps) {
  const {
    attachedImages,
    isDragging,
    fileInputRef,
    removeImage,
    clearImages,
    handleFileSelect,
    handlePaste,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    canAddMore,
    error: imageError,
  } = useImageAttachments();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    const imgs = attachedImages.length > 0 ? [...attachedImages] : undefined;
    clearImages();
    onGenerate(model, imgs);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="px-4 pt-4 pb-4">
      <form onSubmit={handleSubmit}>
        <div
          className={`bg-background-elevated rounded-xl border p-3 transition-colors ${
            isDragging ? "border-teal-500/60 bg-teal-500/5" : "border-border"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => onPromptChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Describe your product or video idea... (Enter to generate)"
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground-dim focus:outline-none resize-none text-sm min-h-[60px] max-h-[160px]"
            style={{ fieldSizing: "content" } as React.CSSProperties}
            disabled={isLoading}
          />

          {/* Image previews */}
          {attachedImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {attachedImages.map((img, i) => (
                <div key={i} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={`Attached ${i + 1}`}
                    className="w-14 h-14 object-cover rounded-md border border-border/60"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 bg-background border border-border rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Image error */}
          {imageError && (
            <p className="text-xs text-destructive mt-1.5">{imageError}</p>
          )}

          <div className="flex justify-between items-center mt-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-1">
              <Select
                value={model}
                onValueChange={(value) => onModelChange(value as ModelId)}
                disabled={isLoading}
              >
                <SelectTrigger className="max-w-[140px] bg-transparent border-none text-muted-foreground hover:text-foreground transition-colors text-xs h-7 px-2 truncate">
                  <SelectValue className="truncate" />
                </SelectTrigger>
                <SelectContent className="bg-background-elevated border-border">
                  {MODELS.map((m) => (
                    <SelectItem
                      key={m.id}
                      value={m.id}
                      className="text-foreground focus:bg-secondary focus:text-foreground text-xs"
                    >
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Image attach button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              {canAddMore && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  title="Attach images (also: paste or drag & drop)"
                  className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded disabled:opacity-40"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              loading={isLoading}
              className="bg-teal-600 text-white hover:bg-teal-500 h-8 px-4 text-xs font-medium gap-2"
            >
              <Film className="w-3.5 h-3.5" />
              Generate Video
            </Button>
          </div>
        </div>

        {attachedImages.length > 0 && (
          <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
            {attachedImages.length} image{attachedImages.length > 1 ? "s" : ""} attached — passed to every scene as ATTACHED_IMAGES[0..{attachedImages.length - 1}]
          </p>
        )}
      </form>
    </div>
  );
}
