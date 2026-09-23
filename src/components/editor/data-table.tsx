"use client";

import { useEffect, useMemo, useRef, useState, type ClipboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { ClipboardPaste, FileSpreadsheet, FileText, ListChecks, Plus, ShieldCheck, Table2, Trash2 } from "lucide-react";
import { PermissionMatrixView } from "@/components/citizen-services/permission-matrix-view";
import { ServiceRequestDocumentView } from "@/components/citizen-services/service-request-document-view";
import { UserStoryDocumentView } from "@/components/citizen-services/user-story-document-view";
import type { CitizenServiceDefinition, ServicePermissionMatrix, ServiceSpecification, ServiceUserStory } from "@/domain/types";
import { cn } from "@/lib/cn";
import { mergePropertiesActionMatrix, mergePropertiesPermissionMatrix } from "@/lib/citizen-service-permission-matrices";
import { mergePropertiesUserStory } from "@/lib/citizen-service-user-stories";

interface TableData {
  columns: string[];
  rows: string[][];
  columnWidths: number[];
  rowHeights: number[];
}

type TableMetadata = Record<string, unknown>;

interface DataTableEditorProps {
  path: string;
  value: string;
  onChange: (value: string) => void;
}

interface CellPosition {
  row: number;
  column: number;
}

interface ResizeState {
  type: "column" | "row";
  index: number;
  startPosition: number;
  initialSize: number;
}

const defaultColumns = ["العمود 1", "العمود 2", "العمود 3"];
const DEFAULT_COLUMN_WIDTH = 180;
const MIN_COLUMN_WIDTH = 90;
const MAX_COLUMN_WIDTH = 600;
const DEFAULT_ROW_HEIGHT = 36;
const MIN_ROW_HEIGHT = 26;
const MAX_ROW_HEIGHT = 240;

function cellValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return typeof value === "string" ? value : typeof value === "object" ? JSON.stringify(value) : String(value);
}

function boundedSize(value: unknown, fallback: number, minimum: number, maximum: number) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? Math.min(maximum, Math.max(minimum, Math.round(numberValue))) : fallback;
}

function normalizeTable(columns: string[], rows: string[][], columnWidths: number[] = [], rowHeights: number[] = []): TableData {
  const width = Math.max(columns.length, ...rows.map((row) => row.length), 1);
  const normalizedRows = rows.length
    ? rows.map((row) => Array.from({ length: width }, (_, index) => row[index] ?? ""))
    : [Array(width).fill("")];

  return {
    columns: Array.from({ length: width }, (_, index) => columns[index]?.trim() || `العمود ${index + 1}`),
    rows: normalizedRows,
    columnWidths: Array.from({ length: width }, (_, index) => boundedSize(columnWidths[index], DEFAULT_COLUMN_WIDTH, MIN_COLUMN_WIDTH, MAX_COLUMN_WIDTH)),
    rowHeights: Array.from({ length: normalizedRows.length }, (_, index) => boundedSize(rowHeights[index], DEFAULT_ROW_HEIGHT, MIN_ROW_HEIGHT, MAX_ROW_HEIGHT)),
  };
}

function splitDelimitedText(value: string) {
  const lines = value.replaceAll("\r", "").split("\n").filter((line) => line.length > 0);
  if (!lines.length) return [];
  const delimiter = lines.some((line) => line.includes("\t")) ? "\t" : ",";
  return lines.map((line) => line.split(delimiter).map((cell) => cell.trim()));
}

function tableFromArray(items: unknown[]): TableData {
  if (!items.length) return normalizeTable(defaultColumns, []);
  if (items.every((item) => Array.isArray(item))) {
    const matrix = items.map((item) => (item as unknown[]).map(cellValue));
    return normalizeTable(matrix[0] ?? defaultColumns, matrix.slice(1));
  }
  const records = items.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item));
  if (!records.length) return normalizeTable(["القيمة"], items.map((item) => [cellValue(item)]));
  const columns = Array.from(new Set(records.flatMap((record) => Object.keys(record))));
  return normalizeTable(columns, records.map((record) => columns.map((column) => cellValue(record[column]))));
}

