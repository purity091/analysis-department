"use client";

/* The avatar URL comes from GitHub's trusted API response. */
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import {
  Clock3,
  ExternalLink,
  GitCommitHorizontal,
  RefreshCw,
  UserRound,
  GitBranch,
  CircleDot,
  ChevronUp,
  ChevronDown,
  X,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/app-version";

export interface RepositoryCommit {
  sha: string;
  shortSha: string;
  url: string;
  message: string;
  user: string;
  userName: string;
  avatarUrl: string | null;
  userUrl: string | null;
  date: string | null;
}

type LoadState = "loading" | "ready" | "error";

function relativeTime(date: string | null) {
  if (!date) return "وقت غير معروف";
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (elapsedMinutes < 1) return "الآن";
  if (elapsedMinutes < 60) return `منذ ${elapsedMinutes} دقيقة`;
  if (elapsedMinutes < 120) return "منذ ساعة";
  if (elapsedMinutes < 1440) return `منذ ${Math.floor(elapsedMinutes / 60)} ساعات`;
  if (elapsedMinutes < 2880) return "أمس";
  return `منذ ${Math.floor(elapsedMinutes / 1440)} أيام`;
}

interface WorkspaceFooterProps {
  issuesCount?: number;
  onOpenProblems?: () => void;
}

export function WorkspaceFooter({ issuesCount = 0, onOpenProblems }: WorkspaceFooterProps) {
  const [commits, setCommits] = useState<RepositoryCommit[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadCommits() {
      try {
        const response = await fetch("/api/github/commits", { cache: "no-store" });
        const payload = (await response.json()) as { commits?: RepositoryCommit[]; error?: string };
        if (!response.ok) throw new Error(payload.error ?? "تعذر جلب سجل GitHub.");
        if (!cancelled) {
          setCommits(payload.commits ?? []);
          setLoadState("ready");
          setErrorMessage("");
        }
      } catch (error) {
        if (!cancelled) {
          setLoadState("error");
          setErrorMessage(error instanceof Error ? error.message : "تعذر جلب سجل GitHub.");
        }
      }
    }

    void loadCommits();
    const interval = window.setInterval(loadCommits, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [refreshKey]);

  const latestCommit = commits[0];

  return (
    <div className="relative shrink-0 z-30 font-sans" dir="rtl">
      {/* Expandable Commits Drawer */}
      {isOpen && (
        <div className="absolute bottom-full right-0 left-0 max-h-64 overflow-hidden border-t border-slate-700 bg-slate-900 text-slate-100 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom duration-200">
          {/* Drawer Header */}
          <div className="flex h-9 items-center justify-between border-b border-slate-800 bg-slate-950/80 px-4 text-xs">
            <div className="flex items-center gap-2">
              <GitCommitHorizontal size={14} className="text-[#e0c98d]" />
              <span className="font-bold text-slate-100">سجل تعديلات المستودع (GitHub)</span>
              <span className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] text-slate-300 border border-slate-700">
                lahlahai/Analysis-Department-OS
              </span>
              <span className="text-[10px] text-slate-400 mr-2 flex items-center gap-1">
                {loadState === "ready" ? (
                  <>
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    تحديث تلقائي
                  </>
                ) : loadState === "loading" ? (
                  "جارٍ الجلب…"
                ) : (
                  <span className="text-rose-400">تعذر التحديث</span>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRefreshKey((current) => current + 1)}
                className="grid size-6 place-items-center rounded text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                title="تحديث سجل التعديلات"
              >
                <RefreshCw size={12} className={loadState === "loading" ? "animate-spin" : ""} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="grid size-6 place-items-center rounded text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                title="إغلاق السجل"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Commits List Body */}
          <div className="max-h-52 overflow-y-auto px-4 py-2 divide-y divide-slate-800/60">
            {loadState === "loading" && (
              <div className="flex h-24 items-center justify-center gap-2 text-xs text-slate-400">
                <RefreshCw size={13} className="animate-spin text-[#e0c98d]" />
                جارٍ جلب أحدث التعديلات من المستودع…
              </div>
            )}

            {loadState === "error" && (
              <div className="flex h-24 flex-col items-center justify-center gap-2 text-xs text-rose-400">
                <span>{errorMessage}</span>
                <button
                  type="button"
                  onClick={() => setRefreshKey((current) => current + 1)}
                  className="rounded border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[10px] text-rose-300 hover:bg-rose-500/20"
                >
                  إعادة المحاولة
                </button>
              </div>
            )}

            {loadState === "ready" && commits.length === 0 && (
              <div className="flex h-20 items-center justify-center text-xs text-slate-400">
                لا توجد تعديلات في هذا الفرع.
              </div>
            )}

            {loadState === "ready" &&
              commits.map((commit) => (
                <div key={commit.sha} className="flex items-center gap-3 py-2 text-xs transition-colors hover:bg-slate-800/30 px-1 rounded-md">
                  <div className="grid size-6 shrink-0 place-items-center overflow-hidden rounded-full border border-slate-700 bg-slate-800 text-slate-300">
                    {commit.avatarUrl ? (
                      <img src={commit.avatarUrl} alt="" className="size-full" />
                    ) : (
                      <UserRound size={12} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <a
                      href={commit.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-[11px] font-medium text-slate-200 hover:text-[#e0c98d]"
                      title={commit.message}
                    >
                      {commit.message}
                      <ExternalLink size={10} className="mr-1 inline text-slate-500" />
                    </a>
                    <div className="mt-0.5 flex items-center gap-2 font-mono text-[9px] text-slate-400">
                      <a
                        href={commit.userUrl ?? `https://github.com/${commit.user}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-slate-300 hover:text-white"
                      >
                        {commit.userName}
                      </a>
                      <span dir="ltr">@{commit.user}</span>
                      <span className="rounded bg-slate-800 px-1 py-0.2 text-[9px] text-[#e0c98d]" dir="ltr">
                        {commit.shortSha}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 text-[10px] text-slate-400">
                    <Clock3 size={11} className="text-slate-500" />
                    {relativeTime(commit.date)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Main Bottom Footer Bar */}
      <footer className="official-footer flex h-9 items-center gap-3 border-t border-white/20 bg-[#002d29] px-4 font-sans text-[10px] text-slate-300 shadow-md">
        {/* Readiness indicator */}
        <span className="footer-ready flex items-center gap-1.5 font-bold text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          جاهز
        </span>

        {/* Git Branch */}
        <span className="footer-branch flex items-center gap-1 text-slate-300">
          <GitBranch size={11} className="text-[#e0c98d]" />
          main
        </span>

        {/* Validation / Problems status */}
        <button
          type="button"
          onClick={onOpenProblems}
          className="footer-check flex items-center gap-1 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="فتح لوحة المشاكل والتحقق"
        >
          <CircleDot size={11} className={issuesCount > 0 ? "text-amber-400" : "text-emerald-400"} />
          <span>{issuesCount > 0 ? `${issuesCount} مشكلة` : "تم التحقق"}</span>
        </button>

        {/* Integrated Repository Changelog Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "flex items-center gap-1.5 rounded px-2 py-0.5 font-sans text-[10px] font-semibold transition-all border",
            isOpen
              ? "border-[#b49a63] bg-[#b49a63]/25 text-white shadow-2xs"
              : "border-white/15 bg-white/[0.06] text-slate-200 hover:bg-white/15 hover:text-white hover:border-white/30"
          )}
          title={isOpen ? "طي سجل تعديلات المستودع" : "عرض سجل تعديلات المستودع"}
        >
          <GitCommitHorizontal size={12} className="text-[#e0c98d]" />
          <span>سجل تعديلات المستودع</span>
          {latestCommit && (
            <span className="font-mono text-[9px] text-[#d8c9a5] bg-black/30 rounded px-1" dir="ltr">
              {latestCommit.shortSha}
            </span>
          )}
          {isOpen ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
        </button>

        {/* Development Status Badge */}
        <span className="footer-development-status hidden sm:inline-flex">
          <span className="size-1.5 rounded-full bg-amber-400" />
          الموقع ما يزال تحت التطوير
        </span>

        {/* Author Credit */}
        <span className="mr-auto footer-credit font-bold text-[#e0c98d]">
          تصميم وتنفيذ: محمد لحلح
        </span>

        {/* Tech Stack Spec */}
        <span className="footer-stack hidden md:inline-block text-slate-400 font-mono text-[9px]">
          TypeScript · UTF-8 · LF
        </span>

        <span className="rounded border border-[#d8c9a5]/40 bg-[#b49a63]/15 px-2 py-0.5 text-[9px] font-semibold text-[#f1dfb1]" title="إصدار المنصة">
          إصدار {APP_VERSION}
        </span>
      </footer>
    </div>
  );
}

export const ChangeLogPanel = WorkspaceFooter;
