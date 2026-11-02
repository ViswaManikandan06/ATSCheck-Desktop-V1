import { BulletList, ContactRow, SummaryParagraph } from "./atsHelpers";

const renderSection = (section, index) => {
  if (!section || !section.items?.length) return null;

  return (
    <section key={`${section.title}-${index}`} className="break-inside-avoid">
      <div className="mb-3 border-b-[2px] border-gray-300 pb-1">
        <h2 className="text-[12px] font-black uppercase tracking-[0.06em] text-slate-700">
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

export default function ModernProfessionalTemplate({ document }) {
  const sections = document?.sections || [];

  return (
    <div className="min-h-[1100px] bg-[#f8fafc] p-8 text-slate-800">
      <header className="mb-7 border-l-[4px] border-slate-900 bg-white p-5 shadow-sm">
        <h1 className="text-3xl font-black tracking-[-0.01em] text-slate-900">
          {document?.name || "Resume Candidate"}
        </h1>

        <ContactRow
          document={document}
          className="mt-3 text-[12px] font-semibold text-slate-600"
        />
      </header>

      <div className="space-y-6">
        {sections.map((section, index) => renderSection(section, index))}
      </div>
    </div>
  );
}
