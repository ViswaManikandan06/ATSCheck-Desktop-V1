
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  FileText,
  FolderGit2,
  GraduationCap,
  Loader2,
  Plus,
  Printer,
  RotateCcw,
  Sparkles,
  Trash2,
  UserRound,
  Wrench,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ResumePreview from "../components/resume/ResumePreview";
import ResumeTemplateSelector from "../components/resume/ResumeTemplateSelector";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1";

const STEPS = [
  { number: 1, label: "Choose resume" },
  { number: 2, label: "Review content" },
  { number: 3, label: "Style and preview" },
];

const SECTION_DEFINITIONS = [
  {
    id: "personalInfo",
    label: "Personal information",
    description: "Your name and contact information.",
    icon: UserRound,
  },
  {
    id: "summary",
    label: "Professional summary",
    description: "Your professional profile and career focus.",
    icon: FileText,
  },
  {
    id: "experience",
    label: "Work experience",
    description: "Your roles, responsibilities, and achievements.",
    icon: BriefcaseBusiness,
  },
  {
    id: "education",
    label: "Education",
    description: "Degrees, institutions, and academic qualifications.",
    icon: GraduationCap,
  },
  {
    id: "skills",
    label: "Skills",
    description: "Technical skills, tools, and competencies.",
    icon: Wrench,
  },
  {
    id: "projects",
    label: "Projects",
    description: "Projects, technologies, and achievements.",
    icon: FolderGit2,
  },
  {
    id: "certifications",
    label: "Certifications",
    description: "Certifications and professional credentials.",
    icon: Award,
  },
];

const HEADING_MAP = {
  summary: "summary",
  "professional summary": "summary",
  profile: "summary",
  "professional profile": "summary",
  objective: "summary",
  "career objective": "summary",
  "about me": "summary",

  experience: "experience",
  "work experience": "experience",
  "professional experience": "experience",
  "employment history": "experience",
  "work history": "experience",
  "career history": "experience",
  "professional background": "experience",

  education: "education",
  "academic background": "education",
  "academic qualifications": "education",
  "educational qualifications": "education",

  skills: "skills",
  "technical skills": "skills",
  "core skills": "skills",
  "core competencies": "skills",
  "technical expertise": "skills",
  technologies: "skills",
  "key skills": "skills",

  projects: "projects",
  "personal projects": "projects",
  "academic projects": "projects",
  "key projects": "projects",
  "selected projects": "projects",
  "project experience": "projects",

  certifications: "certifications",
  certificates: "certifications",
  "licenses and certifications": "certifications",
  "professional certifications": "certifications",

  achievements: "additionalContent",
  awards: "additionalContent",
  "awards and honors": "additionalContent",
  "honors and awards": "additionalContent",
  publications: "additionalContent",
  languages: "additionalContent",
  "technical publications": "additionalContent",
  "volunteer experience": "additionalContent",
  "volunteer work": "additionalContent",
  leadership: "additionalContent",
  "leadership experience": "additionalContent",
  interests: "additionalContent",
  hobbies: "additionalContent",
  references: "additionalContent",
  "additional information": "additionalContent",
  "additional details": "additionalContent",
};

const EMPTY_RESUME = {
  personalInfo: {
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    portfolio: "",
  },
  summary: "",
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  additionalContent: "",
};

const ENTRY_DEFAULTS = {
  experience: {
    jobTitle: "",
    company: "",
    location: "",
    startDate: "",
    endDate: "",
    description: "",
  },
  education: {
    degree: "",
    institution: "",
    field: "",
    location: "",
    startDate: "",
    endDate: "",
    grade: "",
    description: "",
  },
  projects: {
    name: "",
    technologies: "",
    date: "",
    link: "",
    description: "",
  },
  certifications: {
    name: "",
    issuer: "",
    date: "",
    credentialUrl: "",
  },
};

const DATE_PATTERN =
  /\b(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+)?(?:19|20)\d{2}\b/i;

