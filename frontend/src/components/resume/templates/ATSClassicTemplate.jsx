import { ContactRow, ResumeSections } from "./atsHelpers";

export default function ATSClassicTemplate({ document, diff = null, mode = "clean" }) {
  return (
    <article className="resume-paper min-h-0 bg-white px-10 py-9 font-serif text-[13px] leading-[1.45] text-black print:px-0 print:py-0">
      <header className="mb-6 border-b border-black pb-3">
        {document?.name && (
          <h1 className="text-center text-[25px] font-bold leading-tight">
            {document.name}
          </h1>
        )}
        <ContactRow
          document={document}
          className="mt-2 whitespace-pre-wrap text-center text-[11px] leading-5"
        />
      </header>
      <ResumeSections
        sections={document?.sections || []}
        diff={mode === "changes" ? diff : null}
        sectionClassName="mb-5 break-inside-auto"
        headingClassName="mb-2 border-b border-black pb-1 text-[12px] font-bold uppercase tracking-normal text-black"
        bodyClassName="space-y-1 text-[12px] leading-[1.45] text-black"
      />
    </article>
  );
}