"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import Link from "next/link";
import { Activity, Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleDot, Code2, Command, Compass, ExternalLink, FileCode2, FileJson, FileText, Folder, FolderPlus, GitBranch, Globe, HardDrive, Layers, LayoutPanelLeft, Link2, Package, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { validateJsonFile } from "@/domain/validation";
import { loadFixtureWorkspace } from "@/lib/fixture";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DataTableEditor, emptyDataTableDocument } from "@/components/editor/data-table";
import { CodeEditor } from "@/components/editor/code-editor";
import { WorkspaceFooter } from "@/components/workspace/change-log-panel";
import { PlatformTourModal } from "@/components/workspace/platform-tour-modal";

const workspace = loadFixtureWorkspace();

const coreFolders = [".software", "docs"];

function folderForPath(path: string) {
  if (path.startsWith("docs/")) return "docs";
  if (path.startsWith(".software/")) return ".software";
  return path.split("/")[0] ?? "project";
}

function fileNameFromPath(path: string) { return path.split("/").at(-1) ?? path; }

function folderPrefix(folder: string) { return folder; }

function fileExtension(kind: "json" | "markdown") { return kind === "markdown" ? ".md" : ".json"; }

function normalizedFileName(value: string, kind: "json" | "markdown", existingExtension?: string) {
  const clean = value.trim().replace(/[\\/]/g, "-");
  if (!clean) return "";
  if (clean.includes(".")) return clean;
  return `${clean}${existingExtension ?? fileExtension(kind)}`;
}

function fileIcon(path: string) {
  if (path.endsWith(".json")) return <FileJson size={14} className="text-amber-600 shrink-0" />;
  if (path.endsWith(".md")) return <FileText size={14} className="text-blue-600 shrink-0" />;
  return <FileCode2 size={14} className="text-slate-600 shrink-0" />;
}

function pathLabel(path: string) { return path.split("/").at(-1) ?? path; }

interface QuickLink {
  id: string;
  title: string;
  description: string;
  url: string;
  category?: "diagram" | "supporting";
  order?: number;
}

type QuickLinkScope = "general" | "file";

const defaultQuickLinks: QuickLink[] = [
  { id: "google-drive", title: "Google Drive", description: "الملفات والمراجع المشتركة", url: "https://drive.google.com/drive/folders/1J15tNMcku6IQYpbUQFEJxd80JX6L2vpX?usp=sharing" },
  { id: "github", title: "GitHub", description: "المستودع وسجل التعديلات", url: "https://github.com/lahlahai/Analysis-Department-OS" },
  { id: "inquiry-form-image", title: "نموذج استعلام", description: "صورة نموذج الاستعلام الورقي المرفق بمعاملة الطلب", url: "/نموذج استعلام.jpeg" },
  { id: "one-stop-window-form-image", title: "نموذج طلب النافذة الواحدة", description: "صورة النموذج المستخدم ضمن إجراءات النافذة الواحدة", url: "/نموذج طلب نافذة واحدة.jpeg" },
  { id: "property-sketch-image", title: "نموذج كروكي", description: "صورة مخطط كروكي عقاري مرجعي لطلب دمج العقارين", url: "/نموذج كروكي.jpeg" },
];

const requestImageQuickLinks = defaultQuickLinks.filter((link) => link.id.endsWith("-image"));

const MIN_GENERAL_LINKS_RATIO = 15;
const MAX_GENERAL_LINKS_RATIO = 85;

function clampQuickLinksRatio(value: number) {
  return Math.min(MAX_GENERAL_LINKS_RATIO, Math.max(MIN_GENERAL_LINKS_RATIO, Math.round(value)));
}

function normalizeQuickLinkUrl(value: string) {
  const candidate = value.trim();
  if (!candidate) return null;
  const normalized = /^[a-z][a-z\d+.-]*:\/\//i.test(candidate) ? candidate : `https://${candidate}`;
  try {
    const url = new URL(normalized);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function isValidQuickLink(value: unknown): value is QuickLink {
  if (!value || typeof value !== "object") return false;
  const link = value as Record<string, unknown>;
  return typeof link.id === "string" && typeof link.title === "string" && typeof link.description === "string" && typeof link.url === "string";
}

function readFileQuickLinks(value: string): QuickLink[] {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Array.isArray(parsed.links) ? parsed.links.filter(isValidQuickLink) : [];
  } catch {
    return [];
  }
}

function writeFileQuickLinks(value: string, links: QuickLink[]) {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return `${JSON.stringify({ ...parsed, links }, null, 2)}\n`;
  } catch {
    return value;
  }
}

function MarkdownPreview({ text }: { text: string }) {
  return <div className="h-full overflow-auto bg-[#0d131c] px-8 py-7 text-sm text-slate-300"><div className="mx-auto max-w-3xl space-y-5 font-sans leading-7">{text.split("\n").map((line, index) => line.startsWith("# ") ? <h1 key={index} className="border-b border-white/10 pb-4 text-2xl font-semibold text-slate-100">{line.slice(2)}</h1> : line.startsWith("## ") ? <h2 key={index} className="pt-3 text-lg font-semibold text-slate-100">{line.slice(3)}</h2> : line.startsWith("- ") ? <div key={index} className="flex gap-2 pl-2"><span className="text-cyan-300">•</span><span>{line.slice(2)}</span></div> : /^\d+\. /.test(line) ? <div key={index} className="pl-2 text-slate-400">{line}</div> : line.trim() ? <p key={index}>{line.replaceAll("**", "")}</p> : <div key={index} className="h-1" />)}</div></div>;
}

interface QuickLinksPanelProps {
  id: string;
  title: string;
  links: QuickLink[];
  emptyText: string;
  onAdd: () => void;
  onEdit?: (link: QuickLink) => void;
  onRemove: (id: string) => void;
  compact?: boolean;
  activePath?: string;
}

function getQuickLinkIcon(link: QuickLink) {
  const text = `${link.title} ${link.url}`.toLowerCase();
  if (text.includes("drive") || text.includes("google")) {
    return <HardDrive size={13} className="text-emerald-600 shrink-0" />;
  }
  if (text.includes("github") || text.includes("git") || text.includes("repo")) {
    return <Code2 size={13} className="text-slate-800 shrink-0" />;
  }
  if (text.includes("onedrive") || text.includes("cloud") || text.includes("sharepoint") || text.includes("live.com")) {
    return <Layers size={13} className="text-sky-600 shrink-0" />;
  }
  return <Globe size={13} className="text-[#8f733a] shrink-0" />;
}

const diagramLinkPresentation = [
  {
    id: "sequence-diagram",
    title: "Sequence Diagram",
    arTitle: "مخطط التسلسل",
    description: "تسلسل وتدفق خطوات ومعالجة الطلب",
    icon: Activity,
    badge: "UML Sequence",
    containerClass: "bg-emerald-50/80 border-emerald-200/80 text-emerald-700",
    hoverBorder: "hover:border-emerald-400",
    indicatorColor: "bg-emerald-500",
  },
  {
    id: "state-diagram",
    title: "State Diagram",
    arTitle: "مخطط الحالات",
    description: "دورة حياة وحالات وانتقالات الطلب",
    icon: CircleDot,
    badge: "UML State",
    containerClass: "bg-amber-50/80 border-amber-200/80 text-amber-700",
    hoverBorder: "hover:border-amber-400",
    indicatorColor: "bg-amber-500",
  },
  {
    id: "class-diagram",
    title: "Class Diagram",
    arTitle: "مخطط الفئات",
    description: "بنية البيانات والكيانات والعلاقات",
    icon: Code2,
    badge: "UML Class",
    containerClass: "bg-sky-50/80 border-sky-200/80 text-sky-700",
    hoverBorder: "hover:border-sky-400",
    indicatorColor: "bg-sky-500",
  },
  {
    id: "activity-diagram",
    title: "Activity Diagram",
    arTitle: "مخطط النشاط",
    description: "تدفق الإجراءات والشروط والمسارات",
    icon: GitBranch,
    badge: "UML Activity",
    containerClass: "bg-purple-50/80 border-purple-200/80 text-purple-700",
    hoverBorder: "hover:border-purple-400",
    indicatorColor: "bg-purple-500",
  },
] as const;