const DATE_RANGE_PATTERN =
  /((?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:19|20)\d{2})\s*(?:-|–|—|to)\s*((?:(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:19|20)\d{2}|present|current|till\s+date))/i;

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeHeading(line) {
  return String(line || "")
    .replace(/^[\s#>*•–—−-]+/, "")
    .replace(/[:|]+$/, "")
    .replace(/[*\s]+$/, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function getSectionHeading(line) {
  const normalized = normalizeHeading(line);
  return HEADING_MAP[normalized] || null;
}

function cleanValue(line) {
  return String(line || "")
    .replace(/^[\s•●▪◦·–—−*-]+/i, "")
    .trim();
}

function replaceControlCharacters(value) {
  return Array.from(String(value || ""), (character) => {
    const codePoint = character.codePointAt(0);
    const isControlCharacter =
      codePoint <= 0x09 ||
      (codePoint >= 0x0b && codePoint <= 0x1f) ||
      (codePoint >= 0x7f && codePoint <= 0x9f);

    return isControlCharacter ? " " : character;
  }).join("");
}

function normalizeExtractedLine(line) {
  return replaceControlCharacters(line)
    .replace(/^[\s§#ï]+\s*(?=(?:https?:|www\.|linkedin\.|github\.|[\w.+-]+@))/i, "")
    .replace(/^\+\s+(?=[A-Za-z])/, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function isBullet(line) {
  return /^[\s]*[•●▪◦·–—−*-]\s+/.test(line);
}

function isLikelyLocation(value) {
  return (
    value.length < 90 &&
    /,\s*[A-Z][A-Za-z .'-]+/.test(value) &&
    !DATE_PATTERN.test(value)
  );
}

function splitHeadingAndDetails(line) {
  const parts = line
    .split(/\s+[|•]\s+|\s+@\s+|\s+at\s+/i)
    .map((part) => part.trim())
    .filter(Boolean);

  return parts;
}

function extractDateRange(lines) {
  for (const [index, line] of lines.entries()) {
    const match = line.match(DATE_RANGE_PATTERN);

    if (match) {
      return {
        startDate: match[1].trim(),
        endDate: match[2].trim(),
        sourceIndex: index,
        matchIndex: match.index,
        matchLength: match[0].length,
      };
    }
  }

  return {
    startDate: "",
    endDate: "",
    sourceIndex: -1,
    matchIndex: -1,
    matchLength: 0,
  };
}

function splitIntoEntryBlocks(lines, section) {
  const blocks = [];
  let current = [];

  const flush = () => {
    const cleaned = current.filter((line) => line.trim());

    if (cleaned.length) {
      blocks.push(cleaned);
    }

    current = [];
  };

  for (const line of lines) {
    if (!line.trim()) {
      if (section !== "experience") {
        flush();
      }

      continue;
    }

    const hasDate = DATE_RANGE_PATTERN.test(line);
    const hasStandaloneDate = DATE_PATTERN.test(line);
    const startsWithBullet = isBullet(line);

    // A new date-bearing line commonly marks a new job or degree.
    // Avoid splitting when the date appears inside a bullet.
    const startsNewRecord =
      current.length > 0 &&
      !startsWithBullet &&
      (hasDate || (
        hasStandaloneDate &&
        current.some((previous) => DATE_RANGE_PATTERN.test(previous))
      ));
    const startsNewCertification =
      section === "certifications" &&
      current.length > 0 &&
      startsWithBullet;

    if (startsNewRecord || startsNewCertification) {
      flush();
    }

    current.push(line);
  }

  flush();

  // Skill lists and certifications often do not have blank lines.
  // For projects, keep descriptions attached to their project title.
  if (section === "skills") {
    return blocks.flatMap((block) => block.flatMap((line) => {
      const cleaned = cleanValue(line);
      const categorySeparator = cleaned.indexOf(":");
      const skillsText =
        categorySeparator > 0 && categorySeparator < 50
          ? cleaned.slice(categorySeparator + 1)
          : cleaned;

      return skillsText
        .split(/[,;|]/)
        .map(cleanValue)
        .filter(Boolean);
    }));
  }

  return blocks;
}

function parseExperienceBlock(block) {
  const item = {
    id: createId(),
    ...ENTRY_DEFAULTS.experience,
  };

  const dates = extractDateRange(block);
  item.startDate = dates.startDate;
  item.endDate = dates.endDate;
  const usedLines = new Set();
  const beforeDate = [];
  const afterDate = [];

  block.forEach((line, index) => {
    if (index === dates.sourceIndex) {
      const prefix = line
        .slice(0, dates.matchIndex)
        .replace(/[|,\s]+$/, "")
        .trim();
      const suffix = line
        .slice(dates.matchIndex + dates.matchLength)
        .replace(/^[|,\s]+/, "")
        .trim();

      if (prefix) beforeDate.push(prefix);
      if (suffix) afterDate.push(suffix);
      usedLines.add(index);
    } else if (!isBullet(line)) {
      (dates.sourceIndex >= 0 && index < dates.sourceIndex
        ? beforeDate
        : afterDate
      ).push(cleanValue(line));
    }
  });

  const before = beforeDate.filter(Boolean);
  const after = afterDate.filter(Boolean);

  if (before.length) {
    const headingParts = splitHeadingAndDetails(before.at(-1));

    if (headingParts.length > 1) {
      item.jobTitle = headingParts[0];
      const location = headingParts.at(-1);
      if (headingParts.length > 2 && isLikelyLocation(location)) {
        item.company = headingParts.slice(1, -1).join(" | ");
        item.location = location;
      } else {
        item.company = headingParts.slice(1).join(" | ");
      }
      usedLines.add(block.findIndex((line) => cleanValue(line) === before.at(-1)));
    } else if (before.length > 1) {
      item.jobTitle = before.at(-2);
      item.company = before.at(-1);
      for (const value of before.slice(-2)) {
        usedLines.add(block.findIndex((line) => cleanValue(line) === value));
      }
    } else if (after.length) {
      item.company = before[0];
      usedLines.add(block.findIndex((line) => cleanValue(line) === before[0]));
      const afterHeader = after.shift();
      const parts = splitHeadingAndDetails(afterHeader);
      item.jobTitle = parts[0] || afterHeader;
      if (parts.length > 1 && isLikelyLocation(parts.at(-1))) {
        item.location = parts.pop();
      }
      const sourceIndex = block.findIndex((line) => cleanValue(line) === afterHeader);
      if (sourceIndex >= 0) usedLines.add(sourceIndex);
    } else {
      item.jobTitle = before[0];
      usedLines.add(block.findIndex((line) => cleanValue(line) === before[0]));
    }
  } else if (after.length) {
    const headingParts = splitHeadingAndDetails(after[0]);
    item.jobTitle = headingParts[0];
    if (headingParts.length > 1) {
      const location = headingParts.at(-1);
      if (isLikelyLocation(location)) {
        item.location = location;
        if (headingParts.length > 2) {
          item.company = headingParts.slice(1, -1).join(" | ");
        }
      } else {
        item.company = headingParts.slice(1).join(" | ");
      }
    }
    const sourceIndex = block.findIndex((line) =>
      cleanValue(line) === after[0]
    );
    if (sourceIndex >= 0) usedLines.add(sourceIndex);
    after.shift();
  }

  const remaining = block
    .filter((line, index) => !usedLines.has(index))
    .filter((line) => !DATE_RANGE_PATTERN.test(line));
  const details = remaining.map(cleanValue).filter(Boolean);
  const locationIndex = details.findIndex(
    (line) =>
      /,\s*[A-Z][A-Za-z .'-]+/.test(line) &&
      !DATE_PATTERN.test(line) &&
      line.length < 90
  );

  if (locationIndex >= 0 && details.length > 1) {
    item.location = details[locationIndex];
    details.splice(locationIndex, 1);
  }

  item.description = details.join("\n");

  return item;
}

function parseEducationBlock(block) {
  const item = {
    id: createId(),
    ...ENTRY_DEFAULTS.education,
  };

  const dates = extractDateRange(block);
  item.startDate = dates.startDate;
  item.endDate = dates.endDate;

  const entries = block.map((line, index) => {
    if (index !== dates.sourceIndex) {
      return { index, text: line };
    }

    return {
      index,
      text: [
        line.slice(0, dates.matchIndex).replace(/[|,\s]+$/, ""),
        line.slice(dates.matchIndex + dates.matchLength).replace(/^[|,\s]+/, ""),
      ].filter(Boolean).join(" | "),
    };
  });
  const nonBullet = entries.filter(
    (entry) => entry.text.trim() && !isBullet(entry.text)
  );
  const institutionPattern = /\b(university|college|institute|school|academy)\b/i;
  const institutionEntry = nonBullet.find((entry) =>
    institutionPattern.test(entry.text)
  ) || (
    dates.sourceIndex >= 0 &&
    entries[dates.sourceIndex].text &&
    !/\b(bachelor|master|ph\.?d|b\.?tech|m\.?tech|b\.?sc|m\.?sc|mba|diploma)\b/i.test(
      entries[dates.sourceIndex].text
    )
      ? entries[dates.sourceIndex]
      : null
  );
  const degreeEntry = nonBullet.find(
    (entry) => entry !== institutionEntry
  );
  const consumed = new Set([dates.sourceIndex]);

  if (institutionEntry) {
    item.institution = cleanValue(
      institutionEntry.text.split(/\s+\|\s+/)[0]
    );
    consumed.add(institutionEntry.index);
  }

  if (degreeEntry) {
    const degreeParts = splitHeadingAndDetails(degreeEntry.text);
    const gradePart = degreeParts.find((part) =>
      /\b(CGPA|GPA|percentage|grade|score)\b/i.test(part)
    );
    const degree = degreeParts.find((part) => part !== gradePart) || "";

    item.degree = cleanValue(degree);
    if (gradePart) item.grade = cleanValue(gradePart);

    const fieldMatch = item.degree.match(/\bin\s+(.+)$/i);
    if (fieldMatch) {
      item.field = fieldMatch[1].trim();
      item.degree = item.degree.slice(0, fieldMatch.index).trim();
    }
    consumed.add(degreeEntry.index);
  }

  const gradeEntry = nonBullet.find((entry) =>
    /\b(CGPA|GPA|percentage|grade|score)\b/i.test(entry.text)
  );
  if (!item.grade && gradeEntry) item.grade = cleanValue(gradeEntry.text);

  item.description = entries
    .filter((entry) => !consumed.has(entry.index) && entry.text.trim())
    .map((entry) => cleanValue(entry.text))
    .filter(Boolean)
    .join("\n");

  return item;
}

function parseProjectBlock(block) {
  const item = {
    id: createId(),
    ...ENTRY_DEFAULTS.projects,
  };

  const remaining = [...block];
  const headerIndex = remaining.findIndex((line) => !isBullet(line));

  if (headerIndex >= 0) {
    const header = cleanValue(remaining[headerIndex]);
    const parts = splitHeadingAndDetails(header);
    item.name = parts.shift() || header;

    const headerDate = parts.find((part) => DATE_PATTERN.test(part));
    if (headerDate) {
      item.date = headerDate;
      parts.splice(parts.indexOf(headerDate), 1);
    }

    const inlineUrl = parts.join(" | ").match(/https?:\/\/\S+|www\.\S+/i);
    if (inlineUrl) {
      item.link = inlineUrl[0].replace(/[),.;]+$/, "");
      parts.splice(
        parts.findIndex((part) => part.includes(inlineUrl[0])),
        1
      );
    }

    item.technologies = parts.join(", ");
    remaining.splice(headerIndex, 1);
  }

  const description = [];

  for (const rawLine of remaining) {
    const line = cleanValue(rawLine);

    const technologyMatch = line.match(
      /^(?:technologies|tech stack|tools|built with)\s*:\s*(.+)$/i
    );

    const linkMatch = line.match(
      /https?:\/\/\S+/i
    );

    if (technologyMatch && !item.technologies) {
      item.technologies = technologyMatch[1];
    } else if (linkMatch && !item.link) {
      item.link = linkMatch[0];
      const leftover = line.replace(linkMatch[0], "").trim();

      if (leftover) description.push(leftover);
    } else if (line) {
      description.push(line);
    }
  }

  item.description = description.join("\n");

  return item;
}

function parseCertificationBlock(block) {
  const item = {
    id: createId(),
    ...ENTRY_DEFAULTS.certifications,
  };

  const remaining = block.map(cleanValue).filter(Boolean);
  const parts = splitHeadingAndDetails(remaining[0] || "");
  const dashParts = parts[0]?.match(/^(.*?)\s+[–—]\s+(.+)$/);
  if (dashParts && !DATE_PATTERN.test(dashParts[2])) {
    parts.splice(0, 1, dashParts[1].trim(), dashParts[2].trim());
  }
  const datePart = parts.find((part) => DATE_PATTERN.test(part));

  item.name = parts.find((part) => part !== datePart) || remaining[0] || "";
  item.issuer =
    parts.find((part) => part !== item.name && part !== datePart) ||
    remaining[1] ||
    "";
  item.date =
    datePart ||
    remaining.find((line) => DATE_PATTERN.test(line)) ||
    "";

  const urlMatch = block.join(" ").match(/https?:\/\/\S+/i);

  if (urlMatch) {
    item.credentialUrl = urlMatch[0];
  }

  return item;
}

/**
 * Build an editable draft from the extracted text.
 *
 * This parser intentionally preserves content that cannot be confidently
 * assigned to a field. It does not modify the original uploaded resume.
 */
function parseResumeText(text) {
  const originalSource = String(text || "").replace(/\r\n?/g, "\n");
  const source = replaceControlCharacters(
    originalSource
  );
  const lines = source.split("\n").map(normalizeExtractedLine);

  const result = {
    ...clone(EMPTY_RESUME),
    personalInfo: { ...EMPTY_RESUME.personalInfo },
    experience: [],
    education: [],
    skills: [],
    projects: [],
    certifications: [],
    additionalContent: "",
  };

  const rawSections = {};
  let currentSection = null;
  const preamble = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const heading = getSectionHeading(line);

    if (heading) {
      currentSection = heading;

      if (!rawSections[currentSection]) {
        rawSections[currentSection] = [];
      }

      continue;
    }

    if (currentSection) {
      rawSections[currentSection].push(rawLine);
    } else {
      preamble.push(rawLine);
    }
  }

  const emailMatch = source.match(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
  );

  const phoneMatch = source.match(
    /(?:\+\d{1,3}[\s.-]?)?(?:\(?\d{2,5}\)?[\s.-]?)?\d{3,5}[\s.-]?\d{4,6}/
  );

  const linkedinMatch = source.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s,;|]+/i
  );

  const urls = source.match(/(?:https?:\/\/|www\.)[^\s,;|]+/gi) || [];
  const bareProfileUrls =
    source.match(/(?:linkedin|github)\.com\/[^\s,;|]+/gi) || [];

  result.personalInfo.email = emailMatch?.[0] || "";
  result.personalInfo.phone = phoneMatch?.[0]?.trim() || "";
  result.personalInfo.linkedin = linkedinMatch?.[0] || "";
  result.personalInfo.portfolio =
    urls.find((url) => !/linkedin\.com/i.test(url)) ||
    bareProfileUrls.find((url) => !/linkedin\.com/i.test(url)) ||
    "";

  const preambleLines = preamble
    .map(normalizeExtractedLine)
    .filter(Boolean);

  const contactPattern =
    /@|linkedin\.com|github\.com|https?:\/\/|(?:\+\d[\d\s().-]{7,})/i;

  const nameCandidates = preambleLines.filter(
    (line) => !contactPattern.test(line)
  );

  if (nameCandidates.length) {
    result.personalInfo.fullName = nameCandidates[0]
      .replace(/^[#>*•\s]+|[*\s]+$/g, "")
      .trim();
  }

  const contactLocationCandidate = preambleLines
    .filter((line) => contactPattern.test(line))
    .flatMap((line) => line.split(/\s+\|\s+/))
    .map(cleanValue)
    .find(isLikelyLocation);

  const locationCandidate = nameCandidates.find(
    (line, index) =>
      index > 0 &&
      line.length < 90 &&
      /,/.test(line) &&
      !DATE_PATTERN.test(line)
  );

  if (contactLocationCandidate || locationCandidate) {
    result.personalInfo.location = contactLocationCandidate || locationCandidate;
  }

  result.summary = (rawSections.summary || [])
    .join("\n")
    .trim();

  const experienceBlocks = splitIntoEntryBlocks(
    rawSections.experience || [],
    "experience"
  );

  result.experience = experienceBlocks
    .map(parseExperienceBlock)
    .filter((item) =>
      item.jobTitle ||
      item.company ||
      item.description
    );

  const educationBlocks = splitIntoEntryBlocks(
    rawSections.education || [],
    "education"
  );

  result.education = educationBlocks
    .map(parseEducationBlock)
    .filter((item) =>
      item.degree ||
      item.institution ||
      item.description
    );

  const skillLines = rawSections.skills || [];

  result.skills = splitIntoEntryBlocks(
    skillLines,
    "skills"
  )
    .flat()
    .map(cleanValue)
    .filter(Boolean)
    .map((name) => ({
      id: createId(),
      name,
    }));

  const projectBlocks = splitIntoEntryBlocks(
    rawSections.projects || [],
    "projects"
  );

  result.projects = projectBlocks
    .map(parseProjectBlock)
    .filter((item) =>
      item.name ||
      item.description ||
      item.technologies
    );

  const certificationBlocks = splitIntoEntryBlocks(
    rawSections.certifications || [],
    "certifications"
  );

  result.certifications = certificationBlocks
    .map(parseCertificationBlock)
    .filter((item) => item.name || item.issuer);

  // Keep other recognized sections and text outside recognized headings.
  // This is the recovery area for information the parser cannot classify.
  const additionalParts = [];

  for (const [heading, content] of Object.entries(rawSections)) {
    if (heading === "additionalContent") {
      additionalParts.push(content.join("\n").trim());
    }
  }

  const unmatchedPreamble = preambleLines
    .filter((line, index) => {
      if (index === 0 && line === result.personalInfo.fullName) return false;
      if (contactPattern.test(line)) return false;
      if (line === result.personalInfo.location) return false;
      return true;
    });

  if (unmatchedPreamble.length) {
    additionalParts.push(
      "Other extracted information:\n" + unmatchedPreamble.join("\n")
    );
  }

  result.additionalContent = additionalParts
    .filter(Boolean)
    .join("\n\n");

  // Keep the source text available for recovery and change comparison.
  result._originalText = originalSource;

  return result;
}

function serializeResume(data) {
  const lines = [];
  const info = data.personalInfo || {};

  if (info.fullName) lines.push(info.fullName);

  const contact = [
    info.email,
    info.phone,
    info.location,
    info.linkedin,
    info.portfolio,
  ].filter(Boolean);

  if (contact.length) {
    lines.push(contact.join(" | "));
  }

  if (data.summary?.trim()) {
    lines.push("", "PROFESSIONAL SUMMARY", data.summary.trim());
  }

  if (data.experience?.some((item) =>
    item.jobTitle || item.company || item.description
  )) {
    lines.push("", "WORK EXPERIENCE");

    data.experience.forEach((item) => {
      const heading = [item.jobTitle, item.company]
        .filter(Boolean)
        .join(" | ");

      if (heading) lines.push(heading);

      const details = [
        item.location,
        [item.startDate, item.endDate].filter(Boolean).join(" - "),
      ].filter(Boolean);

      if (details.length) lines.push(details.join(" | "));
      if (item.description?.trim()) lines.push(item.description.trim());

      lines.push("");
    });
  }

  if (data.education?.some((item) =>
    item.degree || item.institution || item.description
  )) {
    lines.push("", "EDUCATION");

    data.education.forEach((item) => {
      const heading = [
        item.degree,
        item.field,
        item.institution,
      ].filter(Boolean).join(" | ");

      if (heading) lines.push(heading);

      const details = [
        item.location,
        [item.startDate, item.endDate].filter(Boolean).join(" - "),
        item.grade,
      ].filter(Boolean);

      if (details.length) lines.push(details.join(" | "));
      if (item.description?.trim()) lines.push(item.description.trim());

      lines.push("");
    });
  }

  if (data.skills?.some((item) => item.name?.trim())) {
    lines.push(
      "",
      "SKILLS",
      data.skills.map((item) => item.name.trim()).filter(Boolean).join(", ")
    );
  }

  if (data.projects?.some((item) =>
    item.name || item.description || item.technologies || item.date
  )) {
    lines.push("", "PROJECTS");

    data.projects.forEach((item) => {
      if (item.name) {
        lines.push([item.name, item.date].filter(Boolean).join(" | "));
      }
      if (item.technologies) {
        lines.push(`Technologies: ${item.technologies}`);
      }
      if (item.link) lines.push(item.link);
      if (item.description?.trim()) lines.push(item.description.trim());

      lines.push("");
    });
  }

  if (data.certifications?.some((item) => item.name || item.issuer)) {
    lines.push("", "CERTIFICATIONS");

    data.certifications.forEach((item) => {
      const heading = [item.name, item.issuer, item.date]
        .filter(Boolean)
        .join(" | ");

      if (heading) lines.push(heading);
      if (item.credentialUrl) lines.push(item.credentialUrl);
    });
  }

  if (data.additionalContent?.trim()) {
    lines.push(
      "",
      "ADDITIONAL INFORMATION",
      data.additionalContent.trim()
    );
  }

  return lines.join("\n").trim();
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  type = "text",
  rows = 4,
}) {
  const className =
    "w-full border-2 border-black bg-[#fffdf8] p-3 text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-[#b8ff5a]";

  return (
    <label className="block min-w-0">
      <span className="mb-2 block text-xs font-black uppercase tracking-wide text-gray-600">
        {label}
      </span>

      {multiline ? (
        <textarea
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`${className} resize-y leading-6`}
        />
      ) : (
        <input
          type={type}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={className}
        />
      )}
    </label>
  );
}

function EntryCard({ title, onRemove, children }) {
  return (
    <article className="border-2 border-black bg-[#fffdf8]">
      <div className="flex items-center justify-between gap-3 border-b-2 border-black bg-[#f5f1e8] px-4 py-3">
        <h3 className="text-sm font-black">{title}</h3>

        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-1 text-xs font-black text-red-700 hover:underline"
        >
          <Trash2 size={14} />
          Remove
        </button>
      </div>

      <div className="space-y-4 p-4">{children}</div>
    </article>
  );
}

function ResumeBuilder() {
  const navigate = useNavigate();

  const [resumes, setResumes] = useState([]);
  const [selectedUuid, setSelectedUuid] = useState("");
  const [resumeData, setResumeData] = useState(() => clone(EMPTY_RESUME));
  const [originalData, setOriginalData] = useState(null);
  const [originalText, setOriginalText] = useState("");
  const [template, setTemplate] = useState("atsClassic");
  const [step, setStep] = useState(1);
  const [activeSection, setActiveSection] = useState("personalInfo");
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState("");
  const [extractionWarning, setExtractionWarning] = useState("");
  const selectionRequestId = useRef(0);

  const selectedResume = resumes.find(
    (resume) => resume.resumeUuid === selectedUuid
  );

  const previewContent = useMemo(
    () => serializeResume(resumeData),
    [resumeData]
  );

  const hasEdits = useMemo(
    () => Boolean(originalData) &&
      JSON.stringify(resumeData) !== JSON.stringify(originalData),
    [resumeData, originalData]
  );

  const wordCount = useMemo(
    () => previewContent.split(/\s+/).filter(Boolean).length,
    [previewContent]
  );

  const completedSections = useMemo(() => {
    const info = resumeData.personalInfo || {};

    return {
      personalInfo: Boolean(
        info.fullName || info.email || info.phone || info.linkedin || info.portfolio
      ),
      summary: Boolean(resumeData.summary.trim()),
      experience: resumeData.experience.some(
        (item) => item.jobTitle || item.company || item.description
      ),
      education: resumeData.education.some(
        (item) =>
          item.degree || item.field || item.institution || item.description
      ),
      skills: resumeData.skills.some((item) => item.name.trim()),
      projects: resumeData.projects.some(
        (item) => item.name || item.description || item.technologies || item.date
      ),
      certifications: resumeData.certifications.some(
        (item) => item.name || item.issuer
      ),
    };
  }, [resumeData]);

  const completedCount = Object.values(completedSections).filter(Boolean).length;

  useEffect(() => {
    const controller = new AbortController();

    async function loadResumes() {
      try {
        const response = await fetch(`${API_BASE_URL}/resumes`, {
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Failed to load resumes.");
        }

        const options = Array.isArray(data.resumes)
          ? data.resumes.map((resume) => ({
              resumeUuid: resume.resume_uuid,
              name:
                resume.filename ||
                resume.original_filename ||
                "Untitled resume",
            }))
          : [];

        setResumes(options);
      } catch (loadError) {
        if (loadError.name !== "AbortError") {
          setError(loadError.message || "Failed to load resumes.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoadingResumes(false);
        }
      }
    }

    loadResumes();

    return () => controller.abort();
  }, []);

  const handleSelectResume = async (resumeUuid) => {
    const requestId = ++selectionRequestId.current;
    setSelectedUuid(resumeUuid);
    setError("");
    setExtractionWarning("");
    setOriginalText("");
    setOriginalData(null);
    setResumeData(clone(EMPTY_RESUME));

    if (!resumeUuid) {
      setLoadingContent(false);
      return;
    }

    setLoadingContent(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/resumes/${encodeURIComponent(resumeUuid)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to load resume content.");
      }

      const extracted = data.parsed_text || "";
      const draft = parseResumeText(extracted);

      if (requestId !== selectionRequestId.current) return;

      if (!data.text_extractable) {
        setExtractionWarning(
          data.is_scanned_image
            ? "This PDF appears to be image-only, so text could not be extracted. OCR is not available in this installation. You can still build a resume by entering the details manually."
            : "No readable text was extracted from this file. You can still build a resume by entering the details manually."
        );
      }

      setOriginalText(extracted);
      setResumeData(draft);
      setOriginalData(clone(draft));
      setActiveSection("personalInfo");
      setStep(2);
    } catch (loadError) {
      if (requestId !== selectionRequestId.current) return;
      setError(loadError.message || "Failed to load resume content.");
    } finally {
      if (requestId === selectionRequestId.current) {
        setLoadingContent(false);
      }
    }
  };

  const updatePersonalInfo = (field, value) => {
    setResumeData((previous) => ({
      ...previous,
      personalInfo: {
        ...previous.personalInfo,
        [field]: value,
      },
    }));
  };

  const updateScalar = (field, value) => {
    setResumeData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const updateEntry = (section, id, field, value) => {
    setResumeData((previous) => ({
      ...previous,
      [section]: previous[section].map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addEntry = (section) => {
    setResumeData((previous) => ({
      ...previous,
      [section]: [
        ...previous[section],
        { id: createId(), ...ENTRY_DEFAULTS[section] },
      ],
    }));
  };

  const removeEntry = (section, id) => {
    setResumeData((previous) => ({
      ...previous,
      [section]: previous[section].filter((item) => item.id !== id),
    }));
  };

  const handleReset = () => {
    if (!originalData) return;

    setResumeData(clone(originalData));
    setError("");
  };

  const sectionIndex = SECTION_DEFINITIONS.findIndex(
    (section) => section.id === activeSection
  );

  const currentSection = SECTION_DEFINITIONS[sectionIndex];

  const goToSection = (index) => {
    if (index >= 0 && index < SECTION_DEFINITIONS.length) {
      setActiveSection(SECTION_DEFINITIONS[index].id);
    }
  };

  const handleContinue = () => {
    const info = resumeData.personalInfo;
    const hasContact = Boolean(
      info.email || info.phone || info.linkedin || info.portfolio
    );
    const hasResumeContent = Boolean(
      resumeData.summary.trim() ||
      resumeData.experience.some((item) =>
        item.jobTitle || item.company || item.description.trim()
      ) ||
      resumeData.education.some((item) =>
        item.degree || item.institution || item.description.trim()
      ) ||
      resumeData.skills.some((item) => item.name.trim()) ||
      resumeData.projects.some((item) =>
        item.name || item.description.trim() || item.technologies
      ) ||
      resumeData.certifications.some((item) => item.name || item.issuer) ||
      resumeData.additionalContent.trim()
    );

    if (!info.fullName.trim()) {
      setError("Add your full name before previewing the resume.");
      setActiveSection("personalInfo");
      return;
    }

    if (!hasContact) {
      setError("Add at least one contact method before previewing the resume.");
      setActiveSection("personalInfo");
      return;
    }

    if (info.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(info.email.trim())) {
      setError("Enter a valid email address or remove the email field.");
      setActiveSection("personalInfo");
      return;
    }

    if (!hasResumeContent || !previewContent.trim()) {
      setError("Add at least one resume section before continuing.");
      return;
    }

    setError("");
    setStep(3);
  };

  const handlePrint = () => {
    window.print();
  };

  const renderSectionForm = () => {
    switch (activeSection) {
      case "personalInfo": {
        const info = resumeData.personalInfo;

        return (
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" value={info.fullName}
              onChange={(value) => updatePersonalInfo("fullName", value)}
              placeholder="Your full name" />

            <Field label="Email address" type="email" value={info.email}
              onChange={(value) => updatePersonalInfo("email", value)}
              placeholder="you@example.com" />

            <Field label="Phone number" value={info.phone}
              onChange={(value) => updatePersonalInfo("phone", value)}
              placeholder="+91 98765 43210" />

            <Field label="Location" value={info.location}
              onChange={(value) => updatePersonalInfo("location", value)}
              placeholder="City, Country" />

            <Field label="LinkedIn URL" value={info.linkedin}
              onChange={(value) => updatePersonalInfo("linkedin", value)}
              placeholder="https://linkedin.com/in/..." />

            <Field label="Portfolio / GitHub" value={info.portfolio}
              onChange={(value) => updatePersonalInfo("portfolio", value)}
              placeholder="https://..." />
          </div>
        );
      }

      case "summary":
        return (
          <Field
            label="Professional summary"
            value={resumeData.summary}
            onChange={(value) => updateScalar("summary", value)}
            placeholder="Summarize your experience, strengths, and career focus..."
            multiline
          />
        );

      case "experience":
        return (
          <div className="space-y-4">
            {resumeData.experience.map((item, index) => (
              <EntryCard key={item.id} title={`Experience ${index + 1}`}
                onRemove={() => removeEntry("experience", item.id)}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Job title" value={item.jobTitle}
                    onChange={(value) => updateEntry("experience", item.id, "jobTitle", value)}
                    placeholder="Data Scientist" />

                  <Field label="Company" value={item.company}
                    onChange={(value) => updateEntry("experience", item.id, "company", value)}
                    placeholder="Company name" />

                  <Field label="Location" value={item.location}
                    onChange={(value) => updateEntry("experience", item.id, "location", value)}
                    placeholder="Bengaluru, India" />

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Start date" value={item.startDate}
                      onChange={(value) => updateEntry("experience", item.id, "startDate", value)}
                      placeholder="Jul 2024" />

                    <Field label="End date" value={item.endDate}
                      onChange={(value) => updateEntry("experience", item.id, "endDate", value)}
                      placeholder="Present" />
                  </div>
                </div>

                <Field label="Responsibilities and achievements"
                  value={item.description}
                  onChange={(value) => updateEntry("experience", item.id, "description", value)}
                  placeholder="Describe your work. Use a new line for each achievement."
                  multiline />
              </EntryCard>
            ))}

            <button type="button" onClick={() => addEntry("experience")}
              className="flex w-full items-center justify-center gap-2 border-2 border-dashed border-black p-4 text-sm font-black hover:bg-[#b8ff5a]">
              <Plus size={17} /> Add work experience
            </button>
          </div>
        );

      case "education":
        return (
          <div className="space-y-4">
            {resumeData.education.map((item, index) => (
              <EntryCard key={item.id} title={`Education ${index + 1}`}
                onRemove={() => removeEntry("education", item.id)}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Degree" value={item.degree}
                    onChange={(value) => updateEntry("education", item.id, "degree", value)}
                    placeholder="B.Tech" />

                  <Field label="Field of study" value={item.field}
                    onChange={(value) => updateEntry("education", item.id, "field", value)}
                    placeholder="Computer Science" />

                  <Field label="Institution" value={item.institution}
                    onChange={(value) => updateEntry("education", item.id, "institution", value)}
                    placeholder="University / college" />

                  <Field label="Location" value={item.location}
                    onChange={(value) => updateEntry("education", item.id, "location", value)}
                    placeholder="City, Country" />

                  <Field label="Start date" value={item.startDate}
                    onChange={(value) => updateEntry("education", item.id, "startDate", value)}
                    placeholder="2020" />

                  <Field label="End date" value={item.endDate}
                    onChange={(value) => updateEntry("education", item.id, "endDate", value)}
                    placeholder="2024" />

                  <Field label="Grade / GPA" value={item.grade}
                    onChange={(value) => updateEntry("education", item.id, "grade", value)}
                    placeholder="8.32 CGPA" />
                </div>

                <Field label="Additional details" value={item.description}
                  onChange={(value) => updateEntry("education", item.id, "description", value)}
                  placeholder="Relevant coursework, honors, etc."
                  multiline />
              </EntryCard>
            ))}

            <button type="button" onClick={() => addEntry("education")}
              className="flex w-full items-center justify-center gap-2 border-2 border-dashed border-black p-4 text-sm font-black hover:bg-[#b8ff5a]">
              <Plus size={17} /> Add education
            </button>
          </div>
        );

      case "skills":
        return (
          <div className="space-y-4">
            <p className="text-sm font-semibold leading-6 text-gray-600">
              Review the extracted skills and add or remove any skills.
            </p>

            {resumeData.skills.map((item, index) => (
              <div key={item.id} className="flex items-end gap-3">
                <div className="flex-1">
                  <Field label={`Skill ${index + 1}`} value={item.name}
                    onChange={(value) => updateEntry("skills", item.id, "name", value)}
                    placeholder="Python, SQL, PyTorch..." />
                </div>

                <button type="button" onClick={() => removeEntry("skills", item.id)}
                  className="border-2 border-black bg-white p-3 hover:bg-red-100"
                  aria-label={`Remove skill ${index + 1}`}>
                  <Trash2 size={17} />
                </button>
              </div>
            ))}

            <button type="button" onClick={() =>
              setResumeData((previous) => ({
                ...previous,
                skills: [...previous.skills, { id: createId(), name: "" }],
              }))
            }
              className="flex w-full items-center justify-center gap-2 border-2 border-dashed border-black p-4 text-sm font-black hover:bg-[#b8ff5a]">
              <Plus size={17} /> Add skill
            </button>
          </div>
        );

      case "projects":
        return (
          <div className="space-y-4">
            {resumeData.projects.map((item, index) => (
              <EntryCard key={item.id} title={`Project ${index + 1}`}
                onRemove={() => removeEntry("projects", item.id)}>
                <Field label="Project name" value={item.name}
                  onChange={(value) => updateEntry("projects", item.id, "name", value)}
                  placeholder="Project name" />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Technologies" value={item.technologies}
                    onChange={(value) => updateEntry("projects", item.id, "technologies", value)}
                    placeholder="Python, FastAPI, React..." />

                  <Field label="Date" value={item.date}
                    onChange={(value) => updateEntry("projects", item.id, "date", value)}
                    placeholder="2024" />

                  <Field label="Project URL" value={item.link}
                    onChange={(value) => updateEntry("projects", item.id, "link", value)}
                    placeholder="GitHub / demo URL" />
                </div>

                <Field label="Description and achievements" value={item.description}
                  onChange={(value) => updateEntry("projects", item.id, "description", value)}
                  placeholder="Describe the problem, solution, and results."
                  multiline />
              </EntryCard>
            ))}

            <button type="button" onClick={() => addEntry("projects")}
              className="flex w-full items-center justify-center gap-2 border-2 border-dashed border-black p-4 text-sm font-black hover:bg-[#b8ff5a]">
              <Plus size={17} /> Add project
            </button>
          </div>
        );

      case "certifications":
        return (
          <div className="space-y-4">
            {resumeData.certifications.map((item, index) => (
              <EntryCard key={item.id} title={`Certification ${index + 1}`}
                onRemove={() => removeEntry("certifications", item.id)}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Certification name" value={item.name}
                    onChange={(value) => updateEntry("certifications", item.id, "name", value)}
                    placeholder="Certification title" />

                  <Field label="Issuing organization" value={item.issuer}
                    onChange={(value) => updateEntry("certifications", item.id, "issuer", value)}
                    placeholder="Organization" />

                  <Field label="Issue date" value={item.date}
                    onChange={(value) => updateEntry("certifications", item.id, "date", value)}
                    placeholder="2025" />

                  <Field label="Credential URL" value={item.credentialUrl}
                    onChange={(value) => updateEntry("certifications", item.id, "credentialUrl", value)}
                    placeholder="https://..." />
                </div>
              </EntryCard>
            ))}

            <button type="button" onClick={() => addEntry("certifications")}
              className="flex w-full items-center justify-center gap-2 border-2 border-dashed border-black p-4 text-sm font-black hover:bg-[#b8ff5a]">
              <Plus size={17} /> Add certification
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-[1500px]">
      <header className="mb-6 border-b-[3px] border-black pb-5">
        <button type="button" onClick={() => navigate("/")}
          className="mb-4 flex items-center gap-2 text-sm font-black hover:underline">
          <ArrowLeft size={17} strokeWidth={3} />
          Back to workspace
        </button>

        <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
          Resume studio
        </p>

        <h1 className="mt-1 text-4xl font-black tracking-[-0.05em]">
          Build your resume.
        </h1>

        <p className="mt-3 max-w-2xl font-semibold leading-6 text-gray-600">
          Start with your extracted resume, refine each section, and preview
          the updated content in your chosen template.
        </p>
      </header>

      <nav className="mb-6 grid gap-2 sm:grid-cols-3"
        aria-label="Resume builder steps">
        {STEPS.map((item) => (
          <button key={item.number} type="button"
            onClick={() => item.number <= step && setStep(item.number)}
            disabled={item.number > step}
            className={[
              "flex items-center gap-3 border-[3px] border-black px-4 py-3 text-left transition",
              item.number === step
                ? "bg-[#b8ff5a] shadow-[4px_4px_0_#111]"
                : item.number < step
                  ? "bg-white"
                  : "bg-[#f5f1e8] opacity-60",
            ].join(" ")}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-black bg-white text-xs font-black">
              {item.number < step ? <Check size={14} strokeWidth={4} /> : item.number}
            </span>
            <span className="text-sm font-black">{item.label}</span>
          </button>
        ))}
      </nav>

      {error && (
        <div role="alert"
          className="mb-6 border-[3px] border-black bg-[#ffdddd] p-4 text-sm font-bold">
          {error}
        </div>
      )}

      {step === 1 && (
        <section className="border-[3px] border-black bg-white p-6 shadow-[7px_7px_0_#111]">
          <div className="flex items-start gap-4 border-b-[3px] border-black pb-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center border-[3px] border-black bg-[#ffcf56]">
              <FileText size={23} strokeWidth={3} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                Step 1
              </p>
              <h2 className="mt-1 text-2xl font-black">
                Choose the resume to build from
              </h2>
              <p className="mt-2 text-sm font-semibold text-gray-600">
                Your uploaded resume will be used to create an editable draft.
              </p>
            </div>
          </div>

          {loadingResumes ? (
            <div className="mt-6 flex items-center gap-2 border-[3px] border-black bg-[#f5f1e8] p-4 font-black">
              <Loader2 className="animate-spin" size={18} />
              Loading resumes...
            </div>
          ) : resumes.length === 0 ? (
            <div className="mt-6 border-[3px] border-dashed border-black p-6 text-center">
              <p className="font-black">No resumes uploaded yet.</p>
              <button type="button" onClick={() => navigate("/upload")}
                className="mt-4 border-[3px] border-black bg-[#b8ff5a] px-4 py-2 font-black shadow-[3px_3px_0_#111]">
                Upload resume
              </button>
            </div>
          ) : (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {resumes.map((resume) => (
                <button key={resume.resumeUuid} type="button"
                  disabled={loadingContent}
                  onClick={() => handleSelectResume(resume.resumeUuid)}
                  className="flex items-center gap-3 border-[3px] border-black bg-[#fffdf8] p-4 text-left font-black shadow-[3px_3px_0_#111] transition hover:-translate-y-0.5 hover:bg-[#b8ff5a] disabled:opacity-50">
                  <FileText size={20} />
                  <span className="truncate">{resume.name}</span>
                  <ArrowRight className="ml-auto shrink-0" size={17} />
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="border-[3px] border-black bg-white shadow-[7px_7px_0_#111]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-black bg-[#f5f1e8] p-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
                Step 2 · {selectedResume?.name}
              </p>
              <h2 className="mt-1 text-2xl font-black">
                Review your extracted draft
              </h2>
              <p className="mt-2 text-sm font-semibold text-gray-600">
                Edit the prefilled fields, add entries, or remove information.
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm font-black">
                {completedCount} / {SECTION_DEFINITIONS.length}
              </p>
              <p className="text-xs font-semibold text-gray-600">
                Sections with content
              </p>
            </div>
          </div>

          {loadingContent ? (
            <div className="flex items-center gap-3 p-8 font-black">
              <Loader2 className="animate-spin" size={22} />
              Extracting your resume draft...
            </div>
          ) : (
            <>
          <div className="space-y-3 border-b-[3px] border-black p-5">
            <p className="border-2 border-black bg-[#fff4d6] p-3 text-sm font-semibold leading-6">
              Auto-extraction is a first draft, not a verified resume. Compare
              every section with the original and correct anything missing or
              misclassified before using the preview.
            </p>
            {extractionWarning && (
              <p role="alert" className="border-2 border-black bg-[#ffdddd] p-3 text-sm font-semibold leading-6">
                {extractionWarning}
              </p>
            )}
            <details className="border-2 border-black bg-white p-3">
              <summary className="cursor-pointer text-sm font-black">
                Inspect original extracted text
              </summary>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap border-t border-black pt-3 text-xs leading-5">
                {originalText || "No readable text was extracted."}
              </pre>
            </details>
          </div>
          <div className="grid h-[min(70vh,780px)] min-h-[480px] grid-rows-[minmax(0,0.38fr)_minmax(0,0.62fr)] overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)] lg:grid-rows-1">
                <aside className="min-h-0 overflow-y-auto border-b-[3px] border-black bg-[#f5f1e8] p-4 lg:border-b-0 lg:border-r-[3px]">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                      Resume sections
                    </p>

                    <button type="button" onClick={handleReset}
                      disabled={!hasEdits}
                      className="flex items-center gap-1 text-xs font-black underline disabled:opacity-40">
                      <RotateCcw size={13} />
                      Reset
                    </button>
                  </div>

                  <div className="space-y-2">
                    {SECTION_DEFINITIONS.map((section, index) => {
                      const Icon = section.icon;
                      const active = activeSection === section.id;

                      return (
                        <button key={section.id} type="button"
                          onClick={() => goToSection(index)}
                          className={[
                            "flex w-full items-center gap-3 border-2 p-3 text-left transition",
                            active
                              ? "border-black bg-[#b8ff5a] shadow-[3px_3px_0_#111]"
                              : "border-transparent bg-white hover:border-black",
                          ].join(" ")}>
                          <Icon size={19} className="shrink-0" />

                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-black">
                              {section.label}
                            </span>
                            <span className="mt-1 block text-xs font-semibold text-gray-500">
                              {completedSections[section.id]
                                ? "Content added"
                                : "Needs review"}
                            </span>
                          </span>

                          {completedSections[section.id] ? (
                            <Check size={16} className="shrink-0" />
                          ) : (
                            <ChevronRight size={16} className="shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 border-2 border-black bg-white p-3">
                    <Sparkles size={19} />
                    <p className="mt-2 text-sm font-black">Draft-first editing</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-gray-600">
                      Existing information is prefilled where recognized.
                      Check extracted fields and keep any details the parser
                      could not classify in the additional information section.
                    </p>
                  </div>
                </aside>

                <div className="flex min-h-0 min-w-0 flex-col overflow-hidden p-5 sm:p-7">
                  <div className="mb-6 shrink-0 border-b-2 border-black pb-5">
                    <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                      Section {sectionIndex + 1} of {SECTION_DEFINITIONS.length}
                    </p>
                    <h3 className="mt-2 text-2xl font-black">
                      {currentSection?.label}
                    </h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-gray-600">
                      {currentSection?.description}
                    </p>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto pr-2">
                    {renderSectionForm()}

                    {activeSection === "certifications" && (
                      <div className="mt-6 border-t-2 border-black pt-5">
                        <Field
                          label="Other extracted information"
                          value={resumeData.additionalContent}
                          onChange={(value) => updateScalar("additionalContent", value)}
                          placeholder="Review and preserve achievements, publications, languages, or other details not listed above."
                          multiline
                          rows={6}
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t-2 border-black pt-5">
                    <button type="button"
                      onClick={() => {
                        if (sectionIndex === 0) setStep(1);
                        else goToSection(sectionIndex - 1);
                      }}
                      className="flex items-center gap-2 border-2 border-black bg-white px-4 py-3 text-sm font-black hover:bg-[#f5f1e8]">
                      <ArrowLeft size={16} />
                      Previous
                    </button>

                    {sectionIndex < SECTION_DEFINITIONS.length - 1 ? (
                      <button type="button"
                        onClick={() => goToSection(sectionIndex + 1)}
                        className="flex items-center gap-2 border-2 border-black bg-[#b8ff5a] px-5 py-3 text-sm font-black shadow-[3px_3px_0_#111]">
                        Next section
                        <ArrowRight size={16} />
                      </button>
                    ) : (
                      <button type="button" onClick={handleContinue}
                        className="flex items-center gap-2 border-2 border-black bg-[#b8ff5a] px-5 py-3 text-sm font-black shadow-[3px_3px_0_#111]">
                        Preview resume
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t-[3px] border-black bg-[#f5f1e8] p-5">
                <div>
                  <p className="text-sm font-black">{wordCount} words</p>
                  <p className="text-xs font-semibold text-gray-600">
                    {hasEdits
                      ? "Draft changed — original upload remains untouched."
                      : "Review your draft before previewing."}
                  </p>
                </div>

                <button type="button" onClick={handleContinue}
                  className="flex items-center gap-2 border-[3px] border-black bg-[#b8ff5a] px-5 py-3 text-sm font-black shadow-[3px_3px_0_#111]">
                  Continue to preview
                  <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="border-[3px] border-black bg-white shadow-[7px_7px_0_#111]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-black bg-[#111] p-5 text-white">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-400">
                Step 3 · Presentation only
              </p>
              <h2 className="mt-1 text-2xl font-black">Style and preview</h2>
            </div>
            <span className="text-xs font-black text-gray-300">
              {selectedResume?.name}
            </span>
          </div>

          <div className="grid gap-6 p-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="space-y-4">
              <ResumeTemplateSelector
                selectedTemplate={template}
                onSelect={setTemplate}
              />

              <div className="border-[3px] border-black bg-[#e7f7c7] p-4 text-sm font-bold">
                <Check size={17} className="mb-2" />
                <p>Preview reflects the current wizard draft.</p>
                <p className="mt-2 text-xs font-semibold">
                  Use Print / Save PDF to export this version. The original upload
                  remains unchanged.
                </p>
              </div>

              <button type="button" onClick={() => setStep(2)}
                className="flex items-center gap-2 text-sm font-black underline">
                <ArrowLeft size={15} />
                Edit resume sections
              </button>

              <div className="border-2 border-black bg-[#f5f1e8] p-3">
                <p className="text-xs font-black uppercase tracking-wide">
                  Draft statistics
                </p>
                <p className="mt-2 text-sm font-bold">{wordCount} words</p>
                <p className="mt-1 text-xs font-semibold text-gray-600">
                  {completedCount} of {SECTION_DEFINITIONS.length} sections with content
                </p>
              </div>
            </div>

            <div className="min-w-0 max-h-[780px] overflow-y-auto border-[3px] border-black bg-[#e9e5dc] p-3 sm:p-6">
              <ResumePreview resume={previewContent} template={template} />
            </div>
          </div>

          <div className="flex flex-wrap justify-between gap-3 border-t-[3px] border-black bg-[#f5f1e8] p-5">
            <button type="button" onClick={() => setStep(2)}
              className="border-[3px] border-black bg-white px-4 py-3 text-sm font-black">
              <ArrowLeft size={15} className="mr-2 inline" />
              Edit content
            </button>

            <button type="button" onClick={handlePrint}
              className="flex items-center gap-2 border-[3px] border-black bg-[#b8ff5a] px-5 py-3 text-sm font-black shadow-[3px_3px_0_#111]">
              <Printer size={16} />
              Print / Save PDF
            </button>
          </div>
        </section>
      )}
      {step === 3 && (
        <div className="resume-builder-printable">
          <ResumePreview resume={previewContent} template={template} />
        </div>
      )}
    </div>
  );
}

export default ResumeBuilder;
