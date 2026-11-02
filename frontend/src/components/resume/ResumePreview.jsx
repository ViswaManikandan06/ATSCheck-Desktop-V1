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

/* -------------------------------------------------------------------------- */
/* Section definitions                                                        */
/* -------------------------------------------------------------------------- */

const knownSectionTitles = new Map([
  ["summary", "Summary"],
  ["professional summary", "Summary"],
  ["profile", "Profile"],
  ["professional profile", "Profile"],
  ["objective", "Objective"],
  ["career objective", "Objective"],

  ["experience", "Experience"],
  ["work experience", "Experience"],
  ["professional experience", "Experience"],
  ["employment history", "Experience"],
  ["work history", "Experience"],

  ["projects", "Projects"],
  ["project", "Projects"],
  ["project work", "Projects"],
  ["academic projects", "Projects"],
  ["personal projects", "Projects"],

  ["education", "Education"],
  ["academic background", "Education"],
  ["educational background", "Education"],

  ["skills", "Skills"],
  ["technical skills", "Skills"],
  ["technical expertise", "Skills"],
  ["core skills", "Skills"],
  ["programming skills", "Skills"],

  ["certifications", "Certifications"],
  ["certification", "Certifications"],
  ["certificates", "Certifications"],
  ["certificates and badges", "Certifications"],
  ["certifications and badges", "Certifications"],

  ["awards", "Awards"],
  ["award", "Awards"],

  ["achievements", "Achievements"],
  ["achievement", "Achievements"],

  ["languages", "Languages"],
  ["language", "Languages"],

  ["volunteer experience", "Volunteer Experience"],
  ["volunteering", "Volunteer Experience"],

  ["leadership", "Leadership"],
  ["leadership experience", "Leadership"],

  ["publications", "Publications"],
  ["publication", "Publications"],
  ["research publications", "Publications"],

  ["additional information", "Additional Information"],
  ["interests", "Additional Information"],
]);

/* -------------------------------------------------------------------------- */
/* Text normalization                                                         */
/* -------------------------------------------------------------------------- */

const cleanText = (value) => {
  return String(value ?? "")
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\u200b/g, "")
    .replace(/\u200c/g, "")
    .replace(/\u200d/g, "")
    .replace(/\ufeff/g, "")
    .trim();
};

