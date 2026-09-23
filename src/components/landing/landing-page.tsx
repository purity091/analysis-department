"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Layers3,
  ArrowLeft,
  ArrowRight,
  Compass,
  Building2,
  Table2,
  GitBranch,
  FileCode2,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Database,
  ExternalLink,
  ChevronLeft,
  Check,
  FolderGit2,
  Terminal,
  Activity,
  Package,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { APP_VERSION } from "@/lib/app-version";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PlatformTourModal } from "@/components/workspace/platform-tour-modal";

const FEATURE_HIGHLIGHTS = [
  {
    icon: Building2,
    title: "توصيف منظم لطلبات المواطنين",
    tag: "هندسة المتطلبات",
    description:
      "توصيف شامل لخدمات قسم التنظيم والتخطيط العمراني يجيب عن كافة الأسئلة التشغيلية والفنية للمدير والمطورين في قالب قراءة واضح وسهل الفهم.",
  },
  {
    icon: Table2,
    title: "محرر بيانات وجداول متطور",
    tag: "Spreadsheet & JSON",
    description:
      "تحرير مزدوج يجمع بين التوصيف التفصيلي وجداول البيانات، مع إمكانية النسخ واللصق من Excel وحفظ التعديلات في ملفات JSON مباشرة.",
  },
  {
    icon: GitBranch,
    title: "مزامنة لحظية مع GitHub",
    tag: "DevOps & CI/CD",
    description:
      "تخزين كافة الملفات والمواصفات والجداول في ملفات JSON قياسية في المستودع، مع دعم الـ Commits المباشرة وتتبع التعديلات.",
  },
  {
    icon: ShieldCheck,
    title: "قاموس بيانات وقواعد تحقق صارمة",
    tag: "Data Dictionary",
    description:
      "تحديد دقيق لأنواع البيانات، القيود، تعبيرات Regex، وشروط المرفقات الاستثنائية لضمان عدم قبول أي مدخلات خاطئة.",
  },
  {
    icon: Sparkles,
    title: "تجربة مستخدم Shadcn UI نقية",
    tag: "Modern UX",
    description:
      "واجهة عربية أنيقة بخط IBM Plex Sans Arabic، تدرجات رسمية راقية تجمع بين الأخضر المؤسسي والذهبي الهادئ، وفهرس تنقل ذكي.",
  },
];

const CITIZEN_SERVICES = [
  { id: "site-plan", name: "طلب مخطط موقع عام", category: "مخططات وموافقات", sla: "1 - 3 أيام عمل", fee: "9700 ليرة سورية قديمة" },
  { id: "building-license", name: "طلب ترخيص بناء جديد", category: "تراخيص إنشائية", sla: "1 - 3 أيام عمل", fee: "9700 ليرة سورية قديمة" },
  { id: "property-subdivision", name: "طلب فرز وتقسيم عقار", category: "شؤون الأراضي", sla: "1 - 3 أيام عمل", fee: "9700 ليرة سورية قديمة" },
  { id: "license-amendment", name: "طلب تعديل ترخيص قائم", category: "تعديل تراخيص", sla: "1 - 3 أيام عمل", fee: "9700 ليرة سورية قديمة" },
  { id: "demolition-permit", name: "طلب رخصة هدم", category: "سلامة وإنشاءات", sla: "1 - 3 أيام عمل", fee: "9700 ليرة سورية قديمة" },
  { id: "building-completion", name: "طلب شهادة إتمام بناء", category: "مطابقة وجودة", sla: "1 - 3 أيام عمل", fee: "9700 ليرة سورية قديمة" },
  { id: "occupancy-permit", name: "طلب تصريح إشغال عقار", category: "إشغال وتشغيل", sla: "1 - 3 أيام عمل", fee: "9700 ليرة سورية قديمة" },
  { id: "regulatory-compliance", name: "طلب مطابقة تنظيمية وتراخيص تجارية", category: "أنشطة وتجارة", sla: "1 - 3 أيام عمل", fee: "9700 ليرة سورية قديمة" },
];

