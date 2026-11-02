import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Check,
  FileText,
  History,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1";

function Analytics() {
  const navigate = useNavigate();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      try {
        const resumesResponse = await fetch(`${API_BASE_URL}/resumes`);
        const resumesData = await resumesResponse.json();
        if (!resumesResponse.ok) {
          throw new Error(resumesData.detail || "Failed to load resumes.");
        }

        const resumeList = Array.isArray(resumesData.resumes)
          ? resumesData.resumes
          : [];

        const histories = await Promise.all(
          resumeList.map(async (resume) => {
            const response = await fetch(
              `${API_BASE_URL}/ats/scans?resume_id=${encodeURIComponent(resume.id)}`
            );
            const data = await response.json();
            if (!response.ok) {
              throw new Error(data.detail || "Failed to load scan history.");
            }

            return (Array.isArray(data) ? data : []).map((scan) => ({
              ...scan,
              resume_uuid: resume.resume_uuid,
              resume: resume.filename || "Resume",
              filename: resume.filename || "",
            }));
          })
        );

        if (!cancelled) {
          setScans(
            histories
              .flat()
              .filter((scan) => scan.status === "completed")
              .sort(
                (left, right) =>
                  new Date(right.created_at || 0) -
                  new Date(left.created_at || 0)
              )
          );
          setError("");
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Failed to load scan history.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  const scoredScans = scans.filter(
    (scan) => typeof scan.skills_match_percent === "number"
  );
  const chartScans = [...scoredScans].slice(0, 6).reverse();
  const averageCoverage = scoredScans.length
    ? Math.round(
        scoredScans.reduce(
          (sum, scan) => sum + scan.skills_match_percent,
          0
        ) / scoredScans.length
      )
    : null;
  const bestCoverage = scoredScans.length
    ? Math.max(...scoredScans.map((scan) => scan.skills_match_percent))
    : null;
  const latestScan = scans[0] || null;

  const openScan = (scan) => {
    const params = new URLSearchParams({
      resumeUuid: scan.resume_uuid,
      scanUuid: scan.scan_uuid,
    });
    navigate(`/analyze?${params.toString()}`);
  };

  const openLatestTailoring = () => {
    if (latestScan) {
      const params = new URLSearchParams({
        resumeUuid: latestScan.resume_uuid,
        scanUuid: latestScan.scan_uuid,
      });
      navigate(`/tailor?${params.toString()}`);
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <section className="mb-8">
        <button
          onClick={() => navigate("/")}
          className="mb-6 flex items-center gap-2 font-black hover:underline"
        >
          <ArrowLeft size={18} strokeWidth={3} />
          Back to dashboard
        </button>

        <div>
          <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
            Progress
          </p>

          <h1 className="mt-2 text-5xl font-black tracking-[-0.04em]">
            Scan history & analytics.
          </h1>

          <p className="mt-3 max-w-2xl font-semibold leading-6 text-gray-600">
            Review skills requirement coverage for each saved job analysis. Results are descriptive of that scan, not a prediction of external ATS outcomes.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="grid gap-5 md:grid-cols-3">
        <StatCard
          label="Average skills coverage"
          value={averageCoverage ?? "—"}
          suffix={averageCoverage === null ? "" : "%"}
          icon={BarChart3}
          background="bg-[#b8ff5a]"
        />

        <StatCard
          label="Highest recorded coverage"
          value={bestCoverage ?? "—"}
          suffix={bestCoverage === null ? "" : "%"}
          icon={Trophy}
          background="bg-[#ffcf56]"
        />

        <StatCard
          label="Completed scans"
          value={scans.length}
          suffix=" scans"
          icon={TrendingUp}
          background="bg-[#dcecff]"
        />
      </section>

      {/* Main analytics */}
      <section className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        {/* Score chart */}
        <div className="border-[3px] border-black bg-white p-6 shadow-[7px_7px_0_#111]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                Skills requirement coverage
              </p>

              <h2 className="mt-1 text-2xl font-black">
                Coverage by saved scan
              </h2>
            </div>

            <div className="flex items-center gap-2 border-[2px] border-black bg-[#b8ff5a] px-3 py-2 text-xs font-black">
              <ArrowUpRight size={15} strokeWidth={3} />
              {scoredScans.length} classified
            </div>
          </div>

          <div className="relative mt-10 h-[280px] border-b-[3px] border-l-[3px] border-black">
            {/* Grid */}
            <div className="absolute inset-0 flex flex-col justify-between">
              {[100, 80, 60, 40, 20, 0].map(
                (value) => (
                  <div
                    key={value}
                    className="flex items-center"
                  >
                    <span className="absolute -left-10 text-[10px] font-black">
                      {value}
                    </span>

                    <div className="w-full border-t border-dashed border-gray-300" />
                  </div>
                )
              )}
            </div>

            {/* Chart */}
            <div className="absolute inset-0 flex items-end justify-around px-5 pb-0 pt-5">
              {chartScans.map((scan, index) => {
                const score = scan.skills_match_percent;
                const height = `${score}%`;

                return (
                  <div
                    key={scan.scan_uuid}
                    className="flex h-full flex-1 flex-col items-center justify-end"
                  >
                    <div className="mb-2 text-xs font-black">
                      {score}
                    </div>

                    <div
                      className="w-10 border-[3px] border-black bg-[#b8ff5a] shadow-[3px_0_0_#111]"
                      style={{
                        height,
                      }}
                    />

                    <span className="mt-2 text-[10px] font-black text-gray-500">
                      S{scans.length - chartScans.length + index + 1}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm font-bold text-gray-500">
            <TrendingUp size={16} />

            <span>
              Each value uses its scan's saved job description and classified requirements.
            </span>
          </div>
        </div>

        {/* Insights */}
        <div className="border-[3px] border-black bg-[#111111] p-6 text-white shadow-[7px_7px_0_#b8ff5a]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center border-[2px] border-white bg-[#b8ff5a] text-black">
              <TrendingUp size={20} strokeWidth={3} />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-wider text-gray-400">
                Your progress
              </p>

              <h2 className="text-xl font-black">
                How to read these results
              </h2>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <Insight
              title="Coverage formula"
              text="Matched requirements count as 1, partial matches as 0.5, and missing requirements as 0."
            />

            <Insight
              title="Compare like with like"
              text="Coverage is tied to each scan's job description; different roles have different requirement sets."
            />

            <Insight
              title="No classified requirements"
              text="A percentage is omitted when the analysis did not classify any skills requirements."
            />
          </div>

          <button
            onClick={openLatestTailoring}
            disabled={!latestScan}
            className="mt-8 flex w-full items-center justify-center gap-2 border-[3px] border-white bg-[#b8ff5a] px-5 py-4 font-black text-black shadow-[4px_4px_0_white]"
          >
            Tailor latest scan
            <ArrowUpRight size={18} strokeWidth={3} />
          </button>
        </div>
      </section>

      {/* Scan history */}
      <section className="mt-8 border-[3px] border-black bg-white shadow-[7px_7px_0_#111]">
        <div className="flex flex-col justify-between gap-4 border-b-[3px] border-black bg-[#f5f1e8] p-6 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <History size={24} strokeWidth={3} />

            <div>
              <h2 className="text-2xl font-black">
                Recent scans
              </h2>

              <p className="text-xs font-bold text-gray-500">
                Your latest resume analysis results
              </p>
            </div>
          </div>

          <span className="border-[2px] border-black bg-white px-3 py-2 text-xs font-black">
            {loading ? "Loading" : `${scans.length} scans`}
          </span>
        </div>

        <div className="divide-y-[3px] divide-black">
          {error && (
            <p className="p-5 text-sm font-bold text-red-700">{error}</p>
          )}
          {!loading && !error && scans.length === 0 && (
            <p className="p-5 text-sm font-semibold text-gray-600">
              No completed scans yet.
            </p>
          )}
          {scans.map((scan) => (
            <ScanRow
              key={scan.scan_uuid}
              scan={scan}
              onClick={() => openScan(scan)}
            />
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mt-8 border-[3px] border-black bg-[#b8ff5a] p-7 shadow-[7px_7px_0_#111]">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-wider">
              Keep improving
            </p>

            <h2 className="mt-1 text-2xl font-black">
              Your next scan could be your best one.
            </h2>
          </div>

          <button
            onClick={() => navigate("/upload")}
            className="flex items-center justify-center gap-2 border-[3px] border-black bg-white px-6 py-3 font-black shadow-[4px_4px_0_#111]"
          >
            <FileText size={18} strokeWidth={3} />
            Scan another resume
          </button>
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  background,
}) {
  return (
    <div
      className={`border-[3px] border-black p-6 shadow-[6px_6px_0_#111] ${background}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-black uppercase tracking-wider">
          {label}
        </p>

        <Icon size={23} strokeWidth={3} />
      </div>

      <div className="mt-8 flex items-end gap-1">
        <span className="text-6xl font-black leading-none tracking-[-0.06em]">
          {value}
        </span>

        <span className="mb-1 text-sm font-black">
          {suffix}
        </span>
      </div>
    </div>
  );
}

function Insight({ title, text }) {
  return (
    <div className="border-[2px] border-white/30 p-4">
      <div className="flex items-center gap-2">
        <Check
          size={16}
          className="text-[#b8ff5a]"
          strokeWidth={3}
        />

        <p className="font-black">
          {title}
        </p>
      </div>

      <p className="mt-2 text-sm font-semibold leading-5 text-gray-300">
        {text}
      </p>
    </div>
  );
}

function ScanRow({ scan, onClick }) {
  const score = scan.skills_match_percent;

  return (
    <button
      onClick={onClick}
      className="group flex w-full flex-col gap-4 p-5 text-left transition-colors hover:bg-[#f5f1e8] md:flex-row md:items-center md:justify-between"
    >
      <div className="flex min-w-0 items-center gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center border-[2px] border-black bg-white">
          <FileText size={21} strokeWidth={3} />
        </div>

        <div className="min-w-0">
          <h3 className="truncate font-black">
            {scan.resume}
          </h3>

          <p className="mt-1 truncate text-xs font-bold text-gray-500">
            {scan.filename}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden text-right sm:block">
          <p className="text-xs font-black text-gray-500">
            {scan.created_at ? new Date(scan.created_at).toLocaleString() : ""}
          </p>

          <p className="mt-1 text-xs font-bold">
            {scan.changes ?? 0} changes
          </p>
        </div>

        <span
          className="border-[2px] border-black bg-[#dcecff] px-3 py-2 text-xs font-black"
        >
          {score === null || typeof score === "undefined"
            ? "No coverage"
            : "Skills coverage"}
        </span>

        <div className="border-[3px] border-black bg-white px-4 py-2 shadow-[3px_3px_0_#111]">
          <span className="text-2xl font-black">
            {score ?? "—"}
          </span>
          <span className="text-xs font-black">
            {score === null || typeof score === "undefined" ? "" : "%"}
          </span>
        </div>
      </div>
    </button>
  );
}

export default Analytics;
