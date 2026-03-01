"use client";

import { cn } from "@/lib/utils";
import { Code, Layers, MousePointer2, Play } from "lucide-react";
import { useEffect, useState } from "react";

export type TabId = "code" | "preview" | "cursor" | "plan";

interface TabPanelProps {
  codeContent: React.ReactNode;
  previewContent: React.ReactNode;
  defaultTab?: TabId;
  cursorContent?: React.ReactNode;
  planContent?: React.ReactNode;
}

export function TabPanel({
  codeContent,
  previewContent,
  defaultTab = "preview",
  cursorContent,
  planContent,
}: TabPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);

  // Auto-switch to plan tab when planContent first appears
  useEffect(() => {
    if (planContent && activeTab !== "plan") {
      setActiveTab("plan");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(planContent)]);

  // Auto-switch to cursor tab when cursorContent first appears (and no plan tab active)
  useEffect(() => {
    if (cursorContent && activeTab !== "cursor" && activeTab !== "plan") {
      setActiveTab("cursor");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(cursorContent)]);

  // If plan tab was active but content went away (generation started), switch to preview
  useEffect(() => {
    if (activeTab === "plan" && !planContent) {
      setActiveTab("preview");
    }
  }, [activeTab, planContent]);

  // If cursor tab was active but content went away, fall back to preview
  useEffect(() => {
    if (activeTab === "cursor" && !cursorContent) {
      setActiveTab("preview");
    }
  }, [activeTab, cursorContent]);

  const tabs = [
    { id: "code" as const, label: "Remotion Code", icon: Code },
    { id: "preview" as const, label: "Video Preview", icon: Play },
    ...(planContent
      ? [{ id: "plan" as const, label: "Video Plan", icon: Layers }]
      : []),
    ...(cursorContent
      ? [{ id: "cursor" as const, label: "Cursor Steps", icon: MousePointer2 }]
      : []),
  ];

  const renderContent = () => {
    if (activeTab === "code") return codeContent;
    if (activeTab === "plan" && planContent) return planContent;
    if (activeTab === "cursor" && cursorContent) return cursorContent;
    return previewContent;
  };

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="inline-flex w-fit mb-4 shrink-0 rounded-lg overflow-hidden border border-border">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
              index > 0 && "border-l border-border",
              activeTab === tab.id
                ? "bg-accent text-foreground"
                : "bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent/30",
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0">{renderContent()}</div>
    </div>
  );
}
