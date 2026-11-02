import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const ResumeContext = createContext(null);

const STORAGE_KEY =
  "atscheck_selected_resume";

const ANALYSIS_STORAGE_KEY =
  "atscheck_analysis_state";


export function ResumeProvider({
  children,
}) {

  // =========================================================
  // Selected Resume
  // =========================================================

  const [
    selectedResume,
    setSelectedResume,
  ] = useState(null);


  // =========================================================
  // Analysis State
  //
  // This is UI/session state only.
  //
  // The backend remains the source of truth for:
  //
  // - scans
  // - scan history
  // - scores
  // - job descriptions
  //
  // =========================================================

  const [
    analysisState,
    setAnalysisState,
  ] = useState({});


  // =========================================================
  // Restore selected resume
  // =========================================================

  useEffect(() => {

    const storedResume =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!storedResume) {
      return;
    }

    try {

      const parsedResume =
        JSON.parse(
          storedResume
        );

      if (
        parsedResume &&
        parsedResume.resumeUuid
      ) {

        setSelectedResume(
          parsedResume
        );

      }

    } catch (error) {

      console.error(
        "Failed to restore selected resume:",
        error
      );

      localStorage.removeItem(
        STORAGE_KEY
      );

    }

  }, []);


  // =========================================================
  // Restore analysis UI state
  // =========================================================

  useEffect(() => {

    const storedAnalysis =
      localStorage.getItem(
        ANALYSIS_STORAGE_KEY
      );

    if (!storedAnalysis) {
      return;
    }

    try {

      const parsedAnalysis =
        JSON.parse(
          storedAnalysis
        );

      if (
        parsedAnalysis &&
        typeof parsedAnalysis === "object"
      ) {

        setAnalysisState(
          parsedAnalysis
        );

      }

    } catch (error) {

      console.error(
        "Failed to restore analysis state:",
        error
      );

      localStorage.removeItem(
        ANALYSIS_STORAGE_KEY
      );

    }

  }, []);


  // =========================================================
  // Select Resume
  // =========================================================

  const selectResume = useCallback(
    (resume) => {

      if (
        !resume ||
        !resume.resumeUuid
      ) {

        return;

      }

      const normalizedResume = {
        resumeUuid:
          resume.resumeUuid,
        resumeId:
          resume.resumeId ??
          null,
        name:
          resume.name ||
          resume.filename ||
          resume.original_filename ||
          "Untitled Resume",
        filename:
          resume.filename ||
          resume.original_filename ||
          resume.name ||
          "resume",
        fileType:
          resume.fileType ||
          resume.file_type ||
          "",
        fileSize:
          resume.fileSize ??
          resume.file_size ??
          null,
        createdAt:
          resume.createdAt ||
          resume.created_at ||
          null,
        updated:
          resume.updated ||
          resume.updated_at ||
          resume.created_at ||
          "Recently",
        score:
          resume.score ??
          null,
        version:
          resume.version ??
          null,
      };

      setSelectedResume(
        normalizedResume
      );

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          normalizedResume
        )
      );

    },
    []
  );


  // =========================================================
  // Update Selected Resume
  //
  // Used after:
  //
  // - ATS analysis
  // - version creation
  // - tailoring
  // - builder changes
  //
  // This merges the new values instead of replacing
  // the complete resume object.
  // =========================================================

  const updateSelectedResume = useCallback(
    (updates) => {

      if (!selectedResume) {
        return null;
      }

      const updatedResume = {
        ...selectedResume,
        ...updates,
      };

      setSelectedResume(
        updatedResume
      );

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          updatedResume
        )
      );

      return updatedResume;
    },
    [selectedResume]
  );


  // =========================================================
  // Update Resume
  //
  // Useful when updating a resume object from the
  // Resumes page or backend response.
  // =========================================================

  const updateResume = useCallback(
    (resume) => {

      if (
        !resume ||
        !resume.resumeUuid
      ) {

        return;

      }

      setSelectedResume(
        (previous) => {

          if (
            !previous ||
            previous.resumeUuid !==
              resume.resumeUuid
          ) {

            return previous;

          }

          const updated = {
            ...previous,
            ...resume,
          };

          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(
              updated
            )
          );

          return updated;

        }
      );

    },
    []
  );


  // =========================================================
  // Clear Selected Resume
  // =========================================================

  const clearSelectedResume = useCallback(
    () => {

      setSelectedResume(
        null
      );

      localStorage.removeItem(
        STORAGE_KEY
      );

    },
    []
  );


  // =========================================================
  // Save Analysis State
  //
  // This keeps the current analysis available while
  // navigating between:
  //
  // Analyze
  //   ↓
  // Tailor
  //   ↓
  // Versions
  //
  // Backend scan history remains authoritative.
  // =========================================================

  const saveAnalysisState = (
    resumeUuid,
    state
  ) => {

    if (!resumeUuid) {
      return;
    }

    setAnalysisState(
      (previous) => {

        const updated = {
          ...previous,

          [resumeUuid]: {
            ...(previous[
              resumeUuid
            ] || {}),

            ...state,
          },

        };

        localStorage.setItem(
          ANALYSIS_STORAGE_KEY,
          JSON.stringify(
            updated
          )
        );

        return updated;

      }
    );

  };


  // =========================================================
  // Get Analysis State
  // =========================================================

  const getAnalysisState = (
    resumeUuid
  ) => {

    if (!resumeUuid) {
      return null;
    }

    return (
      analysisState[
        resumeUuid
      ] || null
    );

  };


  // =========================================================
  // Update Analysis Result
  //
  // Convenience method used after a successful
  // ATS scan.
  //
  // Example:
  //
  // updateAnalysis(
  //   resumeUuid,
  //   jobDescription,
  //   scanResult
  // )
  // =========================================================

  const updateAnalysis = (
    resumeUuid,
    jobDescription,
    scanResult
  ) => {

    if (!resumeUuid) {
      return;
    }

    saveAnalysisState(
      resumeUuid,
      {
        jobDescription:
          jobDescription || "",

        scanResult:
          scanResult || null,

        scannedAt:
          new Date().toISOString(),
      }
    );


    // -------------------------------------------------------
    // Keep selected resume score synchronized
    // -------------------------------------------------------

    if (
      selectedResume &&
      selectedResume.resumeUuid ===
        resumeUuid &&
      scanResult
    ) {

      updateSelectedResume({
        score:
          scanResult.skills_match_percent,
      });

    }

  };


  // =========================================================
  // Clear Analysis State
  // =========================================================

  const clearAnalysisState = (
    resumeUuid
  ) => {

    if (!resumeUuid) {
      return;
    }

    setAnalysisState(
      (previous) => {

        const updated = {
          ...previous,
        };

        delete updated[
          resumeUuid
        ];

        localStorage.setItem(
          ANALYSIS_STORAGE_KEY,
          JSON.stringify(
            updated
          )
        );

        return updated;

      }
    );

  };


  // =========================================================
  // Clear All Analysis State
  // =========================================================

  const clearAllAnalysisState = () => {

    setAnalysisState({});

    localStorage.removeItem(
      ANALYSIS_STORAGE_KEY
    );

  };


  // =========================================================
  // Context Value
  // =========================================================

  const value = useMemo(
    () => ({

      // -----------------------------------------------------
      // Resume
      // -----------------------------------------------------

      selectedResume,

      selectedResumeUuid:
        selectedResume?.resumeUuid ||
        null,

      selectResume,

      updateResume,

      updateSelectedResume,

      clearSelectedResume,


      // -----------------------------------------------------
      // Analysis
      // -----------------------------------------------------

      analysisState,

      saveAnalysisState,

      getAnalysisState,

      updateAnalysis,

      clearAnalysisState,

      clearAllAnalysisState,

    }),
    [
      selectedResume,
      analysisState,
    ]
  );


  return (
    <ResumeContext.Provider
      value={value}
    >
      {children}
    </ResumeContext.Provider>
  );

}


// ===========================================================
// Hook
// ===========================================================

export function useResume() {

  const context =
    useContext(
      ResumeContext
    );

  if (!context) {

    throw new Error(
      "useResume must be used inside ResumeProvider"
    );

  }

  return context;

}
