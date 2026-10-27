"use client";

import React, { useState, useRef, DragEvent, ChangeEvent } from "react";
import { uploadBrandGuideline, IngestResponse } from "@/lib/api";
import { 
  Upload, 
  X, 
  FileText, 
  Check, 
  Loader2, 
  AlertCircle
} from "lucide-react";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (res: IngestResponse) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<IngestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "txt", "md"].includes(ext || "")) {
      setError("Please select a supported file format (.pdf, .docx, .txt, or .md)");
      return;
    }

    setSelectedFile(file);
    setError(null);
    setResult(null);
    setIsUploading(true);

    try {
      const res = await uploadBrandGuideline(file);
      setResult(res);
      onSuccess(res);
    } catch (err: any) {
      console.error("Guideline ingestion failed:", err);
      setError(err.message || "Failed to parse and vectorize brand guidelines.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-12 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-slate-900 dark:text-zinc-200">
              Import Brand Guidelines
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
            Upload your organization's official brand style guide or compliance manual. The hybrid RAG engine extracts atomic rules, generates vector embeddings, and builds the semantic search index.
          </div>

          {/* Upload Drop Area */}
          {!result && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                isDragging
                  ? "border-slate-400 dark:border-zinc-500 bg-slate-100/80 dark:bg-zinc-800/50"
                  : "border-slate-300 dark:border-zinc-700/80 hover:border-slate-400 dark:hover:border-zinc-600 bg-slate-50/60 dark:bg-zinc-950/40 hover:bg-slate-50 dark:hover:bg-zinc-950/70"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                className="hidden"
                disabled={isUploading}
                onChange={handleFileChange}
              />

              {isUploading ? (
                <div className="flex flex-col items-center py-2 space-y-2">
                  <Loader2 className="w-6 h-6 text-slate-700 dark:text-zinc-300 animate-spin" />
                  <div className="text-xs font-medium text-slate-900 dark:text-zinc-200">
                    Vectorizing {selectedFile?.name}...
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-500 font-mono">
                    Chunking text · Embedding MiniLM vectors · Indexing Qdrant
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-2 space-y-1.5">
                  <div className="w-8 h-8 rounded-full bg-slate-200/80 dark:bg-zinc-800 flex items-center justify-center text-slate-600 dark:text-zinc-400 mb-1">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-medium text-slate-800 dark:text-zinc-200">
                    Drop guideline file here, or <span className="text-slate-900 dark:text-zinc-100 underline underline-offset-2">browse</span>
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-500 font-mono">
                    Supports PDF, DOCX, TXT, MD (up to 25 MB)
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs text-rose-700 dark:text-rose-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-medium">Ingestion Error: </span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Success State */}
          {result && (
            <div className="space-y-3 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="font-medium text-emerald-800 dark:text-emerald-300">
                    Guideline Indexed Successfully
                  </div>
                  <div className="text-slate-600 dark:text-zinc-400 text-[11px] font-mono">
                    {result.filename} · {result.chunks_indexed} rules extracted
                  </div>
                </div>
              </div>

              {result.rules_extracted.length > 0 && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-1.5">
                  <div className="text-[10px] font-mono text-slate-500 dark:text-zinc-500 uppercase tracking-wider">
                    Extracted Rule Previews
                  </div>
                  <div className="space-y-1">
                    {result.rules_extracted.map((ruleTitle, idx) => (
                      <div key={idx} className="text-xs text-slate-700 dark:text-zinc-300 flex items-center gap-1.5 truncate">
                        <span className="w-1 h-1 rounded-full bg-slate-400 dark:bg-zinc-600" />
                        <span className="truncate">{ruleTitle}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 h-13 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/60 py-3">
          {result ? (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors"
            >
              Upload another file
            </button>
          ) : (
            <span className="text-[11px] text-slate-500 dark:text-zinc-500 font-mono">
              Vector store synchronized
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium bg-slate-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-slate-800 dark:hover:bg-white active:scale-95 rounded-md transition-all shadow-xs"
          >
            {result ? "Done" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
};
