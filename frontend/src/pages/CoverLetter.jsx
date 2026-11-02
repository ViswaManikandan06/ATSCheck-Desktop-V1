import { Check, Copy, Download, FileText, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResume } from "../context/ResumeContext";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1";

function CoverLetters() {
  const navigate = useNavigate();
  const { selectedResume, selectedResumeUuid } = useResume();
  const [resumes, setResumes] = useState([]);
  const [resumeUuid, setResumeUuid] = useState(selectedResumeUuid || "");
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [applicantName, setApplicantName] = useState("");
  const [company, setCompany] = useState("");
  const [position, setPosition] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [tone, setTone] = useState("professional");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    const loadResumes = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/resumes`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Failed to load resumes.");
        }

        const options = Array.isArray(data.resumes)
          ? data.resumes.map((resume) => ({
              resumeUuid: resume.resume_uuid,
              name: resume.filename || resume.original_filename || "Untitled resume",
            }))
          : [];

        setResumes(options);
        setResumeUuid((current) =>
          current && options.some((resume) => resume.resumeUuid === current)
            ? current
            : options[0]?.resumeUuid || ""
        );
      } catch (loadError) {
        setError(loadError.message || "Failed to load resumes.");
      } finally {
        setLoadingResumes(false);
      }
    };

    loadResumes();
  }, []);

  useEffect(() => {
    if (selectedResumeUuid && !resumeUuid) {
      setResumeUuid(selectedResumeUuid);
    }
  }, [selectedResumeUuid, resumeUuid]);

  const selectedResumeOption = resumes.find(
    (resume) => resume.resumeUuid === resumeUuid
  );

  const displayName = applicantName.trim() || "Your Name";

  const formattedDate = new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  const letterParagraphs = content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const handleGenerate = async (event) => {
    event.preventDefault();
    if (!resumeUuid) {
      setError("Select a resume before generating a cover letter.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/cover-letter/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_uuid: resumeUuid,
          company: company.trim(),
          position: position.trim(),
          job_description: jobDescription.trim(),
          tone,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Failed to generate cover letter.");
      }
      setContent(data.content || "");
    } catch (generationError) {
      setError(generationError.message || "Failed to generate cover letter.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${company || "cover-letter"}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-8 border-b-[3px] border-black pb-5">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">Application toolkit</p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.05em]">Cover letter generator</h1>
        <p className="mt-3 max-w-2xl font-semibold leading-6 text-gray-600">
          Generate a role-specific letter grounded in the selected resume and job description.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <form onSubmit={handleGenerate} className="border-[3px] border-black bg-white p-6 shadow-[7px_7px_0_#111]">
            <label className="block text-sm font-black">Resume
              <select required value={resumeUuid} onChange={(event) => setResumeUuid(event.target.value)} disabled={loadingResumes} className="mt-2 w-full border-[3px] border-black bg-[#fffdf8] px-3 py-3 font-medium outline-none">
                <option value="">{loadingResumes ? "Loading resumes..." : "Select a resume"}</option>
                {resumes.map((resume) => <option key={resume.resumeUuid} value={resume.resumeUuid}>{resume.name}</option>)}
              </select>
            </label>
            <p className="mt-2 text-xs font-semibold text-gray-500">{selectedResumeOption?.name || "Choose the resume to ground this letter."}</p>
            <label className="mt-5 block text-sm font-black">Your name<input required value={applicantName} onChange={(event) => setApplicantName(event.target.value)} placeholder="Alex Morgan" className="mt-2 w-full border-[3px] border-black bg-[#fffdf8] px-3 py-3 font-medium outline-none focus:bg-white" /></label>
            <label className="mt-4 block text-sm font-black">Company<input required value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Acme Labs" className="mt-2 w-full border-[3px] border-black bg-[#fffdf8] px-3 py-3 font-medium outline-none focus:bg-white" /></label>
            <label className="mt-4 block text-sm font-black">Position<input required value={position} onChange={(event) => setPosition(event.target.value)} placeholder="Senior Product Designer" className="mt-2 w-full border-[3px] border-black bg-[#fffdf8] px-3 py-3 font-medium outline-none focus:bg-white" /></label>
            <label className="mt-4 block text-sm font-black">Tone<select value={tone} onChange={(event) => setTone(event.target.value)} className="mt-2 w-full border-[3px] border-black bg-[#fffdf8] px-3 py-3 font-medium outline-none"><option>professional</option><option>warm</option><option>confident</option><option>concise</option></select></label>
            <label className="mt-4 block text-sm font-black">Job description<textarea required minLength={20} value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste the job description here..." className="mt-2 min-h-[230px] w-full resize-y border-[3px] border-black bg-[#fffdf8] p-3 font-medium leading-6 outline-none focus:bg-white" /></label>
            {error && <div className="mt-4 border-[3px] border-black bg-[#ffdddd] p-3 text-sm font-bold">{error}</div>}
            <button type="submit" disabled={loading} className="mt-5 flex w-full items-center justify-center gap-2 border-[3px] border-black bg-[#b8ff5a] px-5 py-4 font-black shadow-[4px_4px_0_#111] disabled:cursor-not-allowed disabled:opacity-50">{loading ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />} {loading ? "Generating..." : "Generate cover letter"}</button>
          </form>

          <section className="border-[3px] border-black bg-white shadow-[7px_7px_0_#111]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b-[3px] border-black bg-[#111] p-5 text-white"><div><p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400">Draft output</p><h2 className="mt-1 text-2xl font-black">Your cover letter</h2></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setShowPreview((current) => !current)} className="border-[2px] border-white px-3 py-2 text-xs font-black">{showPreview ? "Edit draft" : "Preview letter"}</button><button type="button" onClick={handleCopy} disabled={!content} className="flex items-center gap-2 border-[2px] border-white px-3 py-2 text-xs font-black disabled:opacity-40"><Copy size={14} />{copied ? "Copied" : "Copy"}</button><button type="button" onClick={handleDownload} disabled={!content} className="flex items-center gap-2 border-[2px] border-white px-3 py-2 text-xs font-black disabled:opacity-40"><Download size={14} />Download</button></div></div>
            {showPreview ? (
              <div className="max-h-[720px] overflow-y-auto bg-[#e9e5dc] p-4 sm:p-8">
                <article className="mx-auto min-h-[560px] max-w-2xl bg-white p-7 shadow-[0_8px_24px_rgba(17,17,17,0.14)] sm:p-12">
                  <div className="border-b-2 border-black pb-5">
                    <p className="text-2xl font-black tracking-[-0.04em]">{displayName}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Application for {position || "the open role"}</p>
                  </div>
                  <div className="mt-8 text-sm font-medium leading-7 text-gray-800">
                    <p>{formattedDate}</p>
                    <p className="mt-6 font-bold">Hiring Team</p>
                    <p>{company || "Company name"}</p>
                    <p className="mt-6 font-black">Re: {position || "Application"}</p>
                    <p className="mt-6">Dear Hiring Team,</p>
                    {letterParagraphs.length > 0 ? letterParagraphs.map((paragraph, index) => <p key={`${paragraph}-${index}`} className="mt-5 whitespace-pre-wrap">{paragraph}</p>) : <p className="mt-5 text-gray-400">Your generated letter will appear here.</p>}
                    <p className="mt-7">Sincerely,</p>
                    <p className="mt-5 font-bold">{displayName}</p>
                  </div>
                </article>
              </div>
            ) : (
              <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder="Your generated cover letter will appear here and can be edited before use." className="min-h-[620px] w-full resize-y bg-[#fffdf8] p-6 font-medium leading-7 outline-none" />
            )}
            {content && <div className="flex items-center gap-2 border-t-[3px] border-black bg-[#e7f7c7] p-4 text-sm font-bold"><Check size={17} /> Editable draft ready for review.</div>}
          </section>
        </div>
    </div>
  );
}

export default CoverLetters;