import { useState } from "react";

const templateOptions = [
  {
    id: "atsClassic",
    label: "ATS Classic",
    description: "Traditional, clean, and job-application safe.",
  },
  {
    id: "modernProfessional",
    label: "Modern Professional",
    description: "Polished and readable for technical roles.",
  },
  {
    id: "compact",
    label: "Compact",
    description: "Higher information density with crisp spacing.",
  },
  {
    id: "executive",
    label: "Executive",
    description: "Refined and highly professional for senior profiles.",
  },
];

export default function ResumeTemplateSelector({ selectedTemplate, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);
  const activeTemplate = templateOptions.find((template) => template.id === selectedTemplate) || templateOptions[0];

  return (
    <div className="relative w-full">
      <div className="mb-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
          Resume Template
        </p>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex w-full items-center justify-between border-[3px] border-black bg-white px-4 py-3 text-left shadow-[3px_3px_0_#111] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#111]"
      >
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">
            Selected
          </div>
          <div className="mt-1 text-base font-black text-gray-900">{activeTemplate.label}</div>
        </div>

        <div className="text-xl font-black leading-none text-gray-900">▾</div>
      </button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 border-[3px] border-black bg-white shadow-[4px_4px_0_#111]">
          {templateOptions.map((template) => {
            const isSelected = template.id === selectedTemplate;

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => {
                  onSelect(template.id);
                  setIsOpen(false);
                }}
                className={[
                  "w-full border-b-[2px] border-black px-4 py-3 text-left last:border-b-0",
                  isSelected ? "bg-[#f5f1e8]" : "bg-white hover:bg-[#f9f7f2]",
                ].join(" ")}
              >
                <div className="text-sm font-black text-gray-900">{template.label}</div>
                <div className="mt-1 text-xs text-gray-600">{template.description}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
