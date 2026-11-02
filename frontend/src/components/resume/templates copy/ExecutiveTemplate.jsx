import { BulletList, ContactRow, SummaryParagraph } from "./atsHelpers";

const renderSection = (section, index) => {
  if (!section || !section.items?.length) return null;

  return (
    <section key={`${section.title}-${index}`} className="break-inside-avoid">
      <div className="mb-3 border-b-[1px] border-slate-200 pb-1">
        <h2 className="text-[12px] font-black uppercase tracking-[0.08em] text-slate-700">
          {section.title}
        </h2>
      </div>

      {section.title === "Summary" ? (
        <SummaryParagraph items={section.items} className="text-sm leading-6 text-slate-700" />
      ) : (
        <BulletList
          items={section.items}
          className="space-y-2 text-sm leading-6 text-slate-700"
          itemClassName="marker:text-slate-500"
        />
      )}
    </section>
  );
};

export default function ExecutiveTemplate({ document }) {
  const sections = document?.sections || [];

  return (
    <div className="min-h-[1100px] bg-white p-10 text-slate-800">
      <header className="mb-8 border-b-[2px] border-slate-900 pb-4">
        <h1 className="text-[32px] font-black uppercase tracking-[0.03em] text-slate-900">
          {document?.name || "Resume Candidate"}
        </h1>

        <ContactRow
          document={document}
          className="mt-3 text-[11px] font-semibold text-slate-600"
        />
      </header>

      <div className="space-y-7">
        {sections.map((section, index) => renderSection(section, index))}
      </div>
    </div>
  );
}
