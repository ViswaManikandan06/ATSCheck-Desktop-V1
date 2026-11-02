import ATSClassicTemplate from "./templates/ATSClassicTemplate";
import CompactTemplate from "./templates/CompactTemplate";
import ExecutiveTemplate from "./templates/ExecutiveTemplate";
import ModernProfessionalTemplate from "./templates/ModernProfessionalTemplate";
import ResumeDiff from "./ResumeDiff";

export const TEMPLATE_IDS = [
  "atsClassic",
  "modernProfessional",
  "compact",
  "executive",
];

const knownSectionTitles = new Map([
  ["summary", "Summary"],
  ["profile", "Profile"],
  ["objective", "Objective"],
  ["experience", "Experience"],
  ["work experience", "Experience"],
  ["professional experience", "Experience"],
  ["projects", "Projects"],
  ["project", "Projects"],
  ["education", "Education"],
  ["skills", "Skills"],
  ["technical skills", "Skills"],
  ["certifications", "Certifications"],
  ["certification", "Certifications"],
  ["awards", "Awards"],
  ["achievement", "Achievements"],
  ["achievements", "Achievements"],
  ["languages", "Languages"],
  ["volunteer experience", "Volunteer Experience"],
  ["leadership", "Leadership"],
  ["publications", "Publications"],
  ["publication", "Publications"],
]);

const isLikelyHeading = (value) => {
  const text = String(value || "").trim();

  if (!text || text.length > 80) {
    return false;
  }

  const sectionWords = Object.keys(Object.fromEntries([...knownSectionTitles.entries()]));

  if (sectionWords.some((word) => text.toLowerCase() === word)) {
    return true;
  }

  if (/^(summary|experience|projects|education|skills|certifications|awards|languages|leadership|publications|volunteer experience)$/i.test(text)) {
    return true;
  }

  if (/^[A-Za-z0-9 .&/()'-]{2,60}$/.test(text) && !/[@:]/.test(text)) {
    return text.split(" ").length <= 8;
  }

  return false;
};

const normalizeSectionTitle = (rawTitle) => {
  const normalized = String(rawTitle || "").trim();
  const matchKey = normalized.toLowerCase();

  if (knownSectionTitles.has(matchKey)) {
    return knownSectionTitles.get(matchKey);
  }

  return normalized;
};

const cleanText = (text) => String(text || "").replace(/\r/g, "").trim();

const ensureArray = (value) => {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== null && item !== undefined && String(item).trim() !== "");
  }

  if (!value) {
    return [];
  }

  return [String(value).trim()].filter(Boolean);
};

