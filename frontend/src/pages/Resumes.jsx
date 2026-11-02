import {
  ArrowUpRight,
  Check,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useResume,
} from "../context/ResumeContext";


const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1";


function Resumes() {

  const navigate = useNavigate();

  const {
    selectedResumeUuid,
    selectResume,
    clearSelectedResume,
  } = useResume();


  const [resumes, setResumes] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [openingResumeUuid, setOpeningResumeUuid] =
    useState(null);

  const [deletingResumeUuid, setDeletingResumeUuid] =
    useState(null);


  // =========================================================
  // Load Resumes
  // =========================================================
  //
  // IMPORTANT:
  // This page only loads resumes.
  //
  // It does NOT:
  // - load scans
  // - load latest analysis
  // - calculate ATS scores
  // - load versions
  //
  // Those belong to Resume Workspace / Analyze / Versions.
  //
  // =========================================================

  useEffect(() => {

    let cancelled = false;


    const loadResumes = async () => {

      setLoading(true);
      setError("");


      try {

        const response =
          await fetch(
            `${API_BASE_URL}/resumes`
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.detail ||
            "Failed to load resumes."
          );

        }


        const backendResumes =
          Array.isArray(data.resumes)
            ? data.resumes
            : [];


        if (cancelled) {
          return;
        }


        const mappedResumes =
          backendResumes.map(
            (resume) => ({

              resumeUuid:
                resume.resume_uuid,

              resumeId:
                resume.id ?? null,

              name:
                resume.filename ||
                resume.original_filename ||
                "Untitled Resume",

              filename:
                resume.filename ||
                resume.original_filename ||
                "resume",

              fileType:
                resume.file_type ||
                "",

              updated:
                formatUpdatedDate(
                  resume.updated_at ||
                  resume.created_at
                ),

            })
          );


        setResumes(
          mappedResumes
        );

      } catch (err) {

        if (cancelled) {
          return;
        }


        console.error(
          "Failed to load resumes:",
          err
        );


        setError(
          err.message ||
          "Failed to load resumes."
        );

      } finally {

        if (!cancelled) {

          setLoading(false);

        }

      }

    };


    loadResumes();


    return () => {

      cancelled = true;

    };

  }, []);


  // =========================================================
  // Open Resume Workspace
  // =========================================================

  const handleOpenResume =
    (resume) => {

      if (!resume?.resumeUuid) {
        return;
      }


      setOpeningResumeUuid(
        resume.resumeUuid
      );


      /*
       * Store the complete resume object
       * in ResumeContext.
       */

      selectResume(
        resume
      );


      /*
       * IMPORTANT:
       *
       * Every resume opens at its workspace.
       *
       * Analyze / Tailor / Versions are
       * handled INSIDE the workspace.
       */

      navigate(
        `/resumes/${encodeURIComponent(
          resume.resumeUuid
        )}`
      );

    };


  const handleDeleteResume =
    async (resume) => {

      if (!resume?.resumeUuid || deletingResumeUuid) {
        return;
      }

      const confirmed = window.confirm(
        `Delete ${resume.name || "this resume"}? This will also delete its analyses and saved versions.`
      );

      if (!confirmed) {
        return;
      }

      setDeletingResumeUuid(resume.resumeUuid);
      setError("");

      try {
        const response = await fetch(
          `${API_BASE_URL}/resumes/${encodeURIComponent(resume.resumeUuid)}`,
          { method: "DELETE" }
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Failed to delete resume.");
        }

        setResumes((current) =>
          current.filter(
            (item) => item.resumeUuid !== resume.resumeUuid
          )
        );

        if (selectedResumeUuid === resume.resumeUuid) {
          clearSelectedResume();
        }
      } catch (err) {
        setError(err.message || "Failed to delete resume.");
      } finally {
        setDeletingResumeUuid(null);
      }
    };


  // =========================================================
  // Loading
  // =========================================================

  if (loading) {

    return (

      <div className="mx-auto max-w-7xl">

        <section className="flex min-h-[400px] items-center justify-center">

          <div className="border-[3px] border-black bg-white p-8 font-black shadow-[7px_7px_0_#111]">

            Loading resumes...

          </div>

        </section>

      </div>

    );

  }


  // =========================================================
  // Error
  // =========================================================

  if (error) {

    return (

      <div className="mx-auto max-w-7xl">

        <section className="border-[3px] border-black bg-[#ffdddd] p-6 font-black shadow-[7px_7px_0_#111]">

          {error}

        </section>

      </div>

    );

  }


  // =========================================================
  // Page
  // =========================================================

  return (

    <div className="mx-auto max-w-7xl">

      {/* =====================================================
          Header
      ===================================================== */}

      <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">

        <div>

          <p className="mb-2 text-sm font-black uppercase tracking-[0.15em] text-gray-500">

            Workspace

          </p>


          <h1 className="text-5xl font-black tracking-[-0.04em]">

            Your resumes.

          </h1>


          <p className="mt-3 max-w-xl font-semibold leading-6 text-gray-600">

            Manage your resumes in one place. Open a resume
            to analyze, tailor, and manage its versions.

          </p>

        </div>


        <button
          type="button"
          onClick={() =>
            navigate("/upload")
          }
          className="flex items-center justify-center gap-2 border-[3px] border-black bg-[#b8ff5a] px-5 py-3 font-black shadow-[5px_5px_0_#111] transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#111]"
        >

          <Plus
            size={20}
            strokeWidth={3}
          />

          Upload Resume

        </button>

      </section>


      {/* =====================================================
          Resume Count
      ===================================================== */}

      <div className="mb-5 flex items-center justify-between border-b-[3px] border-black pb-3">

        <p className="text-sm font-black uppercase tracking-wider">

          {resumes.length}{" "}
          {resumes.length === 1
            ? "Resume"
            : "Resumes"}

        </p>


        <p className="text-sm font-bold text-gray-500">

          Stored locally

        </p>

      </div>


      {/* =====================================================
          Empty State
      ===================================================== */}

      {resumes.length === 0 && (

        <section className="mb-6 border-[3px] border-black bg-white p-10 text-center shadow-[7px_7px_0_#111]">

          <div className="mx-auto flex h-16 w-16 items-center justify-center border-[3px] border-black bg-[#ffcf56] shadow-[4px_4px_0_#111]">

            <FileText
              size={28}
              strokeWidth={3}
            />

          </div>


          <h2 className="mt-6 text-2xl font-black">

            No resumes yet.

          </h2>


          <p className="mt-2 font-semibold text-gray-500">

            Upload your first resume to start
            building your career workspace.

          </p>


          <button
            type="button"
            onClick={() =>
              navigate("/upload")
            }
            className="mt-6 border-[3px] border-black bg-[#b8ff5a] px-5 py-3 font-black shadow-[4px_4px_0_#111]"
          >

            Upload Resume

          </button>

        </section>

      )}


      {/* =====================================================
          Resume Grid
      ===================================================== */}

      {resumes.length > 0 && (

        <section className="grid gap-6 md:grid-cols-2">

          {resumes.map(
            (resume) => (

              <ResumeCard
                key={
                  resume.resumeUuid
                }

                resume={
                  resume
                }

                selected={
                  selectedResumeUuid ===
                  resume.resumeUuid
                }

                opening={
                  openingResumeUuid ===
                  resume.resumeUuid
                }

                onOpen={
                  handleOpenResume
                }

                deleting={
                  deletingResumeUuid === resume.resumeUuid
                }

                onDelete={
                  handleDeleteResume
                }

              />

            )
          )}


          {/* =================================================
              Add Resume
          ================================================= */}

          <button
            type="button"
            onClick={() =>
              navigate("/upload")
            }
            className="flex min-h-[290px] flex-col items-center justify-center border-[3px] border-dashed border-black bg-transparent p-8 text-center transition-all hover:bg-white"
          >

            <div className="flex h-16 w-16 items-center justify-center border-[3px] border-black bg-[#ffcf56] shadow-[4px_4px_0_#111]">

              <Plus
                size={30}
                strokeWidth={3}
              />

            </div>


            <h2 className="mt-6 text-xl font-black">

              Add another resume

            </h2>


            <p className="mt-2 max-w-xs text-sm font-semibold text-gray-500">

              Upload a PDF or DOCX resume to add
              another resume to your workspace.

            </p>

          </button>

        </section>

      )}

    </div>

  );

}