function parseTableDocument(value: string): TableData {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const document = parsed as Record<string, unknown>;
      if (Array.isArray(document.columns) && Array.isArray(document.rows)) {
        return normalizeTable(
          document.columns.map(cellValue),
          document.rows.map((row) => Array.isArray(row) ? row.map(cellValue) : [cellValue(row)]),
          Array.isArray(document.columnWidths) ? document.columnWidths : [],
          Array.isArray(document.rowHeights) ? document.rowHeights : [],
        );
      }
      const arrayProperty = Object.values(document).find((item) => Array.isArray(item));
      if (Array.isArray(arrayProperty)) return tableFromArray(arrayProperty);
      return normalizeTable(["الخاصية", "القيمة"], Object.entries(document).map(([key, item]) => [key, cellValue(item)]));
    }
    if (Array.isArray(parsed)) return tableFromArray(parsed);
  } catch {
    const matrix = splitDelimitedText(value);
    if (matrix.length) return normalizeTable(matrix[0], matrix.slice(1));
  }
  return normalizeTable(defaultColumns, []);
}

function readTableMetadata(value: string): TableMetadata {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const metadata = { ...(parsed as TableMetadata) };
    delete metadata.version;
    delete metadata.columns;
    delete metadata.rows;
    delete metadata.columnWidths;
    delete metadata.rowHeights;
    return metadata;
  } catch {
    return {};
  }
}

function normalizeUserStory(value: unknown): ServiceUserStory | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as { format?: unknown; content?: unknown };
  if (candidate.format !== "markdown") return undefined;
  if (typeof candidate.content === "string") {
    return { format: "markdown", content: candidate.content };
  }
  if (Array.isArray(candidate.content) && candidate.content.every((line) => typeof line === "string")) {
    return { format: "markdown", content: candidate.content.join("\n") };
  }
  return undefined;
}

function normalizePermissionMatrix(value: unknown): ServicePermissionMatrix | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as { format?: unknown; content?: unknown };
  if (candidate.format !== "markdown") return undefined;
  if (typeof candidate.content === "string") {
    return { format: "markdown", content: candidate.content };
  }
  if (Array.isArray(candidate.content) && candidate.content.every((line) => typeof line === "string")) {
    return { format: "markdown", content: candidate.content.join("\n") };
  }
  return undefined;
}

export function emptyDataTableDocument() {
  return `${JSON.stringify({
    version: "1.0",
    links: [],
    columns: defaultColumns,
    rows: [Array(defaultColumns.length).fill("")],
    columnWidths: defaultColumns.map(() => DEFAULT_COLUMN_WIDTH),
    rowHeights: [DEFAULT_ROW_HEIGHT],
  }, null, 2)}\n`;
}

function serializeTable(table: TableData, metadata: TableMetadata = {}) {
  return `${JSON.stringify({
    ...metadata,
    version: "1.0",
    columns: table.columns,
    rows: table.rows,
    columnWidths: table.columnWidths,
    rowHeights: table.rowHeights,
  }, null, 2)}\n`;
}