function FileQuickLinksPanel({ title, links, emptyText, onAdd, onEdit, onRemove, activePath }: Omit<QuickLinksPanelProps, "id" | "compact">) {
  const diagramLinks = links.filter((link) => link.category === "diagram");
  const supportingLinks = links.filter((link) => link.category !== "diagram");

  if (!activePath) {
    return (
      <section className="file-links-panel flex flex-1 min-h-0 flex-col overflow-hidden bg-white" aria-labelledby="file-quick-links">
        <div className="flex h-9 shrink-0 items-center justify-between border-b border-slate-200/70 bg-slate-50/50 px-3 py-1.5">
          <div id="file-quick-links" className="flex min-w-0 items-center gap-1.5 font-sans text-[11px] font-bold text-slate-800">
            <FileCode2 size={13} className="shrink-0 text-[#8f733a]" />
            <span className="truncate">{title}</span>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center select-none">
          <div className="mb-2.5 grid size-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400 shadow-2xs">
            <FileCode2 size={18} />
          </div>
          <p className="text-xs font-bold text-slate-800">لا يوجد ملف نشط</p>
          <p className="mt-1 max-w-[190px] text-[10px] leading-relaxed text-slate-500">
            اختر ملفاً من مستكشف الملفات لعرض مخططاته الهندسية وروابطه التوثيقية.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="file-links-panel flex flex-1 min-h-0 flex-col overflow-hidden bg-white" aria-labelledby="file-quick-links">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-slate-200/70 bg-slate-50/50 px-3 py-1.5">
        <div id="file-quick-links" className="flex min-w-0 items-center gap-1.5 font-sans text-[11px] font-bold text-slate-800">
          <FileCode2 size={13} className="shrink-0 text-[#8f733a]" />
          <span className="truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="rounded-full bg-[#fbf7ee] border border-[#b49a63]/30 px-1.5 py-0.2 font-mono text-[9px] font-bold text-[#8f733a]">
            {diagramLinks.length}/4
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="grid size-5 shrink-0 place-items-center rounded border border-slate-200/80 bg-white text-slate-500 hover:text-[#8f733a] hover:border-[#b49a63]/50 hover:bg-[#fbf7ee] shadow-2xs transition-all"
            title="إضافة رابط للملف"
            aria-label="إضافة رابط للملف"
          >
            <Plus size={11} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2.5">
        <div className="flex items-center justify-between px-0.5">
          <span className="text-[10px] font-bold text-slate-700">المخططات الهندسية (UML)</span>
          <span className="text-[8.5px] font-medium text-slate-400">تفاعلية ومباشرة</span>
        </div>

        <div className="space-y-1.5">
          {diagramLinkPresentation.map((item) => {
            const link = diagramLinks.find((candidate) => candidate.id === item.id);
            const Icon = item.icon;

            if (!link) {
              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2.5 rounded-lg border border-dashed border-slate-200 bg-slate-50/40 p-2 text-right opacity-65 transition-opacity hover:opacity-85 select-none"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="grid size-7 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-100 text-slate-400">
                      <Icon size={13} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-[10px] font-bold text-slate-600 block truncate">
                        {item.title}
                      </span>
                      <span className="text-[8.5px] text-slate-400 block truncate">
                        {item.arTitle} • قيد الإعداد
                      </span>
                    </div>
                  </div>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-medium text-slate-400 border border-slate-200/60 shrink-0">
                    غير متوفر
                  </span>
                </div>
              );
            }

            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  "group flex items-center justify-between gap-2.5 rounded-lg border border-slate-200/80 bg-white p-2 text-right shadow-2xs transition-all hover:shadow-xs hover:bg-[#fbf7ee]/25",
                  item.hoverBorder
                )}
                title={link.url}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-md border shadow-2xs transition-transform group-hover:scale-105",
                      item.containerClass
                    )}
                  >
                    <Icon size={13} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold text-slate-900 group-hover:text-slate-950 truncate">
                        {item.title}
                      </span>
                      <span className="rounded bg-slate-100 px-1 py-0.2 font-sans text-[7.5px] font-semibold text-slate-600 border border-slate-200/70 shrink-0">
                        {item.badge}
                      </span>
                    </div>
                    <p className="truncate text-[8.5px] text-slate-500 mt-0.5 font-normal">
                      {item.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 text-slate-400 group-hover:text-[#8f733a] transition-all">
                  <span className={cn("size-1.5 rounded-full", item.indicatorColor)} />
                  <ExternalLink size={10.5} className="transition-transform group-hover:-translate-x-0.5" />
                </div>
              </a>
            );
          })}
        </div>

        {diagramLinks.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3 text-center">
            <p className="text-[9.5px] text-slate-500 leading-relaxed">{emptyText}</p>
          </div>
        )}

        {supportingLinks.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-slate-200/70">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-700">روابط إضافية للملف</span>
              <span className="font-mono text-[9px] text-slate-500 rounded-full bg-slate-100 border border-slate-200 px-1.5 py-0.2">{supportingLinks.length}</span>
            </div>
            <div className="space-y-1.5">
              {supportingLinks.map((link) => (
                <div
                  key={link.id}
                  className="group relative flex items-center justify-between gap-2 rounded-lg border border-slate-200/70 bg-white p-2 hover:border-[#b49a63]/60 hover:bg-[#fbf7ee]/25 hover:shadow-2xs transition-all"
                >
                  <a href={link.url} target="_blank" rel="noreferrer" className="flex min-w-0 flex-1 items-center gap-2 text-right">
                    <span className="grid size-6 shrink-0 place-items-center rounded border border-slate-200/80 bg-slate-50 text-[#8f733a]">
                      <ExternalLink size={10} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[10px] font-bold text-slate-800">{link.title}</span>
                      <span className="block truncate text-[8.5px] text-slate-500">{link.description}</span>
                    </span>
                  </a>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                      <button type="button" onClick={() => onEdit(link)} className="grid size-5.5 place-items-center rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100" title="تعديل">
                        <Pencil size={10} />
                      </button>
                    )}
                    <button type="button" onClick={() => onRemove(link.id)} className="grid size-5.5 place-items-center rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="حذف">
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function QuickLinksPanel({ id, title, links, emptyText, onAdd, onEdit, onRemove, activePath }: QuickLinksPanelProps) {
  if (id === "file-quick-links") {
    return (
      <FileQuickLinksPanel
        title={title}
        links={links}
        emptyText={emptyText}
        onAdd={onAdd}
        onEdit={onEdit}
        onRemove={onRemove}
        activePath={activePath}
      />
    );
  }

  return (
    <section className="flex flex-1 min-h-0 flex-col overflow-hidden bg-white" aria-labelledby={id}>
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-slate-200/70 bg-slate-50/50 px-3 py-1.5">
        <div id={id} className="flex min-w-0 items-center gap-1.5 font-sans text-[11px] font-bold text-slate-800">
          <Bookmark size={12} className="shrink-0 text-[#8f733a]" />
          <span className="truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="rounded-full bg-slate-100 border border-slate-200/80 px-1.5 py-0.2 font-mono text-[9px] font-bold text-slate-600">
            {links.length}
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="grid size-5 shrink-0 place-items-center rounded border border-slate-200/80 bg-white text-slate-500 hover:text-[#8f733a] hover:border-[#b49a63]/50 hover:bg-[#fbf7ee] shadow-2xs transition-all"
            title="إضافة رابط عام"
            aria-label="إضافة رابط عام"
          >
            <Plus size={11} />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-1.5">
        {links.map((link) => (
          <div
            key={link.id}
            className="group relative flex items-center justify-between gap-2 rounded-lg border border-slate-200/70 bg-white p-2 hover:border-[#b49a63]/60 hover:bg-[#fbf7ee]/25 hover:shadow-2xs transition-all"
          >
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 flex-1 items-center gap-2.5 text-right"
              title={link.url}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-md border border-slate-200/70 bg-slate-50 text-slate-600 group-hover:border-[#b49a63]/40 group-hover:bg-[#fbf7ee] group-hover:text-[#8f733a] shadow-2xs transition-colors">
                {getQuickLinkIcon(link)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-bold text-slate-800 group-hover:text-slate-950 transition-colors">
                  {link.title}
                </span>
                <span className="block truncate text-[9px] text-slate-500 font-normal">
                  {link.description}
                </span>
              </span>
            </a>

            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(link)}
                  className="grid size-5.5 place-items-center rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  title="تعديل الرابط"
                  aria-label={`تعديل ${link.title}`}
                >
                  <Pencil size={10} />
                </button>
              )}
              <button
                type="button"
                onClick={() => onRemove(link.id)}
                className="grid size-5.5 place-items-center rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="حذف الرابط"
                aria-label={`حذف ${link.title}`}
              >
                <Trash2 size={10} />
              </button>
            </div>

            <ExternalLink size={11} className="text-slate-400 group-hover:text-[#8f733a] shrink-0 transition-transform group-hover:-translate-x-0.5" />
          </div>
        ))}

        {links.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center">
            <Link2 size={15} className="mx-auto text-slate-400 mb-1" />
            <p className="text-[10px] text-slate-500">{emptyText}</p>
          </div>
        )}
      </div>
    </section>
  );
}

