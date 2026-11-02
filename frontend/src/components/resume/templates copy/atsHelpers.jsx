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

export function BulletList({ items, className = "", itemClassName = "" }) {
  return (
    <ul className={`list-none ${className}`}>
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className={`flex gap-2 ${itemClassName}`}>
          <span>-</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function SummaryParagraph({ items, className = "" }) {
  return <p className={className}>{items.join(" ")}</p>;
}
