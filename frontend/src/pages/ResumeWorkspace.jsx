import {
  ArrowLeft,
  ArrowRight,
  FileText,
  History,
  Loader2,
  ScanLine,
  Target,
  Trash2,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  useResume,
} from "../context/ResumeContext";
import { useFeatures } from "../hooks/useFeatures";


const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1";


function ResumeWorkspace() {

  const navigate = useNavigate();

  const { resumeUuid } = useParams();
  const { ats_scan: atsScanEnabled } = useFeatures();

  const {
    selectResume,
    selectedResumeUuid,
    clearSelectedResume,
  } = useResume();


  // =========================================================
  // State
  // =========================================================

  const [resume, setResume] =
    useState(null);

  const [scans, setScans] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [deletingScanUuid, setDeletingScanUuid] =
    useState(null);

  const requestIdRef =
    useRef(0);

  const visibleScans =
    scans.filter(
      (scan) =>
        scan &&
        scan.job_description &&
        String(scan.job_description).trim().length > 0 &&
        (scan.status || "completed") !== "failed"
    );


  // =========================================================
  // Load Resume Workspace
  //
  // IMPORTANT:
  //
  // This page does NOT load "latest scan".
  //
  // It loads:
  //
  // 1. Resume
  // 2. ALL scans belonging to that resume
  //
  // Scans are displayed newest -> oldest.
  // =========================================================

  useEffect(() => {

    if (!resumeUuid) {

      setLoading(false);

      setError(
        "No resume selected."
      );

      return;

    }

    const currentRequestId =
      ++requestIdRef.current;

    if (
      selectedResumeUuid &&
      selectedResumeUuid !== resumeUuid
    ) {
      selectResume({
        resumeUuid,
      });
    }


    let cancelled = false;


    const loadWorkspace =
      async () => {

        setLoading(true);
        setError("");


        try {

          // =====================================================
          // 1. Load Resume
          // =====================================================

          const resumeResponse =
            await fetch(
              `${API_BASE_URL}/resumes/${encodeURIComponent(
                resumeUuid
              )}`
            );


          const resumeData =
            await resumeResponse.json();


          if (!resumeResponse.ok) {

            throw new Error(
              resumeData.detail ||
              "Failed to load resume."
            );

          }


          const loadedResume = {

            resumeUuid:
              resumeData.resume_uuid,

            resumeId:
              resumeData.id ?? null,

            name:
              resumeData.filename,

            filename:
              resumeData.filename,

            fileType:
              resumeData.file_type,

            updated:
              resumeData.created_at,

          };


          // =====================================================
          // 2. Load ALL scans for this resume
          // =====================================================

          if (
            loadedResume.resumeId === null ||
            loadedResume.resumeId === undefined
          ) {

            throw new Error(
              "Resume ID is missing."
            );

          }


          let loadedScans = [];

          if (atsScanEnabled) {
            const scanResponse =
              await fetch(
                `${API_BASE_URL}/ats/scans?resume_id=${encodeURIComponent(
                  loadedResume.resumeId
                )}`
              );

            const scanData =
              await scanResponse.json();

            if (!scanResponse.ok) {
              throw new Error(
                scanData.detail ||
                "Failed to load resume analyses."
              );
            }

            loadedScans =
              Array.isArray(scanData)
                ? [...scanData].sort(
                    (a, b) =>
                      new Date(b.created_at || 0).getTime() -
                      new Date(a.created_at || 0).getTime()
                  )
                : [];
          }


          // =====================================================
          // Prevent stale async response from updating UI
          // =====================================================

          if (cancelled || currentRequestId !== requestIdRef.current) {
            return;
          }


          setResume(
            loadedResume
          );


          setScans(
            loadedScans
          );


          // =====================================================
          // Synchronize ResumeContext
          //
          // DO NOT attach latestScan here.
          // =====================================================

          selectResume(
            loadedResume
          );

        } catch (err) {

          if (cancelled || currentRequestId !== requestIdRef.current) {
            return;
          }


          console.error(
            "Failed to load resume workspace:",
            err
          );


          setError(
            err.message ||
            "Failed to load resume workspace."
          );

        } finally {

          if (!cancelled && currentRequestId === requestIdRef.current) {

            setLoading(false);

          }

        }

      };


    loadWorkspace();


    return () => {

      cancelled = true;
      requestIdRef.current = currentRequestId;

    };

  }, [
    resumeUuid,
    atsScanEnabled,
    selectResume,
  ]);


  // =========================================================
  // Start New Analysis
  //
  // This does NOT select an existing scan.
  //
  // Analyze page will handle the new analysis flow.
  // =========================================================

  const openAnalyze =
    () => {

      if (!resume) {
        return;
      }


      navigate(
        `/analyze?resumeUuid=${encodeURIComponent(
          resume.resumeUuid
        )}`
      );

    };


  // =========================================================
  // View Existing Analysis
  //
  // User selects a specific scan from the workspace.
  // Analyze page becomes the RESULT page for that scan.
  // =========================================================

  const openScan =
    (scan) => {

      if (!resume || !scan?.scan_uuid) {
        return;
      }


      const params =
        new URLSearchParams();


      params.set(
        "resumeUuid",
        resume.resumeUuid
      );


      params.set(
        "scanUuid",
        scan.scan_uuid
      );


      navigate(
        `/analyze?${params.toString()}`
      );

    };


  // =========================================================
  // Tailor Resume
  //
  // Tailoring requires a specific analysis/JD.
  //
  // If there are scans, use the most recent scan as the
  // default tailoring target.
  //
  // IMPORTANT:
  // This does NOT mean the workspace itself is based on
  // latestScan anymore.
  //
  // The user can select an older scan and view that analysis.
  // =========================================================

  const openTailor =
    (scan) => {

      if (!resume) {
        return;
      }


      const targetScan =
        scan ||
        visibleScans[0];


      if (!targetScan?.scan_uuid) {

        return;

      }


      const params =
        new URLSearchParams();


      params.set(
        "resumeUuid",
        resume.resumeUuid
      );


      params.set(
        "scanUuid",
        targetScan.scan_uuid
      );


      navigate(
        `/tailor?${params.toString()}`
      );

    };


  // =========================================================
  // Resume Versions
  // =========================================================

  const openHistory =
    () => {

      if (!resume) {
        return;
      }


      navigate(
        `/resumes/${encodeURIComponent(
          resume.resumeUuid
        )}/versions`
      );

    };


  const deleteScan =
    async (scan) => {

      if (!scan?.scan_uuid || deletingScanUuid) {
        return;
      }

      const confirmed = window.confirm(
        "Delete this analysis? Its tailoring suggestions and saved versions will also be deleted."
      );

      if (!confirmed) {
        return;
      }

      setDeletingScanUuid(scan.scan_uuid);
      setError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/ats/scans/${encodeURIComponent(scan.scan_uuid)}`,
          { method: "DELETE" }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Failed to delete analysis.");
        }

        setScans((current) =>
          current.filter(
            (item) => item.scan_uuid !== scan.scan_uuid
          )
        );
      } catch (err) {
        setError(err.message || "Failed to delete analysis.");
      } finally {
        setDeletingScanUuid(null);
      }
    };


  // =========================================================
  // Loading
  // =========================================================

  if (loading) {

    return (

      <div className="mx-auto max-w-7xl">

        <section className="flex min-h-[500px] items-center justify-center">

          <div className="flex items-center gap-3 border-[3px] border-black bg-white p-8 font-black shadow-[7px_7px_0_#111]">

            <Loader2
              size={22}
              className="animate-spin"
              strokeWidth={3}
            />

            Loading resume workspace...

          </div>

        </section>

      </div>

    );

  }


  // =========================================================
  // Error
  // =========================================================

  if (
    error ||
    !resume
  ) {

    return (

      <div className="mx-auto max-w-7xl">

        <section className="flex min-h-[500px] items-center justify-center">

          <div className="max-w-lg border-[3px] border-black bg-[#ffdddd] p-8 text-center shadow-[7px_7px_0_#111]">

            <h1 className="text-3xl font-black">

              Resume unavailable.

            </h1>


            <p className="mt-3 font-semibold">

              {error ||
                "Resume not found."}

            </p>


            <button
              onClick={() =>
                navigate("/resumes")
              }
              className="mt-6 border-[3px] border-black bg-[#b8ff5a] px-5 py-3 font-black shadow-[4px_4px_0_#111]"
            >

              Back to Resumes

            </button>

          </div>

        </section>

      </div>

    );

  }


  // =========================================================
  // Workspace
  // =========================================================

  return (

    <div className="mx-auto max-w-7xl">

      {/* =====================================================
          Header
      ===================================================== */}

      <section className="mb-8">

        <button
          onClick={() => {
            clearSelectedResume();
            navigate("/");
          }}
          className="mb-6 flex items-center gap-2 font-black hover:underline"
        >

          <ArrowLeft
            size={18}
            strokeWidth={3}
          />

          Back to dashboard

        </button>


        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">

          <div>

            <p className="mb-2 text-sm font-black uppercase tracking-[0.15em] text-gray-500">

              Resume Workspace

            </p>


            <h1 className="text-5xl font-black tracking-[-0.04em]">

              {resume.name}

            </h1>


            <div className="mt-3 flex items-center gap-2 text-sm font-bold text-gray-500">

              <FileText
                size={16}
              />

              {resume.filename}

            </div>

          </div>


          {/* =================================================
              Workspace Actions
          ================================================= */}

          {atsScanEnabled && <div className="flex flex-wrap gap-3">

            <button
              onClick={openAnalyze}
              className="flex items-center gap-2 border-[3px] border-black bg-[#b8ff5a] px-5 py-3 font-black shadow-[4px_4px_0_#111] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_#111]"
            >

              <ScanLine
                size={18}
                strokeWidth={3}
              />

              Analyze

            </button>


            <button
              onClick={() =>
                openTailor()
              }
              disabled={
                visibleScans.length === 0
              }
              className="flex items-center gap-2 border-[3px] border-black bg-white px-5 py-3 font-black shadow-[4px_4px_0_#111] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_#111] disabled:cursor-not-allowed disabled:opacity-40"
            >

              <Target
                size={18}
                strokeWidth={3}
              />

              Tailor

            </button>


            <button
              onClick={openHistory}
              className="flex items-center gap-2 border-[3px] border-black bg-[#dcecff] px-5 py-3 font-black shadow-[4px_4px_0_#111] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_#111]"
            >

              <History
                size={18}
                strokeWidth={3}
              />

              Versions

            </button>

          </div>}

        </div>

      </section>


      {/* =====================================================
          Resume Overview
      ===================================================== */}

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">

        {/* ===================================================
            Resume Information
        =================================================== */}

        <div className="border-[3px] border-black bg-white shadow-[7px_7px_0_#111]">

          <div className="border-b-[3px] border-black bg-[#f5f1e8] p-5">

            <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">

              Resume

            </p>


            <h2 className="mt-1 text-2xl font-black">

              Workspace

            </h2>

            </div>


          <div className="p-6">

            <div className="border-[3px] border-black bg-[#faffef] p-5">

              <p className="text-xs font-black uppercase text-gray-500">

                Resume Status

              </p>


              <p className="mt-2 text-3xl font-black">
                {!atsScanEnabled
                  ? "Analysis disabled"
                  : visibleScans.length > 0
                    ? "Analyzed"
                    : "Not analyzed"}
              </p>


              <p className="mt-3 text-sm font-bold leading-6 text-gray-500">

                {!atsScanEnabled
                  ? "ATS resume analysis is currently disabled."
                  : visibleScans.length > 0
                  ? `${visibleScans.length} analysis ${
                      visibleScans.length === 1
                        ? "scan"
                        : "scans"
                    } available for this resume.`
                  : "Run an ATS analysis against a job description to get started."}

              </p>

            </div>


            <div className="mt-5 space-y-3">

              <InfoRow
                label="File"
                value={
                  resume.filename
                }
              />


              {atsScanEnabled && (
                <InfoRow
                  label="Analyses"
                  value={visibleScans.length}
                />
              )}


              <InfoRow
                label="Added"
                value={
                  formatDate(
                    resume.updated
                  )
                }
              />

            </div>

          </div>

        </div>


        {/* ===================================================
            Analysis History
        =================================================== */}

        {atsScanEnabled ? (
          <div className="border-[3px] border-black bg-white shadow-[7px_7px_0_#111]">

          <div className="flex items-center justify-between border-b-[3px] border-black bg-[#f5f1e8] p-5">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">

                Analysis History

              </p>


              <h2 className="mt-1 text-2xl font-black">

                Job analyses

              </h2>

            </div>


            <ScanLine
              size={28}
              strokeWidth={3}
            />

          </div>


          <div className="p-5">

            {visibleScans.length === 0 ? (

              /* ===============================================
                 No scans
              =============================================== */

              <div className="border-[3px] border-dashed border-black bg-[#faffef] p-8 text-center">

                <div className="mx-auto flex h-14 w-14 items-center justify-center border-[3px] border-black bg-[#b8ff5a]">

                  <ScanLine
                    size={24}
                    strokeWidth={3}
                  />

                </div>


                <h3 className="mt-5 text-xl font-black">

                  No analyses yet

                </h3>


                <p className="mt-2 font-semibold leading-6 text-gray-500">

                  Analyze this resume against a job
                  description to create your first scan.

                </p>


                <button
                  onClick={openAnalyze}
                  className="mt-5 flex items-center justify-center gap-2 border-[3px] border-black bg-[#b8ff5a] px-5 py-3 font-black shadow-[4px_4px_0_#111]"
                >

                  Analyze Resume

                  <ArrowRight
                    size={18}
                    strokeWidth={3}
                  />

                </button>

              </div>

            ) : (

              /* ===============================================
                 Scan List
              =============================================== */

              <div className="space-y-4">

                {visibleScans.map(
                  (scan, index) => (

                    <ScanHistoryCard
                      key={
                        scan.scan_uuid ||
                        scan.id ||
                        index
                      }

                      scan={
                        scan
                      }

                      index={
                        index
                      }

                      onView={
                        openScan
                      }

                      onTailor={
                        openTailor
                      }

                      onDelete={
                        deleteScan
                      }

                      deleting={
                        deletingScanUuid === scan.scan_uuid
                      }

                    />

                  )
                )}

              </div>

            )}

          </div>

        </div>
        ) : (
          <div className="border-[3px] border-black bg-white p-8 font-semibold shadow-[7px_7px_0_#111]">
            Resume analysis and scan history are currently disabled.
          </div>
        )}

      </section>


      {/* =====================================================
          Bottom Workspace Actions
      ===================================================== */}

      {atsScanEnabled && (
        <section className="mt-8 border-[3px] border-black bg-[#111111] p-6 text-white shadow-[7px_7px_0_#b8ff5a]">

        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.15em] text-[#b8ff5a]">

              Resume Workspace

            </p>


            <h2 className="mt-1 text-2xl font-black">

              Work on this resume

            </h2>


            <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-gray-300">

              Analyze this resume for a new role, tailor
              it against an existing job analysis, or
              manage its versions.

            </p>

          </div>


          <div className="flex flex-wrap gap-3">

            <button
              onClick={openAnalyze}
              className="flex items-center gap-2 border-[3px] border-white bg-white px-5 py-3 font-black text-black shadow-[4px_4px_0_white]"
            >

              <ScanLine
                size={18}
                strokeWidth={3}
              />

              New Analysis

            </button>


            <button
              onClick={() =>
                openTailor()
              }
              disabled={
                visibleScans.length === 0
              }
              className="flex items-center gap-2 border-[3px] border-white bg-[#b8ff5a] px-5 py-3 font-black text-black shadow-[4px_4px_0_white] disabled:cursor-not-allowed disabled:opacity-40"
            >

              Tailor Resume

              <ArrowRight
                size={18}
                strokeWidth={3}
              />

            </button>


            <button
              onClick={openHistory}
              className="flex items-center gap-2 border-[3px] border-white bg-transparent px-5 py-3 font-black text-white shadow-[4px_4px_0_white]"
            >

              <History
                size={18}
                strokeWidth={3}
              />

              Versions

            </button>

          </div>

        </div>

        </section>
      )}

    </div>

  );

}


// ===========================================================
// Scan History Card
// ===========================================================

function ScanHistoryCard({
  scan,
  index,
  onView,
  onTailor,
  onDelete,
  deleting,
}) {

  const isLatest =
    index === 0;


  const score =
    scan?.skills_match_percent;


  const status =
    scan?.status ||
    "completed";


  const jobDescription =
    scan?.job_description ||
    "No job description stored.";


  const jobPreview =
    jobDescription
      .replace(/\s+/g, " ")
      .trim();


  return (

    <article className="border-[3px] border-black bg-white">

      {/* =====================================================
          Scan Header
      ===================================================== */}

      <div className="flex flex-col justify-between gap-4 border-b-[3px] border-black bg-[#faffef] p-5 sm:flex-row sm:items-start">

        <div className="min-w-0">

          <div className="flex flex-wrap items-center gap-2">

            <span className="border-[2px] border-black bg-white px-2 py-1 text-xs font-black uppercase">

              Scan {index + 1}

            </span>


            {isLatest && (

              <span className="border-[2px] border-black bg-[#b8ff5a] px-2 py-1 text-xs font-black uppercase">

                Latest

              </span>

            )}


            <span className="border-[2px] border-black bg-[#dcecff] px-2 py-1 text-xs font-black uppercase">

              {status}

            </span>

          </div>


          <p className="mt-3 text-sm font-bold text-gray-500">

            {formatDateTime(
              scan?.created_at
            )}

          </p>

        </div>


        {/* =================================================
            Score
        ================================================= */}

        <div className="shrink-0 text-left sm:text-right">

          <p className="text-xs font-black uppercase tracking-wider text-gray-500">

            Skills Match

          </p>


          <div className="mt-1">

            <span className="text-4xl font-black">

              {score ?? "—"}

            </span>


            {score !== null &&
              score !== undefined && (

                <span className="ml-1 font-black">

                  /100

                </span>

              )}

          </div>

        </div>

      </div>


      {/* =====================================================
          Job Description
      ===================================================== */}

      <div className="p-5">

        <div className="flex items-center gap-2">

          <Target
            size={17}
            strokeWidth={3}
          />

          <p className="text-xs font-black uppercase tracking-wider">

            Target Job

          </p>

        </div>


        <p className="mt-3 line-clamp-3 text-sm font-semibold leading-6 text-gray-600">

          {jobPreview}

        </p>


        {/* =================================================
            Scan Metadata
        ================================================= */}

        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-gray-500">

          {scan?.provider_id && (

            <span>

              Provider:{" "}
              <strong className="text-black">

                {scan.provider_id}

              </strong>

            </span>

          )}


          {scan?.model_id && (

            <span>

              Model:{" "}
              <strong className="text-black">

                {scan.model_id}

              </strong>

            </span>

          )}

        </div>


        {/* =================================================
            Actions
        ================================================= */}

        <div className="mt-5 flex flex-wrap gap-3">

          <button
            onClick={() =>
              onView(scan)
            }
            className="flex items-center gap-2 border-[3px] border-black bg-[#b8ff5a] px-4 py-2.5 font-black shadow-[3px_3px_0_#111] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#111]"
          >

            <ScanLine
              size={16}
              strokeWidth={3}
            />

            View Analysis

            <ArrowRight
              size={16}
              strokeWidth={3}
            />

          </button>


          <button
            onClick={() =>
              onTailor(scan)
            }
            className="flex items-center gap-2 border-[3px] border-black bg-white px-4 py-2.5 font-black shadow-[3px_3px_0_#111] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#111]"
          >

            Tailor

            <ArrowRight
              size={16}
              strokeWidth={3}
            />

          </button>


          <button
            type="button"
            onClick={() => onDelete(scan)}
            disabled={deleting}
            aria-label="Delete analysis"
            className="flex items-center justify-center border-[3px] border-black bg-[#ffdddd] px-3 py-2.5 font-black shadow-[3px_3px_0_#111] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#111] disabled:cursor-wait disabled:opacity-60"
          >
            <Trash2
              size={17}
              strokeWidth={3}
            />
          </button>

        </div>

      </div>

    </article>

  );

}


// ===========================================================
// Info Row
// ===========================================================

function InfoRow({
  label,
  value,
}) {

  return (

    <div className="flex justify-between gap-4 border-b-[2px] border-black py-3">

      <span className="text-xs font-black uppercase text-gray-500">

        {label}

      </span>


      <span className="max-w-[65%] text-right text-sm font-black">

        {value}

      </span>

    </div>

  );

}


// ===========================================================
// Date
// ===========================================================

function formatDate(
  value
) {

  if (!value) {
    return "—";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "—";

  }


  return date.toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );

}


// ===========================================================
// Date + Time
// ===========================================================

function formatDateTime(
  value
) {

  if (!value) {
    return "Unknown date";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "Unknown date";

  }


  return date.toLocaleString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  );

}


export default ResumeWorkspace;
