import { citizenServicesDocumentSchema, componentsDocumentSchema, entitiesDocumentSchema, jobCardCatalogSchema, projectDocumentSchema, relationshipsDocumentSchema } from "@/domain/schemas";
import { citizenServiceSpecifications } from "./citizen-service-specifications";
import jobCardCatalogDocument from "../../.software/job-card-catalog.json";
import citizenServicesDocument from "../../.software/citizen-services.json";
import citizenServiceDiagramsDocument from "../../.software/citizen-service-diagrams.json";
import type { SoftwareModel } from "@/domain/types";

const jsonDocument = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

const projectDocument = {
  version: "1.0",
  project: {
    name: "دائرة التخطيط العمراني — بلدية مدينة حماة",
    description: "توثيق بصري للمهام والإجراءات والوثائق التنظيمية في دائرة التخطيط العمراني.",
    repository: "hama-municipality/urban-planning",
  },
};

const componentsDocument = {
  version: "1.0",
  components: [
    { id: "technical-affairs", name: "مدير الشؤون الفنية", type: "component", description: "المرجعية الإدارية المباشرة لدائرة التنظيم العمراني.", metadata: { owner: "الإدارة" } },
    { id: "urban-planning", name: "دائرة التنظيم العمراني", type: "service", description: "تدير التخطيط والتنظيم والاستملاك والإفراز.", metadata: { owner: "دائرة التنظيم العمراني" } },
    { id: "planning-regulation", name: "شعبة التخطيط والتنظيم العمراني", type: "component", description: "تعد الدراسات وتؤمن بيانات المخطط التنظيمي وتتابع اللجان.", metadata: { owner: "التخطيط والتنظيم" } },
    { id: "map-secretariat", name: "شعبة أمانة الخارطة", type: "component", description: "تحفظ الدراسات والمخططات وتصدر بيانات الوضع التخطيطي.", metadata: { owner: "أمانة الخارطة" } },
    { id: "expropriation-plans", name: "شعبة تنظيم المخططات الاستملاكية", type: "component", description: "تنظم مخططات الاستملاك وتدقق معاملات الإفراز.", metadata: { owner: "المخططات الاستملاكية" } },
    { id: "urban-committee", name: "اللجنة العمرانية", type: "external-system", description: "تراجع المعاملات وتصدر القرارات وفق الأصول.", metadata: { owner: "اللجان" } },
    { id: "regional-committee", name: "اللجنة الإقليمية", type: "external-system", description: "تستقبل الأضابير المحالة وتتابع قراراتها.", metadata: { owner: "اللجان" } },
    { id: "public-authorities", name: "الدوائر والجهات العامة", type: "external-system", description: "تزود الدائرة بالمعلومات والوثائق اللازمة لتوسيع المخطط.", metadata: { owner: "جهات خارجية" } },
    { id: "applicant", name: "صاحب العلاقة", type: "actor", description: "يقدم طلبات البيانات والاستملاك والإفراز.", metadata: { owner: "المتعاملون" } },
    { id: "one-stop-window", name: "النافذة الواحدة", type: "component", description: "تسجل طلب المواطن وتستقبل مرفقاته.", metadata: { owner: "الاستقبال" } },
    { id: "general-registry", name: "الديوان العام", type: "component", description: "يقيد الطلب ويحيله إلى الجهة الإدارية التالية.", metadata: { owner: "الديوان" } },
    { id: "technical-registry", name: "ديوان الشؤون الفنية", type: "component", description: "يقيد الطلب فنيًا قبل إحالته إلى دائرة التخطيط العمراني.", metadata: { owner: "الشؤون الفنية" } },
    { id: "urban-planning-mail", name: "بريد دائرة التخطيط العمراني", type: "component", description: "يوجه الطلب إلى الشعبة المختصة.", metadata: { owner: "دائرة التنظيم العمراني" } },
    { id: "drafter-reviewer", name: "الرسامة والمدقق", type: "component", description: "ينفذ الخدمة ويعد الرد والصفحة المصورة ويوقع فنيًا.", metadata: { owner: "التنفيذ الفني" } },
    { id: "technical-affairs-head", name: "رئيس قسم الشؤون الفنية", type: "component", description: "يراجع الرد ويوقع ويصادق عليه.", metadata: { owner: "الشؤون الفنية" } },
    { id: "city-manager", name: "مدير المدينة", type: "component", description: "يوقع توقيعًا شكليًا ويضع الختم.", metadata: { owner: "الإدارة العليا" } },
  ],
};

