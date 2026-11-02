import {
  ArrowRight,
  ArrowUpRight,
  Check,
  FileText,
  Plus,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useResume,
} from "../context/ResumeContext";
import { useFeatures } from "../hooks/useFeatures";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1";

function Dashboard() {
  const navigate = useNavigate();
  const { ats_scan: atsScanEnabled } = useFeatures();

  const {
    selectedResumeUuid,
    selectResume,
  } = useResume();

  const [resumes, setResumes] = useState([]);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const resumeResponse = await fetch(
          `${API_BASE_URL}/resumes`
        );

        const resumeData = await resumeResponse.json();

        if (!resumeResponse.ok) {
          throw new Error(
            resumeData.detail ||
              "Failed to load resume library."
          );
        }

        const resumeList = Array.isArray(resumeData.resumes)
          ? resumeData.resumes
          : [];

        const enrichedResumes = await Promise.all(
          resumeList.map(async (resume) => {
            let scans = [];

            if (atsScanEnabled) {
              const scanResponse = await fetch(
                `${API_BASE_URL}/ats/scans?resume_id=${encodeURIComponent(
                  resume.id
                )}`
              );

              const scanData = await scanResponse.json();

              if (!scanResponse.ok) {
                throw new Error(
                  scanData.detail ||
                    "Failed to load scan history."
                );
              }

              scans = Array.isArray(scanData)
                ? scanData
                : [];
            }

            const completedScans = [...scans]
              .filter(
                (scan) =>
                  (scan.status || "").toLowerCase() ===
                  "completed"
              )
              .sort(
                (a, b) =>
                  new Date(b.created_at || 0).getTime() -
                  new Date(a.created_at || 0).getTime()
              );

            const latestCompleted = completedScans[0] || null;

            return {
              resumeUuid: resume.resume_uuid,
              resumeId: resume.id ?? null,
              name:
                resume.filename ||
                resume.original_filename ||
                "Untitled Resume",
              filename:
                resume.filename ||
                resume.original_filename ||
                "resume",
              fileType: resume.file_type || "",
              fileSize: resume.file_size,
              createdAt: resume.created_at,
              updated: formatDate(resume.created_at),
              latestCompleted,
              completedScans,
              score: latestCompleted?.skills_match_percent ?? null,
            };
          })
        );

        const eligibleResumes = enrichedResumes
          .filter(
            (resume) =>
              !atsScanEnabled ||
              (Array.isArray(resume.completedScans) &&
                resume.completedScans.length > 0)
          )
          .sort(
            (a, b) => {
              const aTime = new Date(
                a.latestCompleted?.created_at || 0
              ).getTime();
              const bTime = new Date(
                b.latestCompleted?.created_at || 0
              ).getTime();

              return bTime - aTime;
            }
          );

        const recent = eligibleResumes
          .flatMap((resume) =>
            (resume.completedScans || []).map((scan) => ({
              scanUuid: scan.scan_uuid,
              resumeUuid: resume.resumeUuid,
              resumeName: resume.name,
              filename: resume.filename,
              jobDescription:
                scan.job_description ||
                "Position brief",
              providerId: scan.provider_id,
              modelId: scan.model_id,
              skillsMatchPercent: scan.skills_match_percent,
              createdAt: scan.created_at,
              label: formatDate(scan.created_at),
            }))
          )
          .sort(
            (a, b) =>
              new Date(b.createdAt || 0).getTime() -
              new Date(a.createdAt || 0).getTime()
          )
          .slice(0, 6);

        if (cancelled) {
          return;
        }

        setResumes(eligibleResumes);
        setRecentAnalyses(recent);

        if (
          selectedResumeUuid &&
          eligibleResumes.some(
            (resume) =>
              resume.resumeUuid === selectedResumeUuid
          )
        ) {
          const match = eligibleResumes.find(
            (resume) =>
              resume.resumeUuid === selectedResumeUuid
          );

          if (match) {
            selectResume(match);
          }
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        console.error(
          "Failed to load dashboard data:",
          err
        );

        setError(
          err.message ||
            "Failed to load your dashboard."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [atsScanEnabled, selectedResumeUuid, selectResume]);

  const totalCompletedScans = useMemo(
    () =>
      resumes.reduce(
        (count, resume) =>
          count + (resume.completedScans?.length || 0),
        0
      ),
    [resumes]
  );

  const averageScore = useMemo(() => {
    const completed = resumes
      .map((resume) => resume.latestCompleted?.skills_match_percent)
      .filter((score) =>
        typeof score === "number" && !Number.isNaN(score)
      );

    if (completed.length === 0) {
      return null;
    }

    const total = completed.reduce(
      (sum, score) => sum + score,
      0
    );

    return Math.round((total / completed.length) * 10) / 10;
  }, [resumes]);

  const handleOpenResume = (resume) => {
    if (!resume?.resumeUuid) {
      return;
    }

    selectResume(resume);

    navigate(
      `/resumes/${encodeURIComponent(resume.resumeUuid)}`
    );
  };

  const handleOpenAnalysis = (analysis) => {
    if (!analysis?.resumeUuid || !analysis?.scanUuid) {
      return;
    }

    const params = new URLSearchParams();
    params.set("resumeUuid", analysis.resumeUuid);
    params.set("scanUuid", analysis.scanUuid);

    navigate(`/analyze?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="flex min-h-[500px] items-center justify-center">
          <div className="border-[3px] border-black bg-white px-8 py-6 font-black shadow-[7px_7px_0_#111]">
            Loading your dashboard...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="border-[3px] border-black bg-[#ffdddd] p-6 shadow-[7px_7px_0_#111]">
          <p className="text-xs font-black uppercase tracking-wider">
            Something went wrong
          </p>
          <p className="mt-2 font-bold">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 border-[3px] border-black bg-white px-4 py-2 font-black shadow-[3px_3px_0_#111]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <section className="mb-10">
        <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-gray-500">
          Dashboard
        </p>

        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.05em] lg:text-6xl">
              Your career
              <span className="mt-2 block">workspace.</span>
            </h1>

            <p className="mt-5 max-w-2xl font-semibold leading-7 text-gray-600">
              {atsScanEnabled
                ? "Track the resumes you have already analyzed and jump back into their latest scan results, versions, and job comparisons."
                : "Manage your resume library and open your other career workspace tools."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/upload")}
            className="flex shrink-0 items-center justify-center gap-2 border-[3px] border-black bg-[#b8ff5a] px-6 py-4 font-black shadow-[6px_6px_0_#111] transition-all duration-100 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0_#111]"
          >
            <Plus size={20} strokeWidth={3} />
            Upload Resume
          </button>
        </div>
      </section>

      {atsScanEnabled ? (
        <>
          <section className="mb-8 grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Resumes analyzed"
              value={String(resumes.length)}
              detail="Completed ATS scans"
              icon={<Sparkles size={18} strokeWidth={3} />}
            />

            <MetricCard
              label="Total scans"
              value={String(totalCompletedScans)}
              detail="Across all resumes"
              icon={<Check size={18} strokeWidth={3} />}
            />

            <MetricCard
              label="Average skills match"
              value={averageScore === null ? "—" : `${averageScore}%`}
              detail="Latest resume snapshot"
              icon={<Target size={18} strokeWidth={3} />}
            />
          </section>

          <section className="mb-10 border-[3px] border-black bg-[#f5f1e8] p-5 shadow-[7px_7px_0_#111]">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-gray-500">
              Recent analyses
            </p>
            <h2 className="mt-1 text-2xl font-black">Latest results</h2>
          </div>

          {recentAnalyses.length > 0 && (
            <span className="text-sm font-black text-gray-600">
              {recentAnalyses.length} shown
            </span>
          )}
        </div>

        {recentAnalyses.length === 0 ? (
          <div className="rounded-none border-[3px] border-dashed border-black bg-white p-6 text-sm font-semibold text-gray-600">
            Once a resume has a completed scan, its latest results will appear here.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {recentAnalyses.map((analysis) => (
              <button
                key={`${analysis.resumeUuid}-${analysis.scanUuid}`}
                type="button"
                onClick={() => handleOpenAnalysis(analysis)}
                className="group flex h-full flex-col items-start border-[3px] border-black bg-white p-5 text-left shadow-[5px_5px_0_#111] transition-all hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[3px_3px_0_#111]"
              >
                <div className="flex w-full items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center border-[3px] border-black bg-[#b8ff5a] font-black">
                      {getFileType(analysis.filename || analysis.resumeName)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-base font-black">
                        {analysis.resumeName}
                      </p>
                      <p className="truncate text-[11px] font-semibold text-gray-500">
                        {analysis.filename}
                      </p>
                    </div>
                  </div>

                  <span className="border-[3px] border-black bg-[#ffcf56] px-2 py-1 text-[10px] font-black uppercase">
                    {analysis.skillsMatchPercent ?? "—"}
                  </span>
                </div>

                <div className="mt-5 w-full border-t-[3px] border-black pt-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">
                    Latest skills match
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.04em]">
                    {analysis.skillsMatchPercent !== null && typeof analysis.skillsMatchPercent !== "undefined"
                      ? `${Math.round(analysis.skillsMatchPercent)}%`
                      : "Pending"}
                  </p>
                </div>

                <p className="mt-4 line-clamp-2 text-sm font-semibold leading-6 text-gray-600">
                  {getJobSummary(analysis.jobDescription)}
                </p>

                <div className="mt-5 flex w-full items-center justify-between text-sm font-black text-gray-700">
                  <span>{formatDate(analysis.createdAt)}</span>
                  <span className="inline-flex items-center gap-1">
                    Open
                    <ArrowRight size={15} strokeWidth={3} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
          </section>
        </>
      ) : (
        <section className="mb-8 border-[3px] border-black bg-white p-5 font-semibold shadow-[5px_5px_0_#111]">
          ATS resume analysis is currently disabled.
        </section>
      )}

      <section>
        <div className="mb-5 flex items-end justify-between border-b-[3px] border-black pb-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
              Your library
            </p>
            <h2 className="mt-1 text-2xl font-black">Resumes</h2>
          </div>

          <span className="text-sm font-black">
            {resumes.length} {resumes.length === 1 ? "resume" : "resumes"}
          </span>
        </div>

        {resumes.length === 0 ? (
          <EmptyResumeState
            onUpload={() => navigate("/upload")}
            atsScanEnabled={atsScanEnabled}
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {resumes.map((resume) => (
              <ResumeCard
                key={resume.resumeUuid}
                resume={resume}
                selected={selectedResumeUuid === resume.resumeUuid}
                onOpen={handleOpenResume}
                atsScanEnabled={atsScanEnabled}
              />
            ))}

            <button
              type="button"
              onClick={() => navigate("/upload")}
              className="group flex min-h-[300px] flex-col items-center justify-center border-[3px] border-dashed border-black bg-transparent p-8 text-center transition-all hover:bg-white"
            >
              <div className="flex h-16 w-16 items-center justify-center border-[3px] border-black bg-[#ffcf56] shadow-[4px_4px_0_#111] transition-transform group-hover:-translate-y-1">
                <Upload size={27} strokeWidth={3} />
              </div>

              <h3 className="mt-6 text-xl font-black">Upload another resume</h3>

              <p className="mt-2 max-w-xs text-sm font-semibold leading-5 text-gray-500">
                Add a different version for another role, company, or career direction.
              </p>

              <span className="mt-5 border-[3px] border-black bg-white px-4 py-2 text-sm font-black shadow-[3px_3px_0_#111]">
                Add Resume
              </span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value, detail, icon }) {
  return (
    <div className="border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_#111]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
          {label}
        </p>
        <div className="flex h-9 w-9 items-center justify-center border-[3px] border-black bg-[#b8ff5a]">
          {icon}
        </div>
      </div>

      <p className="mt-5 text-4xl font-black tracking-[-0.05em]">{value}</p>
      <p className="mt-2 text-sm font-semibold text-gray-600">{detail}</p>
    </div>
  );
}

function EmptyResumeState({ onUpload, atsScanEnabled }) {
  return (
    <section className="border-[3px] border-black bg-white p-12 shadow-[7px_7px_0_#111]">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="flex h-20 w-20 items-center justify-center border-[3px] border-black bg-[#b8ff5a] shadow-[5px_5px_0_#111]">
          <FileText size={34} strokeWidth={2.5} />
        </div>

        <p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-gray-500">
          Start here
        </p>

        <h2 className="mt-2 text-3xl font-black tracking-tight">
          Upload your first resume.
        </h2>

        <p className="mt-3 max-w-md font-semibold leading-6 text-gray-600">
          {atsScanEnabled
            ? "Once a resume has a completed ATS scan, it will appear in your dashboard library."
            : "Upload a resume to add it to your workspace library."}
        </p>

        <button
          type="button"
          onClick={onUpload}
          className="mt-7 flex items-center gap-2 border-[3px] border-black bg-[#111111] px-6 py-3 font-black text-white shadow-[5px_5px_0_#b8ff5a] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#b8ff5a]"
        >
          <Upload size={18} strokeWidth={3} />
          Upload Resume
        </button>

        <p className="mt-4 text-xs font-bold text-gray-400">
          PDF or DOCX · Maximum 5 MB
        </p>
      </div>
    </section>
  );
}

function ResumeCard({ resume, selected, onOpen, atsScanEnabled }) {
  const latestScore =
    resume.latestCompleted?.skills_match_percent !== null &&
    typeof resume.latestCompleted?.skills_match_percent !== "undefined"
      ? `${Math.round(resume.latestCompleted.skills_match_percent)}%`
      : "No score";

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={() => onOpen(resume)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(resume);
        }
      }}
      className={[
        "cursor-pointer select-none",
        "border-[3px] border-black bg-white",
        "shadow-[7px_7px_0_#111]",
        "transition-all duration-100",
        "focus:outline-none focus:ring-4 focus:ring-[#b8ff5a]",
        selected
          ? "bg-[#faffef] translate-x-[2px] translate-y-[2px] shadow-[4px_4px_0_#111]"
          : "hover:-translate-x-[1px] hover:-translate-y-[1px]",
      ].join(" ")}
    >
      <div className="border-b-[3px] border-black p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center border-[3px] border-black bg-[#f5f1e8] text-xs font-black uppercase">
              {getFileType(resume.fileType || resume.filename)}
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-lg font-black">{resume.name}</h3>
              <p className="mt-1 truncate text-xs font-semibold text-gray-500">
                {resume.filename}
              </p>
            </div>
          </div>

          {selected && (
            <div className="flex shrink-0 items-center gap-1 border-[3px] border-black bg-[#b8ff5a] px-2 py-1 text-[10px] font-black uppercase">
              <Check size={12} strokeWidth={4} />
              Selected
            </div>
          )}
        </div>
      </div>

      <div className={atsScanEnabled ? "grid grid-cols-2" : ""}>
        <div className={atsScanEnabled ? "border-r-[3px] border-black p-5" : "p-5"}>
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
            {atsScanEnabled ? "Latest skills match" : "Resume status"}
          </p>
          <p className="mt-2 text-xl font-black">
            {atsScanEnabled ? latestScore : "Ready to use"}
          </p>
        </div>

        {atsScanEnabled && <div className="p-5">
          <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
            Scans
          </p>
          <p className="mt-2 text-xl font-black">
            {resume.completedScans?.length || 0}
          </p>
        </div>}
      </div>

      <div className="border-t-[3px] border-black bg-[#f5f1e8] p-4">
        {atsScanEnabled && (
          <div className="mb-3 flex items-center justify-between text-xs font-black uppercase tracking-[0.12em] text-gray-500">
            <span>Last analyzed</span>
            <span>{formatDate(resume.latestCompleted?.created_at || resume.createdAt)}</span>
          </div>
        )}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpen(resume);
          }}
          className="flex w-full items-center justify-center gap-2 border-[3px] border-black bg-[#b8ff5a] px-4 py-3 text-sm font-black shadow-[3px_3px_0_#111] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#111]"
        >
          Open Resume Workspace
          <ArrowUpRight size={16} strokeWidth={3} />
        </button>
      </div>
    </article>
  );
}

function getFileType(value) {
  if (!value) {
    return "FILE";
  }

  const normalized = value.toLowerCase();

  if (
    normalized.includes(".pdf") ||
    normalized === "pdf"
  ) {
    return "PDF";
  }

  if (
    normalized.includes(".docx") ||
    normalized === "docx"
  ) {
    return "DOCX";
  }

  return "FILE";
}

function formatDate(createdAt) {
  if (!createdAt) {
    return "Recently";
  }

  const date = new Date(createdAt);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getJobSummary(jobDescription) {
  if (!jobDescription) {
    return "Position brief unavailable.";
  }

  const cleaned = jobDescription.trim().replace(/\s+/g, " ");

  return cleaned.length > 110
    ? `${cleaned.slice(0, 110).trim()}...`
    : cleaned;
}

export default Dashboard;
