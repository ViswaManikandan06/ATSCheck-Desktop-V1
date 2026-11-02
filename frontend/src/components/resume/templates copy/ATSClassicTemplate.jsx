import { BulletList, ContactRow, SummaryParagraph } from "./atsHelpers";

const renderSection = (section, index) => {
  if (!section || !section.items?.length) return null;

  return (
    <section key={`${section.title}-${index}`} className="break-inside-avoid">
      <h2 className="mb-2 border-b-[2px] border-black pb-1 text-[12px] font-black uppercase tracking-[0.08em] text-gray-700">
        {section.title}
      </h2>

      {section.title === "Summary" ? (
        <SummaryParagraph items={section.items} className="text-sm leading-6 text-gray-800" />
      ) : (
        <BulletList
          items={section.items}
          className="space-y-2 text-sm leading-6 text-gray-800"
          itemClassName="marker:text-gray-600"
        />
      )}
    </section>
  );
};

export default function ATSClassicTemplate({ document }) {
  const sections = document?.sections || [];

  return (
    <div className="min-h-[1100px] bg-white p-8 text-gray-900">
      <header className="mb-7 border-b-[2px] border-black pb-4">
        <h1 className="text-3xl font-black tracking-[-0.01em] text-black">
          {document?.name || "Resume Candidate"}
        </h1>

        <ContactRow
          document={document}
          className="mt-2 text-[12px] font-semibold text-gray-700"
        />
      </header>

      <div className="space-y-6">
        {sections.map((section, index) => renderSection(section, index))}
      </div>
    </div>
  );
}
