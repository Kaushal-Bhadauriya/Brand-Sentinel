import type { Metadata } from "next";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  WorkspaceActionsProvider,
  WorkspaceHeaderActions,
} from "@/components/WorkspaceHeaderActions";

export const metadata: Metadata = {
  title: "BrandSentinel",
  description: "AI brand governance and content compliance workspace.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col antialiased selection:bg-slate-200 dark:selection:bg-zinc-800">
        <WorkspaceActionsProvider>
          <header className="h-12 shrink-0 border-b border-slate-200 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md px-5 flex items-center justify-between z-40">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-md bg-slate-900 text-white dark:bg-zinc-100 dark:text-zinc-950 flex items-center justify-center font-bold text-xs tracking-tighter">
              B
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-zinc-100">
                BrandSentinel
              </span>
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-zinc-800 text-xs text-slate-500 dark:text-zinc-500">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-mono">live engine</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            <WorkspaceHeaderActions />
            <span className="text-slate-300 dark:text-zinc-700">·</span>
            <a
              href="http://127.0.0.1:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
            >
              API Reference ↗
            </a>
            <a
              href="https://github.com/Kaushal-Bhadauriya"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub profile"
              title="GitHub"
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
            >
              <svg
                viewBox="0 0 16 16"
                aria-hidden="true"
                className="h-3.5 w-3.5 fill-current"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
              </svg>
              <span>GitHub</span>
            </a>
            <span className="text-slate-300 dark:text-zinc-700">·</span>
            <ThemeToggle />
          </div>
          </header>

          <main className="flex-1 overflow-hidden flex flex-col p-3.5 w-full mx-auto max-w-[1800px] min-h-0">
            {children}
          </main>
        </WorkspaceActionsProvider>
      </body>
    </html>
  );
}
