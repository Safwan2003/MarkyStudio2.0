"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConversationMessage } from "@/types/conversation";
import { MODELS, type ModelId } from "@/types/generation";
import { PanelLeftClose, PanelLeftOpen, RotateCcw } from "lucide-react";
import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { ChatHistory } from "./ChatHistory";
import { ChatInput } from "./ChatInput";

export interface ChatSidebarRef {
  triggerGenerate: (promptText: string, model: ModelId) => void;
}

interface ChatSidebarProps {
  messages: ConversationMessage[];
  pendingMessage?: {
    skills?: string[];
    startedAt: number;
  };
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  /** Called when user submits — receives the prompt text, selected model, and optional images */
  onGenerate: (promptText: string, model: ModelId, images?: string[]) => void;
  isLoading: boolean;
  initialModel?: ModelId;
}

export const ChatSidebar = forwardRef<ChatSidebarRef, ChatSidebarProps>(
  function ChatSidebar(
    {
      messages,
      pendingMessage,
      isCollapsed,
      onToggleCollapse,
      prompt,
      onPromptChange,
      onGenerate,
      isLoading,
      initialModel,
    },
    ref,
  ) {
    const [model, setModel] = useState<ModelId>(initialModel || MODELS[1].id);
    const promptRef = useRef(prompt);
    promptRef.current = prompt;

    useImperativeHandle(ref, () => ({
      triggerGenerate: (promptText: string, m: ModelId) => {
        onGenerate(promptText, m);
      },
    }));

    const handleGenerate = (selectedModel: ModelId, images?: string[]) => {
      const currentPrompt = promptRef.current.trim();
      if (!currentPrompt || isLoading) return;
      onPromptChange("");
      onGenerate(currentPrompt, selectedModel, images);
    };

    return (
      <div
        className={cn(
          "flex flex-col bg-background transition-all duration-300",
          isCollapsed
            ? "w-12 shrink-0"
            : "w-full h-[40vh] min-[1000px]:h-auto min-[1000px]:w-[40%] min-[1000px]:min-w-[320px] min-[1000px]:max-w-[520px] shrink",
        )}
      >
        {isCollapsed ? (
          <div className="flex justify-center px-4 mb-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onToggleCollapse}
              className="text-muted-foreground hover:text-foreground"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 ml-12 mr-8 mb-8 rounded-xl bg-muted/20 border border-border/30 shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between px-4 pt-4 pb-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                Assistant Chat
              </h2>
              <div className="flex items-center gap-1 -mt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Start over? This will reset your animation.",
                      )
                    ) {
                      window.location.href = "/";
                    }
                  }}
                  title="Start over"
                  className="text-muted-foreground hover:text-foreground text-xs gap-1 h-7 px-2"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onToggleCollapse}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ChatHistory messages={messages} pendingMessage={pendingMessage} />

            {/* Input */}
            <ChatInput
              prompt={prompt}
              onPromptChange={onPromptChange}
              model={model}
              onModelChange={setModel}
              isLoading={isLoading}
              onGenerate={handleGenerate}
            />
          </div>
        )}
      </div>
    );
  },
);