const cleanLine = (value) => {
  let text = cleanText(value);

  if (!text) {
    return "";
  }

  /*
   * Markdown headings:
   *
   * # Viswa M
   * ## Education
   */
  text = text.replace(/^#{1,6}\s+/, "");

  /*
   * Markdown bold / italic.
   */
  text = text.replace(/\*\*(.*?)\*\*/g, "$1");
  text = text.replace(/__(.*?)__/g, "$1");
  text = text.replace(/(?<!\w)\*(.*?)\*(?!\w)/g, "$1");
  text = text.replace(/(?<!\w)_(.*?)_(?!\w)/g, "$1");

  /*
   * Remove escaped Markdown characters.
   */
  text = text.replace(/\\([@#*+_.|()[\]{}])/g, "$1");
  text = text.replace(/\\\//g, "/");
  text = text.replace(/\\-/g, "-");

  /*
   * Remove bullet markers.
   */
  text = text.replace(/^\s*(?:[-*•▪◦●○]\s*)+/, "");

  /*
   * Normalize whitespace.
   */
  text = text.replace(/[ \t]+/g, " ").trim();

  return text;
};

const normalizeForComparison = (value) => {
  return cleanLine(value)
    .toLowerCase()
    .replace(/[.:|]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

/* -------------------------------------------------------------------------- */
/* Section helpers                                                            */
/* -------------------------------------------------------------------------- */

const getKnownSectionTitle = (value) => {
  const normalized = normalizeForComparison(value);

  return knownSectionTitles.get(normalized) || null;
};

const isKnownSectionHeading = (value) => {
  return Boolean(getKnownSectionTitle(value));
};

const normalizeSectionTitle = (value) => {
  return getKnownSectionTitle(value) || cleanLine(value);
};

/* -------------------------------------------------------------------------- */
/* Contact extraction                                                         */
/* -------------------------------------------------------------------------- */

const extractEmail = (text) => {
  const match = text.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  return match?.[0] || "";
};

const extractPhone = (text) => {
  const matches = text.match(
    /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{4}/g
  );

  if (!matches) {
    return "";
  }

  const phone = matches.find((value) => {
    const digits = value.replace(/\D/g, "");

    return (
      digits.length >= 10 &&
      !/^19\d{2}$/.test(digits) &&
      !/^20\d{2}$/.test(digits)
    );
  });

  return phone?.trim() || "";
};

const extractLinkedIn = (text) => {
  const match = text.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s|]+/i
  );

  return (
    match?.[0]
      ?.replace(/[),.;]+$/, "")
      .trim() || ""
  );
};

const extractWebsite = (text) => {
  const match = text.match(
    /(?:https?:\/\/|www\.)[^\s|]+/i
  );

  return (
    match?.[0]
      ?.replace(/[),.;]+$/, "")
      .trim() || ""
  );
};

/*
 * Location extraction is intentionally conservative.
 *
 * We do NOT use a generic capitalized-word regex because that can incorrectly
 * identify company names, universities, job titles, etc. as locations.
 */
const extractLocation = (text) => {
  const patterns = [
    /\b(Bangalore|Bengaluru|Coimbatore|Chennai|Hyderabad|Mumbai|Pune|Delhi|Kolkata|Noida|Gurugram|Gurgaon)\b(?:,\s*[A-Za-z .-]+){0,2}/i,

    /\b[A-Z][A-Za-z .-]+,\s*[A-Z][A-Za-z .-]+,\s*(?:India|USA|UK|Canada|Australia)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[0]) {
      return match[0].trim();
    }
  }

  return "";
};

/* -------------------------------------------------------------------------- */
/* Candidate name detection                                                   */
/* -------------------------------------------------------------------------- */

const isContactLine = (line) => {
  const text = cleanLine(line);

  if (!text) {
    return false;
  }

  return (
    /@/.test(text) ||
    /linkedin\.com/i.test(text) ||
    /https?:\/\//i.test(text) ||
    /www\./i.test(text) ||
    extractPhone(text) !== ""
  );
};

const isDateLine = (line) => {
  const text = cleanLine(line);

  return (
    /\b(?:19|20)\d{2}\b/.test(text) ||
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i.test(
      text
    )
  );
};

const looksLikeCandidateName = (line) => {
  const text = cleanLine(line);

  if (!text || text.length > 60) {
    return false;
  }

  if (isContactLine(text)) {
    return false;
  }

  if (isKnownSectionHeading(text)) {
    return false;
  }

  if (isDateLine(text)) {
    return false;
  }

  if (/\b(engineer|developer|scientist|analyst|designer|manager|director|consultant|architect|researcher|specialist|lead|intern|student|graduate)\b/i.test(text)) {
    return false;
  }

  const words = text.split(/\s+/);

  if (words.length > 5) {
    return false;
  }

  if (
    /^(professional summary|work experience|education|skills|projects|publications)$/i.test(
      text
    )
  ) {
    return false;
  }

  return /^[A-Za-z][A-Za-z .'-]*$/.test(text);
};

/* -------------------------------------------------------------------------- */
/* Generic heading detection                                                  */
/* -------------------------------------------------------------------------- */

const isGenericHeading = (value) => {
  const text = cleanLine(value);

  if (!text) {
    return false;
  }

  if (text.length > 70) {
    return false;
  }

  if (isContactLine(text)) {
    return false;
  }

  if (/[.!?]$/.test(text)) {
    return false;
  }

  if (isKnownSectionHeading(text)) {
    return true;
  }

  const words = text.split(/\s+/);

  if (words.length > 8) {
    return false;
  }

  /*
   * Avoid interpreting normal resume bullet content as headings.
   */
  const lower = text.toLowerCase();

  const contentIndicators = [
    "implemented ",
    "developed ",
    "worked ",
    "built ",
    "designed ",
    "created ",
    "responsible ",
    "experienced ",
    "leveraged ",
    "applied ",
    "conducted ",
    "using ",
    "achieved ",
    "improved ",
    "optimized ",
  ];

  if (
    contentIndicators.some((prefix) =>
      lower.startsWith(prefix)
    )
  ) {
    return false;
  }

  /*
   * Generic headings are normally title case or uppercase.
   */
  const titleLike =
    /^[A-Za-z][A-Za-z0-9 &/()'.,:+-]*$/.test(text) &&
    (
      text === text.toUpperCase() ||
      /^[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*)*$/.test(text)
    );

  return titleLike;
};

/* -------------------------------------------------------------------------- */
/* Content normalization                                                      */
/* -------------------------------------------------------------------------- */

const normalizeContentLine = (line) => {
  return cleanText(line);
};

/* -------------------------------------------------------------------------- */
/* Embedded heading detection                                                 */
/* -------------------------------------------------------------------------- */

/*
 * Handles both:
 *
 * Professional Summary
 *
 * and:
 *
 * Professional Summary AI-driven Software Engineer...
 */
const splitEmbeddedHeading = (line) => {
  const text = cleanLine(line);

  if (!text) {
    return {
      before: "",
      heading: null,
      after: "",
    };
  }

  /*
   * Exact heading.
   */
  const exactHeading = getKnownSectionTitle(text);

  if (exactHeading) {
    return {
      before: "",
      heading: exactHeading,
      rawHeading: text,
      after: "",
    };
  }

  /*
   * Remove trailing ":" or "|".
   */
  const normalizedLine = text
    .replace(/[:|]+$/, "")
    .trim();

  const normalizedHeading = getKnownSectionTitle(
    normalizedLine
  );

  if (normalizedHeading) {
    return {
      before: "",
      heading: normalizedHeading,
      rawHeading: normalizedLine,
      after: "",
    };
  }

  /*
   * Check if a known heading appears at the beginning of a line.
   *
   * Example:
   *
   * Work Experience DIGITAP.AI, Bangalore
   */
  const knownHeadings = [...knownSectionTitles.keys()]
    .sort((a, b) => b.length - a.length);

  for (const knownHeading of knownHeadings) {
    const escapedHeading = knownHeading.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

    const regex = new RegExp(
      `^${escapedHeading}(?:\\s+|:|$)`,
      "i"
    );

    const match = text.match(regex);

    if (!match) {
      continue;
    }

    const canonical =
      knownSectionTitles.get(knownHeading);

    const remaining = text
      .slice(match[0].length)
      .trim();

    return {
      before: "",
      heading: canonical,
      rawHeading: match[0].trim().replace(/[:|]+$/, "").trim(),
      after: remaining,
    };
  }

  return {
    before: text,
    heading: null,
    after: "",
  };
};

/* -------------------------------------------------------------------------- */
/* Main resume parser                                                         */
/* -------------------------------------------------------------------------- */

export const parseResumeDocument = (
  resumeInput
) => {
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
    title: "",
    email: "",
    phone: "",
    location: "",
    website: "",
    summary: "",
    sections: [],
    headerLines: [],
    rawText: fullText,
  };

  /*
   * Empty resume.
   */
  if (!fullText) {
    return document;
  }

  /* ---------------------------------------------------------------------- */
  /* Contact information                                                    */
  /* ---------------------------------------------------------------------- */

  document.email = extractEmail(fullText);
  document.phone = extractPhone(fullText);

  const linkedin = extractLinkedIn(fullText);
  const website = extractWebsite(fullText);

  document.website = linkedin || website;
  document.location = extractLocation(fullText);

  /* ---------------------------------------------------------------------- */
  /* Split document into clean lines                                        */
  /* ---------------------------------------------------------------------- */

  const rawLines = fullText
    .split(/\n+/)
    .map((line) => cleanText(line).replace(/[ \t]+/g, " "))
    .filter(Boolean);

  /* ---------------------------------------------------------------------- */
  /* Find candidate name                                                    */
  /* ---------------------------------------------------------------------- */

  let nameIndex = -1;

  /*
   * Candidate name is normally near the beginning.
   *
   * We only inspect the first few lines so that something such as
   * "Data Scientist" later in Experience cannot become the candidate name.
   */
  for (let i = 0; i < Math.min(rawLines.length, 8); i += 1) {
    if (looksLikeCandidateName(rawLines[i])) {
      document.name = rawLines[i];
      nameIndex = i;
      break;
    }
  }

  /* ---------------------------------------------------------------------- */
  /* Build sections                                                         */
  /* ---------------------------------------------------------------------- */

  const sections = [];
  let currentSection = null;

  const appendToSection = (value) => {
    const cleaned = normalizeContentLine(value);

    if (!cleaned || !currentSection) {
      return;
    }

    currentSection.items.push(cleaned);
  };

  const headerLines = [];

  for (let i = 0; i < rawLines.length; i += 1) {
    const line = rawLines[i];

    /*
     * Skip candidate name.
     */
    if (i === nameIndex) {
      continue;
    }

    /*
     * Detect section headings anywhere in the document.
     */
    const headingResult = splitEmbeddedHeading(line);

    if (
      !headingResult.heading &&
      currentSection &&
      isGenericHeading(line)
    ) {
      headingResult.heading = normalizeSectionTitle(line);
    }

    if (headingResult.heading) {
      currentSection = {
        title: headingResult.rawHeading || headingResult.heading,
        normalizedTitle: headingResult.heading,
        items: [],
      };
      sections.push(currentSection);

      /*
       * Handle:
       *
       * Professional Summary AI-driven Software Engineer...
       */
      if (headingResult.after) {
        appendToSection(headingResult.after);
      }

      continue;
    }

    /*
     * Before the first section, this is header information.
     *
     * We intentionally do NOT automatically turn it into Summary.
     */
    if (!currentSection) {
      headerLines.push(line);
      continue;
    }

    /*
     * Everything after a known section heading belongs to that section.
     */
    appendToSection(line);
  }

  /* ---------------------------------------------------------------------- */
  /* Summary                                                                */
  /* ---------------------------------------------------------------------- */

  const explicitSummary = sections.find(
    (section) => section.normalizedTitle === "Summary"
  )?.items;

  if (explicitSummary?.length) {
    document.summary = explicitSummary.join(" ");
  }

  /*
   * Only use a header paragraph as a fallback summary if it actually looks
   * like a paragraph.
   */
  if (!document.summary) {
    const possibleSummary = headerLines.find((line) => {
      const text = normalizeContentLine(line);

      if (text.length < 80) {
        return false;
      }

      if (isContactLine(text)) {
        return false;
      }

      if (looksLikeCandidateName(text)) {
        return false;
      }

      return true;
    });

    if (possibleSummary) {
      document.summary = possibleSummary;
    }
  }

  document.sections = sections;

  const firstHeaderTitle = headerLines.find(
    (line) => !isContactLine(line) && line.length <= 80
  );
  document.title = firstHeaderTitle || "";
  document.headerLines = headerLines;

  return document;
};

/* -------------------------------------------------------------------------- */
/* Templates                                                                  */
/* -------------------------------------------------------------------------- */

const templates = {
  atsClassic: ATSClassicTemplate,
  modernProfessional: ModernProfessionalTemplate,
  compact: CompactTemplate,
  executive: ExecutiveTemplate,
};

/* -------------------------------------------------------------------------- */
/* Resume Preview                                                             */
/* -------------------------------------------------------------------------- */

export default function ResumePreview({
  resume,
  document: suppliedDocument,
  originalDocument,
  template = "atsClassic",
  mode = "clean",
  diff = null,
}) {
  const document = suppliedDocument || parseResumeDocument(resume);
  const sourceDocument = originalDocument
    ? parseResumeDocument(originalDocument)
    : document;
  const sourceText = sourceDocument.rawText || "";
  const finalText = document.rawText || "";
  const validatedDiff = diff
    ? {
        ...diff,
        changes: (diff.changes || []).filter((change) => {
          const original = String(change.original_text || "");
          const suggested = String(change.suggested_text || "");
          return (
            suggested &&
            finalText.includes(suggested) &&
            (original
              ? sourceText.includes(original)
              : !sourceText.includes(suggested))
          );
        }),
      }
    : null;

  const SelectedTemplate =
    templates[template] || templates.atsClassic;

  return (
    <div className="w-full bg-white text-slate-900">
      <div className="mx-auto w-full max-w-[820px] bg-white">
        <SelectedTemplate
          document={document}
          originalDocument={originalDocument}
          mode={mode}
          diff={validatedDiff}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Resume Diff                                                                */
/* -------------------------------------------------------------------------- */

export const RenderResumeDiff = ({
  text,
  diff,
  className = "",
}) => {
  return (
    <ResumeDiff
      text={text}
      diff={diff}
      className={className}
    />
  );
};