const entitiesDocument = {
  version: "1.0",
  entities: [
    { id: "real-estate", name: "العقار", description: "العقار محل الدراسة أو المعاملة.", fields: [{ name: "id", type: "string", required: true }, { name: "planningStatus", type: "string", required: true }, { name: "administrativeBoundary", type: "boolean", required: true }] },
    { id: "regulatory-plan", name: "المخطط التنظيمي", description: "المخطط المعتمد وحدوده ومنطقة الحماية.", fields: [{ name: "id", type: "string", required: true }, { name: "version", type: "string", required: true }, { name: "approvedAt", type: "date", required: false }] },
    { id: "planning-study", name: "الدراسة التخطيطية", description: "دراسة تعديل أو تفصيل مرتبطة بالمخطط التنظيمي.", fields: [{ name: "id", type: "string", required: true }, { name: "kind", type: "تعديلية | تفصيلية", required: true }, { name: "status", type: "مسودة | مصدقة", required: true }] },
    { id: "transaction-file", name: "المعاملة والأضبارة", description: "الطلب والبريد والوثائق المتداولة في الإجراء.", fields: [{ name: "id", type: "string", required: true }, { name: "kind", type: "استملاك | إفراز | تخصيص", required: true }, { name: "status", type: "string", required: true }] },
    { id: "expropriation-map", name: "مخطط الاستملاك", description: "مخطط يبين العقارات والوضع الاستملاكي والبيانات التخطيطية.", fields: [{ name: "id", type: "string", required: true }, { name: "parcelCount", type: "number", required: true }, { name: "approved", type: "boolean", required: true }] },
    { id: "subdivision-plan", name: "مخطط الإفراز", description: "مخطط إفراز طابقي أو عادي مع مخططه المساحي.", fields: [{ name: "id", type: "string", required: true }, { name: "kind", type: "طابقي | عادي", required: true }, { name: "approved", type: "boolean", required: true }] },
    { id: "planning-certificate", name: "بيان الوضع التخطيطي", description: "بيان يوضح الصفة العمرانية وموقع العقار والمرجع القانوني.", fields: [{ name: "id", type: "string", required: true }, { name: "planningZone", type: "string", required: true }, { name: "legalReference", type: "string", required: false }] },
    { id: "committee-decision", name: "قرار اللجنة", description: "قرار اللجنة العمرانية أو الإقليمية ونتيجة الإحالة.", fields: [{ name: "id", type: "string", required: true }, { name: "committee", type: "العمرانية | الإقليمية", required: true }, { name: "decision", type: "string", required: true }] },
  ],
};

