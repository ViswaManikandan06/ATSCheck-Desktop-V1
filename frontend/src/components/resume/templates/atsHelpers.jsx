// Shared helpers used by every resume template.
//
// These exist to keep every template's *visual* style distinct while making
// sure the underlying text that gets extracted by an ATS (or by copy/paste,
// or by a headless "print to PDF") is always clean, ordered, and complete.
//
// Concretely:
//  - Bullets are real "-" text characters, not CSS list markers. Some
//    PDF/text extractors drop ::marker / list-style bullets entirely, which
//    can silently merge bullet lines together.
//  - Contact details (email / phone / location / website) are joined with a
//    literal separator character. Flexbox gaps do not produce a real space
//    or text node, so two adjacent <span> contact items can get glued
//    together (e.g. "you@email.comLos Angeles, CA") once the layout is
//    flattened into plain text.
//  - Section titles are real <h2> elements under a single <h1> name, so
//    parsers that rely on heading structure (rather than font-size/weight)
//    can still find section boundaries.
//  - Nothing here is an image, icon font, table, or absolutely-positioned
//    text box - all of which are common causes of ATS parsers reading
//    resume content out of order or dropping it entirely.

export const CONTACT_SEPARATOR = " | ";

export function getContactItems(document) {
  return [document?.email, document?.phone, document?.location, document?.website].filter(Boolean);
}

export function ContactRow({ document, className = "" }) {
  if (document?.headerLines?.length) {
    return (
      <div className={className}>
        {document.headerLines.map((line, index) => (
          <span
            key={`${index}-${line}`}
            className={line === document.title ? "block font-semibold" : "block"}
          >
            {line}
          </span>
        ))}
      </div>
    );
  }

  const items = getContactItems(document);

  if (items.length === 0) {
    return null;
  }

  return (
    <p className={className}>
      {items.map((item, index) => (
        <span key={`${item}-${index}`}>
          {item}
          {index < items.length - 1 ? CONTACT_SEPARATOR : ""}
        </span>
      ))}
    </p>
  );
}

function normalizeDiffText(value) {
  return String(value ?? "")
    .replace(/^\s*(?:[-*•▪◦●○])\s+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getHighlightSegmentsForText(text, diff) {
  if (!diff) {
    return [{ type: "plain", text: String(text ?? "") }];
  }

  const changes = Array.isArray(diff.changes) ? diff.changes : [];
  const currentText = normalizeDiffText(text);

  for (const change of changes) {
    const originalText = String(change?.original_text ?? "");
    const suggestedText = String(change?.suggested_text ?? "");

    if (
      normalizeDiffText(suggestedText) &&
      currentText === normalizeDiffText(suggestedText)
    ) {
      const oldWording = originalText.replace(/^\s*(?:[-*•▪◦●○])\s+/, "");
      const newWording = suggestedText.replace(/^\s*(?:[-*•▪◦●○])\s+/, "");
      return originalText && normalizeDiffText(originalText) !== currentText
        ? [
            { type: "removed", text: oldWording },
            { type: "added", text: newWording },
          ]
        : [{ type: "added", text: newWording }];
    }
  }

  const addedTokens = (diff.added || []).filter(Boolean).map((value) => normalizeDiffText(value));
  const removedTokens = (diff.removed || []).filter(Boolean).map((value) => normalizeDiffText(value));

  if (addedTokens.includes(currentText)) {
    return [{ type: "added", text: currentText }];
  }

  if (removedTokens.includes(currentText)) {
    return [{ type: "removed", text: currentText }];
  }

  return [{ type: "plain", text: String(text ?? "") }];
}

function renderDiffSegment(segment, index) {
  const baseClassName = "rounded px-1 py-[1px]";

  if (segment.type === "added") {
    return (<span key={`${segment.type}-${index}`} className={`${baseClassName} bg-[#b8ff5a] text-black`}>{segment.text}</span>);
  }

  if (segment.type === "removed") {
    return (<span key={`${segment.type}-${index}`} className={`${baseClassName} bg-[#ffb3b3] text-black line-through`}>{segment.text}</span>);
  }

  return <span key={`${segment.type}-${index}`}>{segment.text}</span>;
}

export function HighlightedText({ text, diff = null, className = "" }) {
  const segments = getHighlightSegmentsForText(text, diff);

  return (
    <span className={className}>
      {segments.map((segment, index) => (
        <span key={`diff-${segment.type}-${index}`}>
          {segment.type === "added" && segments[index - 1]?.type === "removed" && (
            <span aria-hidden="true" className="mx-1 text-gray-500">→</span>
          )}
          {renderDiffSegment(segment, index)}
        </span>
      ))}
    </span>
  );
}

export function BulletList({ items, className = "", itemClassName = "", diff = null }) {
  return (
    <ul className={`list-none ${className}`}>
      {items.map((item, index) => {
        const sourceText = String(item ?? "");
        const isBullet = /^\s*(?:[-*•▪◦●○])\s+/.test(sourceText);
        const text = sourceText.replace(/^\s*(?:[-*•▪◦●○])\s+/, "");
        const dateMatch = text.match(
          /^(.*?)(?:\s*[|,]\s*|\s+)((?:[A-Za-z]{3,9}\s+)?(?:19|20)\d{2}(?:\s*(?:-|–|—|to)\s*(?:(?:[A-Za-z]{3,9}\s+)?(?:19|20)\d{2}|present|current|now))?)$/i
        );
        const changed = (diff?.changes || []).some(
          (change) => normalizeDiffText(change?.suggested_text) === normalizeDiffText(text)
        );

        return (
        <li
          key={`${index}-${sourceText}`}
          className={`flex gap-2 break-inside-avoid ${itemClassName}`}
        >
          {isBullet && <span aria-hidden="true">-</span>}
          {dateMatch && !changed ? (
            <span className="flex min-w-0 flex-1 justify-between gap-4">
              <span className="whitespace-pre-wrap">{dateMatch[1]}</span>
              <time className="shrink-0 whitespace-nowrap text-right">{dateMatch[2]}</time>
            </span>
          ) : (
            <HighlightedText text={text} diff={diff} className="whitespace-pre-wrap" />
          )}
        </li>
        );
      })}
    </ul>
  );
}

export function SummaryParagraph({ items, className = "", diff = null }) {
  return (
    <div className={className}>
      {items.map((item, index) => (
        <p key={`${index}-${item}`} className="whitespace-pre-wrap">
          <HighlightedText text={item} diff={diff} />
        </p>
      ))}
    </div>
  );
}

export function ResumeSections({
  sections,
  diff,
  sectionClassName = "mb-5 break-inside-auto",
  headingClassName = "mb-2 border-b border-slate-300 pb-1 text-xs font-bold uppercase text-slate-700",
  bodyClassName = "space-y-1.5 text-sm leading-6 text-slate-800",
}) {
  return sections.map((section, index) => (
    <section
      key={`${index}-${section.title}`}
      className={sectionClassName}
    >
      <h2 className={headingClassName}>{section.title}</h2>
      {["summary", "profile", "objective"].includes(
        (section.normalizedTitle || section.title).toLowerCase()
      ) ? (
        <SummaryParagraph items={section.items} diff={diff} className={bodyClassName} />
      ) : (
        <BulletList items={section.items} diff={diff} className={bodyClassName} />
      )}
    </section>
  ));
}
