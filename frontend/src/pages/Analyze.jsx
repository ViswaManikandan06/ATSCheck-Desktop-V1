import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  History,
  Lightbulb,
  Loader2,
  Plus,
  Target,
  TriangleAlert,
  X,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  useResume,
} from "../context/ResumeContext";


const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1";


function normalizeScanResult(data) {
  const resultPayload = data?.result ?? {};
  const analysisPayload =
    resultPayload.analysis ?? resultPayload ?? {};

  const breakdown =
    analysisPayload.breakdown ??
    data?.breakdown ??
    resultPayload.breakdown ??
    {};

  return {
    ...data,
    result: {
      ...resultPayload,
      ...analysisPayload,
      analysis: {
        ...(resultPayload.analysis ?? {}),
        ...(analysisPayload.analysis ?? {}),
        breakdown,
      },
      breakdown,
    },
    breakdown,
  };
}


function getSkillCoverage(skillsMatch = {}) {
  const classifications = new Map();

  for (const [classification, field] of [
    ["matched", "matched_skills"],
    ["partial", "partially_matched_skills"],
    ["missing", "missing_skills"],
  ]) {
    for (const item of skillsMatch[field] || []) {
      const normalized = item.trim().toLocaleLowerCase();
      if (normalized && !classifications.has(normalized)) {
        classifications.set(normalized, classification);
      }
    }
  }

  const counts = {
    matched: 0,
    partial: 0,
    missing: 0,
    total: classifications.size,
  };

  for (const classification of classifications.values()) {
    counts[classification] += 1;
  }

  return {
    ...counts,
    percent: counts.total
      ? Math.round(
          ((counts.matched + counts.partial * 0.5) / counts.total) * 1000
        ) / 10
      : null,
  };
}


