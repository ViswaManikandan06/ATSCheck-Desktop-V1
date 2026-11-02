import { BulletList, ContactRow, SummaryParagraph } from "./atsHelpers";

const renderSection = (section, index) => {
  if (!section || !section.items?.length) return null;

  return (
    <section key={`${section.title}-${index}`} className="break-inside-avoid">
      <h2 className="mb-2 text-[11px] font-black uppercase tracking-[0.06em] text-slate-600">
        {section.title}
      </h2>

      {section.title === "Summary" ? (
        <SummaryParagraph items={section.items} className="text-[13px] leading-5 text-slate-700" />
      ) : (
        <BulletList
          items={section.items}
          className="space-y-1.5 text-[13px] leading-5 text-slate-700"
          itemClassName="marker:text-slate-500"
        />
      )}
    </section>
  );
};

export default function CompactTemplate({ document }) {
  const sections = document?.sections || [];

  return (
    <div className="min-h-[1100px] bg-white p-6 text-slate-800">
      <header className="mb-5 border-b-[2px] border-slate-500 pb-3">
        <h1 className="text-[26px] font-black tracking-[-0.01em] text-slate-900">
          {document?.name || "Resume Candidate"}
        </h1>

        <ContactRow
          document={document}
          className="mt-2 text-[11px] font-semibold text-slate-600"
        />
      </header>

      <div className="space-y-4">
        {sections.map((section, index) => renderSection(section, index))}
      </div>
    </div>
  );
}