// ===========================================================
// Resume Card
// ===========================================================

function ResumeCard({
  resume,
  selected,
  opening,
  deleting,
  onOpen,
  onDelete,
}) {

  const fileExtension =
    getFileExtension(
      resume.filename
    );


  return (

    <article
      role="button"
      tabIndex={0}

      onClick={() =>
        onOpen(resume)
      }

      onKeyDown={(event) => {

        if (
          event.key === "Enter" ||
          event.key === " "
        ) {

          event.preventDefault();

          onOpen(resume);

        }

      }}

      className={[
        "group cursor-pointer select-none",
        "border-[3px] border-black bg-white",
        "shadow-[7px_7px_0_#111]",
        "transition-all duration-100",
        "focus:outline-none focus:ring-4 focus:ring-[#b8ff5a]",

        selected
          ? "translate-x-[3px] translate-y-[3px] bg-[#faffef] shadow-[3px_3px_0_#111]"
          : "hover:-translate-x-[1px] hover:-translate-y-[1px]",

      ].join(" ")}

    >

      {/* =====================================================
          Card Header
      ===================================================== */}

      <div className="flex items-start justify-between border-b-[3px] border-black p-6">

        <div className="flex min-w-0 items-center gap-4">

          <div className="flex h-14 w-14 shrink-0 items-center justify-center border-[3px] border-black bg-[#f5f1e8] font-black uppercase">

            {fileExtension}

          </div>


          <div className="min-w-0">

            <h2
              className="truncate text-xl font-black"
              title={resume.name}
            >

              {resume.name}

            </h2>


            <p
              className="mt-1 truncate text-sm font-semibold text-gray-500"
              title={resume.filename}
            >

              {resume.filename}

            </p>

          </div>

        </div>


        {/* =================================================
            Card Actions
        ================================================= */}

        <div className="ml-4 flex shrink-0 items-center gap-2">

          {selected && (

            <div className="flex h-9 items-center gap-1 border-[3px] border-black bg-[#b8ff5a] px-2 text-xs font-black">

              <Check
                size={14}
                strokeWidth={4}
              />

              Selected

            </div>

          )}


          <button
            type="button"

            onClick={(event) => {
              event.stopPropagation();
              onDelete(resume);
            }}

            disabled={deleting}

            aria-label={`Delete ${resume.name || "resume"}`}

            className="flex h-9 w-9 items-center justify-center border-[3px] border-black bg-white hover:bg-[#ffdddd] disabled:cursor-wait disabled:opacity-60"
          >

            <Trash2
              size={18}
              strokeWidth={3}
            />

          </button>

        </div>

      </div>


      {/* =====================================================
          Resume Information
      ===================================================== */}

      <div className="border-b-[3px] border-black p-6">

        <p className="text-xs font-black uppercase tracking-wider text-gray-500">

          Resume

        </p>


        <p className="mt-2 text-lg font-black">

          Ready to work with

        </p>


        <p className="mt-1 text-sm font-semibold leading-5 text-gray-500">

          Open this resume to analyze ATS performance,
          tailor it for a job, or manage versions.

        </p>

      </div>


      {/* =====================================================
          Footer
      ===================================================== */}

      <div className="flex items-center justify-between border-t-[3px] border-black bg-[#f5f1e8] p-4">

        <span className="text-xs font-bold text-gray-500">

          {resume.updated}

        </span>


        {/* -------------------------------------------------
            ONLY PRIMARY ACTION
        ------------------------------------------------- */}

        <button
          type="button"

          disabled={opening}

          onClick={(event) => {

            event.stopPropagation();

            onOpen(resume);

          }}

          className="flex items-center gap-2 border-[3px] border-black bg-white px-4 py-2 text-sm font-black shadow-[3px_3px_0_#111] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#111] disabled:cursor-wait disabled:opacity-60"
        >

          {opening ? (

            "Opening..."

          ) : (

            <>

              <ArrowUpRight
                size={15}
                strokeWidth={3}
              />

              Open

            </>

          )}

        </button>

      </div>

    </article>

  );

}


// ===========================================================
// Helpers
// ===========================================================

function getFileExtension(
  filename
) {

  if (!filename) {

    return "FILE";

  }


  const extension =
    filename
      .split(".")
      .pop()
      ?.toUpperCase();


  return extension || "FILE";

}


function formatUpdatedDate(
  dateValue
) {

  if (!dateValue) {

    return "Stored locally";

  }


  const date =
    new Date(
      dateValue
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "Stored locally";

  }


  return `Added ${date.toLocaleDateString(
    undefined,
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  )}`;

}


export default Resumes;
