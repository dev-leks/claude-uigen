"use client";

import { Loader2 } from "lucide-react";

interface ToolCallBadgeProps {
  toolName: string;
  args: Record<string, unknown>;
  state: string;
}

function getFileName(path: unknown): string {
  if (typeof path !== "string") return "";
  return path.split("/").filter(Boolean).pop() ?? path;
}

function getLabel(toolName: string, args: Record<string, unknown>): string {
  if (toolName === "str_replace_editor") {
    const file = getFileName(args.path);
    switch (args.command) {
      case "create":     return `Creating ${file}`;
      case "str_replace":
      case "insert":     return `Editing ${file}`;
      case "view":       return `Viewing ${file}`;
      default:           return `Editing ${file}`;
    }
  }

  if (toolName === "file_manager") {
    const file = getFileName(args.path);
    switch (args.command) {
      case "rename": return `Renaming ${file}`;
      case "delete": return `Deleting ${file}`;
    }
  }

  return toolName;
}

export function ToolCallBadge({ toolName, args, state }: ToolCallBadgeProps) {
  const label = getLabel(toolName, args);
  const isDone = state === "result";

  return (
    <div className="inline-flex items-center gap-2 mt-2 px-3 py-1.5 bg-neutral-50 rounded-lg text-xs font-mono border border-neutral-200">
      {isDone ? (
        <div className="w-2 h-2 rounded-full bg-emerald-500" />
      ) : (
        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
      )}
      <span className="text-neutral-700">{label}</span>
    </div>
  );
}

export { getLabel };
