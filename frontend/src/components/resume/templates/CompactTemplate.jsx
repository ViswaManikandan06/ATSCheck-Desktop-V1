import { ContactRow, ResumeSections } from "./atsHelpers";

export default function CompactTemplate({ document, diff = null, mode = "clean" }) {
  return (
    <article className="resume-paper min-h-0 bg-white px-8 py-7 font-sans text-[12px] leading-[1.4] text-slate-800 print:px-0 print:py-0">
      <header className="mb-5 border-b border-slate-500 pb-3">
        {document?.name && (
          <h1 className="text-[24px] font-semibold leading-tight text-slate-900">
            {document.name}
          </h1>
        )}
        <ContactRow
          document={document}
          className="mt-2 whitespace-pre-wrap text-[10px] leading-4 text-slate-600"
        />
      </header>
      <ResumeSections
        sections={document?.sections || []}
        diff={mode === "changes" ? diff : null}
        sectionClassName="mb-4 break-inside-auto"
        headingClassName="mb-1.5 border-b border-slate-300 pb-1 text-[11px] font-semibold uppercase text-slate-700"
        bodyClassName="space-y-1 text-[11px] leading-[1.4] text-slate-700"
      />
    </article>
  );
}