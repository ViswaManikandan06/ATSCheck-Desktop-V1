
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  RotateCcw,
  Save,
  Sparkles,
  X,
} from "lucide-react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  useEffectEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useResume } from "../context/ResumeContext";
import ResumePreview from "../components/resume/ResumePreview";
import ResumeTemplateSelector from "../components/resume/ResumeTemplateSelector";


const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1";


function Tailor() {
  const navigate = useNavigate();

  const [searchParams] =
    useSearchParams();

  const {
    selectedResume,
    selectedResumeUuid,
  } = useResume();

  const queryResumeUuid =
    searchParams.get("resumeUuid");

  const queryScanUuid =
    searchParams.get("scanUuid");

  const querySessionUuid =
    searchParams.get("sessionUuid");

  const resumeUuid =
    queryResumeUuid ||
    selectedResumeUuid;


  // =========================================================
  // STATE
  // =========================================================

  const [
    sessionUuid,
    setSessionUuid,
  ] = useState(null);

  const [
    selectedScan,
    setSelectedScan,
  ] = useState(null);

  const [
    routeResume,
    setRouteResume,
  ] = useState(null);


  const [
    suggestions,
    setSuggestions,
  ] = useState([]);


  const [
    expandedId,
    setExpandedId,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(false);


  const [
    updatingSuggestionId,
    setUpdatingSuggestionId,
  ] = useState(null);


  const [
    error,
    setError,
  ] = useState("");


  const [
    saveMessage,
    setSaveMessage,
  ] = useState(
    "Updated experience bullets and added relevant skill proof points."
  );


  const [
    content,
    setContent,
  ] = useState("");

  const [draftContent, setDraftContent] = useState("");

  const [acceptedDraftContent, setAcceptedDraftContent] = useState("");

  const [savedVersionUuid, setSavedVersionUuid] = useState(null);

  const [previewMode, setPreviewMode] = useState("changes");

  const startedScanRef = useRef(null);

  const [
    selectedTemplate,
    setSelectedTemplate,
  ] = useState("atsClassic");


  useEffect(() => {
    if (!resumeUuid) {
      setContent("");
      return;
    }

    let isCancelled = false;

    const loadResumeContent = async () => {
      try {
        const resolvedScanUuid =
          queryScanUuid || selectedScan?.scan_uuid;

        const [resumeResponse, versionsResponse] = await Promise.all([
          fetch(
            `${API_BASE_URL}/resumes/${encodeURIComponent(resumeUuid)}`
          ),
          fetch(
            `${API_BASE_URL}/resumes/${encodeURIComponent(resumeUuid)}/versions`
          ),
        ]);

        const resumeData = resumeResponse.ok
          ? await resumeResponse.json()
          : null;

        let nextContent = resumeData?.parsed_text || "";

        if (versionsResponse.ok) {
          const versionsData = await versionsResponse.json();
          const matchingVersion = (versionsData.versions || [])
            .filter(
              (version) => version.scan_uuid === resolvedScanUuid
            )
            .sort(
              (a, b) =>
                new Date(b.created_at) - new Date(a.created_at)
            )[0];

          if (matchingVersion?.content) {
            nextContent = matchingVersion.content;
          }
        }

        if (!isCancelled && nextContent) {
          setContent(nextContent);
        }
      } catch (err) {
        console.error(
          "Failed to load resume content for tailoring:",
          err
        );
      }
    };

    loadResumeContent();

    return () => {
      isCancelled = true;
    };
  }, [resumeUuid, queryScanUuid, selectedScan?.scan_uuid]);


  useEffect(() => {
    if (!resumeUuid) {
      setRouteResume(null);
      return;
    }

    if (
      selectedResume &&
      selectedResume.resumeUuid === resumeUuid
    ) {
      setRouteResume(selectedResume);
      return;
    }

    let isCancelled = false;

    const loadRouteResume = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/resumes/${encodeURIComponent(resumeUuid)}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail || "Failed to load resume."
          );
        }

        if (isCancelled) {
          return;
        }

        setRouteResume({
          resumeUuid: data.resume_uuid,
          resumeId: data.id ?? null,
          name: data.filename || "Resume",
          filename: data.filename || "resume",
          fileType: data.file_type || "",
          updated: data.created_at || null,
          version: null,
        });
      } catch {
        if (!isCancelled) {
          setRouteResume(null);
        }
      }
    };

    loadRouteResume();

    return () => {
      isCancelled = true;
    };
  }, [resumeUuid, selectedResume]);


  useEffect(() => {
    if (!queryScanUuid) {
      setSelectedScan(null);
      return;
    }

    const loadSelectedScan = async () => {
      try {
        setError("");

        const response =
          await fetch(
            `${API_BASE_URL}/ats/scans/${encodeURIComponent(
              queryScanUuid
            )}`
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Failed to load selected analysis."
          );
        }

        setSelectedScan(data);
      } catch (err) {
        setError(
          err.message ||
            "Failed to load the selected analysis."
        );
      }
    };

    loadSelectedScan();
  }, [queryScanUuid]);


  useEffect(() => {
    if (!querySessionUuid) {
      return;
    }

    let isCancelled = false;
    const loadSession = async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/tailoring/sessions/${encodeURIComponent(querySessionUuid)}`
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.detail || "Failed to load tailoring draft.");
        }
        if (isCancelled) return;

        setSessionUuid(data.session_uuid);
        setContent(data.base_resume_text || "");
        setDraftContent(data.draft_content || data.base_resume_text || "");
        setAcceptedDraftContent(
          data.accepted_draft_content || data.base_resume_text || ""
        );
        setSavedVersionUuid(data.saved_version_uuid || null);
        setSuggestions(data.suggestions || []);
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError.message || "Failed to load tailoring draft.");
        }
      }
    };

    loadSession();
    return () => {
      isCancelled = true;
    };
  }, [querySessionUuid]);


  // =========================================================
  // RESUME CONTEXT
  // =========================================================

  const activeResume = selectedResume || routeResume;


  // =========================================================
  // DERIVED STATE
  // =========================================================

  const acceptedCount =
    suggestions.filter(
      (suggestion) =>
        suggestion.status ===
        "accepted"
    ).length;

  const pendingCount =
    suggestions.filter((suggestion) => suggestion.status === "pending").length;


  const proposedSuggestions =
    suggestions.filter((suggestion) => suggestion.status !== "rejected");

  const acceptedSuggestions =
    suggestions.filter((suggestion) => suggestion.status === "accepted");

  const hasDecision =
    suggestions.some((suggestion) => suggestion.status !== "pending");

  const previewContent = hasDecision
    ? acceptedDraftContent
    : draftContent;

  const previewSuggestions = hasDecision
    ? acceptedSuggestions
    : proposedSuggestions;

  const changeSummary = [
    ...new Set(
      previewSuggestions.map(
        (suggestion) =>
          `${suggestion.section}: ${suggestion.matched_job_requirement}`
      )
    ),
  ];

  const editorDiff = useMemo(() => {
    if (!previewSuggestions.length) {
      return null;
    }

    const changes = previewSuggestions
      .filter((suggestion) => suggestion?.original_text || suggestion?.suggested_text)
      .map((suggestion) => ({
        original_text: suggestion.original_text || "",
        suggested_text: suggestion.suggested_text || "",
        status: suggestion.status,
      }));

    return {
      changes,
      added: changes
        .map((change) => change.suggested_text)
        .filter(Boolean),
      removed: changes
        .map((change) => change.original_text)
        .filter(Boolean),
    };
  }, [previewSuggestions]);

  const handleDownloadTailoredResume = () => {
    const textToDownload = (acceptedDraftContent || content || "").trim();

    if (!textToDownload || pendingCount > 0 || acceptedCount === 0) return;

    const blob = new Blob([textToDownload], {
      type: "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeResume?.name || "resume"}-tailored.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };


  // =========================================================
  // CREATE TAILORING SESSION
  // =========================================================

  const handleCreateSession =
    async () => {

      if (!resumeUuid) {
        setError(
          "No resume selected. Please choose a resume first."
        );

        return;
      }


      const resolvedScanUuid =
        queryScanUuid ||
        selectedScan?.scan_uuid;

      if (!resolvedScanUuid) {
        setError(
          "Please choose an existing analysis to tailor from the resume workspace or analyze page."
        );

        return;
      }


      setLoading(true);
      setError("");


      try {

        const response =
          await fetch(
            `${API_BASE_URL}/tailoring/sessions`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                scan_uuid:
                  resolvedScanUuid,
              }),
            }
          );


        const data =
          await response.json();


        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Failed to create tailoring session."
          );
        }


        setSessionUuid(
          data.session_uuid
        );

        setContent(data.base_resume_text || content);
        setDraftContent(data.draft_content || content);
        setAcceptedDraftContent(
          data.accepted_draft_content || data.base_resume_text || content
        );
        setSavedVersionUuid(null);

        const sessionParams = new URLSearchParams(searchParams);
        sessionParams.set("sessionUuid", data.session_uuid);
        navigate(`/tailor?${sessionParams.toString()}`, { replace: true });


        setSuggestions(
          data.suggestions || []
        );


        if (
          data.suggestions?.length >
          0
        ) {
          setExpandedId(
            data.suggestions[0].id
          );
        }

      } catch (err) {

        setError(
          err.message ||
            "Something went wrong while creating the tailoring session."
        );

      } finally {

        setLoading(false);

      }
    };

  const startTailoringForScan = useEffectEvent(() => {
    handleCreateSession();
  });

  useEffect(() => {
    const scanUuid = selectedScan?.scan_uuid;
    if (
      !scanUuid ||
      querySessionUuid ||
      sessionUuid ||
      startedScanRef.current === scanUuid
    ) {
      return;
    }

    startedScanRef.current = scanUuid;
    startTailoringForScan();
  }, [selectedScan?.scan_uuid, querySessionUuid, sessionUuid]);


  // =========================================================
  // UPDATE SUGGESTION STATUS
  // =========================================================

  const updateSuggestionStatus =
    async (
      suggestionId,
      status
    ) => {

      setUpdatingSuggestionId(
        suggestionId
      );

      setError("");


      try {

        const response =
          await fetch(
            `${API_BASE_URL}/tailoring/suggestions/${suggestionId}/status`,
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                status,
              }),
            }
          );


        const data =
          await response.json();


        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Failed to update suggestion."
          );
        }


        setSuggestions(
          (current) =>
            current.map(
              (suggestion) =>
                suggestion.id ===
                suggestionId
                  ? {
                      ...suggestion,
                      status:
                        data.status,
                    }
                  : suggestion
            )
        );

        setDraftContent(data.draft_content || content);
        setAcceptedDraftContent(
          data.accepted_draft_content || content
        );

      } catch (err) {

        setError(
          err.message ||
            "Failed to update suggestion."
        );

      } finally {

        setUpdatingSuggestionId(
          null
        );

      }
    };


  // =========================================================
  // RESET SUGGESTION
  // =========================================================

  const resetSuggestion =
    async (
      suggestionId
    ) => {

      await updateSuggestionStatus(
        suggestionId,
        "pending"
      );
    };


  // =========================================================
  // SAVE VERSION
  // =========================================================

  const handleSaveVersion =
    async () => {

      if (!sessionUuid) {
        return;
      }


      if (acceptedCount === 0 || !acceptedDraftContent.trim()) {
        return;
      }


      /*
       * This endpoint already exists in your backend.
       *
       * The actual version creation will be handled
       * server-side.
       */

      try {

        setError("");


        const payload = {
          content: acceptedDraftContent,
          commit_message:
            saveMessage.trim() ||
            `Saved version ${acceptedCount} accepted change${acceptedCount === 1 ? "" : "s"}`,
        };

        const response =
          await fetch(
            `${API_BASE_URL}/tailoring/sessions/${sessionUuid}/save`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            }
          );


        const data =
          await response.json();


        if (!response.ok) {
          throw new Error(
            data.detail ||
              "Failed to save resume version."
          );
        }


        /*
         * For now simply notify the user.
         *
         * Once the backend response contains
         * version_uuid/version_number, this can
         * navigate directly to that version.
         */

        setAcceptedDraftContent(data.content);
        setDraftContent(data.content);
        setSavedVersionUuid(data.version_uuid);
        alert(`Saved resume version ${data.version_number}.`);

      } catch (err) {

        setError(
          err.message ||
            "Failed to save resume version."
        );
      }
    };


  // =========================================================
  // NO RESUME
  // =========================================================

  if (
    !activeResume ||
    !resumeUuid
  ) {

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
              Choose a resume from your
              workspace before opening
              the AI tailoring workspace.
            </p>


            <button
              onClick={() =>
                navigate("/resumes")
              }
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
  // VALIDATE RESUME CONTEXT
  // =========================================================

  if (
    activeResume.resumeUuid !==
    resumeUuid
  ) {

    return (
      <div className="mx-auto max-w-7xl">

        <section className="flex min-h-[500px] items-center justify-center">

          <div className="max-w-lg border-[3px] border-black bg-white p-8 text-center shadow-[8px_8px_0_#111]">

            <h1 className="text-3xl font-black">
              Resume not available.
            </h1>


            <p className="mt-3 font-semibold leading-6 text-gray-600">
              The requested resume is not
              currently selected in your
              workspace.
            </p>


            <button
              onClick={() =>
                navigate("/resumes")
              }
              className="mt-6 flex w-full items-center justify-center gap-2 border-[3px] border-black bg-[#b8ff5a] px-5 py-3 font-black shadow-[5px_5px_0_#111]"
            >

              <ArrowLeft
                size={18}
                strokeWidth={3}
              />

              Back to Resumes

            </button>

          </div>

        </section>

      </div>
    );
  }


  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="mx-auto max-w-[1500px]">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="mb-6 flex flex-col justify-between gap-4 border-b-[3px] border-black pb-5 lg:flex-row lg:items-end">

        <div>

          <button
            onClick={() => {
              const params = new URLSearchParams();
              params.set("resumeUuid", resumeUuid);

              const resolvedScanUuid =
                queryScanUuid || selectedScan?.scan_uuid;

              if (resolvedScanUuid) {
                params.set("scanUuid", resolvedScanUuid);
              }

              navigate(`/analyze?${params.toString()}`);
            }}
            className="mb-4 flex items-center gap-2 font-black hover:underline"
          >

            <ArrowLeft
              size={18}
              strokeWidth={3}
            />

            Back to analysis

          </button>


          <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
            AI Resume Tailoring
          </p>


          <h1 className="mt-1 text-4xl font-black tracking-[-0.04em]">
            Make your resume stronger.
          </h1>

        </div>


        <div className="flex items-center gap-3">

          <div className="border-[3px] border-black bg-white px-4 py-3 font-black shadow-[4px_4px_0_#111]">
            {acceptedCount} accepted
          </div>

          <div className="min-w-[280px] max-w-[420px] border-[3px] border-black bg-white px-3 py-2 shadow-[4px_4px_0_#111]">
            <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">
              Save message
            </label>
            <input
              type="text"
              value={saveMessage}
              onChange={(event) => setSaveMessage(event.target.value)}
              placeholder="Describe the version you saved"
              className="w-full border-none bg-transparent text-sm font-semibold text-gray-800 outline-none placeholder:text-gray-400"
            />
          </div>

          <button
            disabled={
              !sessionUuid ||
              acceptedCount === 0 ||
              pendingCount > 0 ||
              Boolean(savedVersionUuid)
            }
            onClick={
              handleSaveVersion
            }
            className="flex items-center gap-2 border-[3px] border-black bg-[#b8ff5a] px-5 py-3 font-black shadow-[4px_4px_0_#111] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#111] disabled:cursor-not-allowed disabled:opacity-40"
          >

            <Save
              size={18}
              strokeWidth={3}
            />

            Save Version

          </button>

        </div>

      </header>


      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="mb-6 border-[3px] border-black bg-[#ffdddd] p-4 text-sm font-bold">

          {error}

        </div>
      )}


      {/* =====================================================
          CONFIGURATION
      ===================================================== */}

      {!sessionUuid && (
        <section className="mb-6 border-[3px] border-black bg-white p-6 shadow-[7px_7px_0_#111]">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-gray-500">
              Selected Analysis
            </p>
            <h2 className="mt-1 text-2xl font-black">
              Review targeted resume changes.
            </h2>
          </div>

          {selectedScan ? (
            <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
              <div>
                <p className="text-sm font-black">Job Description</p>
                <div className="mt-2 max-h-56 overflow-y-auto whitespace-pre-wrap border-[3px] border-black bg-[#fffdf8] p-4 text-sm font-medium leading-6">
                  {selectedScan.job_description}
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-[3px] border-black bg-[#f5f1e8] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-500">
                    Provider / Model
                  </p>
                  <p className="mt-2 break-words font-black">
                    {selectedScan.provider_id} / {selectedScan.model_id}
                  </p>
                </div>

                {loading && (
                  <p className="flex items-center gap-2 text-sm font-semibold" role="status">
                    <Loader2 size={18} className="animate-spin" />
                    Building the complete draft and review changes...
                  </p>
                )}
                {error && !sessionUuid && (
                  <button
                    onClick={handleCreateSession}
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-2 border border-black bg-white px-4 py-3 font-semibold disabled:opacity-50"
                  >
                    <Sparkles size={18} />
                    Retry tailoring
                  </button>
                )}
                {sessionUuid && (
                  <p className="text-sm font-semibold text-green-800">
                    Complete draft is ready for review.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="border-[3px] border-black bg-[#ffcf56] p-5">
              <p className="font-black">
                {queryScanUuid
                  ? "Loading the selected analysis..."
                  : "Choose a completed analysis to begin tailoring."}
              </p>
              {!queryScanUuid && (
                <button
                  onClick={() => navigate("/resumes")}
                  className="mt-4 border-[3px] border-black bg-white px-4 py-3 font-black shadow-[3px_3px_0_#111]"
                >
                  Open Resume Workspace
                </button>
              )}
            </div>
          )}
        </section>
      )}


      {/* =====================================================
          WORKSPACE
      ===================================================== */}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">

        {/* ===================================================
            RESUME EDITOR
        =================================================== */}

        <section className="min-w-0">

          <div className="min-w-0">

            <div className="mb-4 flex items-center justify-between border-b border-gray-300 py-3">

              <div className="flex items-center gap-3">

                <FileText
                  size={20}
                  strokeWidth={3}
                />


                <div>

                  <p className="font-black">
                    {activeResume.name}
                  </p>


                  <p className="text-xs font-bold text-gray-500">

                    Current version • V
                    {String(
                      activeResume.version || 0
                    ).padStart(
                      2,
                      "0"
                    )}

                  </p>

                </div>

              </div>


            </div>


            <div className="space-y-5 p-6">

              <div className="flex flex-col gap-3 border-b border-gray-300 pb-4 sm:flex-row sm:items-center sm:justify-between">

                <div>

                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                    Resume Template
                  </p>

                  <h3 className="mt-1 text-xl font-black">
                    Tailored Resume Preview
                  </h3>

                </div>

                <button type="button" onClick={handleDownloadTailoredResume} disabled={pendingCount > 0 || acceptedCount === 0} className="flex items-center gap-2 border border-black bg-white px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">
                  Download ATS Text
                </button>

              </div>

              <div className="py-4">
                {sessionUuid && (
                  <div className="mb-4 border-b border-gray-300 pb-3">
                    <p className="text-sm font-semibold text-gray-600">
                      {hasDecision
                        ? "Accepted changes currently shown in the draft"
                        : "Proposed changes in the complete draft"}
                    </p>
                    {changeSummary.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
                        {changeSummary.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <div className="mb-4 flex flex-col gap-4 border-b border-gray-300 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <ResumeTemplateSelector
                    selectedTemplate={selectedTemplate}
                    onSelect={setSelectedTemplate}
                  />

                  <div className="flex shrink-0 border border-gray-400" role="group" aria-label="Preview mode">
                    <button
                      type="button"
                      onClick={() => setPreviewMode("changes")}
                      aria-pressed={previewMode === "changes"}
                      className={`px-3 py-2 text-sm font-semibold ${previewMode === "changes" ? "bg-gray-900 text-white" : "bg-white"}`}
                    >
                      Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode("clean")}
                      aria-pressed={previewMode === "clean"}
                      className={`border-l border-gray-400 px-3 py-2 text-sm font-semibold ${previewMode === "clean" ? "bg-gray-900 text-white" : "bg-white"}`}
                    >
                      Clean
                    </button>
                  </div>
                </div>

                <div className="bg-white">
                  <ResumePreview
                    resume={previewContent || content}
                    originalDocument={content}
                    template={selectedTemplate}
                    mode={previewMode}
                    diff={editorDiff}
                  />
                </div>

              </div>

            </div>

          </div>

        </section>


        {/* ===================================================
            SUGGESTIONS
        =================================================== */}

        <section className="min-w-0">

          <div className="border-l border-gray-300 pl-5">

            <div className="border-b-[3px] border-black bg-[#111111] p-5 text-white">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center border-[2px] border-white bg-[#b8ff5a] text-black">

                  <Sparkles
                    size={20}
                    strokeWidth={3}
                  />

                </div>


                <div>

                  <h2 className="font-black">
                    AI Suggestions
                  </h2>


                  <p className="text-xs font-semibold text-gray-300">

                    {sessionUuid
                      ? `${suggestions.length} proposed changes · ${acceptedCount} accepted`
                      : "Run tailoring to review a complete draft"}

                  </p>

                </div>

              </div>

            </div>


            <div className="divide-y-[3px] divide-black">

              {suggestions.length ===
                0 && (

                <div className="p-8 text-center">

                  <Sparkles
                    className="mx-auto text-gray-400"
                    size={32}
                  />


                  <p className="mt-4 font-black">
                    {loading ? "Preparing the complete resume draft." : "No changes suggested."}
                  </p>


                  <p className="mt-2 text-sm font-semibold text-gray-500">

                    {loading
                      ? "The full source resume is being preserved while supported changes are prepared."
                      : "The selected analysis has no additional supported changes to review."}

                  </p>

                </div>
              )}


              {suggestions.map(
                (suggestion) => (

                  <SuggestionCard
                    key={
                      suggestion.id
                    }
                    suggestion={
                      suggestion
                    }
                    expanded={
                      expandedId ===
                      suggestion.id
                    }
                    updating={
                      updatingSuggestionId ===
                      suggestion.id
                    }
                    onToggle={() =>
                      setExpandedId(
                        expandedId ===
                          suggestion.id
                          ? null
                          : suggestion.id
                      )
                    }
                    onAccept={() =>
                      updateSuggestionStatus(
                        suggestion.id,
                        "accepted"
                      )
                    }
                    onReject={() =>
                      updateSuggestionStatus(
                        suggestion.id,
                        "rejected"
                      )
                    }
                    onReset={() =>
                      resetSuggestion(
                        suggestion.id
                      )
                    }
                  />

                )
              )}

            </div>


            {/* =================================================
                FOOTER
            ================================================= */}

            {suggestions.length >
              0 && (

              <div className="border-t border-gray-300 py-4">

                <div className="flex items-center justify-between text-sm">

                  <span className="font-black">

                    {acceptedCount} of{" "}
                    {
                      suggestions.length
                    }{" "}
                    accepted

                  </span>


                </div>


                <div className="mt-3 h-3 border-[2px] border-black bg-white">

                  <div
                    className="h-full bg-[#b8ff5a]"
                    style={{
                      width: `${
                        suggestions.length
                          ? (acceptedCount /
                              suggestions.length) *
                            100
                          : 0
                      }%`,
                    }}
                  />

                </div>

              </div>

            )}

          </div>

        </section>

      </div>

    </div>
  );
}


// ===========================================================
// SUGGESTION CARD
// ===========================================================

function SuggestionCard({
  suggestion,
  expanded,
  updating,
  onToggle,
  onAccept,
  onReject,
  onReset,
}) {

  const isAccepted =
    suggestion.status ===
    "accepted";


  const isRejected =
    suggestion.status ===
    "rejected";


  return (

    <article
      className={`${
        isAccepted
          ? "bg-[#b8ff5a]"
          : isRejected
            ? "bg-[#eeeeee]"
            : "bg-white"
      }`}
    >

      {/* =====================================================
          HEADER
      ===================================================== */}

      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 p-5 text-left"
      >

        <div className="min-w-0">

          <div className="flex items-center gap-2">

            <span className="border-[2px] border-black bg-white px-2 py-1 text-[10px] font-black uppercase">

              {suggestion.action ||
                suggestion.type}

            </span>


            <span className="text-xs font-black uppercase text-gray-500">

              {
                suggestion.section
              }

            </span>

          </div>


          <h3 className="mt-3 font-black">

            {suggestion.type ===
              "add" ||
            suggestion.action ===
              "add"
              ? "Add missing skill"
              : "Improve experience bullet"}

          </h3>

        </div>


        {expanded ? (

          <ChevronUp
            size={20}
            strokeWidth={3}
            className="shrink-0"
          />

        ) : (

          <ChevronDown
            size={20}
            strokeWidth={3}
            className="shrink-0"
          />

        )}

      </button>


      {/* =====================================================
          EXPANDED CONTENT
      ===================================================== */}

      {expanded && (

        <div className="border-t-[2px] border-black p-5">

          {/* Requirement */}

          {suggestion.matched_job_requirement && (

            <div className="mb-5">

              <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                Matched requirement
              </p>


              <span className="mt-2 inline-block border-[2px] border-black bg-[#dcecff] px-2 py-1 text-xs font-black">

                {
                  suggestion.matched_job_requirement
                }

              </span>

            </div>

          )}


          {/* Current */}

          {suggestion.original_text && (

            <div>

              <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                Current
              </p>


              <div className="mt-2 border-[2px] border-black bg-[#ffdddd] p-3 text-sm font-semibold leading-5">

                {
                  suggestion.original_text
                }

              </div>

            </div>

          )}


          {/* Suggested */}

          <div className="mt-4">

            <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">
              Suggested
            </p>


            <div className="mt-2 border-[2px] border-black bg-[#e4ffd0] p-3 text-sm font-semibold leading-5">

              {
                suggestion.suggested_text
              }

            </div>

          </div>


          {/* Reason */}

          {suggestion.reason && (

            <div className="mt-4 border-[2px] border-black bg-[#f5f1e8] p-3">

              <p className="text-xs font-bold leading-5">

                <span className="font-black">
                  Why:
                </span>{" "}

                {
                  suggestion.reason
                }

              </p>

            </div>

          )}


          {/* Actions */}

          <div className="mt-5 flex gap-2">

            {suggestion.status ===
              "pending" && (

              <>

                <button
                  onClick={onAccept}
                  disabled={updating}
                  className="flex flex-1 items-center justify-center gap-2 border-[3px] border-black bg-[#b8ff5a] px-4 py-3 font-black shadow-[3px_3px_0_#111] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#111] disabled:opacity-40"
                >

                  <Check
                    size={17}
                    strokeWidth={3}
                  />

                  {updating
                    ? "Updating..."
                    : "Accept"}

                </button>


                <button
                  onClick={onReject}
                  disabled={updating}
                  className="flex flex-1 items-center justify-center gap-2 border-[3px] border-black bg-[#ff7b7b] px-4 py-3 font-black shadow-[3px_3px_0_#111] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#111] disabled:opacity-40"
                >

                  <X
                    size={17}
                    strokeWidth={3}
                  />

                  {updating
                    ? "Updating..."
                    : "Reject"}

                </button>

              </>

            )}


            {suggestion.status ===
              "accepted" && (

              <button
                onClick={onReset}
                disabled={updating}
                className="flex w-full items-center justify-center gap-2 border-[3px] border-black bg-white px-4 py-3 font-black disabled:opacity-40"
              >

                <RotateCcw
                  size={17}
                />

                Undo

              </button>

            )}


            {suggestion.status ===
              "rejected" && (

              <button
                onClick={onReset}
                disabled={updating}
                className="flex w-full items-center justify-center gap-2 border-[3px] border-black bg-white px-4 py-3 font-black disabled:opacity-40"
              >

                <RotateCcw
                  size={17}
                />

                Restore suggestion

              </button>

            )}

          </div>

        </div>

      )}

    </article>
  );
}


export default Tailor;