const relationshipsDocument = {
  version: "1.0",
  relationships: [
    { id: "technical-affairs-manages-urban-planning", source: "technical-affairs", target: "urban-planning", type: "contains", label: "إشراف إداري", direction: "forward" },
    { id: "urban-planning-contains-planning", source: "urban-planning", target: "planning-regulation", type: "contains", label: "تتبع تنظيمي", direction: "forward" },
    { id: "urban-planning-contains-map", source: "urban-planning", target: "map-secretariat", type: "contains", label: "تتبع تنظيمي", direction: "forward" },
    { id: "urban-planning-contains-expropriation", source: "urban-planning", target: "expropriation-plans", type: "contains", label: "تتبع تنظيمي", direction: "forward" },
    { id: "public-authorities-supply-documents", source: "public-authorities", target: "planning-regulation", type: "data-flow", label: "معلومات ووثائق", direction: "forward" },
    { id: "planning-study-uses-regulatory-plan", source: "planning-study", target: "regulatory-plan", type: "relationship", label: "تعديل أو تفصيل", direction: "forward" },
    { id: "transaction-concerns-real-estate", source: "transaction-file", target: "real-estate", type: "relationship", label: "تخص العقار", direction: "forward" },
    { id: "real-estate-has-certificate", source: "real-estate", target: "planning-certificate", type: "relationship", label: "له بيان", direction: "forward" },
    { id: "expropriation-map-covers-real-estate", source: "expropriation-map", target: "real-estate", type: "relationship", label: "يشمل", direction: "forward" },
    { id: "subdivision-plan-covers-real-estate", source: "subdivision-plan", target: "real-estate", type: "relationship", label: "يفرز", direction: "forward" },
    { id: "transaction-produces-expropriation-map", source: "transaction-file", target: "expropriation-map", type: "data-flow", label: "ينتج مخططًا", direction: "forward" },
    { id: "transaction-produces-subdivision-plan", source: "transaction-file", target: "subdivision-plan", type: "data-flow", label: "ينتج مخططًا", direction: "forward" },
    { id: "urban-committee-reviews-transaction", source: "urban-committee", target: "transaction-file", type: "calls", label: "مراجعة وإحالة", direction: "forward" },
    { id: "regional-committee-reviews-transaction", source: "regional-committee", target: "transaction-file", type: "calls", label: "إحالة وقرار", direction: "forward" },
    { id: "committee-produces-decision", source: "transaction-file", target: "committee-decision", type: "data-flow", label: "قرار اللجنة", direction: "forward" },
    { id: "applicant-submits-transaction", source: "applicant", target: "transaction-file", type: "data-flow", label: "طلب معاملة", direction: "forward" },
    { id: "map-secretariat-to-planning", source: "map-secretariat", target: "planning-regulation", type: "calls", label: "تدقيق وتخطيط", direction: "forward" },
    { id: "planning-to-committee", source: "planning-regulation", target: "urban-committee", type: "calls", label: "إحالة للدراسة", direction: "forward" },
    { id: "map-to-expropriation", source: "map-secretariat", target: "expropriation-plans", type: "calls", label: "مخطط استملاك", direction: "forward" },
    { id: "expropriation-to-committee", source: "expropriation-plans", target: "urban-committee", type: "calls", label: "مراجعة اللجنة", direction: "forward" },
    { id: "transaction-to-map-secretariat", source: "transaction-file", target: "map-secretariat", type: "calls", label: "تحقق من الوضع التخطيطي", direction: "forward" },
    { id: "applicant-to-one-stop-window", source: "applicant", target: "one-stop-window", type: "data-flow", label: "تقديم الطلب والمرفقات", direction: "forward" },
    { id: "one-stop-to-general-registry", source: "one-stop-window", target: "general-registry", type: "calls", label: "قيد الطلب", direction: "forward" },
    { id: "general-to-technical-registry", source: "general-registry", target: "technical-registry", type: "calls", label: "إحالة للديوان الفني", direction: "forward" },
    { id: "technical-registry-to-mail", source: "technical-registry", target: "urban-planning-mail", type: "calls", label: "تسجيل وإحالة", direction: "forward" },
    { id: "mail-to-drafter-reviewer", source: "urban-planning-mail", target: "drafter-reviewer", type: "calls", label: "إحالة حسب الشعبة", direction: "forward" },
    { id: "drafter-to-technical-head", source: "drafter-reviewer", target: "technical-affairs-head", type: "data-flow", label: "رد موقع فنيًا", direction: "forward" },
    { id: "technical-head-to-city-manager", source: "technical-affairs-head", target: "city-manager", type: "calls", label: "مصادقة وتوقيع", direction: "forward" },
    { id: "drafter-returns-to-applicant", source: "drafter-reviewer", target: "applicant", type: "data-flow", label: "إرجاع لاستكمال المعلومات", direction: "forward" },
    { id: "technical-head-returns-to-drafter", source: "technical-affairs-head", target: "drafter-reviewer", type: "calls", label: "إعادة للمراجعة", direction: "forward" },
  ],
};

const documentationOverview = [
  "# التوثيق الأساسي للنظام",
  "",
  "## المجال الموثق",
  "",
  "دائرة التخطيط العمراني في بلدية مدينة حماة، بما يشمل دائرة التنظيم العمراني والشعب واللجان والمعاملات المرتبطة بالعقارات.",
  "",
  "للتفاصيل، افتح ملف hama-urban-planning-department.md.",
  "",
].join("\\n");

const documentationSummary = [
  "# دائرة التخطيط العمراني في بلدية مدينة حماة",
  "",
  "## ملخص وظيفي",
  "",
  "توثق هذه الصفحة الهيكل والمهام المستخرجة من أربع بطاقات وصف وظيفي. المرجع الكامل محفوظ في ملف المشروع، وتبقى الأرقام القانونية غير المحسومة بحاجة إلى اعتماد رسمي.",
  "",
  "## الوحدات والأدوار",
  "",
  "- مدير الشؤون الفنية.",
  "- رئيس دائرة التنظيم العمراني.",
  "- رئيس شعبة التخطيط والتنظيم العمراني.",
  "- رئيس شعبة أمانة الخارطة.",
  "- رئيس شعبة تنظيم المخططات الاستملاكية.",
  "- اللجنة العمرانية واللجنة الإقليمية.",
  "",
  "## الأعمال المركزية",
  "",
  "1. إعداد وتصديق الدراسات التخطيطية التعديلية والتفصيلية.",
  "2. متابعة توسعة المخطط التنظيمي وحدوده ومنطقة الحماية.",
  "3. إصدار بيانات الوضع التخطيطي للعقارات.",
  "4. إعداد وتدقيق مخططات الاستملاك ومشاريع الإفراز.",
  "5. إحالة الأضابير إلى اللجان ومتابعة قراراتها.",
  "6. حفظ المخططات والدراسات والمخططات النهائية المصدقة.",
  "",
  "## التدفق المختصر",
  "",
  "استلام الطلب ← دراسة الوثائق ← تدقيق الوضع التخطيطي ← إعداد المخطط أو الدراسة ← الإحالة والتصديق ← الحفظ",
  "",
].join("\\n");