function Analyze() {

  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const queryScanUuid =
    searchParams.get("scanUuid");


  // =========================================================
  // Resume Context
  // =========================================================

  const {
    selectedResume,
    selectedResumeUuid,
    selectResume,
    clearSelectedResume,
  } = useResume();


  // =========================================================
  // Resume UUID
  // =========================================================

  const queryResumeUuid =
    searchParams.get("resumeUuid");

  const resumeUuid =
    queryResumeUuid ||
    selectedResumeUuid;


  // =========================================================
  // State
  // =========================================================

  const [resume, setResume] =
    useState(selectedResume);

  const [jobDescription, setJobDescription] =
    useState("");

  const [scanResult, setScanResult] =
    useState(null);

  const [scanUuid, setScanUuid] =
    useState(null);

  const [loadingResume, setLoadingResume] =
    useState(false);

  const [loadingLatestScan, setLoadingLatestScan] =
    useState(false);

  const [analyzing, setAnalyzing] =
    useState(false);

  const [loadingProvider, setLoadingProvider] =
    useState(true);

  const [activeProvider, setActiveProvider] =
    useState(null);

  const [ollamaStatus, setOllamaStatus] =
    useState({
      installed: false,
      running: false,
      host: "http://127.0.0.1:11434",
    });

  const [error, setError] =
    useState("");

  const [providerError, setProviderError] =
    useState("");

  const selectedResumeRef =
    useRef(selectedResume);

  const currentSkillsMatch =
    scanResult?.result?.analysis?.breakdown?.skills_match || {};

  const skillCoverage =
    getSkillCoverage(currentSkillsMatch);

  const skillsMatchPercent =
    typeof scanResult?.skills_match_percent === "number"
      ? scanResult.skills_match_percent
      : typeof currentSkillsMatch.requirement_coverage_percent === "number"
        ? currentSkillsMatch.requirement_coverage_percent
        : skillCoverage.percent;


  useEffect(() => {
    selectedResumeRef.current =
      selectedResume;
  }, [selectedResume]);


  // =========================================================
  // Keep local resume synchronized with context
  // =========================================================

  useEffect(() => {

    if (
      selectedResume &&
      selectedResume.resumeUuid ===
        resumeUuid
    ) {

      setResume(
        selectedResume
      );

    }

  }, [
    selectedResume,
    resumeUuid,
  ]);


  // =========================================================
  // Load Resume
  // =========================================================

  useEffect(() => {

    if (!resumeUuid) {
      return;
    }


    const loadResume = async () => {

      const contextResume =
        selectedResumeRef.current;

      if (
        contextResume &&
        contextResume.resumeUuid ===
          resumeUuid
      ) {

        setResume(
          contextResume
        );

        return;

      }


      setLoadingResume(true);
      setError("");


      try {

        const response =
          await fetch(
            `${API_BASE_URL}/resumes/${encodeURIComponent(
              resumeUuid
            )}`
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.detail ||
            "Failed to load resume."
          );

        }


        const loadedResume = {

          resumeUuid:
            data.resume_uuid,

          resumeId:
            data.id ?? null,

          name:
            data.filename,

          filename:
            data.filename,

          fileType:
            data.file_type,

          score:
            null,

          version:
            null,

          updated:
            data.created_at,

        };


        setResume(
          loadedResume
        );

        selectResume(
          loadedResume
        );

      } catch (err) {

        console.error(
          "Failed to load resume:",
          err
        );

        setError(
          err.message ||
          "Failed to load resume."
        );

      } finally {

        setLoadingResume(false);

      }

    };


    loadResume();

  }, [
    resumeUuid,
  ]);


  // =========================================================
  // Load a specific scan if provided, otherwise load latest scan
  // =========================================================

  useEffect(() => {

    if (!resumeUuid) {
      return;
    }


    const loadScan = async () => {

      setLoadingLatestScan(true);
      setError("");

      const contextResume =
        selectedResumeRef.current;


      try {

        const targetUrl = queryScanUuid
          ? `${API_BASE_URL}/ats/scans/${encodeURIComponent(
              queryScanUuid
            )}`
          : `${API_BASE_URL}/ats/resumes/${encodeURIComponent(
              resumeUuid
            )}/latest`;


        const response =
          await fetch(targetUrl);


        if (response.status === 404) {

          if (queryScanUuid) {
            throw new Error(
              "Selected analysis not found."
            );
          }

          setScanResult(null);
          setScanUuid(null);
          setJobDescription("");
          return;

        }


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.detail ||
            "Failed to load analysis."
          );

        }


        const loadedScanUuid =
          data.scan_uuid || queryScanUuid;


        setScanUuid(loadedScanUuid);
        setJobDescription(
          data.job_description || ""
        );


        const normalizedResult = normalizeScanResult({
          scan_uuid: loadedScanUuid,
          resume_id: data.resume_id,
          job_description: data.job_description,
          provider_id: data.provider_id,
          model_id: data.model_id,
          overall_score: data.overall_score,
          status: data.status,
          created_at: data.created_at,
          ...data,
        });


        setScanResult(
          normalizedResult
        );


        const updatedResume = {

          ...(resume || contextResume || {}),
          resumeUuid:
            resumeUuid,
          score:
            data.skills_match_percent,

        };


        setResume(updatedResume);

        if (
          contextResume &&
          contextResume.resumeUuid ===
            resumeUuid
        ) {
          selectResume(updatedResume);
        }

      } catch (err) {

        console.error(
          "Failed to load ATS scan:",
          err
        );

        setScanResult(null);
        setScanUuid(null);

        setError(
          err.message ||
          "Failed to load analysis."
        );

      } finally {

        setLoadingLatestScan(false);

      }

    };


    loadScan();

  }, [
    resumeUuid,
    queryScanUuid,
    selectResume,
  ]);


  // =========================================================
  // Load Active LLM Provider
  // =========================================================

  useEffect(() => {

    const loadActiveProvider =
      async () => {

        setLoadingProvider(true);
        setProviderError("");


        try {

          const response =
            await fetch(
              `${API_BASE_URL}/settings/llm/active`
            );


          const data =
            await response.json();


          if (!response.ok) {

            setActiveProvider(null);
            setProviderError(
              data.detail ||
              "No active LLM provider is configured."
            );
            return;

          }


          setActiveProvider(data);
          setProviderError("");

          try {
            const statusResponse = await fetch(
              `${API_BASE_URL}/settings/llm/providers/${encodeURIComponent(data.provider_id)}/status`
            );

            const statusData = await statusResponse.json();
            const isRunning =
              statusResponse.ok &&
              statusData?.running !== false;

            setOllamaStatus(
              statusData || {
                installed: false,
                running: false,
                host: "http://127.0.0.1:11434",
              }
            );

            if (!isRunning) {
              setProviderError(
                "The selected LLM provider is not available or unreachable. Check that it is running and configured correctly."
              );
              setActiveProvider(null);
            }
          } catch {
            setOllamaStatus({
              installed: false,
              running: false,
              host: "http://127.0.0.1:11434",
            });
            setProviderError(
              "The selected LLM provider is not available or unreachable. Check that it is running and configured correctly."
            );
            setActiveProvider(null);
          }

        } catch (err) {

          console.error(
            "Failed to load active LLM provider:",
            err
          );


          setActiveProvider(null);


          setProviderError(
            err.message ||
            "No active LLM provider is configured."
          );

        } finally {

          setLoadingProvider(false);

        }

      };


    loadActiveProvider();

  }, []);


  // =========================================================
  // Run New ATS Analysis
  // =========================================================

  const handleAnalyze =
    async () => {

      if (!resumeUuid) {

        setError(
          "No resume selected."
        );

        return;

      }


      if (!jobDescription.trim()) {

        setError(
          "Please enter a job description before analyzing."
        );

        return;

      }


      if (!activeProvider) {

        setError(
          providerError ||
          "No active LLM provider is configured. Please configure a provider in Settings."
        );

        return;

      }

      const providerRuntimeAvailable =
        ollamaStatus.running !== false;

      if (!providerRuntimeAvailable) {
        setError(
          `The selected LLM provider (${activeProvider.display_name || activeProvider.provider_id}) is not available or unreachable. Check that it is running and configured correctly.`
        );
        return;
      }


      setAnalyzing(true);
      setError("");


      try {

        const response =
          await fetch(
            `${API_BASE_URL}/ats/scan`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({

                resume_uuid:
                  resumeUuid,

                job_description:
                  jobDescription.trim(),

              }),

            }
          );


        const data =
          await response.json();


        console.log(
          "NEW ATS SCAN:",
          data
        );


        if (!response.ok) {

          const detail =
            data?.detail ||
            "ATS analysis failed.";

          if (
            detail &&
            detail.toLowerCase().includes("not available")
          ) {
            throw new Error(
              "The selected LLM provider is not available or unreachable. Check that it is running and configured correctly."
            );
          }

          throw new Error(detail);

        }


        setScanUuid(
          data.scan_uuid
        );


        setJobDescription(
          data.job_description ||
          jobDescription.trim()
        );


        const normalizedResult = normalizeScanResult(data);


        console.log(
          "NEW ATS ANALYSIS:",
          normalizedResult.result
        );


        setScanResult(
          normalizedResult
        );


        // -----------------------------------------------------
        // Update resume score
        // -----------------------------------------------------

        const updatedResume = {

          ...(resume || selectedResume || {}),

          resumeUuid:
            resumeUuid,

          score:
            data.skills_match_percent,

        };


        setResume(
          updatedResume
        );


        if (
          selectedResume &&
          selectedResume.resumeUuid ===
            resumeUuid
        ) {

          selectResume(
            updatedResume
          );

        }

      } catch (err) {

        console.error(
          "ATS analysis failed:",
          err
        );


        setError(
          err.message ||
          "Failed to analyze resume."
        );

      } finally {

        setAnalyzing(false);

      }

    };


  // =========================================================
  // Start New Analysis
  // =========================================================

  const handleNewAnalysis =
    () => {

      setScanResult(null);

      setScanUuid(null);

      setJobDescription("");

      setError("");

    };


  // =========================================================
  // Tailor Resume
  // =========================================================

  const handleTailor =
    () => {

      if (!resumeUuid) {
        return;
      }


      const params =
        new URLSearchParams();


      params.set(
        "resumeUuid",
        resumeUuid
      );


      if (scanUuid) {

        params.set(
          "scanUuid",
          scanUuid
        );

      }


      navigate(
        `/tailor?${params.toString()}`
      );

    };


  // =========================================================
  // No Resume
  // =========================================================

  if (!resumeUuid) {

    return (

      <div className="mx-auto max-w-7xl">

        <section className="flex min-h-[500px] items-center justify-center">

          <div className="max-w-lg border-[3px] border-black bg-white p-8 text-center shadow-[8px_8px_0_#111]">

            <div className="mx-auto flex h-16 w-16 items-center justify-center border-[3px] border-black bg-[#ffcf56] shadow-[4px_4px_0_#111]">

              <FileText
                size={30}
                strokeWidth={3}
              />

            </div>


            <h1 className="mt-6 text-3xl font-black">

              Select a resume first.

            </h1>


            <p className="mt-3 font-semibold leading-6 text-gray-600">

              Choose a resume from your workspace before
              opening ATS analysis.

            </p>


            <button
              onClick={() => {
                clearSelectedResume();
                navigate("/");
              }}
              className="mt-6 flex w-full items-center justify-center gap-2 border-[3px] border-black bg-[#b8ff5a] px-5 py-3 font-black shadow-[5px_5px_0_#111]"
            >

              <ArrowLeft
                size={18}
                strokeWidth={3}
              />

              Choose Resume

            </button>

          </div>

        </section>

      </div>

    );

  }


  // =========================================================
  // Loading Resume
  // =========================================================

  if (loadingResume) {

    return (

      <div className="mx-auto max-w-7xl">

        <section className="flex min-h-[500px] items-center justify-center">

          <div className="border-[3px] border-black bg-white p-8 font-black shadow-[7px_7px_0_#111]">

            Loading resume...

          </div>

        </section>

      </div>

    );

  }


  // =========================================================
  // Resume Loading Error
  // =========================================================

  if (
    error &&
    !resume
  ) {

    return (

      <div className="mx-auto max-w-7xl">

        <section className="flex min-h-[500px] items-center justify-center">

          <div className="max-w-lg border-[3px] border-black bg-[#ffdddd] p-8 text-center shadow-[8px_8px_0_#111]">

            <TriangleAlert
              className="mx-auto"
              size={40}
              strokeWidth={3}
            />


            <h1 className="mt-5 text-3xl font-black">

              Resume unavailable.

            </h1>


            <p className="mt-3 font-semibold">

              {error}

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
  // Main
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

              ATS Analysis

            </p>


            <h1 className="text-5xl font-black tracking-[-0.04em]">

              {resume?.name}

            </h1>


            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm font-bold text-gray-500">

              <FileText
                size={16}
              />

              {resume?.filename}

              <span>
                •
              </span>

              Resume UUID:

              <span className="font-mono">

                {resumeUuid.slice(
                  0,
                  8
                )}

                ...

              </span>

            </div>

          </div>


          <div className="flex flex-wrap gap-3">

            {scanResult && (

              <button
                onClick={handleNewAnalysis}
                className="flex items-center justify-center gap-2 border-[3px] border-black bg-white px-5 py-3 font-black shadow-[4px_4px_0_#111]"
              >

                <Plus
                  size={18}
                  strokeWidth={3}
                />

                New Analysis

              </button>

            )}


            <button
              onClick={() =>
                navigate(
                  `/resumes/${resumeUuid}/versions`
                )
              }
              className="flex items-center justify-center gap-2 border-[3px] border-black bg-[#dcecff] px-5 py-3 font-black shadow-[4px_4px_0_#111]"
            >

              <History
                size={18}
                strokeWidth={3}
              />

              Scan History

            </button>

          </div>

        </div>

      </section>


      {/* =====================================================
          Error
      ===================================================== */}

      {error && (

        <section className="mb-6 border-[3px] border-black bg-[#ff7b7b] p-4 font-black shadow-[4px_4px_0_#111]">

          {error}

        </section>

      )}


      {/* =====================================================
          Loading Latest Scan
      ===================================================== */}

      {loadingLatestScan && (

        <section className="mb-6 flex items-center gap-3 border-[3px] border-black bg-white p-5 font-black shadow-[5px_5px_0_#111]">

          <Loader2
            size={20}
            className="animate-spin"
            strokeWidth={3}
          />

          Loading latest analysis...

        </section>

      )}


      {/* =====================================================
          Provider Status
      ===================================================== */}

      {!scanResult && !loadingLatestScan && (

        <section className="mb-6 border-[3px] border-black bg-[#dcecff] p-5 shadow-[5px_5px_0_#111]">

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-600">

                Active LLM Provider

              </p>


              {loadingProvider ? (

                <div className="mt-2 flex items-center gap-2 font-black">

                  <Loader2
                    size={17}
                    className="animate-spin"
                    strokeWidth={3}
                  />

                  Loading provider...

                </div>

              ) : activeProvider ? (

                <div className="mt-2 flex flex-wrap items-center gap-2">

                  <span className="border-[2px] border-black bg-white px-3 py-1 font-black">

                    {activeProvider.provider_id}

                  </span>

                  <span className="font-black">
                    /
                  </span>

                  <span className="border-[2px] border-black bg-white px-3 py-1 font-black">

                    {activeProvider.model_id}

                  </span>

                </div>

              ) : (

                <div className="mt-2">

                  <p className="font-black text-red-700">

                    No active provider configured.

                  </p>

                  <p className="mt-1 text-sm font-semibold text-gray-700">

                    Configure an LLM provider before analyzing
                    your resume.

                  </p>

                </div>

              )}

            </div>


            {!loadingProvider &&
              !activeProvider && (

                <button
                  onClick={() =>
                    navigate("/settings")
                  }
                  className="flex shrink-0 items-center justify-center gap-2 border-[3px] border-black bg-[#b8ff5a] px-5 py-3 font-black shadow-[4px_4px_0_#111]"
                >

                  Open Settings

                  <ArrowRight
                    size={18}
                    strokeWidth={3}
                  />

                </button>

              )}

          </div>

        </section>

      )}


      {/* =====================================================
          Provider Error
      ===================================================== */}

      {!scanResult &&
        !loadingLatestScan &&
        providerError &&
        activeProvider === null && (

          <section className="mb-6 border-[3px] border-black bg-[#ffcf56] p-4 font-black shadow-[4px_4px_0_#111]">

            {providerError}

          </section>

        )}


      {/* =====================================================
          NEW ANALYSIS
      ===================================================== */}

      {!scanResult &&
        !loadingLatestScan && (

          <section className="mb-8 border-[3px] border-black bg-white p-7 shadow-[8px_8px_0_#111]">

            <div className="flex items-start justify-between gap-4">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">

                  New Analysis

                </p>

                <h2 className="mt-1 text-3xl font-black">

                  Analyze this resume against a job.

                </h2>

                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-gray-600">

                  Paste a job description to create a new
                  ATS analysis. Previous scans remain
                  available in Scan History.

                </p>

              </div>


              <Target
                size={30}
                strokeWidth={3}
              />

            </div>


            <textarea
              value={jobDescription}
              onChange={(event) =>
                setJobDescription(
                  event.target.value
                )
              }
              placeholder="Paste the complete job description here..."
              rows={12}
              className="mt-6 w-full resize-y border-[3px] border-black bg-[#f5f1e8] p-5 font-semibold outline-none focus:bg-white"
            />


            <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

              <div className="text-xs font-black uppercase tracking-wider text-gray-500">

                Provider:

                {activeProvider ? (

                  <>

                    <span className="ml-2 border-2 border-black bg-white px-2 py-1 text-black">

                      {activeProvider.provider_id}

                    </span>

                    <span className="mx-2">
                      /
                    </span>

                    <span className="border-2 border-black bg-white px-2 py-1 text-black">

                      {activeProvider.model_id}

                    </span>

                  </>

                ) : (

                  <span className="ml-2 border-2 border-black bg-[#ffdddd] px-2 py-1 text-black">

                    Not configured

                  </span>

                )}

              </div>


              <button
                onClick={handleAnalyze}
                disabled={
                  analyzing ||
                  loadingProvider ||
                  !activeProvider ||
                  !jobDescription.trim()
                }
                className="flex items-center justify-center gap-2 border-[3px] border-black bg-[#b8ff5a] px-7 py-4 font-black shadow-[5px_5px_0_#111] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#111] disabled:cursor-not-allowed disabled:opacity-50"
              >

                {analyzing ? (

                  <>

                    <Loader2
                      size={19}
                      className="animate-spin"
                      strokeWidth={3}
                    />

                    Analyzing...

                  </>

                ) : (

                  <>

                    Analyze and Tailor Resume

                    <ArrowRight
                      size={19}
                      strokeWidth={3}
                    />

                  </>

                )}

              </button>

            </div>

          </section>

        )}


      {/* =====================================================
          ANALYSIS RESULTS
      ===================================================== */}

      {scanResult && (

        <>

          <section className="mb-6 flex flex-col justify-between gap-4 border-[3px] border-black bg-[#f5f1e8] p-5 shadow-[5px_5px_0_#111] md:flex-row md:items-center">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">

                Current Analysis

              </p>

              <p className="mt-1 font-black">

                Latest scan loaded from your local database.

              </p>

              {scanResult.created_at && (

                <p className="mt-1 text-xs font-bold text-gray-500">

                  {formatScanDate(
                    scanResult.created_at
                  )}

                </p>

              )}

            </div>


            <button
              onClick={handleTailor}
              className="flex shrink-0 items-center justify-center gap-2 border-[3px] border-black bg-[#b8ff5a] px-6 py-3 font-black shadow-[4px_4px_0_#111]"
            >

              Tailor Resume

              <ArrowRight
                size={18}
                strokeWidth={3}
              />

            </button>

          </section>


            {/* =================================================
              Skills Match Summary
            ================================================= */}

          <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">

            <div className="border-[3px] border-black bg-[#b8ff5a] p-7 shadow-[8px_8px_0_#111]">

              <div className="flex items-start justify-between">

                <div>

                  <p className="text-xs font-black uppercase tracking-[0.15em]">

                    Skills Match

                  </p>

                  <p className="mt-2 text-sm font-bold">

                    Demonstrated job requirements

                  </p>

                </div>


                <Target
                  size={28}
                  strokeWidth={3}
                />

              </div>


              <div className="mt-10 flex items-end gap-2">

                <span className="text-8xl font-black leading-none tracking-[-0.07em]">

                  {skillsMatchPercent ?? "—"}

                </span>

                <span className="mb-2 text-xl font-black">

                  {skillsMatchPercent === null ? "" : "%"}

                </span>

              </div>


              <div className="mt-8 grid grid-cols-3 gap-2">
                <div className="border-[2px] border-black bg-white p-3">
                  <p className="text-2xl font-black">{skillCoverage.matched}</p>
                  <p className="text-[10px] font-black uppercase">Matched</p>
                </div>
                <div className="border-[2px] border-black bg-[#ffcf56] p-3">
                  <p className="text-2xl font-black">{skillCoverage.partial}</p>
                  <p className="text-[10px] font-black uppercase">Partial</p>
                </div>
                <div className="border-[2px] border-black bg-[#ffdddd] p-3">
                  <p className="text-2xl font-black">{skillCoverage.missing}</p>
                  <p className="text-[10px] font-black uppercase">Missing</p>
                </div>
              </div>


              <p className="mt-5 max-w-md text-sm font-bold leading-6">

                Equal-weight requirement coverage: matched = 1,
                partial = 0.5, and missing = 0. No percentage is
                shown when no requirements were classified.

              </p>

            </div>


            <div className="border-[3px] border-black bg-white p-7 shadow-[8px_8px_0_#111]">

              <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">

                Target Job

              </p>


              <h2 className="mt-2 text-3xl font-black">

                Analysis complete.

              </h2>


              <div className="mt-6 border-[3px] border-black bg-[#f5f1e8] p-5">

                <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-sm font-bold leading-6">

                  {jobDescription}

                </p>

              </div>


              <div className="mt-6 border-[3px] border-black bg-[#dcecff] p-4">

                <div className="flex gap-3">

                  <Lightbulb
                    className="shrink-0"
                    size={21}
                    strokeWidth={3}
                  />

                  <p className="text-sm font-bold leading-5">

                    Review the matched and missing requirements,
                    then tailor the resume using supported evidence.

                  </p>

                </div>

              </div>

            </div>

          </section>


          {/* =================================================
              EXACT BACKEND ANALYSIS
          ================================================= */}

          <AnalysisDetails
            analysis={
              scanResult.result.analysis.breakdown
            }
          />


          {/* =================================================
              Bottom Actions
          ================================================= */}

          <section className="mt-10 flex flex-col justify-between gap-4 border-[3px] border-black bg-[#111111] p-6 text-white shadow-[8px_8px_0_#b8ff5a] md:flex-row md:items-center">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.15em] text-[#b8ff5a]">

                Resume workspace

              </p>

              <h2 className="mt-1 text-2xl font-black">

                Continue improving this resume.

              </h2>

            </div>


            <div className="flex flex-wrap gap-3">

              <button
                onClick={() =>
                  navigate(
                    `/resumes/${resumeUuid}/versions`
                  )
                }
                className="flex items-center gap-2 border-[3px] border-white bg-white px-5 py-3 font-black text-black shadow-[4px_4px_0_white]"
              >

                <History
                  size={18}
                  strokeWidth={3}
                />

                Scan History

              </button>


              <button
                onClick={handleTailor}
                className="flex items-center gap-2 border-[3px] border-white bg-[#b8ff5a] px-5 py-3 font-black text-black shadow-[4px_4px_0_white]"
              >

                Review Tailoring Suggestions

                <ArrowRight
                  size={18}
                  strokeWidth={3}
                />

              </button>

            </div>

          </section>

        </>

      )}

    </div>

  );

}