export function Workspace() {
  const [files, setFiles] = useState<Record<string, string>>(workspace.files);
  const [savedFiles, setSavedFiles] = useState<Record<string, string>>(workspace.files);
  const [activePath, setActivePath] = useState("");
  const [openPaths, setOpenPaths] = useState<string[]>([]);
  const [folders, setFolders] = useState<string[]>(["قسم التنظيم والتخطيط العمراني"]);
  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [fileDialog, setFileDialog] = useState<"create" | "rename" | null>(null);
  const [folderDialog, setFolderDialog] = useState<"create" | "rename" | null>(null);
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [folderDraft, setFolderDraft] = useState("قسم التنظيم والتخطيط العمراني");
  const [showProblems, setShowProblems] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(true);
  const [showQuickLinksPanel, setShowQuickLinksPanel] = useState(true);
  const [showCommand, setShowCommand] = useState(false);
  const [tabContextMenu, setTabContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>(defaultQuickLinks);
  const [quickLinksHydrated, setQuickLinksHydrated] = useState(false);
  const [quickLinksGeneralRatio, setQuickLinksGeneralRatio] = useState(20);
  const quickLinksResizeRef = useRef<{ startY: number; startRatio: number; height: number } | null>(null);
  const autoSaveAttemptRef = useRef("");
  const [quickLinkDialog, setQuickLinkDialog] = useState(false);
  const [quickLinkScope, setQuickLinkScope] = useState<QuickLinkScope>("general");
  const [quickLinkEditingId, setQuickLinkEditingId] = useState<string | null>(null);
  const [quickLinkDraft, setQuickLinkDraft] = useState({ title: "", description: "", url: "" });
  const fileQuickLinks = useMemo(
    () => Object.fromEntries(
      Object.entries(files)
        .map(([path, content]) => [path, readFileQuickLinks(content)] as const)
        .filter(([, links]) => links.length > 0),
    ),
    [files],
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("tour") === "true" || params.get("tour") === "1") {
        // The URL is an external source of truth for the initial tour state.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setShowTour(true);
      }
    }
    try {
      const stored = JSON.parse(localStorage.getItem("analysis-department-quick-links") ?? "null") as unknown;
      if (Array.isArray(stored) && stored.every(isValidQuickLink)) {
        const storedIds = new Set(stored.map((link) => link.id));
        setQuickLinks([...stored, ...requestImageQuickLinks.filter((link) => !storedIds.has(link.id))]);
      }
      const storedRatio = Number(localStorage.getItem("analysis-department-quick-links-ratio"));
      if (Number.isFinite(storedRatio)) {
        setQuickLinksGeneralRatio(clampQuickLinksRatio(storedRatio));
      }
    } catch {
      // Keep defaults when local storage is unavailable or malformed.
    }
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setShowLeftPanel(false);
      setShowQuickLinksPanel(false);
    }
    setQuickLinksHydrated(true);

    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setShowLeftPanel(false);
        setShowQuickLinksPanel(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!quickLinksHydrated) return;
    localStorage.setItem("analysis-department-quick-links", JSON.stringify(quickLinks));
    localStorage.setItem("analysis-department-quick-links-ratio", String(quickLinksGeneralRatio));
  }, [quickLinks, quickLinksGeneralRatio, quickLinksHydrated]);

  const modifiedPaths = useMemo(() => Object.keys(files).filter((path) => files[path] !== savedFiles[path]), [files, savedFiles]);
  const deletedPaths = useMemo(() => Object.keys(savedFiles).filter((path) => !(path in files)), [files, savedFiles]);
  const issues = useMemo(() => Object.entries(files).flatMap(([path, content]) => validateJsonFile(path, content)), [files]);
  const visibleFileGroups = folders.map((label) => ({ label, files: Object.keys(files).filter((path) => folderForPath(path) === label) }));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "s") { event.preventDefault(); saveChanges(); }
      if (modifier && event.key.toLowerCase() === "k") { event.preventDefault(); setShowCommand(true); }
      if (modifier && event.key.toLowerCase() === "p") { event.preventDefault(); setShowCommand(true); }
      if (event.key === "Escape") { setShowCommand(false); setTabContextMenu(null); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function handleEditorChange(value: string) {
    setFiles((current) => ({ ...current, [activePath]: value }));
  }

  async function saveChanges(): Promise<boolean> {
    const changedPaths = [...modifiedPaths, ...deletedPaths];
    const errors = issues.filter((issue) => issue.severity === "error" && changedPaths.some((path) => issue.path === path || issue.path.startsWith(`${path}.`)));
    if (errors.length) { setShowProblems(true); setNotice(`أصلح ${errors.length} من أخطاء التحقق قبل الحفظ`); return false; }
    const changedFiles = Object.fromEntries(modifiedPaths.map((path) => [path, files[path]]));
    if (!modifiedPaths.length && !deletedPaths.length) { setNotice("لا توجد تغييرات"); window.setTimeout(() => setNotice(null), 2400); return true; }

    setIsSaving(true);
    setNotice("جارٍ حفظ الملفات داخل المستودع…");
    try {
      const response = await fetch("/api/github/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: changedFiles,
          deletedPaths,
          message: `تحديث ملفات مساحة العمل${activePath ? `: ${fileNameFromPath(activePath)}` : ""}`,
        }),
      });
      const payload = await response.json() as { error?: string; ok?: boolean };
      if (!response.ok || !payload.ok) throw new Error(payload.error ?? "تعذر حفظ الملفات داخل المستودع.");
      setSavedFiles({ ...files });
      setNotice(`تم حفظ ${modifiedPaths.length + deletedPaths.length} ملفًا داخل المشروع`);
      window.setTimeout(() => setNotice(null), 2400);
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر حفظ الملفات داخل المستودع.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    if (!modifiedPaths.length && !deletedPaths.length) {
      autoSaveAttemptRef.current = "";
      return;
    }
    if (isSaving) return;
    const signature = JSON.stringify({ changed: modifiedPaths.map((path) => [path, files[path]]), deleted: deletedPaths });
    if (autoSaveAttemptRef.current === signature) return;
    const timer = window.setTimeout(() => {
      autoSaveAttemptRef.current = signature;
      void saveChanges();
    }, 850);
    return () => window.clearTimeout(timer);
    // saveChanges intentionally uses the current file snapshot when the debounce completes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, savedFiles, isSaving, modifiedPaths, deletedPaths]);

  function selectPath(path: string) {
    setActivePath(path);
    setOpenPaths((current) => current.includes(path) ? current : [...current, path]);
    setShowCommand(false);
    setEditorOpen(false);
  }

  function openQuickLinkDialog(scope: QuickLinkScope, link?: QuickLink) {
    if (scope === "file" && !activePath) {
      setNotice("افتح ملفاً أولاً لإضافة رابط مخصص له");
      return;
    }
    setQuickLinkScope(scope);
    setQuickLinkEditingId(link?.id ?? null);
    setQuickLinkDraft(link ? { title: link.title, description: link.description, url: link.url } : { title: "", description: "", url: "https://" });
    setQuickLinkDialog(true);
  }

  function submitQuickLink() {
    const title = quickLinkDraft.title.trim();
    const description = quickLinkDraft.description.trim();
    const url = normalizeQuickLinkUrl(quickLinkDraft.url);
    if (!title || !description || !url) {
      setNotice("أدخل اسم الرابط ووصفه ورابطاً صحيحاً");
      return;
    }
    const link = { id: quickLinkEditingId ?? `quick-link-${Date.now()}`, title, description, url };
    if (quickLinkScope === "general") {
      setQuickLinks((current) => quickLinkEditingId ? current.map((item) => item.id === quickLinkEditingId ? link : item) : [...current, link]);
    } else if (activePath) {
      const nextLinks = quickLinkEditingId
        ? (fileQuickLinks[activePath] ?? []).map((item) => item.id === quickLinkEditingId ? link : item)
        : [...(fileQuickLinks[activePath] ?? []), link];
      setFiles((current) => current[activePath] === undefined ? current : { ...current, [activePath]: writeFileQuickLinks(current[activePath], nextLinks) });
    }
    setQuickLinkEditingId(null);
    setQuickLinkDialog(false);
  }

  function removeQuickLink(scope: QuickLinkScope, id: string) {
    if (scope === "general") setQuickLinks((current) => current.filter((link) => link.id !== id));
    else if (activePath) {
      const nextLinks = (fileQuickLinks[activePath] ?? []).filter((link) => link.id !== id);
      setFiles((current) => current[activePath] === undefined ? current : { ...current, [activePath]: writeFileQuickLinks(current[activePath], nextLinks) });
    }
  }

  function startQuickLinksResize(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const body = event.currentTarget.parentElement;
    if (!body) return;
    quickLinksResizeRef.current = { startY: event.clientY, startRatio: quickLinksGeneralRatio, height: body.getBoundingClientRect().height };
    const handleMove = (moveEvent: PointerEvent) => {
      const resizeState = quickLinksResizeRef.current;
      if (!resizeState || resizeState.height <= 0) return;
      const deltaRatio = ((moveEvent.clientY - resizeState.startY) / resizeState.height) * 100;
      setQuickLinksGeneralRatio(clampQuickLinksRatio(resizeState.startRatio + deltaRatio));
    };
    const handleUp = () => {
      quickLinksResizeRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  function handleQuickLinksResizeKey(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setQuickLinksGeneralRatio((current) => clampQuickLinksRatio(current - 5));
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setQuickLinksGeneralRatio((current) => clampQuickLinksRatio(current + 5));
    }
  }

  function openTabContextMenu(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    setTabContextMenu({ x: event.clientX, y: event.clientY });
  }

  function closeAllTabs() {
    setOpenPaths([]);
    setActivePath("");
    setEditorOpen(false);
    setTabContextMenu(null);
  }

  function closeFile(path: string) {
    const nextPaths = openPaths.filter((item) => item !== path);
    if (!nextPaths.length) return;
    setOpenPaths(nextPaths);
    if (activePath === path) setActivePath(nextPaths.at(-1) ?? "");
    setEditorOpen(false);
  }

  function toggleFolder(label: string) {
    setOpenFolders((current) => ({ ...current, [label]: !current[label] }));
  }

  function openCreateFile() {
    setEditingPath(null);
    setNameDraft("");
    setFolderDraft("قسم التنظيم والتخطيط العمراني");
    setFileDialog("create");
  }

  function openRenameFile(path: string) {
    setEditingPath(path);
    setNameDraft(fileNameFromPath(path));
    setFileDialog("rename");
  }

  function openCreateFolder() {
    setEditingFolder(null);
    setNameDraft("");
    setFolderDialog("create");
  }

  function openRenameFolder(folder: string) {
    if (coreFolders.includes(folder)) return;
    setEditingFolder(folder);
    setNameDraft(folder);
    setFolderDialog("rename");
  }

  function submitFolder() {
    const nextName = nameDraft.trim().replace(/[\\/]/g, "-");
    if (!nextName) return;
    if (folderDialog === "create") {
      if (folders.includes(nextName)) return;
      setFolders((current) => [...current, nextName]);
      setOpenFolders((current) => ({ ...current, [nextName]: true }));
    } else if (editingFolder && nextName !== editingFolder) {
      if (folders.includes(nextName)) return;
      const oldPrefix = folderPrefix(editingFolder);
      const newPrefix = folderPrefix(nextName);
      const renamePaths = (record: Record<string, string>) => Object.fromEntries(Object.entries(record).map(([path, value]) => [path.startsWith(`${oldPrefix}/`) ? `${newPrefix}/${path.slice(oldPrefix.length + 1)}` : path, value]));
      setFiles((current) => renamePaths(current));
      setOpenPaths((current) => current.map((path) => path.startsWith(`${oldPrefix}/`) ? `${newPrefix}/${path.slice(oldPrefix.length + 1)}` : path));
      if (activePath.startsWith(`${oldPrefix}/`)) setActivePath(`${newPrefix}/${activePath.slice(oldPrefix.length + 1)}`);
      setFolders((current) => current.map((folder) => folder === editingFolder ? nextName : folder));
      setOpenFolders((current) => ({ ...current, [nextName]: current[editingFolder] ?? true }));
    }
    setFolderDialog(null);
  }

  function deleteFolder(folder: string) {
    if (coreFolders.includes(folder)) return;
    const prefix = `${folderPrefix(folder)}/`;
    const folderFiles = Object.keys(files).filter((path) => path.startsWith(prefix));
    if (folderFiles.length && !window.confirm(`حذف مجلد ${folder} وكل ملفاته؟`)) return;
    setFiles((current) => Object.fromEntries(Object.entries(current).filter(([path]) => !path.startsWith(prefix))));
    setOpenPaths((current) => current.filter((path) => !path.startsWith(prefix)));
    if (activePath.startsWith(prefix)) setActivePath("");
    setFolders((current) => current.filter((item) => item !== folder));
  }

  function deleteFile(path: string) {
    if (Object.keys(files).length <= 1 || !window.confirm(`حذف الملف ${fileNameFromPath(path)}؟`)) return;
    const nextFiles = Object.keys(files).filter((item) => item !== path);
    setFiles((current) => { const next = { ...current }; delete next[path]; return next; });
    const nextOpenPaths = openPaths.filter((item) => item !== path);
    const nextActivePath = activePath === path ? nextOpenPaths.at(-1) ?? nextFiles[0] ?? "" : activePath;
    setOpenPaths(nextOpenPaths.length ? nextOpenPaths : [nextActivePath]);
    setActivePath(nextActivePath);
    setEditorOpen(false);
  }

  function submitFile() {
    if (fileDialog === "rename" && editingPath) {
      const oldPath = editingPath;
      const extension = fileNameFromPath(oldPath).match(/\.[^.]+$/)?.[0];
      const nextName = normalizedFileName(nameDraft, oldPath.endsWith(".md") ? "markdown" : "json", extension);
      if (!nextName) return;
      const nextPath = `${folderPrefix(folderForPath(oldPath))}/${nextName}`;
      if (nextPath !== oldPath && files[nextPath] !== undefined) return;
      setFiles((current) => { const next = { ...current, [nextPath]: current[oldPath] }; delete next[oldPath]; return next; });
      setOpenPaths((current) => current.map((path) => path === oldPath ? nextPath : path));
      if (activePath === oldPath) setActivePath(nextPath);
    } else if (fileDialog === "create") {
      const targetFolder = folderDraft;
      const nextName = normalizedFileName(nameDraft, "json");
      if (!nextName) return;
      const nextPath = `${folderPrefix(targetFolder)}/${nextName}`;
      if (files[nextPath] !== undefined) return;
      setFiles((current) => ({ ...current, [nextPath]: emptyDataTableDocument() }));
      if (!folders.includes(targetFolder)) setFolders((current) => [...current, targetFolder]);
      setOpenFolders((current) => ({ ...current, [targetFolder]: true }));
      selectPath(nextPath);
    }
    setFileDialog(null);
  }

  async function saveAndCloseEditor() {
    if (await saveChanges()) setEditorOpen(false);
  }


  return <main className="day-mode official-shell relative flex h-screen min-h-[560px] flex-col overflow-hidden text-slate-900">
    <header className="official-header flex h-12 shrink-0 items-center justify-between border-b border-white/20 bg-[#002d29] px-2 sm:px-3 shadow-lg shadow-black/20">
      <div className="official-brand flex items-center gap-2 border-r-0 sm:border-r border-white/10 pr-0 sm:pr-4">
        <Link href="/" className="official-brand-mark grid size-7 place-items-center rounded-md bg-[#b49a63] text-slate-950 font-bold border border-white/30 hover:opacity-90 transition-opacity shrink-0" title="العودة إلى الصفحة الرئيسية">
          <Package size={15} strokeWidth={2.5} />
        </Link>
        <div className="min-w-0">
          <div className="font-sans text-[10px] sm:text-[11px] font-bold tracking-tight text-slate-100 flex items-center gap-1.5 truncate">
            <span>قسم فريق تحليل المشاريع</span>
          </div>
          <div className="hidden sm:block font-sans text-[8px] tracking-[0.12em] text-slate-300 truncate">مكان واحد لكل الملفات والروابط</div>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => setShowTour(true)} className="text-white hover:bg-white/15 gap-1 border border-[#b49a63]/40 bg-[#b49a63]/20 hover:bg-[#b49a63]/30 text-[10px] sm:text-[11px] font-bold shadow-xs px-2 h-7 sm:h-8">
          <Compass size={13} className="text-[#e0c98d]" />
          <span className="hidden xs:inline">جولة في المنصة</span>
        </Button>
        <Button size="sm" variant="ghost" disabled={isSaving} onClick={saveChanges} className="text-white hover:bg-white/10 text-[10px] sm:text-[11px] px-2 h-7 sm:h-8"><Check size={12} className={isSaving ? "animate-pulse text-amber-300" : modifiedPaths.length ? "text-amber-400" : "text-emerald-400"} />حفظ {modifiedPaths.length > 0 && <span className="rounded bg-amber-400 px-1 text-[8px] sm:text-[9px] font-bold text-slate-950">{modifiedPaths.length}</span>}</Button>
        <Button size="sm" variant="ghost" onClick={() => setShowProblems(true)} className="text-white hover:bg-white/10 text-[10px] sm:text-[11px] px-2 h-7 sm:h-8"><CircleDot size={12} className={issues.length ? "text-amber-400" : "text-emerald-400"} /><span className="hidden xs:inline">تحقق</span></Button>
      </div>
    </header>

    <Dialog open={quickLinkDialog} onOpenChange={setQuickLinkDialog}><DialogContent dir="rtl"><DialogTitle className="text-lg font-bold text-slate-900">{quickLinkEditingId ? "تعديل الرابط العام" : quickLinkScope === "general" ? "إضافة رابط عام" : "إضافة رابط للملف"}</DialogTitle><DialogDescription className="mt-1 text-right text-xs text-slate-600">أضف اسماً ووصفاً ورابطاً واضحاً ليستفيد منه الفريق.</DialogDescription><div className="mt-5 space-y-4"><label className="block text-xs font-bold text-slate-800">اسم الرابط<Input className="mt-1" autoFocus value={quickLinkDraft.title} onChange={(event) => setQuickLinkDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Google Drive" /></label><label className="block text-xs font-bold text-slate-800">الوصف<Input className="mt-1" value={quickLinkDraft.description} onChange={(event) => setQuickLinkDraft((current) => ({ ...current, description: event.target.value }))} placeholder="الملفات والمراجع المشتركة" /></label><label className="block text-xs font-bold text-slate-800">الرابط<Input className="mt-1" value={quickLinkDraft.url} onChange={(event) => setQuickLinkDraft((current) => ({ ...current, url: event.target.value }))} placeholder="https://example.com" dir="ltr" /></label></div><div className="mt-6 flex justify-start gap-2"><Button variant="outline" onClick={() => setQuickLinkDialog(false)}>إلغاء</Button><Button variant="primary" onClick={submitQuickLink}><Link2 size={14} />{quickLinkEditingId ? "حفظ التعديل" : "إضافة الرابط"}</Button></div></DialogContent></Dialog>
    <div className="workspace-body flex min-h-0 flex-1 relative bg-slate-100">
      {/* Right Sidebar (File Explorer: Expanded or Docked Rail) */}
      {showLeftPanel ? (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs lg:hidden" onClick={() => setShowLeftPanel(false)} />
          <aside className="workspace-sidebar official-sidebar fixed lg:static inset-y-0 right-0 z-50 lg:z-auto flex w-[268px] max-w-[85vw] shrink-0 flex-col border-r border-slate-200/90 bg-white shadow-xl lg:shadow-none">
            {/* Sidebar Header */}
            <div className="flex h-11 items-center justify-between border-b border-slate-200/80 bg-slate-50/70 px-3.5">
              <div className="flex items-center gap-2 font-sans text-xs font-bold tracking-tight text-slate-900">
                <span className="grid size-6 place-items-center rounded-md border border-[#b49a63]/30 bg-[#fbf7ee] text-[#8f733a]">
                  <LayoutPanelLeft size={13} />
                </span>
                <span>مستكشف الملفات</span>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="size-7 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60" title="ملف جديد" onClick={openCreateFile}><Plus size={13} /></Button>
                <Button size="icon" variant="ghost" className="size-7 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60" title="مجلد جديد" onClick={openCreateFolder}><FolderPlus size={13} /></Button>
                <Button size="icon" variant="ghost" className="size-7 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60" title="طي اللوحة الجانبية" onClick={() => setShowLeftPanel(false)}>
                  <PanelRightClose size={14} />
                </Button>
              </div>
            </div>

            {/* Search input */}
            <div className="border-b border-slate-200/80 px-3 py-2 bg-white">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1 text-slate-500 focus-within:border-[#8f733a] focus-within:bg-white focus-within:text-slate-900 focus-within:ring-2 focus-within:ring-[#b49a63]/20 transition-all">
                <Search size={13} className="shrink-0 text-slate-400" />
                <Input className="h-6 border-0 bg-transparent p-0 text-xs shadow-none focus-visible:ring-0 placeholder:text-slate-400" placeholder="بحث وتصفية الملفات..." />
              </div>
            </div>

            {/* File Tree Explorer */}
            <div className="min-h-0 flex-1 overflow-auto px-2 py-3 space-y-1">
              {visibleFileGroups.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-8 text-center text-xs leading-6 text-slate-500">
                  المستكشف فارغ.<br />أنشئ مجلداً أو ملفاً جديداً للبدء.
                </div>
              ) : (
                visibleFileGroups.map((group) => {
                  const isOpen = openFolders[group.label] ?? true;
                  const isCoreFolder = coreFolders.includes(group.label);
                  return (
                    <div key={group.label} className="group-folder mb-1.5">
                      <div className="flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-100/80">
                        <button type="button" onClick={() => toggleFolder(group.label)} className="flex min-w-0 flex-1 items-center gap-1.5 text-right font-sans text-xs font-bold text-slate-800">
                          <ChevronDown size={13} className={cn("text-slate-400 transition-transform", !isOpen && "-rotate-90")} />
                          <Folder size={14} className="text-[#8f733a] shrink-0" />
                          <span className="truncate">{group.label === "docs" ? "التوثيق" : group.label}</span>
                          <span className="mr-auto rounded-full bg-slate-200/70 px-1.5 py-0.2 font-mono text-[9px] font-semibold text-slate-600">{group.files.length}</span>
                        </button>
                        {!isCoreFolder && (
                          <div className="flex items-center gap-0.5">
                            <button type="button" onClick={() => openRenameFolder(group.label)} className="grid size-5 place-items-center rounded text-slate-400 hover:bg-white hover:text-slate-900 shadow-2xs" title="إعادة تسمية المجلد">
                              <Pencil size={10} />
                            </button>
                            <button type="button" onClick={() => deleteFolder(group.label)} className="grid size-5 place-items-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 shadow-2xs" title="حذف المجلد">
                              <Trash2 size={10} />
                            </button>
                          </div>
                        )}
                      </div>
                      {isOpen && (
                        <div className="mt-0.5 space-y-0.5 pr-2.5 mr-1 border-r border-slate-200/70">
                          {group.files.map((path) => {
                            const isActive = activePath === path;
                            return (
                              <div key={path} className={cn("group flex w-full items-center rounded-md transition-all text-xs", isActive ? "bg-[#fbf7ee] text-[#7a6231] font-bold border-r-2 border-[#b49a63] shadow-2xs" : "hover:bg-slate-100/70 text-slate-700 hover:text-slate-950")}>
                                <button type="button" onClick={() => { selectPath(path); if (typeof window !== "undefined" && window.innerWidth < 1024) setShowLeftPanel(false); }} className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left font-sans transition-colors">
                                  <span>{fileIcon(path)}</span>
                                  <span className="file-name truncate text-[11px]" dir="ltr">{pathLabel(path)}</span>
                                  {files[path] !== savedFiles[path] && <span className="mr-auto size-1.5 rounded-full bg-amber-500 shrink-0" />}
                                </button>
                                <div className="flex items-center gap-0.5 pl-1 opacity-0 transition-opacity group-hover:opacity-100">
                                  <button type="button" onClick={() => openRenameFile(path)} className="grid size-5 place-items-center rounded text-slate-400 hover:bg-white hover:text-slate-900 shadow-2xs" title="إعادة تسمية الملف">
                                    <Pencil size={10} />
                                  </button>
                                  <button type="button" onClick={() => deleteFile(path)} className="grid size-5 place-items-center rounded text-slate-400 hover:bg-rose-50 hover:text-rose-600 shadow-2xs" title="حذف الملف">
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </aside>
        </>
      ) : (
        /* Docked Collapsible Rail for Right Sidebar */
        <aside className="workspace-collapsed-rail flex w-12 shrink-0 flex-col items-center border-r border-slate-200/90 bg-slate-50/90 py-2.5 shadow-xs transition-all select-none gap-2">
          <button
            type="button"
            onClick={() => setShowLeftPanel(true)}
            className="flex size-8 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white hover:text-slate-950 hover:shadow-2xs"
            title="توسيع مستكشف الملفات"
          >
            <PanelRightOpen size={16} />
          </button>
          <div className="h-px w-6 bg-slate-200" />
          <button
            type="button"
            onClick={() => setShowLeftPanel(true)}
            className="flex size-8 items-center justify-center rounded-lg bg-slate-900 text-white shadow-xs"
            title="مستكشف الملفات"
          >
            <Folder size={15} />
          </button>
          <div className="h-px w-6 bg-slate-200" />
          <button
            type="button"
            onClick={openCreateFile}
            className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-slate-900 hover:shadow-2xs"
            title="ملف جديد"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={openCreateFolder}
            className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-slate-900 hover:shadow-2xs"
            title="مجلد جديد"
          >
            <FolderPlus size={14} />
          </button>
        </aside>
      )}

      {/* Main Workspace Area (File Tabs + Editor) */}
      <section className="official-main flex min-h-0 min-w-0 flex-1 flex-col bg-slate-100/90">
        {/* Workspace Tab Bar */}
        <div className="workspace-tabs flex h-10 shrink-0 items-stretch border-b border-slate-200/90 bg-slate-200/60 px-2" onContextMenu={openTabContextMenu}>
          <div className="flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto">
            {openPaths.map((path) => {
              const isActive = activePath === path;
              return (
                <div key={path} className={cn("workspace-tab flex max-w-[200px] shrink-0 items-center border-x border-slate-200/80 transition-all rounded-t-sm", isActive ? "bg-white font-bold text-slate-950 shadow-xs border-b-2 border-b-[#003b36]" : "bg-transparent text-slate-600 hover:bg-white/60 hover:text-slate-900")}>
                  <button type="button" onClick={() => selectPath(path)} className={cn("workspace-tab-button flex min-w-0 items-center gap-2 px-3 font-sans text-xs", isActive ? "text-slate-950 font-bold" : "text-slate-600 hover:text-slate-900")}>
                    <span>{fileIcon(path)}</span>
                    <span className="file-name truncate text-[11px]" dir="ltr">{pathLabel(path)}</span>
                    {files[path] !== savedFiles[path] && <span className="size-1.5 shrink-0 rounded-full bg-amber-500" />}
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      closeFile(path);
                    }}
                    className="workspace-tab-close mr-1 grid size-5 shrink-0 place-items-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-900"
                    title="إغلاق الملف"
                  >
                    <X size={11} />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="workspace-tabs-actions flex items-center gap-1 pl-2">
            <Button size="icon" variant="ghost" className="size-7 text-slate-600 hover:text-slate-900 hover:bg-white/80" title="لوحة الأوامر" onClick={() => setShowCommand(true)}>
              <Command size={13} />
            </Button>
          </div>
        </div>

        {/* Editor Area */}
        <div className="min-h-0 flex-1">
          {activePath ? (
            <DataTableEditor key={activePath} path={activePath} value={files[activePath] ?? ""} onChange={(value) => setFiles((current) => ({ ...current, [activePath]: value }))} />
          ) : (
            <EmptyWorkspaceState />
          )}
        </div>
      </section>

      {/* Left Sidebar (Quick Links: Expanded or Docked Rail) */}
      {showQuickLinksPanel ? (
        <>
          <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs lg:hidden" onClick={() => setShowQuickLinksPanel(false)} />
          <aside className="quick-links-sidebar fixed lg:static inset-y-0 left-0 z-50 lg:z-auto flex w-[285px] max-w-[85vw] shrink-0 flex-col border-l border-slate-200/90 bg-white shadow-xl lg:shadow-none select-none">
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-200/80 bg-slate-50/70 px-3.5">
              <div className="flex items-center gap-2 font-sans text-xs font-bold tracking-tight text-slate-900">
                <span className="grid size-6 place-items-center rounded-md border border-[#b49a63]/30 bg-[#fbf7ee] text-[#8f733a] shadow-2xs">
                  <Link2 size={13} />
                </span>
                <span>الروابط والمراجع</span>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="size-7 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60" title="إضافة رابط جديد" onClick={() => openQuickLinkDialog("general")}>
                  <Plus size={13} />
                </Button>
                <Button size="icon" variant="ghost" className="size-7 text-slate-600 hover:text-slate-900 hover:bg-slate-200/60" title="طي لوحة الروابط" onClick={() => setShowQuickLinksPanel(false)}>
                  <PanelLeftClose size={14} />
                </Button>
              </div>
            </div>
            <div className="quick-links-sidebar-body flex-1 min-h-0 bg-white overflow-hidden" style={{ display: "grid", gridTemplateRows: `${quickLinksGeneralRatio}fr 8px ${100 - quickLinksGeneralRatio}fr`, height: "100%" }}>
              <div className="min-h-0 flex flex-col overflow-hidden">
                <QuickLinksPanel id="general-quick-links" title="روابط الفريق العامة" links={quickLinks} emptyText="أضف رابطاً عاماً للفريق." onAdd={() => openQuickLinkDialog("general")} onEdit={(link) => openQuickLinkDialog("general", link)} onRemove={(id) => removeQuickLink("general", id)} />
              </div>
              <div className="group relative flex h-2 shrink-0 cursor-row-resize items-center justify-center border-y border-slate-200/80 bg-slate-100 hover:bg-slate-200/70 transition-colors select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-[#8f733a]" role="separator" tabIndex={0} aria-orientation="horizontal" aria-valuemin={MIN_GENERAL_LINKS_RATIO} aria-valuemax={MAX_GENERAL_LINKS_RATIO} aria-valuenow={quickLinksGeneralRatio} aria-label="تغيير مساحة الروابط العامة وروابط الملف" title="اسحب لتغيير مساحة القسمين" onPointerDown={startQuickLinksResize} onKeyDown={handleQuickLinksResizeKey}>
                <span className="h-1 w-8 rounded-full bg-slate-300 group-hover:w-12 group-hover:bg-[#8f733a] transition-all" />
              </div>
              <div className="quick-links-file-section min-h-0 flex flex-col overflow-hidden">
                <QuickLinksPanel id="file-quick-links" title={activePath ? `مخططات: ${pathLabel(activePath)}` : "مخططات وتوثيق الملف"} activePath={activePath} links={activePath ? (fileQuickLinks[activePath] ?? []) : []} emptyText={activePath ? "أضف روابط مرتبطة بهذا الملف." : "افتح ملفاً لعرض روابطه الخاصة."} onAdd={() => openQuickLinkDialog("file")} onEdit={(link) => openQuickLinkDialog("file", link)} onRemove={(id) => removeQuickLink("file", id)} />
              </div>
            </div>
          </aside>
        </>
      ) : (
        /* Docked Collapsible Rail for Left Sidebar (Quick Links) */
        <aside className="quick-links-collapsed-rail flex w-12 shrink-0 flex-col items-center border-l border-slate-200/90 bg-slate-50/90 py-2.5 shadow-xs transition-all select-none gap-2">
          <button
            type="button"
            onClick={() => setShowQuickLinksPanel(true)}
            className="flex size-8 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white hover:text-slate-950 hover:shadow-2xs"
            title="توسيع الروابط السريعة"
          >
            <PanelLeftOpen size={16} className="text-[#8f733a]" />
          </button>
          <div className="h-px w-6 bg-slate-200" />
          <button
            type="button"
            onClick={() => openQuickLinkDialog("general")}
            className="flex size-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white hover:text-slate-900 hover:shadow-2xs"
            title="إضافة رابط عام"
          >
            <Plus size={14} />
          </button>
          <div className="mt-auto flex flex-col items-center gap-1 pb-1">
            <span className="text-[9px] font-bold text-slate-600 font-mono" title="عدد الروابط">
              {quickLinks.length + (activePath ? (fileQuickLinks[activePath]?.length ?? 0) : 0)}
            </span>
            <Link2 size={12} className="text-[#8f733a]" />
          </div>
        </aside>
      )}
    </div>

    {/* Docked Problems Panel */}
    {showProblems && (
      <section className="h-[148px] shrink-0 border-t border-slate-700 bg-slate-900 text-slate-100 shadow-2xl animate-in slide-in-from-bottom duration-200">
        <div className="flex h-9 items-center gap-4 border-b border-slate-800 bg-slate-950/70 px-4">
          <div className="flex h-full items-center gap-2 border-b-2 border-amber-400 font-sans text-xs font-bold text-slate-100">
            <CircleDot size={13} className={issues.length ? "text-amber-400" : "text-emerald-400"} />
            المشاكل
            <span className={cn("rounded-md px-1.5 py-0.5 text-[9px] font-bold", issues.length ? "bg-amber-400/20 text-amber-300 border border-amber-400/40" : "bg-emerald-400/20 text-emerald-300 border border-emerald-400/40")}>
              {issues.length}
            </span>
          </div>
          <button className="mr-auto text-slate-400 hover:text-white transition-colors" onClick={() => setShowProblems(false)} title="طي لوحة المشاكل">
            <ChevronDown size={14} />
          </button>
        </div>
        <div className="h-[109px] overflow-auto px-4 py-2">
          {issues.length === 0 ? (
            <div className="flex items-center gap-2 py-3 font-sans text-xs font-semibold text-emerald-400">
              <Check size={13} />
              لا توجد مشاكل في المشروع.
            </div>
          ) : (
            issues.map((issue) => (
              <div key={issue.id} className="flex items-center gap-3 border-b border-slate-800/80 py-1.5 font-sans text-xs">
                <span className={issue.severity === "error" ? "text-rose-400 font-bold" : "text-amber-400 font-bold"}>{issue.severity === "error" ? "×" : "△"}</span>
                <span className="text-slate-200">{issue.message}</span>
                <span className="mr-auto font-mono text-[10px] text-slate-400" dir="ltr">{issue.path}</span>
              </div>
            ))
          )}
        </div>
      </section>
    )}

    {/* Docked Status Footer Bar */}
    <WorkspaceFooter issuesCount={issues.length} onOpenProblems={() => setShowProblems((prev) => !prev)} />

    {notice && <div className="fixed bottom-12 left-1/2 z-50 -translate-x-1/2 rounded-xl border border-slate-900 bg-slate-900 px-4 py-2.5 font-sans text-xs font-bold text-white shadow-2xl">{notice}</div>}
    <Dialog open={fileDialog !== null} onOpenChange={(open) => !open && setFileDialog(null)}><DialogContent dir="rtl"><DialogTitle className="text-lg font-bold text-slate-900">{fileDialog === "rename" ? "إعادة تسمية ملف" : "ملف جديد"}</DialogTitle><DialogDescription className="mt-1 text-right text-xs text-slate-600">{fileDialog === "rename" ? "غيّر اسم الملف مع الحفاظ على محتواه." : "أنشئ ملفًا جديدًا داخل مجلد المشروع."}</DialogDescription><div className="mt-5 space-y-4"><label className="block text-xs font-bold text-slate-800">اسم الملف<Input className="mt-1" autoFocus value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} placeholder={fileDialog === "rename" ? "اسم الملف" : "اسم الملف"} dir="ltr" /></label>{fileDialog === "create" && <label className="block text-xs font-bold text-slate-800">المجلد<select className="mt-1 flex h-8 w-full rounded-lg border border-slate-300 bg-white px-3 font-sans text-xs text-slate-900 outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-900/15" value={folderDraft} onChange={(event) => setFolderDraft(event.target.value)}>{folders.map((folder) => <option key={folder} value={folder}>{folder === "docs" ? "التوثيق" : folder}</option>)}</select></label>}</div><div className="mt-6 flex justify-start gap-2"><Button variant="outline" onClick={() => setFileDialog(null)}>إلغاء</Button><Button variant="primary" onClick={submitFile}><Check size={14} />{fileDialog === "rename" ? "حفظ الاسم" : "إنشاء الملف"}</Button></div></DialogContent></Dialog>
    <Dialog open={folderDialog !== null} onOpenChange={(open) => !open && setFolderDialog(null)}><DialogContent dir="rtl"><DialogTitle className="text-lg font-bold text-slate-900">{folderDialog === "rename" ? "إعادة تسمية مجلد" : "مجلد جديد"}</DialogTitle><DialogDescription className="mt-1 text-right text-xs text-slate-600">{folderDialog === "rename" ? "ستنتقل الملفات الموجودة إلى الاسم الجديد." : "أنشئ مجلدًا لتنظيم الملفات."}</DialogDescription><label className="mt-5 block text-xs font-bold text-slate-800">اسم المجلد<Input className="mt-1" autoFocus value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} placeholder="اسم المجلد" dir="ltr" /></label><div className="mt-6 flex justify-start gap-2"><Button variant="outline" onClick={() => setFolderDialog(null)}>إلغاء</Button><Button variant="primary" onClick={submitFolder}><Check size={14} />{folderDialog === "rename" ? "حفظ الاسم" : "إنشاء المجلد"}</Button></div></DialogContent></Dialog>
    <Dialog open={editorOpen} onOpenChange={setEditorOpen}><DialogContent dir="rtl" className="flex h-[82vh] max-w-[1180px] flex-col gap-0 overflow-hidden p-0 border border-slate-300 shadow-2xl"><div className="shrink-0 border-b border-slate-300 bg-slate-100 px-6 py-4"><DialogTitle className="text-base font-bold text-slate-900">تحرير الملف</DialogTitle><DialogDescription className="mt-1 font-mono text-[10px] text-slate-500" dir="ltr">{activePath}</DialogDescription></div><div className="min-h-0 flex-1">{activePath.endsWith(".md") ? <div className="grid h-full min-h-0 grid-cols-2 divide-x divide-slate-300"><CodeEditor path={activePath} value={files[activePath]} onChange={handleEditorChange} /><MarkdownPreview text={files[activePath]} /></div> : <CodeEditor path={activePath} value={files[activePath]} onChange={handleEditorChange} />}</div><div className="flex shrink-0 items-center justify-between border-t border-slate-300 bg-slate-100 px-6 py-3"><span className="text-xs font-medium text-slate-600">Ctrl / Cmd + S للحفظ</span><div className="flex gap-2"><Button variant="outline" onClick={() => setEditorOpen(false)}>إلغاء</Button><Button variant="primary" onClick={saveAndCloseEditor}><Check size={14} />حفظ الملف</Button></div></div></DialogContent></Dialog>
    {showCommand && <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-[2px]" onMouseDown={() => setShowCommand(false)}><div className="mx-auto mt-24 w-[520px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3"><Command size={14} className="text-[#e0c98d]" /><span className="font-sans text-xs font-semibold">أوامر مساحة العمل</span></div><div className="p-2"><button type="button" onClick={() => { setShowCommand(false); setShowProblems(true); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-right font-sans text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white"><span className="grid size-6 place-items-center rounded-md bg-slate-800 text-[#e0c98d]"><CircleDot size={13} /></span>تحقق من المشروع</button></div><div className="border-t border-slate-800 px-4 py-2 font-mono text-[9px] text-slate-500">Esc إغلاق</div></div></div>}
    {tabContextMenu && <div className="fixed inset-0 z-50" onMouseDown={() => setTabContextMenu(null)} onContextMenu={(event) => { event.preventDefault(); setTabContextMenu(null); }}><div className="context-menu absolute min-w-[190px] rounded-xl border border-slate-700 bg-slate-900 p-1.5 shadow-2xl" style={{ left: tabContextMenu.x, top: tabContextMenu.y }} onMouseDown={(event) => event.stopPropagation()}><button type="button" className="context-menu-item flex w-full items-center gap-2 rounded-lg px-3 py-2 text-right text-xs font-bold text-slate-100 transition-colors hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-40" onClick={closeAllTabs} disabled={!openPaths.length}><X size={13} />إغلاق جميع التبويبات</button></div></div>}
    <PlatformTourModal open={showTour} onOpenChange={setShowTour} />
  </main>;
}

function EmptyWorkspaceState() {
  return <div className="flex h-full items-center justify-center bg-slate-50 p-8"><div className="rounded-2xl border border-dashed border-slate-300 bg-white px-10 py-12 text-center shadow-sm"><div className="text-sm font-semibold text-slate-700">لا توجد تبويبات مفتوحة</div><p className="mt-2 text-xs text-slate-500">اختر ملفًا من القائمة الجانبية لفتحه.</p></div></div>;
}

function EditorLaunchpad({ path, value, onOpen }: { path: string; value: string; onOpen: () => void }) {
  const isMarkdown = path.endsWith(".md");
  return <div className="flex h-full items-center justify-center bg-slate-50 p-8"><div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-pink-50 text-pink-600">{isMarkdown ? <FileText size={22} /> : <FileJson size={22} />}</div><h2 className="text-lg font-semibold text-slate-900">{isMarkdown ? "وثيقة المشروع" : "ملف النموذج"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">افتح المحرر في نافذة مستقلة لتعديل الملف مع المعاينة والحفظ.</p><div className="mx-auto mt-5 max-w-md rounded-lg bg-slate-50 p-3 text-right font-mono text-[10px] leading-5 text-slate-500" dir="ltr">{value.split("\n").slice(0, 5).join("\n")}</div><Button className="mt-6" variant="primary" onClick={onOpen}><Code2 size={15} />فتح المحرر</Button></div></div>;
}