export const fixtureFiles: Record<string, string> = {
  ".software/project.json": jsonDocument(projectDocument),
  ".software/components.json": jsonDocument(componentsDocument),
  ".software/entities.json": jsonDocument(entitiesDocument),
  ".software/relationships.json": jsonDocument(relationshipsDocument),
  "docs/architecture/overview.md": documentationOverview,
  "docs/architecture/hama-urban-planning-department.md": documentationSummary,
  "docs/requirements/citizen-services.md": "# طلبات المواطنين — دائرة التنظيم العمراني\n\nيتضمن الكتالوج ثمانية طلبات: دمج عقارين، شراء فضلة، كروكي، الاستعلام عن الوضع التنظيمي للعقار، استعلام تغيير استخدام عقار، موافقة مبدئية على تنظيم مشروع إفراز طابقي أو جوار، استفسار عن مصاعد بانورامية وشروط التركيب، وترخيص صيدلية.\n\nالمراحل الموحدة: النافذة الواحدة ← الديوان العام ← دائرة التنظيم والتخطيط العمراني ← إعداد الرد والتوقيع ← المصادقة والختم أو الإحالة إلى الجهة المختصة.\n\nالتفاصيل المنظمة موجودة في .software/citizen-services.json.\n",
  "docs/studies/hama-urban-planning/README.md": "# دراسة دائرة التخطيط العمراني في بلدية مدينة حماة\n\nتبدأ هذه الدراسة من ملف التوثيق الوظيفي، ثم تُضاف إليها متطلبات المديرية ونموذج البيانات والإجراءات وقرارات الاعتماد.\n",
};

export interface FixtureWorkspace {
  model: SoftwareModel;
  files: Record<string, string>;
  jobCards: ReturnType<typeof jobCardCatalogSchema.parse>["cards"];
  citizenServices: ReturnType<typeof citizenServicesDocumentSchema.parse>["services"];
}

type CitizenService = ReturnType<typeof citizenServicesDocumentSchema.parse>["services"][number];

