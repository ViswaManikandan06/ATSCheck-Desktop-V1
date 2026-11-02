import {
  ArrowLeft,
  Check,
  Clock3,
  FileText,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1";

function formatDateTime(isoString) {
  if (!isoString) {
    return "Unknown date";
  }

  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function ResumeVersions() {
  const navigate = useNavigate();
  const { resumeUuid } = useParams();

  const [resume, setResume] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!resumeUuid) {
      setLoading(false);
      setError("Resume not found.");
      return;
    }

    const fetchResumeAndVersions = async () => {
      setLoading(true);
      setError("");

      try {
        const resumeResponse = await fetch(
          `${API_BASE_URL}/resumes/${encodeURIComponent(resumeUuid)}`
        );

        if (!resumeResponse.ok) {
          throw new Error("Failed to load resume.");
        }

        const resumeData = await resumeResponse.json();
        setResume(resumeData);

        const versionsResponse = await fetch(
          `${API_BASE_URL}/resumes/${encodeURIComponent(resumeUuid)}/versions`
        );

        if (!versionsResponse.ok) {
          throw new Error("Failed to load version history.");
        }

        const versionsData = await versionsResponse.json();
        setVersions(versionsData.versions || []);
      } catch (err) {
        setError(
          err.message ||
            "Unable to load version history."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchResumeAndVersions();
  }, [resumeUuid]);

  const currentVersion = useMemo(() => {
    if (!versions.length) {
      return null;
    }

    return [...versions].sort(
      (a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
    )[0];
  }, [versions]);

  return (
    <div className="mx-auto max-w-6xl">
      <section className="mb-8">
        <button
          onClick={() => navigate("/resumes")}
          className="mb-6 flex items-center gap-2 font-black hover:underline"
        >
          <ArrowLeft
            size={18}
            strokeWidth={3}
          />
          Back to resumes
        </button>

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
              Resume history
            </p>

            <h1 className="mt-2 text-5xl font-black tracking-[-0.04em]">
              Version history.
            </h1>

            <p className="mt-3 max-w-2xl font-semibold leading-6 text-gray-600">
              Every saved tailoring change creates a new version.
              Your previous versions always stay untouched.
            </p>
          </div>

          <div className="border-[3px] border-black bg-[#b8ff5a] px-5 py-4 shadow-[5px_5px_0_#111]">
            <p className="text-xs font-black uppercase">
              Current version
            </p>

            <div className="mt-1 flex items-end gap-1">
              <span className="text-4xl font-black">
                {currentVersion ? `V${currentVersion.version_number}` : "V0"}
              </span>

              <span className="mb-1 text-sm font-black">
                / {versions.length || 0}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 flex flex-col justify-between gap-4 border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_#111] md:flex-row md:items-center">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center border-[3px] border-black bg-[#f5f1e8]">
            <FileText
              size={22}
              strokeWidth={3}
            />
          </div>

          <div>
            <h2 className="font-black">
              {resume?.filename || "Resume"}
            </h2>

            <p className="text-xs font-bold text-gray-500">
              {resume?.filename || resumeUuid || "No filename available"}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate(`/tailor?resumeUuid=${resumeUuid}`)}
          className="flex items-center justify-center gap-2 border-[3px] border-black bg-[#b8ff5a] px-5 py-3 font-black shadow-[4px_4px_0_#111] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#111]"
        >
          <Sparkles
            size={18}
            strokeWidth={3}
          />
          Tailor current version
        </button>
      </section>

      {error && (
        <div className="mb-6 border-[3px] border-black bg-[#ffdddd] p-4 text-sm font-bold">
          {error}
        </div>
      )}

      {loading ? (
        <div className="border-[3px] border-black bg-white p-6 font-black shadow-[6px_6px_0_#111]">
          Loading version history...
        </div>
      ) : !versions.length ? (
        <div className="border-[3px] border-dashed border-black bg-white p-8 text-center shadow-[6px_6px_0_#111]">
          <p className="text-2xl font-black">No versions saved yet.</p>
          <p className="mt-2 text-sm font-semibold text-gray-600">
            Save a tailored resume version to start building the history.
          </p>
        </div>
      ) : (
        <section className="relative">
          <div className="absolute left-[27px] top-8 bottom-8 hidden w-[3px] bg-black md:block" />

          <div className="space-y-6">
            {[...versions]
              .sort(
                (a, b) =>
                  new Date(b.created_at) -
                  new Date(a.created_at)
              )
              .map((version) => (
                <VersionCard
                  key={version.version_uuid}
                  version={version}
                  isCurrent={
                    currentVersion?.version_uuid ===
                    version.version_uuid
                  }
                />
              ))}
          </div>
        </section>
      )}

      <section className="mt-8 border-[3px] border-black bg-[#dcecff] p-6 shadow-[6px_6px_0_#111]">
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center border-[2px] border-black bg-white">
            <Check
              size={20}
              strokeWidth={3}
            />
          </div>

          <div>
            <h3 className="font-black">
              Your previous versions are safe.
            </h3>

            <p className="mt-1 text-sm font-semibold leading-5 text-gray-600">
              Accepting new tailoring suggestions never overwrites
              an existing version. You can always return to an
              earlier version.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function VersionCard({ version, isCurrent }) {
  return (
    <article
      className={`relative ml-0 border-[3px] border-black bg-white p-5 shadow-[6px_6px_0_#111] md:ml-16 ${
        isCurrent ? "bg-[#faffef]" : ""
      }`}
    >
      <div
        className={`absolute -left-[51px] top-7 hidden h-10 w-10 items-center justify-center border-[3px] border-black font-black md:flex ${
          isCurrent ? "bg-[#b8ff5a]" : "bg-white"
        }`}
      >
        V{version.version_number}
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="border-[2px] border-black bg-[#f5f1e8] px-2 py-1 text-xs font-black">
              V{version.version_number}
            </span>

            <span
              className={`border-[2px] border-black px-2 py-1 text-xs font-black ${
                isCurrent ? "bg-[#b8ff5a]" : "bg-white"
              }`}
            >
              Saved version
            </span>

            {isCurrent && (
              <span className="flex items-center gap-1 border-[2px] border-black bg-black px-2 py-1 text-xs font-black text-white">
                <Check
                  size={12}
                  strokeWidth={4}
                />
                Current
              </span>
            )}
          </div>

          <h3 className="mt-3 text-xl font-black">
            {version.commit_message ||
              `Resume saved from analysis ${version.scan_uuid ? version.scan_uuid.slice(0, 8) : "legacy version"}`}
          </h3>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-semibold text-gray-600">
            <span className="inline-flex items-center gap-2">
              <Clock3
                size={14}
                strokeWidth={2.5}
              />
              {formatDateTime(version.created_at)}
            </span>

            {version.storage_path && (
              <span className="font-mono text-xs text-gray-500">
                {version.storage_path}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              window.open(
                version.storage_path || "",
                "_blank"
              )
            }
            disabled={!version.storage_path}
            className="border-[3px] border-black bg-white px-4 py-2 text-sm font-black shadow-[3px_3px_0_#111] transition-all hover:bg-[#f5f1e8] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Open file
          </button>
        </div>
      </div>
    </article>
  );
}

export default ResumeVersions;