const FAQ_ITEMS = [
  {
    q: "كيف تساعد المنصة كلاً من مدير قسم التحليل وفريق البرمجة؟",
    a: "توفر المنصة صفحة 'توصيف منظم' لكل خدمة تجيب عن الجوانب التشغيلية (الرسوم، المدد، التشريعات، الشركاء) والجوانب الفنية (قاموس الحقول، قواعد التحقق، صيغ المرفقات، وحالات الاستثناء) دون فصل أو تعقيد.",
  },
  {
    q: "أين يتم حفظ التعديلات والبيانات؟",
    a: "تُحفظ كافة التوصيفات وجداول البيانات كملفات JSON مهيكلة داخل مستودع المشروع، وتُرفع مباشرة إلى GitHub عبر زر الحفظ.",
  },
  {
    q: "كيف أبدأ استخدام المنصة أو أقوم بجولة داخلها؟",
    a: "يمكنك الضغط على زر 'الدخول إلى لوحة التحكم' للبدء فوراً، أو النقر على زر 'جولة في المنصة' لاستكشاف كافة الميزات خطوة بخطوة.",
  },
];

export function LandingPage() {
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<"spec" | "table" | "git">("spec");

  return (
    <div className="min-h-screen bg-[#faf8f5] text-slate-900" dir="rtl">
      {/* Top Floating Navbar */}
      <header className="sticky top-0 z-40 border-b border-[#002d29]/20 bg-[#002d29] px-4 py-3 shadow-md backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl border border-white/20 bg-[#b49a63] text-slate-950 font-bold shadow-xs">
              <Package size={20} strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-sans text-sm font-bold text-white">Analysis Department OS</div>
              <div className="text-[10px] text-[#d8c9a5]">قسم فريق تحليل المشاريع</div>
            </div>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-xs font-semibold text-slate-200 transition-colors hover:text-white">
              المميزات والحلول
            </a>
            <a href="#preview" className="text-xs font-semibold text-slate-200 transition-colors hover:text-white">
              استعراض المنصة
            </a>
            <a href="#services" className="text-xs font-semibold text-slate-200 transition-colors hover:text-white">
              طلبات المواطنين
            </a>
            <a href="#faq" className="text-xs font-semibold text-slate-200 transition-colors hover:text-white">
              الأسئلة الشائعة
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsTourOpen(true)}
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white text-xs gap-1.5"
            >
              <Compass size={14} className="text-[#e0c98d]" />
              جولة في المنصة
            </Button>

            <Link href="/workspace">
              <Button
                variant="primary"
                size="sm"
                className="bg-[#b49a63] hover:bg-[#a38a53] text-slate-950 font-bold border-[#b49a63] gap-1.5 shadow-sm"
              >
                الدخول إلى لوحة التحكم
                <ArrowLeft size={14} />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-gradient-to-b from-[#002d29] via-[#003b36] to-[#004d46] px-4 pt-16 pb-24 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(180,154,99,0.15),transparent_50%)] pointer-events-none" />

        <div className="relative mx-auto max-w-5xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-3.5 py-1.5 text-xs font-medium text-[#e0c98d] shadow-sm backdrop-blur-md">
            <Sparkles size={14} className="text-[#e0c98d]" />
            <span>المنظومة الموحدة لهندسة المتطلبات والمخططات المعمارية</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-white leading-tight">
            كل ما يحتاجه فريق تحليل المشاريع والمهندسين، في مكان واحد.
          </h1>

          <p className="mx-auto max-w-3xl text-sm leading-relaxed text-slate-200 sm:text-base">
            بيئة عمل متقدمة تجمع بين التوصيف المنظم للخدمات الحكومية والبلدية، المخططات المعمارية التفاعلية
            وقواميس البيانات الموثوقة مع الحفظ والمزامنة المباشرة في مستودعات GitHub.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/workspace">
              <Button
                size="md"
                className="h-11 px-6 text-sm font-bold bg-[#b49a63] hover:bg-[#9e844b] text-slate-950 border-0 shadow-lg shadow-black/25 gap-2"
              >
                <Package size={18} />
                فتح لوحة التحكم الآن
                <ArrowLeft size={16} />
              </Button>
            </Link>

            <Button
              size="md"
              variant="outline"
              onClick={() => setIsTourOpen(true)}
              className="h-11 px-5 text-sm font-semibold border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white gap-2 shadow-sm"
            >
              <Compass size={18} className="text-[#e0c98d]" />
              بدء الجولة التفاعلية
            </Button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mx-auto mt-12 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 pt-6">
            <div className="rounded-xl border border-white/15 bg-white/[0.07] p-4 text-center backdrop-blur-xs">
              <div className="font-mono text-2xl font-bold text-[#e0c98d]">8+</div>
              <div className="text-xs text-slate-300 mt-0.5">خدمات تنظيمية موصّفة</div>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/[0.07] p-4 text-center backdrop-blur-xs">
              <div className="font-mono text-2xl font-bold text-[#e0c98d]">5+</div>
              <div className="text-xs text-slate-300 mt-0.5">أنواع مخططات معمارية</div>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/[0.07] p-4 text-center backdrop-blur-xs">
              <div className="font-mono text-2xl font-bold text-[#e0c98d]">100%</div>
              <div className="text-xs text-slate-300 mt-0.5">تكامل JSON مع GitHub</div>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/[0.07] p-4 text-center backdrop-blur-xs">
              <div className="font-mono text-2xl font-bold text-[#e0c98d]">0</div>
              <div className="text-xs text-slate-300 mt-0.5">فجوة بين التحليل والبرمجة</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Platform Preview Section */}
      <section id="preview" className="px-4 py-16">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="text-center space-y-2">
            <Badge variant="secondary" className="bg-[#f5efe2] text-[#7a6231] border-[#b49a63]/30">
              واجهة العمل الموحدة
            </Badge>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">استعراض مباشر لقدرات المنصة</h2>
            <p className="text-xs text-slate-600 sm:text-sm">
              تنقل بين مختلف أنماط العمل واستكشف كيف تجعل المنصة هندسة النظم وتوثيق الخدمات أكثر سهولة.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setActivePreviewTab("spec")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                activePreviewTab === "spec"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <Building2 size={14} />
              التوصيف المنظم للطلب (Shadcn View)
            </button>

            <button
              type="button"
              onClick={() => setActivePreviewTab("table")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                activePreviewTab === "table"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <FileSpreadsheet size={14} />
              جدول البيانات وقاموس الحقول
            </button>

            <button
              type="button"
              onClick={() => setActivePreviewTab("git")}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                activePreviewTab === "git"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
              }`}
            >
              <GitBranch size={14} />
              سجل التغييرات ومزامنة GitHub
            </button>
          </div>

          {/* Interactive Screen Preview Box */}
          <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-xl">
            {/* Fake Mac/Browser Top bar */}
            <div className="flex h-9 items-center justify-between border-b border-slate-200 bg-slate-100 px-4">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-rose-400" />
                <span className="size-2.5 rounded-full bg-amber-400" />
                <span className="size-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="font-mono text-[11px] text-slate-500">
                {activePreviewTab === "spec" && "قسم التنظيم والتخطيط العمراني / طلب ترخيص بناء جديد.json [التوصيف المنظم]"}
                {activePreviewTab === "table" && "قسم التنظيم والتخطيط العمراني / طلب مخطط موقع عام.json [جدول البيانات]"}
                {activePreviewTab === "git" && "GitHub Commits & Workspace Synchronizer"}
              </div>
              <Link href="/workspace" className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1">
                فتح مباشر <ExternalLink size={11} />
              </Link>
            </div>

            {/* Preview Body */}
            <div className="p-6 bg-slate-50 min-h-[380px]">
              {activePreviewTab === "spec" && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                          02
                        </span>
                        <h4 className="font-bold text-slate-900 text-base">طلب ترخيص بناء جديد (Building License)</h4>
                      </div>
                      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 text-[10px]">
                        1 - 3 أيام عمل · 9700 ليرة سورية قديمة
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      إصدار رخصة بناء إنشائية ومعمارية معتمدة لإقامة مبنى سكني أو تجاري وفق ضابطة البناء العامة السورية والمخطط التنظيمي المعتمد لمدينة حماة.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
                      <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        الإطار القانوني والتشريعي
                      </div>
                      <p className="text-[10px] text-slate-500">قانون البناء السوري وضابطة البناء العامة والقرارات التنظيمية المعتمدة لدى مجلس مدينة حماة.</p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
                      <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-blue-600" />
                        المسار الإجرائي (Workflow)
                      </div>
                      <p className="text-[10px] text-slate-500">تقديم الطلب ← تدقيق المخططات ← دفع الرسوم ← اعتماد الرخصة.</p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
                      <div className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-amber-600" />
                        قاموس الحقول (Data Dictionary)
                      </div>
                      <p className="text-[10px] text-slate-500">رقم الصك، رقم القطعة، إجمالي المساحة، وشهادة فحص التربة.</p>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewTab === "table" && (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold">
                        <tr>
                          <th className="p-2.5">اسم الحقل البرمجي</th>
                          <th className="p-2.5">العنوان بالعربية</th>
                          <th className="p-2.5">نوع البيانات</th>
                          <th className="p-2.5">إجباري</th>
                          <th className="p-2.5">قاعدة التحقق</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        <tr>
                          <td className="p-2.5 font-mono text-[11px] text-blue-600">parcel_number</td>
                          <td className="p-2.5 font-semibold">رقم قطعة الأرض</td>
                          <td className="p-2.5 font-mono text-[10px]">string</td>
                          <td className="p-2.5"><Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-[10px]">نعم</Badge></td>
                          <td className="p-2.5 text-slate-500 font-mono text-[10px]">Regex: ^[0-9]{'{1,6}'}$</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-mono text-[11px] text-blue-600">total_area_sqm</td>
                          <td className="p-2.5 font-semibold">المساحة الإجمالية (م²)</td>
                          <td className="p-2.5 font-mono text-[10px]">number</td>
                          <td className="p-2.5"><Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-[10px]">نعم</Badge></td>
                          <td className="p-2.5 text-slate-500 text-[11px]">الحد الأدنى 50 م²</td>
                        </tr>
                        <tr>
                          <td className="p-2.5 font-mono text-[11px] text-blue-600">deed_document</td>
                          <td className="p-2.5 font-semibold">صك الملكية الإلكتروني</td>
                          <td className="p-2.5 font-mono text-[10px]">file</td>
                          <td className="p-2.5"><Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-[10px]">نعم</Badge></td>
                          <td className="p-2.5 text-slate-500 text-[11px]">PDF (الحد الأقصى 10MB)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activePreviewTab === "git" && (
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <GitBranch size={16} className="text-[#e0c98d]" />
                      <span>سجل التعديلات المباشر (GitHub Commits)</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500">lahlahai/Analysis-Department-OS</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs">
                      <div>
                        <div className="font-bold text-slate-900">تحديث توصيف طلب ترخيص البناء الجديد</div>
                        <div className="text-[10px] text-slate-500">Mohamed Lahlah · قبل 15 دقيقة</div>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px]">#7a38f2</Badge>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-xs">
                      <div>
                        <div className="font-bold text-slate-900">إضافة قاموس الحقول لطلب فرز الأراضي</div>
                        <div className="text-[10px] text-slate-500">Mohamed Lahlah · اليوم</div>
                      </div>
                      <Badge variant="outline" className="font-mono text-[10px]">#b14d89</Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="border-t border-slate-200/80 bg-white px-4 py-16">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="text-center space-y-2">
            <Badge variant="secondary" className="bg-[#f5efe2] text-[#7a6231] border-[#b49a63]/30">
              المميزات المتقدمة
            </Badge>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">حلول متكاملة لفرق التحليل والتطوير</h2>
            <p className="text-xs text-slate-600 sm:text-sm">
              تم بناء كل ميزة لحل مشكلة واقعية في دورة حياة هندسة متطلبات البرمجيات والخدمات الحكومية.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURE_HIGHLIGHTS.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Card key={idx} className="border-slate-200 bg-slate-50/50 transition-all hover:bg-white hover:shadow-md">
                  <CardHeader className="p-5 pb-2">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-[#8f733a] shadow-xs">
                        <Icon size={20} />
                      </div>
                      <Badge variant="outline" className="text-[10px] text-slate-600">
                        {item.tag}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <p className="text-xs leading-relaxed text-slate-600">{item.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Citizen Services Section */}
      <section id="services" className="border-t border-slate-200/80 bg-[#f8fafc] px-4 py-16">
        <div className="mx-auto max-w-6xl space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <Badge variant="secondary" className="bg-[#f5efe2] text-[#7a6231] border-[#b49a63]/30">
                قسم التنظيم والتخطيط العمراني
              </Badge>
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">دليل خدمات المواطنين الموثقة</h2>
              <p className="text-xs text-slate-600 sm:text-sm">
                8 خدمات بلدية وعمرانية مهندسة بكامل تفاصيلها التشغيلية والتقنية وقواميس حقولها.
              </p>
            </div>

            <Link href="/workspace">
              <Button variant="primary" size="sm" className="bg-[#003b36] hover:bg-[#002d29] text-white gap-1.5">
                فتح كامل الدليل في لوحة التحكم
                <ArrowLeft size={14} />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {CITIZEN_SERVICES.map((srv, idx) => (
              <Card key={srv.id} className="border-slate-200 bg-white shadow-2xs hover:shadow-sm transition-all">
                <CardContent className="p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="flex size-6 items-center justify-center rounded bg-slate-100 font-mono text-[11px] font-bold text-slate-700">
                      0{idx + 1}
                    </span>
                    <Badge variant="outline" className="text-[10px] text-slate-500">
                      {srv.category}
                    </Badge>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 leading-snug">{srv.name}</h4>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-500">
                    <span>المدة: <strong>{srv.sla}</strong></span>
                    <span>الرسوم: <strong>{srv.fee}</strong></span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="border-t border-slate-200/80 bg-white px-4 py-16">
        <div className="mx-auto max-w-4xl space-y-8">
          <div className="text-center space-y-2">
            <Badge variant="secondary" className="bg-[#f5efe2] text-[#7a6231] border-[#b49a63]/30">
              الأسئلة الشائعة
            </Badge>
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">إجابات على الاستفسارات المتكررة</h2>
          </div>

          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => (
              <Card key={idx} className="border-slate-200 bg-slate-50/50 shadow-none">
                <CardContent className="p-4 space-y-1.5">
                  <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span className="text-emerald-700">●</span>
                    {item.q}
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600 pr-4">{item.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Call to Action Banner */}
      <section className="border-t border-slate-200 bg-gradient-to-l from-[#002d29] via-[#003b36] to-[#004d46] px-4 py-16 text-white text-center">
        <div className="mx-auto max-w-3xl space-y-5">
          <h2 className="text-2xl font-bold sm:text-3xl text-white">جاهز لبدء العمل في مساحة التحليل؟</h2>
          <p className="text-xs text-slate-200 sm:text-sm leading-relaxed">
            انتقل مباشرة إلى لوحة التحكم واستمتع ببيئة عمل احترافية تدعم كل متطلبات مشروعك.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/workspace">
              <Button
                size="md"
                className="h-11 px-8 text-sm font-bold bg-[#b49a63] hover:bg-[#9e844b] text-slate-950 border-0 shadow-lg gap-2"
              >
                الدخول إلى لوحة التحكم الآن
                <ArrowLeft size={16} />
              </Button>
            </Link>

            <Button
              size="md"
              variant="outline"
              onClick={() => setIsTourOpen(true)}
              className="h-11 px-6 text-sm font-semibold border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white gap-2"
            >
              <Compass size={16} className="text-[#e0c98d]" />
              جولة في المنصة
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-4 py-8 text-xs text-slate-600">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-[#003b36] text-white font-bold text-xs">
              <Package size={14} />
            </div>
            <span className="font-bold text-slate-900">Analysis Department OS</span>
            <span>·</span>
            <span>قسم فريق تحليل المشاريع</span>
            <Badge variant="outline" className="border-[#b49a63]/40 bg-[#fbf7ee] px-2 py-0.5 text-[10px] font-semibold text-[#7a6231]">إصدار المنصة {APP_VERSION}</Badge>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            <span>تصميم وتنفيذ: <strong>محمد لحلح</strong></span>
            <span>·</span>
            <Link href="/workspace" className="font-semibold text-emerald-700 hover:underline">
              لوحة التحكم
            </Link>
          </div>
        </div>
      </footer>

      {/* Platform Tour Modal */}
      <PlatformTourModal open={isTourOpen} onOpenChange={setIsTourOpen} />
    </div>
  );
}
