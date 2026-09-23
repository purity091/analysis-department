"use client";

import { useMemo, useState } from "react";
import {
  Building2,
  FileText,
  Clock,
  Coins,
  ShieldCheck,
  Workflow,
  ChevronDown,
  ChevronUp,
  Search,
  Copy,
  ExternalLink,
  Layers,
  HelpCircle,
  Code,
  Check,
  Download,
  Sparkles,
  FileCheck,
  Compass,
  BookOpen,
  ArrowRight,
  Folder,
  FileJson,
  CheckCircle2,
  Hash,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import type { CitizenServiceDefinition, ServiceSpecification } from "@/domain/types";
import { citizenServiceSpecifications } from "@/lib/citizen-service-specifications";

interface ServiceRequestDocumentViewProps {
  path: string;
  service: CitizenServiceDefinition;
  specification?: ServiceSpecification;
  rawJson?: string;
  onUpdateSpecification?: (spec: ServiceSpecification) => void;
}

function createAssistantSkill(service: CitizenServiceDefinition, specification: ServiceSpecification, path: string, rawJson?: string) {
  let sourceDocument = rawJson?.trim() || "غير متاح";
  try {
    sourceDocument = JSON.stringify(JSON.parse(sourceDocument), null, 2);
  } catch {
    // Keep non-JSON source content as-is so no information is lost.
  }

  const completeRequest = JSON.stringify({ service, specification }, null, 2);
  return `---
name: urban-planning-${service.id}
description: مساعد متخصص لتحليل ومتابعة طلب ${service.name} ضمن دائرة التنظيم والتخطيط العمراني.
---

# مهارة متابعة طلب تنظيمي

أنت مساعد متخصص في تحليل الطلبات التنظيمية والعمرانية. استخدم المعلومات أدناه للإجابة بدقة، واذكر دائماً الافتراضات أو البيانات الناقصة، ولا تعتبر التحليل موافقة رسمية أو بديلاً عن قرار الجهة المختصة.

## المطلوب من المساعد

1. فهم حالة الطلب والهدف منه.
2. تلخيص المتطلبات والوثائق والمراحل بوضوح.
3. تحديد النواقص والتعارضات والمخاطر المحتملة.
4. اقتراح أسئلة متابعة عملية وخطوات تالية قابلة للتنفيذ.
5. الحفاظ على المصطلحات الرسمية وعدم اختراع معلومات غير موجودة.

## مصدر الملف

${path}

## البيانات الكاملة للطلب

\`\`\`json
${completeRequest}
\`\`\`

## محتوى المستند الأصلي

\`\`\`json
${sourceDocument}
\`\`\`

## صيغة الحوار المقترحة

ابدأ بملخص تنفيذي قصير، ثم اعرض: الحالة الحالية، المتطلبات، مراحل المعالجة، النواقص، المخاطر، وأسئلة المتابعة. اختم بخطوات عملية مرتبة وبصياغة واضحة.
`;
}

export function ServiceRequestDocumentView({
  path,
  service,
  specification: propSpec,
  rawJson,
  onUpdateSpecification,
}: ServiceRequestDocumentViewProps) {
  // Resolve specification with fallback
  const spec = useMemo<ServiceSpecification>(() => {
    return (
      propSpec ??
      service.specification ??
      citizenServiceSpecifications[service.id] ?? {
        serviceId: service.id,
        serviceCode: `SRV-${service.id.toUpperCase().slice(0, 7)}`,
        legalBasis: "ضابطة البناء العامة وقوانين الإدارة المحلية المعتمدة في مجلس مدينة حماة.",
        slaDays: 3,
        slaDescription: "1 - 3 أيام عمل رسمية من تاريخ القيد الرسمي للمعاملة.",
        businessGoal: service.description,
        targetBeneficiary: service.audience,
        digitalMaturityLevel: "إجراء هجين ورقي/رقمي",
        deliverableType: service.response,
        officialCertification: "رئيس دائرة التنظيم والتخطيط العمراني ومدير الشؤون الفنية.",
        fieldsDictionary: service.requiredFields.map((f, i) => ({
          name: f,
          key: `field_${i + 1}`,
          type: "string",
          required: true,
          description: `حقل مطلوب لمعالجة ${service.name}`,
        })),
        validationConstraints: [],
        attachmentsSpecification: service.attachments.map((att) => ({
          name: att,
          format: "PDF / JPEG",
          maxSize: "5MB",
          isRequired: true,
          purpose: "وثيقة إلزامية للتحقق من صحة الطلب",
          issuingAuthority: "الجهة الرسمية المختصة",
        })),
        edgeCasesAndReturns: (service.returnReasons ?? []).map((reason) => ({
          condition: reason,
          action: "إعادة الطلب لصاحب العلاقة أو الشعبة الفنية للاستكمال",
          returnCode: "ERR_RETURN_REASON",
        })),
        faqs: [],
      }
    );
  }, [propSpec, service]);

  const [faqSearch, setFaqSearch] = useState("");
  const [faqCategory, setFaqCategory] = useState<string>("all");
  const [expandedFaqs, setExpandedFaqs] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    if (spec.faqs[0]) initial[spec.faqs[0].id] = true;
    if (spec.faqs[1]) initial[spec.faqs[1].id] = true;
    return initial;
  });
  const [copiedCode, setCopiedCode] = useState(false);
  const [assistantStatus, setAssistantStatus] = useState<string | null>(null);
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");

  const filteredFaqs = useMemo(() => {
    return spec.faqs.filter((faq) => {
      const matchesSearch =
        faqSearch.trim() === "" ||
        faq.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
        faq.answer.toLowerCase().includes(faqSearch.toLowerCase());
      const matchesCat = faqCategory === "all" || faq.category === faqCategory;
      return matchesSearch && matchesCat;
    });
  }, [spec.faqs, faqSearch, faqCategory]);

  const toggleFaq = (id: string) => {
    setExpandedFaqs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyPayload = () => {
    if (spec.apiPayloadExample) {
      navigator.clipboard.writeText(spec.apiPayloadExample);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const openAssistant = () => {
    const skill = createAssistantSkill(service, spec, path, rawJson);
    const assistantWindow = window.open("https://chatgpt.com/", "_blank", "noopener,noreferrer");
    const clipboardWrite = navigator.clipboard?.writeText
      ? navigator.clipboard.writeText(skill)
      : Promise.reject(new Error("Clipboard API unavailable"));
    void clipboardWrite
      .then(() => {
        setAssistantStatus(assistantWindow ? "تم تجهيز السياق ونسخه — الصقه في ChatGPT" : "انسخ السياق وافتح ChatGPT يدوياً");
      })
      .catch(() => {
        setAssistantStatus(assistantWindow ? "تم فتح ChatGPT — تعذر النسخ التلقائي" : "افتح ChatGPT وانسخ ملف Skill");
      });
    window.setTimeout(() => setAssistantStatus(null), 5000);
  };

  const downloadSkill = () => {
    const skill = createAssistantSkill(service, spec, path, rawJson);
    const blob = new Blob([skill], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `skill-${service.id}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setAssistantStatus("تم تنزيل ملف Skill الخاص بالطلب");
    window.setTimeout(() => setAssistantStatus(null), 4000);
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const navItems = [
    { id: "overview", label: "1. الرؤية والأساس القانوني", icon: Compass, count: "نظرة عامة" },
    { id: "workflow", label: "2. مراحل التدفق الإجرائي", icon: Workflow, count: `${service.stages.length} مراحل` },
    { id: "schema", label: "3. قاموس البيانات والتحقق", icon: Layers, count: `${spec.fieldsDictionary.length} حقول` },
    { id: "quality", label: "4. ضوابط الجودة والاستثناءات", icon: ShieldCheck, count: `${spec.edgeCasesAndReturns.length} حالات` },
    { id: "faq", label: "5. بنك الأسئلة الشائعة والمعرفة", icon: HelpCircle, count: `${spec.faqs.length} سؤال` },
  ];

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-[#f8fafc] p-2.5 sm:p-3.5 md:p-4 font-sans text-slate-900 selection:bg-[#b49a63]/20 text-xs sm:text-sm" dir="rtl">
      <div className="mx-auto w-full max-w-6xl space-y-3 sm:space-y-3.5">
        {/* Document Header Hero Card (Sidebar Directorial Style) */}
        <div className="rounded-lg border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
          {/* Top Bar: Clean Identity & Action Tools */}
          <div className="flex h-11 sm:h-12 items-center justify-between border-b border-slate-200/80 bg-slate-50/70 px-3 sm:px-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="grid size-6 sm:size-7 shrink-0 place-items-center rounded-md border border-[#b49a63]/30 bg-[#fbf7ee] text-[#8f733a]">
                <Building2 size={14} />
              </span>
              <div className="min-w-0 truncate font-sans text-xs sm:text-sm font-bold text-slate-800" title={service.name}>
                {service.name}
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={openAssistant}
                className="h-7 sm:h-7.5 gap-1.5 border border-emerald-300/80 bg-emerald-50/70 px-2.5 text-[11px] sm:text-xs font-bold text-emerald-900 hover:border-emerald-400 hover:bg-emerald-100/80 shadow-2xs"
                title="يفتح ChatGPT وينسخ سياق الطلب الكامل إلى الحافظة"
              >
                <Sparkles size={12} className="text-emerald-700" />
                <span>متابعة مع ChatGPT</span>
                <ExternalLink size={10} className="text-emerald-600" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSkillDialogOpen(true)}
                className="h-7 sm:h-7.5 gap-1.5 border border-emerald-300/80 bg-emerald-50/70 px-2.5 text-[11px] sm:text-xs font-bold text-emerald-900 hover:border-emerald-400 hover:bg-emerald-100/80 hover:text-slate-950 shadow-2xs"
                title="تنزيل سياق الطلب كملف Skill بصيغة Markdown"
              >
                <Download size={12} />
                <span>تحميل Skill</span>
              </Button>
              {assistantStatus && (
                <span className="text-[10px] sm:text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 animate-in fade-in">
                  {assistantStatus}
                </span>
              )}
            </div>
          </div>

          <Dialog open={skillDialogOpen} onOpenChange={setSkillDialogOpen}>
            <DialogContent dir="rtl" className="max-w-[620px]">
              <div className="flex items-start gap-3 border-b border-slate-200 pb-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                  <Sparkles size={20} />
                </span>
                <div>
                  <DialogTitle className="text-lg font-bold text-slate-900">مهارة الذكاء الصنعي للطلب</DialogTitle>
                  <DialogDescription className="mt-1 text-right text-xs leading-6 text-slate-600">
                    ملف Markdown جاهز يعرّف أدوات الذكاء الصنعي بهذا الطلب ومعلوماته ومتطلباته.
                  </DialogDescription>
                </div>
              </div>

              <div className="mt-5 space-y-3 text-xs leading-6 text-slate-700">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="font-bold text-slate-900">ماذا تحتوي المهارة؟</p>
                  <p className="mt-1">تعليمات للتحليل، بيانات الطلب الكاملة، المتطلبات والمراحل، ومحتوى الملف الأصلي حتى يتمكن المساعد من الإجابة ضمن سياق الخدمة.</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="font-bold text-slate-900">كيفية استخدامها</p>
                  <ol className="mt-1 list-decimal space-y-1 pr-5">
                    <li>اضغط على «تحميل ملف المهارة» واحفظ ملف Markdown.</li>
                    <li>أرفق الملف في أداة الذكاء الصنعي أو انسخ محتواه إلى المحادثة.</li>
                    <li>اطلب من المساعد تحليل الطلب أو تلخيصه أو تحديد النواقص والأسئلة التالية.</li>
                  </ol>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap justify-start gap-2">
                <Button variant="outline" onClick={() => setSkillDialogOpen(false)}>إغلاق</Button>
                <Button variant="primary" onClick={downloadSkill}>
                  <Download size={14} />
                  تحميل Skill
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Service Title & Metadata Badges */}
          <div className="p-3 sm:p-4 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-slate-900 leading-snug">
                {service.name}
              </h1>
              <span className={cn(
                "rounded px-2 py-0.5 text-[10px] sm:text-xs font-bold border",
                service.kind === "service"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              )}>
                {service.kind === "service" ? "خدمة تنفيذية" : "استعلام تنظيمي"}
              </span>
              <span className="rounded border border-slate-200/90 bg-slate-50 px-2 py-0.5 text-[10px] sm:text-xs font-mono text-slate-600">
                {spec.digitalMaturityLevel}
              </span>
            </div>

            <p className="text-xs sm:text-[13px] md:text-sm leading-relaxed text-slate-600 max-w-4xl">
              {service.description}
            </p>
          </div>

          {/* KPI Mini-Cards Strip (Right Sidebar Style) */}
          <div className="border-t border-slate-100 bg-slate-50/60 p-2 sm:p-2.5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="flex items-center gap-2.5 rounded-md border border-slate-200/70 bg-white px-2.5 py-1.5 shadow-2xs">
                <span className="grid size-6 sm:size-7 shrink-0 place-items-center rounded-md border border-[#b49a63]/30 bg-[#fbf7ee] text-[#8f733a]">
                  <Clock size={13} />
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs text-slate-500 font-medium leading-none mb-1">زمن المعالجة (SLA)</div>
                  <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">1 - 3 أيام عمل</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-md border border-slate-200/70 bg-white px-2.5 py-1.5 shadow-2xs">
                <span className="grid size-6 sm:size-7 shrink-0 place-items-center rounded-md border border-[#b49a63]/30 bg-[#fbf7ee] text-[#8f733a]">
                  <Coins size={13} />
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs text-slate-500 font-medium leading-none mb-1">الرسوم المعتمدة</div>
                  <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                    {service.fee ? `${service.fee.amount} ${service.fee.currency}` : "9700 ليرة سورية قديمة"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-md border border-slate-200/70 bg-white px-2.5 py-1.5 shadow-2xs">
                <span className="grid size-6 sm:size-7 shrink-0 place-items-center rounded-md border border-[#b49a63]/30 bg-[#fbf7ee] text-[#8f733a]">
                  <Workflow size={13} />
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs text-slate-500 font-medium leading-none mb-1">مراحل التدفق</div>
                  <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">{service.stages.length} مراحل معتمدة</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 rounded-md border border-slate-200/70 bg-white px-2.5 py-1.5 shadow-2xs">
                <span className="grid size-6 sm:size-7 shrink-0 place-items-center rounded-md border border-[#b49a63]/30 bg-[#fbf7ee] text-[#8f733a]">
                  <Layers size={13} />
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] sm:text-xs text-slate-500 font-medium leading-none mb-1">حقول الإدخال</div>
                  <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">{spec.fieldsDictionary.length} حقول رئيسية</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Body Layout */}
        <div className="grid grid-cols-1 gap-2.5 sm:gap-3 lg:grid-cols-12">
          {/* Main Reading Stream (8 cols on lg) */}
          <div className="space-y-2.5 sm:space-y-3 lg:col-span-8">
            {/* Section 1: Overview & Framework */}
            <div id="overview" className="rounded-lg border border-slate-200/90 bg-white shadow-2xs overflow-hidden scroll-mt-3">
              <div className="flex h-10 sm:h-11 items-center justify-between border-b border-slate-200/80 bg-slate-50/70 px-3 sm:px-4">
                <div className="flex items-center gap-2 font-sans text-xs sm:text-sm font-bold tracking-tight text-slate-900">
                  <span className="grid size-6 place-items-center rounded-md border border-[#b49a63]/30 bg-[#fbf7ee] text-[#8f733a]">
                    <Compass size={13} />
                  </span>
                  <span>1. الرؤية والأساس التشغيلي والقانوني</span>
                </div>
                <span className="rounded-full bg-slate-200/70 px-2 py-0.5 font-mono text-[10px] sm:text-xs font-semibold text-slate-600">
                  نظرة عامة
                </span>
              </div>

              <div className="p-3 sm:p-4 space-y-2.5 text-xs sm:text-sm leading-relaxed">
                <div>
                  <h4 className="font-bold text-slate-800 mb-1 text-xs sm:text-sm">الهدف والوظيفة التشغيلية للطلب:</h4>
                  <p className="rounded-md bg-slate-50/80 p-2.5 sm:p-3 text-slate-700 border border-slate-100">
                    {spec.businessGoal}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-1 text-xs sm:text-sm">نطاق الاستخدام وحالات التطبيق:</h4>
                  <p className="rounded-md bg-slate-50/80 p-2.5 sm:p-3 text-slate-700 border border-slate-100">
                    {service.usage}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-slate-800 mb-1 text-xs sm:text-sm">الأساس التشريعي والمرجع القانوني:</h4>
                  <p className="rounded-md border border-[#b49a63]/30 bg-[#fbf7ee] p-2.5 sm:p-3 text-[#7a6231]">
                    {spec.legalBasis}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="rounded-md border border-slate-200/80 p-2.5 sm:p-3 bg-white shadow-2xs">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 block">المخرج الرسمي النهائي</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm mt-1 flex items-center gap-1.5">
                      <FileCheck size={14} className="text-emerald-600 shrink-0" />
                      {spec.deliverableType}
                    </span>
                  </div>

                  <div className="rounded-md border border-slate-200/80 p-2.5 sm:p-3 bg-white shadow-2xs">
                    <span className="text-[10px] sm:text-xs font-bold text-slate-500 block">سلسلة المصادقة والختم</span>
                    <span className="font-bold text-slate-900 text-xs sm:text-sm mt-1 block truncate">
                      {spec.officialCertification}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Workflow Stages */}
            <div id="workflow" className="rounded-lg border border-slate-200/90 bg-white shadow-2xs overflow-hidden scroll-mt-3">
              <div className="flex h-10 sm:h-11 items-center justify-between border-b border-slate-200/80 bg-slate-50/70 px-3 sm:px-4">
                <div className="flex items-center gap-2 font-sans text-xs sm:text-sm font-bold tracking-tight text-slate-900">
                  <span className="grid size-6 place-items-center rounded-md border border-[#b49a63]/30 bg-[#fbf7ee] text-[#8f733a]">
                    <Workflow size={13} />
                  </span>
                  <span>2. مراحل التدفق الإجرائي</span>
                </div>
                <span className="rounded-full bg-slate-200/70 px-2 py-0.5 font-mono text-[10px] sm:text-xs font-semibold text-slate-600">
                  {service.stages.length} مراحل
                </span>
              </div>

              <div className="p-3 sm:p-4 space-y-1.5">
                {service.stages.map((stage, idx) => {
                  const isLast = idx === service.stages.length - 1;
                  return (
                    <div
                      key={stage.order}
                      className="flex items-start gap-2.5 rounded-md border border-slate-200/70 bg-white p-2 sm:p-2.5 transition-colors hover:bg-slate-50/70"
                    >
                      <div className="flex size-5 sm:size-6 shrink-0 items-center justify-center rounded-md bg-slate-900 font-mono text-[11px] sm:text-xs font-bold text-white shadow-2xs">
                        {stage.order}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm">{stage.name}</span>
                          <span className="rounded border border-slate-200/80 bg-slate-50 px-1.5 py-0.5 text-[9.5px] sm:text-[10.5px] font-normal text-slate-600">
                            {idx === 0 ? "استلام وقيد" : isLast ? "اعتماد نهائي" : "معالجة وتدقيق"}
                          </span>
                        </div>
                        <div className="mt-1 text-xs sm:text-[12.5px] text-slate-600">
                          <span className="text-slate-500">الجهة المسؤولة: </span>
                          <span className="font-semibold text-slate-800">{stage.owner}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 3: Data Dictionary & Validation */}
            <div id="schema" className="rounded-lg border border-slate-200/90 bg-white shadow-2xs overflow-hidden scroll-mt-3">
              <div className="flex h-10 sm:h-11 items-center justify-between border-b border-slate-200/80 bg-slate-50/70 px-3 sm:px-4">
                <div className="flex items-center gap-2 font-sans text-xs sm:text-sm font-bold tracking-tight text-slate-900">
                  <span className="grid size-6 place-items-center rounded-md border border-[#b49a63]/30 bg-[#fbf7ee] text-[#8f733a]">
                    <Layers size={13} />
                  </span>
                  <span>3. قاموس البيانات وقواعد التحقق البرمجية</span>
                </div>
                <span className="rounded-full bg-slate-200/70 px-2 py-0.5 font-mono text-[10px] sm:text-xs font-semibold text-slate-600">
                  {spec.fieldsDictionary.length} حقول
                </span>
              </div>

              <div className="p-3 sm:p-4 space-y-3">
                {/* Data Dictionary Table */}
                <div className="overflow-x-auto rounded-md border border-slate-200/80 bg-white">
                  <table className="min-w-[480px] w-full text-right text-xs sm:text-[13px]">
                    <thead className="border-b border-slate-200/80 bg-slate-50/80 text-xs sm:text-[12.5px] font-bold text-slate-700">
                      <tr>
                        <th className="px-3 py-2">اسم الحقل</th>
                        <th className="px-3 py-2">المعرف البرمجي</th>
                        <th className="px-3 py-2">النوع</th>
                        <th className="px-3 py-2">الإلزام</th>
                        <th className="px-3 py-2">قاعدة التحقق والوصف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {spec.fieldsDictionary.map((field) => (
                        <tr key={field.key} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-3 py-2 font-bold text-slate-900">{field.name}</td>
                          <td className="px-3 py-2 font-mono text-[11px] sm:text-xs text-slate-600" dir="ltr">
                            {field.key}
                          </td>
                          <td className="px-3 py-2">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] sm:text-[11px] text-slate-700 border border-slate-200">
                              {field.type}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            {field.required ? (
                              <Badge variant="destructive" className="text-[10px] sm:text-[11px] px-2 py-0.5 font-medium">
                                إلزامي
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] sm:text-[11px] px-2 py-0.5 font-medium">
                                اختياري
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-600 text-xs sm:text-[12.5px]">
                            {field.validationRule ?? field.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Validation Constraints */}
                {spec.validationConstraints.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm">شروط ومحددات الاعتماد الأساسية:</h4>
                    <div className="space-y-1.5">
                      {spec.validationConstraints.map((constraint, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "rounded-md border p-2.5 sm:p-3 text-xs sm:text-[13px]",
                            constraint.severity === "error"
                              ? "border-rose-200 bg-rose-50/40 text-rose-950"
                              : "border-amber-200 bg-amber-50/40 text-amber-950"
                          )}
                        >
                          <div className="flex items-center justify-between font-bold">
                            <span>{constraint.rule}</span>
                            <span
                              className={cn(
                                "rounded px-2 py-0.5 text-[10px] sm:text-xs border font-bold",
                                constraint.severity === "error"
                                  ? "border-rose-300 text-rose-700 bg-white"
                                  : "border-amber-300 text-amber-700 bg-white"
                              )}
                            >
                              {constraint.severity === "error" ? "شرط مانع" : "ملاحظة تدقيق"}
                            </span>
                          </div>
                          <p className="mt-1 text-xs sm:text-[12.5px] leading-relaxed text-slate-600">
                            {constraint.rationale}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attachments Spec */}
                <div className="space-y-1.5 pt-1">
                  <h4 className="font-bold text-slate-800 text-xs sm:text-sm">المرفقات والوثائق المطلوبة:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {spec.attachmentsSpecification.map((att, idx) => (
                      <div key={idx} className="rounded-md border border-slate-200/80 p-2.5 sm:p-3 bg-white text-xs sm:text-[13px]">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-slate-900">{att.name}</span>
                          <span className="font-mono text-[10px] sm:text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 shrink-0" dir="ltr">
                            {att.format}
                          </span>
                        </div>
                        <div className="mt-1 space-y-0.5 text-[11px] sm:text-xs text-slate-600">
                          <div><span className="text-slate-500">الغاية:</span> {att.purpose}</div>
                          <div><span className="text-slate-500">الجهة:</span> {att.issuingAuthority}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 4: Edge Cases & Quality Control */}
            <div id="quality" className="rounded-lg border border-slate-200/90 bg-white shadow-2xs overflow-hidden scroll-mt-3">
              <div className="flex h-10 sm:h-11 items-center justify-between border-b border-slate-200/80 bg-slate-50/70 px-3 sm:px-4">
                <div className="flex items-center gap-2 font-sans text-xs sm:text-sm font-bold tracking-tight text-slate-900">
                  <span className="grid size-6 place-items-center rounded-md border border-[#b49a63]/30 bg-[#fbf7ee] text-[#8f733a]">
                    <ShieldCheck size={13} />
                  </span>
                  <span>4. ضوابط الجودة ومعالجة الاستثناءات</span>
                </div>
                <span className="rounded-full bg-slate-200/70 px-2 py-0.5 font-mono text-[10px] sm:text-xs font-semibold text-slate-600">
                  {spec.edgeCasesAndReturns.length} حالات
                </span>
              </div>

              <div className="p-3 sm:p-4 space-y-3">
                <div className="overflow-x-auto rounded-md border border-slate-200/80 bg-white">
                  <table className="min-w-[480px] w-full text-right text-xs sm:text-[13px]">
                    <thead className="border-b border-slate-200/80 bg-slate-50/80 text-xs sm:text-[12.5px] font-bold text-slate-700">
                      <tr>
                        <th className="px-3 py-2">الحالة الاستثنائية / التعارض</th>
                        <th className="px-3 py-2">الإجراء النظامي المعتمد</th>
                        <th className="px-3 py-2">رمز الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {spec.edgeCasesAndReturns.map((edge, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-3 py-2 font-bold text-slate-900">{edge.condition}</td>
                          <td className="px-3 py-2 text-slate-600 text-xs sm:text-[12.5px]">{edge.action}</td>
                          <td className="px-3 py-2">
                            <span className="font-mono text-[10px] sm:text-[11px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 border border-slate-200" dir="ltr">
                              {edge.returnCode ?? "ERR_GENERAL"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* API Payload Example */}
                {spec.apiPayloadExample && (
                  <div className="rounded-md border border-slate-800 bg-slate-900 p-3 text-slate-100">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <span className="font-mono text-xs sm:text-[13px] text-slate-300 flex items-center gap-2">
                        <Code size={13} className="text-emerald-400" />
                        عقد التكامل البرمجي (Payload Contract)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={copyPayload}
                        className="h-6 text-slate-300 hover:text-white hover:bg-slate-800 text-[11px] sm:text-xs px-2"
                      >
                        {copiedCode ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        {copiedCode ? "تم النسخ" : "نسخ JSON"}
                      </Button>
                    </div>
                    <pre
                      className="mt-2 overflow-x-auto text-xs sm:text-[12.5px] font-mono leading-relaxed text-emerald-300 max-h-56 p-1"
                      dir="ltr"
                    >
                      {spec.apiPayloadExample}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Section 5: Knowledge Base / FAQ */}
            <div id="faq" className="rounded-lg border border-slate-200/90 bg-white shadow-2xs overflow-hidden scroll-mt-3">
              <div className="flex h-10 sm:h-11 items-center justify-between border-b border-slate-200/80 bg-slate-50/70 px-3 sm:px-4">
                <div className="flex items-center gap-2 font-sans text-xs sm:text-sm font-bold tracking-tight text-slate-900">
                  <span className="grid size-6 place-items-center rounded-md border border-[#b49a63]/30 bg-[#fbf7ee] text-[#8f733a]">
                    <HelpCircle size={13} />
                  </span>
                  <span>5. بنك الأسئلة الشائعة والمعرفة</span>
                </div>
                <span className="rounded-full bg-slate-200/70 px-2 py-0.5 font-mono text-[10px] sm:text-xs font-semibold text-slate-600">
                  {spec.faqs.length} سؤال
                </span>
              </div>

              <div className="p-3 sm:p-4 space-y-2.5">
                {/* Search & Category Filter (Sidebar search input design) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1 w-full">
                    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1 text-slate-500 focus-within:border-[#8f733a] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#b49a63]/20 transition-all">
                      <Search size={13} className="shrink-0 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="بحث وتصفية الأسئلة الشائعة..."
                        value={faqSearch}
                        onChange={(e) => setFaqSearch(e.target.value)}
                        className="h-6 border-0 bg-transparent p-0 text-xs sm:text-[13px] shadow-none focus-visible:ring-0 placeholder:text-slate-400"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                    {[
                      { key: "all", label: "الكل" },
                      { key: "إداري وتشغيلي", label: "إداري" },
                      { key: "تقني ونموذج البيانات", label: "تقني" },
                      { key: "مالي وقانوني", label: "مالي/قانوني" },
                      { key: "إجراءات واعتمادات", label: "إجراءات" },
                    ].map((cat) => (
                      <button
                        key={cat.key}
                        type="button"
                        onClick={() => setFaqCategory(cat.key)}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-[10px] sm:text-xs font-semibold transition-all shrink-0",
                          faqCategory === cat.key
                            ? "bg-slate-900 text-white shadow-2xs"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* FAQ Items */}
                <div className="space-y-1.5 pt-1">
                  {filteredFaqs.length === 0 ? (
                    <div className="rounded-md border border-dashed border-slate-200 p-4 text-center text-xs sm:text-sm text-slate-500">
                      لا توجد أسئلة شائعة مطابقة للبحث.
                    </div>
                  ) : (
                    filteredFaqs.map((faq) => {
                      const isExpanded = expandedFaqs[faq.id] ?? false;
                      return (
                        <div
                          key={faq.id}
                          className="rounded-md border border-slate-200/80 bg-white transition-all hover:border-slate-300"
                        >
                          <button
                            type="button"
                            onClick={() => toggleFaq(faq.id)}
                            className="flex w-full items-center justify-between gap-2 p-2.5 sm:p-3 text-right hover:bg-slate-50/60 transition-colors"
                          >
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {faq.question}
                            </span>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9.5px] sm:text-[10.5px] text-slate-500 font-normal">
                                {faq.category}
                              </span>
                              {isExpanded ? (
                                <ChevronUp size={13} className="text-slate-400" />
                              ) : (
                                <ChevronDown size={13} className="text-slate-400" />
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t border-slate-100 bg-slate-50/50 p-3 text-xs sm:text-[13px] leading-relaxed text-slate-700">
                              <p>{faq.answer}</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar-Inspired Navigation Rail (4 cols on lg) */}
          <div className="space-y-2.5 sm:space-y-3 lg:col-span-4">
            {/* Table of Contents Sticky Jump Menu */}
            <div className="lg:sticky lg:top-3 rounded-lg border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
              <div className="flex h-10 sm:h-11 items-center justify-between border-b border-slate-200/80 bg-slate-50/70 px-3 sm:px-4">
                <div className="flex items-center gap-2 font-sans text-xs sm:text-sm font-bold tracking-tight text-slate-900">
                  <span className="grid size-6 place-items-center rounded-md border border-[#b49a63]/30 bg-[#fbf7ee] text-[#8f733a]">
                    <BookOpen size={13} />
                  </span>
                  <span>فهرس وثيقة الطلب</span>
                </div>
                <span className="text-[10px] sm:text-xs font-mono text-slate-500">
                  5 أقسام
                </span>
              </div>

              {/* Jump Tree Rows (Compact, Proportional, Right Sidebar Style) */}
              <div className="p-2 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollToSection(item.id)}
                      className={cn(
                        "group flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-right font-sans text-xs sm:text-[13px] transition-all",
                        isActive
                          ? "bg-[#fbf7ee] text-[#7a6231] font-bold border-r-2 border-[#b49a63] shadow-2xs"
                          : "text-slate-700 hover:bg-slate-100/80 hover:text-slate-950"
                      )}
                    >
                      <Icon size={13} className={isActive ? "text-[#8f733a]" : "text-slate-400 group-hover:text-slate-600"} />
                      <span className="truncate flex-1">{item.label}</span>
                      <span className="font-mono text-[9.5px] sm:text-[10.5px] text-slate-400 group-hover:text-slate-600 shrink-0">{item.count}</span>
                    </button>
                  );
                })}

                <Separator className="my-2 bg-slate-100" />

                {/* Quick Service Meta Box */}
                <div className="space-y-1.5 px-2 py-1 text-xs sm:text-[12.5px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">المديرية:</span>
                    <span className="font-semibold text-slate-800 truncate">{service.directorate}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">الدائرة:</span>
                    <span className="font-semibold text-slate-800 truncate">{service.department}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">الوحدة:</span>
                    <span className="font-semibold text-slate-800 truncate">{service.unit}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">القناة:</span>
                    <span className="font-semibold text-slate-800 truncate">{service.channel}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">الأولوية:</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono font-bold text-slate-700 border border-slate-200/70 text-[10px] sm:text-xs">
                      {service.priority}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