export const parseResumeDocument = (resumeInput, fallbackName = "Resume Candidate") => {
  const rawText =
    typeof resumeInput === "string"
      ? resumeInput
      : resumeInput?.rawText ||
        resumeInput?.text ||
        resumeInput?.content ||
        resumeInput?.plainText ||
        resumeInput?.parsed_text ||
        "";

  const fullText = cleanText(rawText);

  const document = {
    name: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    summary: "",
    sections: [],
    rawText: fullText,
  };

  if (!fullText) {
    document.name = fallbackName;
    document.summary = "Resume content is not available yet.";
    return document;
  }

  const emailMatch = fullText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi);
  const phoneMatch = fullText.match(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?){2}\d{4}/g);
  const websiteMatch = fullText.match(/https?:\/\/[^\s]+|www\.[^\s]+/gi);
  const locationMatch = fullText.match(/(?:[A-Z][a-zA-Z.-]+(?:,\s*)?)+(?:\s+[A-Z][a-zA-Z.-]+)?(?:,\s*[A-Z]{2,})?/g)?.find((value) => value && !value.includes("@") && !/\d/.test(value));

  document.email = emailMatch?.[0] || "";
  document.phone = phoneMatch?.[0] || "";
  document.website = websiteMatch?.[0] || "";
  document.location = locationMatch || "";

  const lines = fullText
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const candidateName =
    lines.find((line) => {
      if (!line || line.length > 80) return false;
      if (/[A-Z]{2,}\s*:\s*/.test(line)) return false;
      if (line.includes("@") || /https?:\/\//i.test(line)) return false;
      if (/^(summary|experience|projects|education|skills|certifications|awards|languages|leadership|publications|volunteer experience)$/i.test(line)) {
        return false;
      }

      return !/\d{4}.*\d{4}/.test(line) && !/^\d{1,2}\/\d{1,2}\//.test(line);
    }) || fallbackName;

  document.name = candidateName;

  const blocks = fullText.split(/\n\s*\n+/).map((block) => block.trim()).filter(Boolean);
  const sectionMap = new Map();
  let currentTitle = null;

  for (const block of blocks) {
    const firstLine = block.split(/\n/)[0].trim();
    const isHeading = isLikelyHeading(firstLine);

    if (isHeading) {
      const title = normalizeSectionTitle(firstLine);
      currentTitle = title;
      const existing = sectionMap.get(title) || [];
      const blockLines = block
        .split(/\n/)
        .slice(1)
        .map((line) => line.trim())
        .filter(Boolean);

      sectionMap.set(title, [...existing, ...blockLines]);
      continue;
    }

    if (currentTitle) {
      const existing = sectionMap.get(currentTitle) || [];
      sectionMap.set(currentTitle, [...existing, ...block.split(/\n/).map((line) => line.trim()).filter(Boolean)]);
      continue;
    }

    if (!document.summary) {
      document.summary = block;
    } else {
      const existing = sectionMap.get("Additional Information") || [];
      sectionMap.set("Additional Information", [...existing, block]);
    }
  }

  if (!document.summary) {
    const summaryBlock = blocks.find((block) => {
      const normalized = block.replace(/\s+/g, " ");
      return normalized.length > 80 && !/^(experience|projects|education|skills|certifications|awards|languages|leadership|publications|volunteer experience)/i.test(normalized);
    });

    document.summary = summaryBlock || "";
  }

  const orderedSections = [];
  const seen = new Set();

  for (const sectionKey of [
    "Summary",
    "Profile",
    "Objective",
    "Experience",
    "Projects",
    "Education",
    "Skills",
    "Certifications",
    "Awards",
    "Achievements",
    "Languages",
    "Volunteer Experience",
    "Leadership",
    "Publications",
    "Additional Information",
  ]) {
    if (!sectionMap.has(sectionKey)) continue;
    const items = ensureArray(sectionMap.get(sectionKey));
    if (items.length === 0) continue;
    seen.add(sectionKey);
    orderedSections.push({
      title: sectionKey,
      items: items,
    });
  }

  for (const [title, items] of sectionMap.entries()) {
    if (seen.has(title)) continue;
    const nextItems = ensureArray(items);
    if (nextItems.length) {
      orderedSections.push({ title, items: nextItems });
    }
  }

  if (document.summary && !orderedSections.some((section) => section.title === "Summary")) {
    orderedSections.unshift({ title: "Summary", items: [document.summary] });
  }

  document.sections = orderedSections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (typeof item === "string") {
        return item.trim();
      }

      if (item && typeof item === "object") {
        const text = item.text || item.value || item.label || "";
        return String(text).trim();
      }

      return "";
    }).filter(Boolean),
  }));

  return document;
};

const templates = {
  atsClassic: ATSClassicTemplate,
  modernProfessional: ModernProfessionalTemplate,
  compact: CompactTemplate,
  executive: ExecutiveTemplate,
};

export default function ResumePreview({ resume, template = "atsClassic", mode = "clean", diff = null }) {
  const document = parseResumeDocument(resume, "Resume Candidate");

  const SelectedTemplate = templates[template] || templates.atsClassic;

  const wrapperClassName = mode === "changes" ? "border-[3px] border-black bg-[#fffdf8] shadow-[4px_4px_0_#111]" : "border-[3px] border-black bg-white shadow-[4px_4px_0_#111]";

  return (
    <div className={`w-full overflow-hidden ${wrapperClassName}`}>
      <div className="max-h-[780px] overflow-y-auto bg-white">
        <div className="mx-auto w-full max-w-[820px] min-h-[1100px] bg-white text-slate-900" style={{ aspectRatio: "210 / 297" }}>
          <SelectedTemplate document={document} mode={mode} diff={diff} />
        </div>
      </div>
    </div>
  );
}

export const RenderResumeDiff = ({ text, diff, className = "" }) => {
  return (
    <ResumeDiff text={text} diff={diff} className={className} />
  );
};