// ===========================================================
// EXACT BACKEND ANALYSIS DETAILS
// ===========================================================

function AnalysisDetails({
  analysis,
}) {

  if (!analysis) {
    return null;
  }


  console.log(
    "EXACT BACKEND ANALYSIS:",
    analysis
  );


  // =========================================================
  // Exact Backend Objects
  // =========================================================

  const atsCompatibility =
    analysis.ats_compatibility;


  const resumeStructure =
    analysis.resume_structure;


  const keywordMatch =
    analysis.keyword_match;


  const skillsMatch =
    analysis.skills_match;


  const experienceRelevance =
    analysis.experience_relevance;


  const achievements =
    analysis.achievements;


  return (

    <>

      <section className="mt-10 grid gap-4 md:grid-cols-2">
        <div className="border-[3px] border-black bg-[#dcecff] p-5 shadow-[5px_5px_0_#111]">
          <p className="text-xs font-black uppercase tracking-[0.15em]">
            ATS Compatibility Diagnostic
          </p>
          <p className="mt-2 text-4xl font-black">
            {atsCompatibility?.score ?? "—"}
            {atsCompatibility?.score !== undefined && <span className="ml-1 text-base">/100</span>}
          </p>
          <p className="mt-2 text-sm font-semibold leading-5">
            Heuristic checks for text extraction and formatting. This does not predict results on external ATS platforms.
          </p>
        </div>

        <div className="border-[3px] border-black bg-[#ffcf56] p-5 shadow-[5px_5px_0_#111]">
          <p className="text-xs font-black uppercase tracking-[0.15em]">
            Resume Structure Diagnostic
          </p>
          <p className="mt-2 text-4xl font-black">
            {resumeStructure?.score ?? "—"}
            {resumeStructure?.score !== undefined && <span className="ml-1 text-base">/100</span>}
          </p>
          <p className="mt-2 text-sm font-semibold leading-5">
            Section hierarchy and organization checks, with findings below.
          </p>
        </div>
      </section>


      {/* =====================================================
          ATS COMPATIBILITY ISSUES
      ===================================================== */}

      {atsCompatibility?.issues?.length > 0 && (

        <section className="mt-10 border-[3px] border-black bg-[#ffdddd] p-6 shadow-[6px_6px_0_#111]">

          <p className="text-xs font-black uppercase tracking-[0.15em]">

            ATS Compatibility

          </p>


          <h2 className="mt-1 text-2xl font-black">

            Issues detected

          </h2>


          <div className="mt-5 space-y-3">

            {atsCompatibility.issues.map(
              (
                issue,
                index
              ) => (

                <div
                  key={`ats-issue-${index}`}
                  className="flex gap-3 border-[2px] border-black bg-white p-4"
                >

                  <TriangleAlert
                    className="shrink-0"
                    size={18}
                    strokeWidth={3}
                  />

                  <p className="text-sm font-bold">

                    {issue}

                  </p>

                </div>

              )
            )}

          </div>

        </section>

      )}


      {/* =====================================================
          RESUME STRUCTURE ISSUES
      ===================================================== */}

      {resumeStructure?.issues?.length > 0 && (

        <section className="mt-6 border-[3px] border-black bg-[#ffcf56] p-6 shadow-[6px_6px_0_#111]">

          <p className="text-xs font-black uppercase tracking-[0.15em]">

            Resume Structure

          </p>


          <h2 className="mt-1 text-2xl font-black">

            Structure issues

          </h2>


          <div className="mt-5 space-y-3">

            {resumeStructure.issues.map(
              (
                issue,
                index
              ) => (

                <div
                  key={`structure-issue-${index}`}
                  className="flex gap-3 border-[2px] border-black bg-white p-4"
                >

                  <TriangleAlert
                    className="shrink-0"
                    size={18}
                    strokeWidth={3}
                  />

                  <p className="text-sm font-bold">

                    {issue}

                  </p>

                </div>

              )
            )}

          </div>

        </section>

      )}


      {/* =====================================================
          KEYWORD MATCH
      ===================================================== */}

      <section className="mt-10 border-[3px] border-black bg-white p-6 shadow-[6px_6px_0_#111]">

        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">

              Keyword Match

            </p>

            <h2 className="mt-1 text-2xl font-black">

              Keyword analysis

            </h2>

          </div>


        </div>


        {/* Matched Keywords */}

        {keywordMatch?.matched_keywords?.length > 0 && (

          <div className="mt-6">

            <p className="text-sm font-black">

              Matched Keywords

            </p>


            <div className="mt-3 flex flex-wrap gap-2">

              {keywordMatch.matched_keywords.map(
                (
                  keyword,
                  index
                ) => (

                  <span
                    key={`matched-${keyword}-${index}`}
                    className="border-[2px] border-black bg-[#b8ff5a] px-3 py-1.5 text-sm font-black"
                  >

                    {keyword}

                  </span>

                )
              )}

            </div>

          </div>

        )}


        {/* Partially Matched Keywords */}

        {keywordMatch?.partially_matched_keywords?.length > 0 && (

          <div className="mt-6">

            <p className="text-sm font-black">

              Partially Matched Keywords

            </p>


            <div className="mt-3 flex flex-wrap gap-2">

              {keywordMatch.partially_matched_keywords.map(
                (
                  keyword,
                  index
                ) => (

                  <span
                    key={`partial-${keyword}-${index}`}
                    className="border-[2px] border-black bg-[#ffcf56] px-3 py-1.5 text-sm font-black"
                  >

                    {keyword}

                  </span>

                )
              )}

            </div>

          </div>

        )}


        {/* Missing Keywords */}

        {keywordMatch?.missing_keywords?.length > 0 && (

          <div className="mt-6">

            <p className="text-sm font-black">

              Missing Keywords

            </p>


            <div className="mt-3 flex flex-wrap gap-2">

              {keywordMatch.missing_keywords.map(
                (
                  keyword,
                  index
                ) => (

                  <span
                    key={`missing-${keyword}-${index}`}
                    className="border-[2px] border-black bg-[#ffdddd] px-3 py-1.5 text-sm font-black"
                  >

                    {keyword}

                  </span>

                )
              )}

            </div>

          </div>

        )}


        {/* Evidence */}

        {keywordMatch?.evidence?.length > 0 && (

          <div className="mt-6">

            <p className="text-sm font-black">

              Evidence

            </p>


            <div className="mt-3 space-y-3">

              {keywordMatch.evidence.map(
                (
                  evidence,
                  index
                ) => (

                  <div
                    key={`keyword-evidence-${index}`}
                    className="border-[2px] border-black bg-[#f5f1e8] p-4"
                  >

                    <p className="font-black">

                      {evidence.skill ||
                        evidence.requirement ||
                        "Evidence"}

                    </p>


                    {evidence.resume_evidence && (

                      <p className="mt-2 text-sm font-semibold leading-6">

                        {evidence.resume_evidence}

                      </p>

                    )}


                    {evidence.relevance && (

                      <p className="mt-2 text-xs font-bold text-gray-600">

                        {evidence.relevance}

                      </p>

                    )}

                  </div>

                )
              )}

            </div>

          </div>

        )}

      </section>


      {/* =====================================================
          SKILLS MATCH
      ===================================================== */}

      <section className="mt-10 border-[3px] border-black bg-white p-6 shadow-[6px_6px_0_#111]">

        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">

              Skills Match

            </p>

            <h2 className="mt-1 text-2xl font-black">

              Skills analysis

            </h2>

          </div>


        </div>


        {/* Matched Skills */}

        {skillsMatch?.matched_skills?.length > 0 && (

          <SkillGroup
            title="Matched Skills"
            items={
              skillsMatch.matched_skills
            }
            className="bg-[#b8ff5a]"
          />

        )}


        {/* Partially Matched Skills */}

        {skillsMatch?.partially_matched_skills?.length > 0 && (

          <SkillGroup
            title="Partially Matched / Unverified Requirements"
            items={
              skillsMatch.partially_matched_skills
            }
            className="bg-[#ffcf56]"
          />

        )}


        {/* Missing Skills */}

        {skillsMatch?.missing_skills?.length > 0 && (

          <SkillGroup
            title="Missing Requirements"
            items={
              skillsMatch.missing_skills
            }
            className="bg-[#ffdddd]"
          />

        )}

        {skillsMatch?.evidence?.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-black">Resume Evidence</p>
            <div className="mt-3 space-y-3">
              {skillsMatch.evidence.map((evidence, index) => (
                <div
                  key={`skill-evidence-${index}`}
                  className="border-[2px] border-black bg-[#f5f1e8] p-4"
                >
                  <p className="font-black">{evidence.skill}</p>
                  <p className="mt-2 text-sm font-semibold leading-6">
                    {evidence.resume_evidence}
                  </p>
                  {evidence.relevance && (
                    <p className="mt-2 text-xs font-bold text-gray-600">
                      {evidence.relevance}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Recommendations */}

        {skillsMatch?.recommendations?.length > 0 && (

          <InsightPanel
            title="Skills Recommendations"
            icon={Lightbulb}
            items={
              skillsMatch.recommendations
            }
            variant="warning"
          />

        )}

      </section>


      {/* =====================================================
          EXPERIENCE RELEVANCE
      ===================================================== */}

      <section className="mt-10 border-[3px] border-black bg-white p-6 shadow-[6px_6px_0_#111]">

        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">

              Experience Relevance

            </p>

            <h2 className="mt-1 text-2xl font-black">

              Experience analysis

            </h2>

          </div>


          {experienceRelevance?.relevant !== undefined && (

            <span className="border-[2px] border-black bg-[#b8ff5a] px-3 py-2 font-black">

              {experienceRelevance.relevant
                ? "Relevant"
                : "Not Relevant"}

            </span>

          )}

        </div>


        {/* Relevant Experience */}

        {experienceRelevance?.relevant_experience?.length > 0 && (

          <InsightPanel
            title="Relevant Experience"
            icon={Check}
            items={
              experienceRelevance.relevant_experience
            }
            variant="good"
          />

        )}


        {/* Partially Relevant Experience */}

        {experienceRelevance?.partially_relevant_experience?.length > 0 && (

          <InsightPanel
            title="Partially Relevant Experience"
            icon={Lightbulb}
            items={
              experienceRelevance.partially_relevant_experience
            }
            variant="warning"
          />

        )}


        {/* Missing Experience */}

        {experienceRelevance?.missing_experience?.length > 0 && (

          <InsightPanel
            title="Missing Experience"
            icon={TriangleAlert}
            items={
              experienceRelevance.missing_experience
            }
            variant="warning"
          />

        )}


        {/* Evidence */}

        {experienceRelevance?.evidence?.length > 0 && (

          <div className="mt-6">

            <p className="text-sm font-black">

              Evidence

            </p>


            <div className="mt-3 space-y-4">

              {experienceRelevance.evidence.map(
                (
                  evidence,
                  index
                ) => (

                  <div
                    key={`experience-evidence-${index}`}
                    className="border-[2px] border-black bg-[#f5f1e8] p-5"
                  >

                    <p className="font-black">

                      {evidence.requirement}

                    </p>


                    <p className="mt-3 text-sm font-semibold leading-6">

                      {evidence.resume_evidence}

                    </p>


                    <div className="mt-3 flex flex-wrap gap-2">

                      <span className="border-[2px] border-black bg-white px-2 py-1 text-xs font-black">

                        Relevance:{" "}
                        {String(
                          evidence.relevance
                        )}

                      </span>


                      {evidence.strength && (

                        <span className="border-[2px] border-black bg-white px-2 py-1 text-xs font-black">

                          Strength:{" "}
                          {evidence.strength}

                        </span>

                      )}

                    </div>

                  </div>

                )
              )}

            </div>

          </div>

        )}


        {/* Recommendations */}

        {experienceRelevance?.recommendations?.length > 0 && (

          <InsightPanel
            title="Experience Recommendations"
            icon={Lightbulb}
            items={
              experienceRelevance.recommendations
            }
            variant="warning"
          />

        )}

      </section>


      {/* =====================================================
          ACHIEVEMENTS
      ===================================================== */}

      <section className="mt-10 border-[3px] border-black bg-white p-6 shadow-[6px_6px_0_#111]">

        <div className="flex items-start justify-between gap-4">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">

              Achievements

            </p>

            <h2 className="mt-1 text-2xl font-black">

              Achievement analysis

            </h2>

          </div>


        </div>


        {achievements?.strong_achievements?.length > 0 && (

          <InsightPanel
            title="Strong Achievements"
            icon={Check}
            items={
              achievements.strong_achievements
            }
            variant="good"
          />

        )}


        {achievements?.weak_achievements?.length > 0 && (

          <InsightPanel
            title="Weak Achievements"
            icon={TriangleAlert}
            items={
              achievements.weak_achievements
            }
            variant="warning"
          />

        )}


        {achievements?.missing_achievements?.length > 0 && (

          <InsightPanel
            title="Missing Achievements"
            icon={TriangleAlert}
            items={
              achievements.missing_achievements
            }
            variant="warning"
          />

        )}


        {achievements?.evidence?.length > 0 && (

          <div className="mt-6">

            <p className="text-sm font-black">

              Evidence

            </p>


            <div className="mt-3 space-y-3">

              {achievements.evidence.map(
                (
                  evidence,
                  index
                ) => (

                  <div
                    key={`achievement-evidence-${index}`}
                    className="border-[2px] border-black bg-[#f5f1e8] p-4"
                  >

                    <p className="text-sm font-semibold">

                      {typeof evidence === "string"
                        ? evidence
                        : JSON.stringify(
                            evidence
                          )}

                    </p>

                  </div>

                )
              )}

            </div>

          </div>

        )}


        {achievements?.recommendations?.length > 0 && (

          <InsightPanel
            title="Achievement Recommendations"
            icon={Lightbulb}
            items={
              achievements.recommendations
            }
            variant="warning"
          />

        )}

      </section>

    </>

  );

}


// ===========================================================
// Skill Group
// ===========================================================

function SkillGroup({
  title,
  items,
  className,
}) {

  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {

    return null;

  }


  return (

    <div className="mt-6">

      <p className="text-sm font-black">

        {title}

      </p>


      <div className="mt-3 flex flex-wrap gap-2">

        {items.map(
          (
            item,
            index
          ) => (

            <span
              key={`${title}-${item}-${index}`}
              className={`border-[2px] border-black px-3 py-1.5 text-sm font-black ${className}`}
            >

              {item}

            </span>

          )
        )}

      </div>

    </div>

  );

}


// ===========================================================
// Insight Panel
// ===========================================================

function InsightPanel({
  title,
  icon: Icon,
  items,
  variant,
}) {

  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {

    return null;

  }


  const isGood =
    variant === "good";


  return (

    <div className="mt-6 border-[3px] border-black bg-white shadow-[4px_4px_0_#111]">

      <div
        className={[
          "flex items-center gap-3 border-b-[3px] border-black p-4",

          isGood
            ? "bg-[#b8ff5a]"
            : "bg-[#ffcf56]",

        ].join(" ")}
      >

        <Icon
          size={21}
          strokeWidth={3}
        />


        <h3 className="font-black">

          {title}

        </h3>

      </div>


      <div className="p-4">

        <div className="space-y-3">

          {items.map(
            (
              item,
              index
            ) => (

              <div
                key={`${title}-${index}`}
                className="flex gap-3 border-[2px] border-black bg-[#f5f1e8] p-4"
              >

                {isGood ? (

                  <Check
                    className="mt-0.5 shrink-0"
                    size={18}
                    strokeWidth={3}
                  />

                ) : (

                  <X
                    className="mt-0.5 shrink-0"
                    size={18}
                    strokeWidth={3}
                  />

                )}


                <p className="text-sm font-bold leading-5">

                  {typeof item === "string"
                    ? item
                    : JSON.stringify(
                        item
                      )}

                </p>

              </div>

            )
          )}

        </div>

      </div>

    </div>

  );

}


// ===========================================================
// Date Helper
// ===========================================================

function formatScanDate(
  value
) {

  if (!value) {
    return "";
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "";

  }


  return `Scanned ${date.toLocaleString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }
  )}`;

}


export default Analyze;
