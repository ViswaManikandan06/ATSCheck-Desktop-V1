import { ContactRow, ResumeSections } from "./atsHelpers";

export default function ExecutiveTemplate({ document, diff = null, mode = "clean" }) {
  return (
    <article className="resume-paper min-h-0 bg-white px-12 py-11 font-serif text-[13px] leading-[1.5] text-slate-800 print:px-0 print:py-0">
      <header className="mb-8 border-b border-slate-800 pb-4">
        {document?.name && (
          <h1 className="text-[28px] font-semibold leading-tight text-slate-900">
            {document.name}
          </h1>
        )}
        <ContactRow
          document={document}
          className="mt-3 whitespace-pre-wrap text-[11px] leading-5 text-slate-600"
        />
      </header>
      <ResumeSections
        sections={document?.sections || []}
        diff={mode === "changes" ? diff : null}
        sectionClassName="mb-6 break-inside-auto"
        headingClassName="mb-2 border-b border-slate-200 pb-1 text-[12px] font-semibold uppercase text-slate-800"
        bodyClassName="space-y-1.5 text-[12px] leading-[1.5] text-slate-700"
      />
    </article>
  );
}