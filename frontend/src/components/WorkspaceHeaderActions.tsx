"use client";

import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { FileUp, Upload } from "lucide-react";

interface WorkspaceActions {
  onUploadDraft: (file: File) => void;
  onOpenGuidelinesUpload: () => void;
}

interface WorkspaceActionsContextValue {
  actions: WorkspaceActions | null;
  registerActions: (actions: WorkspaceActions | null) => void;
}

const WorkspaceActionsContext = createContext<WorkspaceActionsContextValue | null>(null);

export function WorkspaceActionsProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = useState<WorkspaceActions | null>(null);

  const registerActions = useCallback((nextActions: WorkspaceActions | null) => {
    setActions(nextActions);
  }, []);

  return (
    <WorkspaceActionsContext.Provider value={{ actions, registerActions }}>
      {children}
    </WorkspaceActionsContext.Provider>
  );
}

export function useWorkspaceHeaderActions() {
  const context = useContext(WorkspaceActionsContext);
  if (!context) {
    throw new Error("WorkspaceHeaderActions must be used within WorkspaceActionsProvider.");
  }
  return context;
}

export function WorkspaceHeaderActions() {
  const { actions } = useWorkspaceHeaderActions();
  const draftFileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-1.5">
      <input
        ref={draftFileInputRef}
        type="file"
        accept=".txt,.md,text/plain,text/markdown"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) actions?.onUploadDraft(file);
          event.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => draftFileInputRef.current?.click()}
        disabled={!actions}
        title="Upload a text or Markdown draft to scan"
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        <Upload className="h-3 w-3" />
        <span>Upload Draft</span>
      </button>
      <button
        type="button"
        onClick={() => actions?.onOpenGuidelinesUpload()}
        disabled={!actions}
        title="Add PDF, DOCX, text, or Markdown guidelines to the Qdrant index"
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        <FileUp className="h-3 w-3" />
        <span>Ingest Guidelines</span>
      </button>
    </div>
  );
}