export function DataTableEditor({ path, value, onChange }: DataTableEditorProps) {
  const [table, setTable] = useState<TableData>(() => parseTableDocument(value));
  const [focusedCell, setFocusedCell] = useState<CellPosition>({ row: 0, column: 0 });
  const [resizeCursor, setResizeCursor] = useState<"col-resize" | "row-resize" | "">("");
  const tableRef = useRef(table);
  const resizeRef = useRef<ResizeState | null>(null);
  const metadata = useMemo(() => readTableMetadata(value), [value]);
  const metadataRef = useRef<TableMetadata>(metadata);

  // Detect citizen service definition if present in document metadata
  const citizenService = useMemo<CitizenServiceDefinition | null>(() => {
    if (metadata.request && typeof metadata.request === "object") {
      return metadata.request as CitizenServiceDefinition;
    }
    return null;
  }, [metadata]);

  const serviceSpecification = useMemo<ServiceSpecification | undefined>(() => {
    if (metadata.specification && typeof metadata.specification === "object") {
      return metadata.specification as ServiceSpecification;
    }
    if (metadata.request && typeof metadata.request === "object") {
      const req = metadata.request as Record<string, unknown>;
      if (req.specification && typeof req.specification === "object") {
        return req.specification as ServiceSpecification;
      }
    }
    return undefined;
  }, [metadata]);

  const isMergePropertiesRequest = citizenService?.id === "merge-properties"
    || metadata.serviceId === "merge-properties"
    || path.includes("طلب دمج عقارين");

  const userStory = useMemo<ServiceUserStory | undefined>(() => {
    const documentStory = normalizeUserStory(metadata.userStory);
    if (documentStory) return documentStory;
    const specificationStory = normalizeUserStory(serviceSpecification?.userStory);
    if (specificationStory) return specificationStory;
    if (metadata.request && typeof metadata.request === "object") {
      const request = metadata.request as Record<string, unknown>;
      const requestStory = normalizeUserStory(request.userStory);
      if (requestStory) return requestStory;
    }
    return isMergePropertiesRequest ? mergePropertiesUserStory : undefined;
  }, [isMergePropertiesRequest, metadata, serviceSpecification]);

  const hasUserStory = Boolean(userStory);

  const permissionMatrix = useMemo<ServicePermissionMatrix | undefined>(() => {
    const documentMatrix = normalizePermissionMatrix(metadata.permissionMatrix);
    if (documentMatrix) return documentMatrix;
    const specificationMatrix = normalizePermissionMatrix(serviceSpecification?.permissionMatrix);
    if (specificationMatrix) return specificationMatrix;
    if (metadata.request && typeof metadata.request === "object") {
      const request = metadata.request as Record<string, unknown>;
      const requestMatrix = normalizePermissionMatrix(request.permissionMatrix);
      if (requestMatrix) return requestMatrix;
    }
    return isMergePropertiesRequest ? mergePropertiesPermissionMatrix : undefined;
  }, [isMergePropertiesRequest, metadata, serviceSpecification]);

  const hasPermissionMatrix = Boolean(permissionMatrix);

  const actionPermissionMatrix = useMemo<ServicePermissionMatrix | undefined>(() => {
    const documentMatrix = normalizePermissionMatrix(metadata.actionPermissionMatrix);
    if (documentMatrix) return documentMatrix;
    const specificationMatrix = normalizePermissionMatrix(serviceSpecification?.actionPermissionMatrix);
    if (specificationMatrix) return specificationMatrix;
    if (metadata.request && typeof metadata.request === "object") {
      const request = metadata.request as Record<string, unknown>;
      const requestMatrix = normalizePermissionMatrix(request.actionPermissionMatrix);
      if (requestMatrix) return requestMatrix;
    }
    return isMergePropertiesRequest ? mergePropertiesActionMatrix : undefined;
  }, [isMergePropertiesRequest, metadata, serviceSpecification]);

  const hasActionPermissionMatrix = Boolean(actionPermissionMatrix);

  const [viewTab, setViewTab] = useState<"specification" | "user-story" | "permission-matrix" | "action-permission-matrix" | "table">(() => {
    return citizenService ? "specification" : "table";
  });

  useEffect(() => {
    metadataRef.current = metadata;
  }, [metadata]);

  useEffect(() => {
    tableRef.current = table;
  }, [table]);

  useEffect(() => {
    document.body.style.cursor = resizeCursor;
    document.body.style.userSelect = resizeCursor ? "none" : "";
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [resizeCursor]);

  useEffect(() => {
    function resize(event: PointerEvent) {
      const resizeState = resizeRef.current;
      if (!resizeState) return;

      const current = tableRef.current;
      const position = resizeState.type === "column" ? event.clientX : event.clientY;
      const direction = resizeState.type === "column" ? -1 : 1;
      const nextSize = boundedSize(
        resizeState.initialSize + (position - resizeState.startPosition) * direction,
        resizeState.initialSize,
        resizeState.type === "column" ? MIN_COLUMN_WIDTH : MIN_ROW_HEIGHT,
        resizeState.type === "column" ? MAX_COLUMN_WIDTH : MAX_ROW_HEIGHT,
      );

      const next = resizeState.type === "column"
        ? { ...current, columnWidths: current.columnWidths.map((width, index) => index === resizeState.index ? nextSize : width) }
        : { ...current, rowHeights: current.rowHeights.map((height, index) => index === resizeState.index ? nextSize : height) };
      tableRef.current = next;
      setTable(next);
      onChange(serializeTable(next, metadataRef.current));
    }

    function stopResize() {
      resizeRef.current = null;
      setResizeCursor("");
    }

    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stopResize);
    return () => {
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stopResize);
    };
  }, [onChange]);

  function updateTable(next: TableData) {
    const normalized = normalizeTable(next.columns, next.rows, next.columnWidths, next.rowHeights);
    tableRef.current = normalized;
    setTable(normalized);
    onChange(serializeTable(normalized, metadataRef.current));
  }

  function handleUpdateSpecification(newSpec: ServiceSpecification) {
    const updatedMetadata: TableMetadata = {
      ...metadataRef.current,
      specification: newSpec,
    };

    if (metadataRef.current.request && typeof metadataRef.current.request === "object") {
      const updatedRequest = { ...(metadataRef.current.request as Record<string, unknown>) };
      delete updatedRequest.specification;
      updatedMetadata.request = updatedRequest;
    }

    metadataRef.current = updatedMetadata;
    onChange(serializeTable(tableRef.current, updatedMetadata));
  }

  function handleUpdateUserStory(content: string) {
    const updatedStory: ServiceUserStory = { format: "markdown", content };
    const updatedMetadata: TableMetadata = {
      ...metadataRef.current,
      userStory: updatedStory,
    };

    if (metadataRef.current.specification && typeof metadataRef.current.specification === "object") {
      updatedMetadata.specification = {
        ...(metadataRef.current.specification as Record<string, unknown>),
        userStory: updatedStory,
      };
    }

    if (metadataRef.current.request && typeof metadataRef.current.request === "object") {
      updatedMetadata.request = {
        ...(metadataRef.current.request as Record<string, unknown>),
        userStory: updatedStory,
      };
    }

    metadataRef.current = updatedMetadata;
    onChange(serializeTable(tableRef.current, updatedMetadata));
  }

  function beginResize(event: ReactPointerEvent<HTMLButtonElement>, type: ResizeState["type"], index: number) {
    event.preventDefault();
    event.stopPropagation();
    resizeRef.current = {
      type,
      index,
      startPosition: type === "column" ? event.clientX : event.clientY,
      initialSize: type === "column" ? table.columnWidths[index] : table.rowHeights[index],
    };
    setResizeCursor(type === "column" ? "col-resize" : "row-resize");
  }

  function updateCell(row: number, column: number, valueToSet: string) {
    const rows = table.rows.map((current, rowIndex) => rowIndex === row ? current.map((cell, columnIndex) => columnIndex === column ? valueToSet : cell) : current);
    updateTable({ ...table, rows });
  }

  function addRow() {
    updateTable({ ...table, rows: [...table.rows, Array(table.columns.length).fill("")] });
    setFocusedCell({ row: table.rows.length, column: 0 });
  }

  function addColumn() {
    updateTable({
      ...table,
      columns: [...table.columns, `العمود ${table.columns.length + 1}`],
      rows: table.rows.map((row) => [...row, ""]),
    });
  }

  function removeRow(rowIndex: number) {
    updateTable({ ...table, rows: table.rows.filter((_, index) => index !== rowIndex), rowHeights: table.rowHeights.filter((_, index) => index !== rowIndex) });
  }

  function removeColumn(columnIndex: number) {
    if (table.columns.length === 1) return;
    updateTable({
      ...table,
      columns: table.columns.filter((_, index) => index !== columnIndex),
      rows: table.rows.map((row) => row.filter((_, index) => index !== columnIndex)),
      columnWidths: table.columnWidths.filter((_, index) => index !== columnIndex),
    });
  }

  function updateColumn(columnIndex: number, valueToSet: string) {
    updateTable({ ...table, columns: table.columns.map((column, index) => index === columnIndex ? valueToSet : column) });
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const pastedText = event.clipboardData.getData("text/plain");
    if (!pastedText.includes("\t") && !pastedText.includes("\n")) return;
    event.preventDefault();
    const matrix = splitDelimitedText(pastedText);
    if (!matrix.length) return;
    const start = focusedCell;
    const width = Math.max(table.columns.length, start.column + Math.max(...matrix.map((row) => row.length)));
    const rows = table.rows.map((row) => [...row, ...Array(Math.max(0, width - row.length)).fill("")]);
    while (rows.length < start.row + matrix.length) rows.push(Array(width).fill(""));
    matrix.forEach((row, rowOffset) => row.forEach((cell, columnOffset) => { rows[start.row + rowOffset][start.column + columnOffset] = cell; }));
    updateTable({
      ...table,
      columns: [...table.columns, ...Array(Math.max(0, width - table.columns.length)).fill("").map((_, index) => `العمود ${table.columns.length + index + 1}`)],
      rows,
    });
  }

  const tableWidth = 40 + table.columnWidths.reduce((total, width) => total + width, 0);

  return (
    <div className="official-data-table flex h-full min-h-0 flex-col bg-slate-100" dir="rtl" onPaste={handlePaste}>
      {/* Top Document Mode Navigation Bar */}
      {(citizenService || hasUserStory || hasPermissionMatrix || hasActionPermissionMatrix) && (
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-2 sm:px-3 shadow-2xs">
          <div className="inline-flex h-8 min-w-0 max-w-full items-center justify-start overflow-x-auto rounded-lg border border-slate-200/70 bg-slate-100/90 p-0.5 text-slate-500 select-none">
            {citizenService && (
              <button
                type="button"
                onClick={() => setViewTab("specification")}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 sm:px-2.5 text-[9px] sm:text-[10px] leading-none font-semibold transition-all whitespace-nowrap",
                  viewTab === "specification"
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-950 hover:bg-white/50"
                )}
              >
                <FileText size={13} className={viewTab === "specification" ? "text-[#8f733a]" : "text-slate-400"} />
                <span>التوصيف المنظم للطلب</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 font-mono text-[8.5px] sm:text-[9px] font-bold border transition-colors",
                    viewTab === "specification"
                      ? "bg-[#fbf7ee] text-[#8f733a] border-[#b49a63]/30"
                      : "bg-slate-200/70 text-slate-500 border-transparent"
                  )}
                >
                  مفصّل
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setViewTab("table")}
              className={cn(
                "inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 sm:px-2.5 text-[9px] sm:text-[10px] leading-none font-semibold transition-all whitespace-nowrap",
                viewTab === "table"
                  ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
                  : "text-slate-600 hover:text-slate-950 hover:bg-white/50"
              )}
            >
              <Table2 size={13} className={viewTab === "table" ? "text-emerald-600" : "text-slate-400"} />
              <span>جدول البيانات</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.2 font-mono text-[8.5px] sm:text-[9px] font-bold border transition-colors",
                  viewTab === "table"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                    : "bg-slate-200/70 text-slate-500 border-transparent"
                )}
              >
                {table.rows.length} صف
              </span>
            </button>

            {hasUserStory && (
              <button
                type="button"
                onClick={() => setViewTab("user-story")}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[9px] leading-none font-semibold transition-all sm:px-2.5 sm:text-[10px] whitespace-nowrap",
                  viewTab === "user-story"
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-950 hover:bg-white/50"
                )}
              >
                <ListChecks size={13} className={viewTab === "user-story" ? "text-[#8f733a]" : "text-slate-400"} />
                <span>قصة المستخدم</span>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.2 font-mono text-[8.5px] font-bold border transition-colors",
                    viewTab === "user-story"
                      ? "bg-[#fbf7ee] text-[#8f733a] border-[#b49a63]/30"
                      : "bg-slate-200/70 text-slate-500 border-transparent"
                  )}
                >
                  US-001
                </span>
              </button>
            )}

            {hasPermissionMatrix && (
              <button
                type="button"
                onClick={() => setViewTab("permission-matrix")}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[9px] leading-none font-semibold transition-all sm:px-2.5 sm:text-[10px] whitespace-nowrap",
                  viewTab === "permission-matrix"
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-950 hover:bg-white/50"
                )}
              >
                <ShieldCheck size={13} className={viewTab === "permission-matrix" ? "text-emerald-600" : "text-slate-400"} />
                <span className="hidden lg:inline">Full Permission Matrix</span>
                <span className="lg:hidden">الصلاحيات</span>
              </button>
            )}

            {hasActionPermissionMatrix && (
              <button
                type="button"
                onClick={() => setViewTab("action-permission-matrix")}
                className={cn(
                  "inline-flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-[9px] leading-none font-semibold transition-all sm:px-2.5 sm:text-[10px] whitespace-nowrap",
                  viewTab === "action-permission-matrix"
                    ? "bg-white text-slate-900 shadow-2xs border border-slate-200/80"
                    : "text-slate-600 hover:text-slate-950 hover:bg-white/50"
                )}
              >
                <ShieldCheck size={13} className={viewTab === "action-permission-matrix" ? "text-sky-600" : "text-slate-400"} />
                <span className="hidden xl:inline">CRUD / Action Matrix</span>
                <span className="xl:hidden">خصائص العمليات</span>
              </button>
            )}
          </div>

        </div>
      )}

      {/* Main View Area */}
      {citizenService && viewTab === "specification" ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <ServiceRequestDocumentView
            path={path}
            service={citizenService}
            specification={serviceSpecification}
            rawJson={value}
            onUpdateSpecification={handleUpdateSpecification}
          />
        </div>
      ) : viewTab === "user-story" && userStory ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <UserStoryDocumentView story={userStory} onChange={handleUpdateUserStory} />
        </div>
      ) : viewTab === "permission-matrix" && permissionMatrix ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <PermissionMatrixView matrix={permissionMatrix} />
        </div>
      ) : viewTab === "action-permission-matrix" && actionPermissionMatrix ? (
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <PermissionMatrixView
            matrix={actionPermissionMatrix}
            title="مصفوفة خصائص العمليات"
            subtitle="CRUD / Action Matrix"
            itemLabel="عملية"
            variant="action"
          />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
          {/* Table Header Controls */}
          <div className="flex shrink-0 items-center justify-between border-b border-slate-300 bg-white px-5 py-3">
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-[#8f733a]" />
                جدول البيانات والخصائص
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-slate-500" dir="ltr">{path}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addColumn}
                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-white px-3 py-1.5 font-sans text-xs font-bold text-slate-900 transition hover:bg-slate-100"
              >
                <Plus size={13} />
                عمود
              </button>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-slate-900 bg-slate-900 px-3 py-1.5 font-sans text-xs font-bold text-white transition hover:bg-slate-800"
              >
                <Plus size={13} />
                صف
              </button>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 border-b border-slate-300 bg-slate-100 px-5 py-2 text-xs font-medium text-slate-700">
            <ClipboardPaste size={14} className="text-[#8f733a]" />
            <span>يمكنك لصق خلايا من جدول Excel مباشرة داخل الجدول بالضغط على Ctrl + V</span>
            <span className="mr-auto font-mono text-[10px] text-slate-500">
              {table.rows.length} صف · {table.columns.length} أعمدة
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-auto p-5">
            <div className="w-max min-w-full overflow-hidden rounded-xl border-2 border-slate-900 bg-white shadow-md">
              <table className="table-fixed border-collapse text-right text-xs" dir="rtl" style={{ width: tableWidth }}>
                <colgroup>
                  {table.columnWidths.map((width, columnIndex) => (
                    <col key={`column-size-${columnIndex}`} style={{ width }} />
                  ))}
                  <col style={{ width: 40 }} />
                </colgroup>
                <thead>
                  <tr className="border-b-2 border-slate-900 bg-slate-100">
                    {table.columns.map((column, columnIndex) => (
                      <th
                        key={`column-${columnIndex}`}
                        className="border-b border-l border-slate-300 p-0"
                        style={{ width: table.columnWidths[columnIndex] }}
                      >
                        <div className="relative flex h-10 min-w-0 items-center">
                          <span className="w-9 shrink-0 border-l border-slate-300 px-2 py-2 text-center font-mono text-[10px] font-bold text-slate-500">
                            {String.fromCharCode(65 + columnIndex)}
                          </span>
                          <input
                            value={column}
                            onChange={(event) => updateColumn(columnIndex, event.target.value)}
                            className="min-w-0 flex-1 bg-transparent px-2 py-2 font-sans font-bold text-slate-900 outline-none focus:bg-slate-200"
                            aria-label={`اسم العمود ${columnIndex + 1}`}
                          />
                          <button
                            type="button"
                            onClick={() => removeColumn(columnIndex)}
                            className="mr-1 shrink-0 rounded p-1 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                            title="حذف العمود"
                          >
                            <Trash2 size={12} />
                          </button>
                          <button
                            type="button"
                            onPointerDown={(event) => beginResize(event, "column", columnIndex)}
                            className="absolute inset-y-0 left-0 z-20 w-2 cursor-col-resize touch-none bg-transparent transition hover:bg-slate-900"
                            aria-label={`تغيير عرض العمود ${columnIndex + 1}`}
                            title="اسحب لتغيير عرض العمود"
                          />
                        </div>
                      </th>
                    ))}
                    <th className="border-b border-slate-300 p-0" aria-label="إجراءات الصف" />
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rowIndex) => (
                    <tr
                      key={`row-${rowIndex}`}
                      className="group border-b border-slate-200 last:border-0 hover:bg-slate-50/80"
                      style={{ height: table.rowHeights[rowIndex] }}
                    >
                      {table.columns.map((_, columnIndex) => (
                        <td
                          key={`cell-${rowIndex}-${columnIndex}`}
                          className="border-l border-slate-200 p-0"
                          style={{ width: table.columnWidths[columnIndex] }}
                        >
                          <input
                            value={row[columnIndex] ?? ""}
                            onFocus={() => setFocusedCell({ row: rowIndex, column: columnIndex })}
                            onChange={(event) => updateCell(rowIndex, columnIndex, event.target.value)}
                            className="block h-full min-h-[28px] w-full min-w-0 bg-transparent px-2.5 py-2 text-slate-800 outline-none focus:bg-slate-100 focus:ring-1 focus:ring-inset focus:ring-slate-900"
                            aria-label={`الصف ${rowIndex + 1}، العمود ${columnIndex + 1}`}
                          />
                        </td>
                      ))}
                      <td className="relative w-10 p-1 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(rowIndex)}
                          className="rounded p-1 text-slate-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100"
                          title="حذف الصف"
                        >
                          <Trash2 size={12} />
                        </button>
                        <button
                          type="button"
                          onPointerDown={(event) => beginResize(event, "row", rowIndex)}
                          className="absolute inset-x-0 bottom-0 z-20 h-2 cursor-row-resize touch-none bg-transparent transition hover:bg-slate-900"
                          aria-label={`تغيير ارتفاع الصف ${rowIndex + 1}`}
                          title="اسحب لتغيير ارتفاع الصف"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={addRow}
              className="mt-4 flex items-center gap-1.5 rounded-lg border-2 border-dashed border-slate-300 px-3 py-2 font-sans text-xs font-bold text-slate-600 transition hover:border-slate-900 hover:bg-white hover:text-slate-900"
            >
              <Plus size={13} />
              إضافة صف جديد
            </button>
            <p className="mt-2 text-[10px] text-slate-400">
              اسحب الحد الأيسر من عنوان العمود لتغيير عرضه، أو الحد السفلي للصف لتغيير ارتفاعه.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