function citizenServiceTableDocument(service: CitizenService) {
  const spec = citizenServiceSpecifications[service.id];
  const rows = [
    ["اسم الطلب", service.name],
    ["المعرف الفريد", service.id],
    ["رمز الخدمة", spec?.serviceCode ?? service.id],
    ["النوع", service.kind === "service" ? "خدمة" : "استعلام"],
    ["الجمهور", service.audience],
    ["المجال", service.domain],
    ["الوحدة", service.unit],
    ["الوصف", service.description],
    ["الاستخدام", service.usage],
    ["الأساس القانوني", spec?.legalBasis ?? "ضابطة البناء العامة وقوانين الإدارة المحلية"],
    ["زمن الإنجاز المتوقع (SLA)", spec?.slaDescription ?? "بين 1 إلى 3 أيام عمل رسمية"],
    ["المديرية", service.directorate],
    ["الدائرة", service.department],
    ["التوفر", service.availability],
    ["القناة", service.channel],
    ["الأولوية", service.priority],
    ["مستوى النضج الرقمي", spec?.digitalMaturityLevel ?? "إجراء هجين ورقي/رقمي"],
    ["المخرج الرسمي", spec?.deliverableType ?? service.response],
    ["جهة الاعتماد والختم", spec?.officialCertification ?? "رئيس الدائرة ومدير الشؤون الفنية"],
    ["الحقول المطلوبة", service.requiredFields.join("، ")],
    ["المرفقات", service.attachments.join("، ") || "لا يوجد"],
    ["الرسوم", service.fee ? `${service.fee.label}: ${service.fee.amount} ${service.fee.currency}` : "9700 ليرة سورية قديمة"],
    ["مراحل الطلب", service.stages.map((stage) => `${stage.order}. ${stage.name} — ${stage.owner}`).join(" ← ")],
    ["أسباب الإرجاع", service.returnReasons?.join("، ") || "لا يوجد"],
    ["ملاحظات الجهة", service.authorityNotes?.join("، ") || "لا يوجد"],
    ["الاستجابة", service.response],
  ];
  const filePath = citizenServiceFilePath(service);
  const repository = "https://github.com/lahlahai/Analysis-Department-OS";
  const diagramLinks = citizenServiceDiagramsDocument.services[service.id as keyof typeof citizenServiceDiagramsDocument.services]?.links ?? [];
  const visualReferenceLinks = service.id === "merge-properties" ? [
    { id: "inquiry-form-image", title: "نموذج استعلام", description: "صورة نموذج الاستعلام الورقي المرفق بمعاملة الطلب", url: "/نموذج استعلام.jpeg", category: "supporting" },
    { id: "one-stop-window-form-image", title: "نموذج طلب النافذة الواحدة", description: "صورة النموذج المستخدم ضمن إجراءات النافذة الواحدة", url: "/نموذج طلب نافذة واحدة.jpeg", category: "supporting" },
    { id: "property-sketch-image", title: "نموذج كروكي", description: "صورة مخطط كروكي عقاري مرجعي لطلب دمج العقارين", url: "/نموذج كروكي.jpeg", category: "supporting" },
  ] : [];
  const links = [
    ...diagramLinks,
    ...visualReferenceLinks,
    { id: "request-file", title: "ملف الطلب في المستودع", description: "النسخة المحفوظة من هذا الطلب داخل GitHub", url: `${repository}/blob/main/${encodeURI(filePath)}`, category: "supporting" },
    { id: "service-catalog", title: "كتالوج الخدمات", description: "المرجع الكامل لبيانات خدمات المواطنين", url: `${repository}/blob/main/.software/citizen-services.json`, category: "supporting" },
    { id: "service-guide", title: "دليل طلبات المواطنين", description: "المراحل العامة ومتطلبات معالجة الطلبات", url: `${repository}/blob/main/docs/requirements/citizen-services.md`, category: "supporting" },
    { id: "repository", title: "مستودع فريق تحليل المشاريع", description: "الملفات والمراجع المشتركة للفريق", url: repository, category: "supporting" },
  ];
  return `${JSON.stringify({ version: "1.0", serviceId: service.id, request: service, specification: spec, userStory: spec?.userStory, permissionMatrix: spec?.permissionMatrix, actionPermissionMatrix: spec?.actionPermissionMatrix, links, columns: ["البيان", "التفاصيل"], rows, columnWidths: [220, 680], rowHeights: rows.map(() => 42) }, null, 2)}\n`;
}

function citizenServiceFilePath(service: CitizenService) {
  const safeName = service.name.trim().replace(/[\\/:*?"<>|]/g, "-");
  return `قسم التنظيم والتخطيط العمراني/${safeName}.json`;
}

export function loadFixtureWorkspace(): FixtureWorkspace {
  const project = projectDocumentSchema.parse(JSON.parse(fixtureFiles[".software/project.json"])).project;
  const components = componentsDocumentSchema.parse(JSON.parse(fixtureFiles[".software/components.json"])).components;
  const entities = entitiesDocumentSchema.parse(JSON.parse(fixtureFiles[".software/entities.json"])).entities;
  const relationships = relationshipsDocumentSchema.parse(JSON.parse(fixtureFiles[".software/relationships.json"])).relationships;
  const jobCardDocument = jobCardCatalogSchema.parse(jobCardCatalogDocument);
  const citizenServices = citizenServicesDocumentSchema.parse(citizenServicesDocument);
  const enrichedCitizenServices = citizenServices.services.map((service) => ({
    ...service,
    specification: citizenServiceSpecifications[service.id],
  }));
  const citizenServiceFiles = Object.fromEntries(enrichedCitizenServices.map((service) => [citizenServiceFilePath(service), citizenServiceTableDocument(service)]));
  const files = { ...fixtureFiles, ...citizenServiceFiles, ".software/job-card-catalog.json": `${JSON.stringify(jobCardDocument, null, 2)}\n`, ".software/citizen-services.json": `${JSON.stringify({ version: "1.0", services: enrichedCitizenServices }, null, 2)}\n` };
  return { model: { project: { ...project, version: "1.0" }, components, entities, relationships }, files, jobCards: jobCardDocument.cards, citizenServices: enrichedCitizenServices };
}

