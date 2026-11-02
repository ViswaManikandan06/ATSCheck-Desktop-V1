import {
  ArrowLeft,
  CheckCircle2,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react";

import {
  useRef,
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


function UploadResume() {

  const navigate = useNavigate();

  const inputRef = useRef(null);


  // ---------------------------------------------------------
  // Resume context
  // ---------------------------------------------------------

  const {
    selectResume,
  } = useResume();


  // ---------------------------------------------------------
  // State
  // ---------------------------------------------------------

  const [file, setFile] =
    useState(null);

  const [isDragging, setIsDragging] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] =
    useState("");


  // ---------------------------------------------------------
  // Validate selected file
  // ---------------------------------------------------------

  const handleFile = (
    selectedFile
  ) => {

    if (!selectedFile) {
      return;
    }


    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];


    const allowedExtensions = [
      ".pdf",
      ".docx",
    ];


    const filename =
      selectedFile.name.toLowerCase();


    const hasValidExtension =
      allowedExtensions.some(
        (extension) =>
          filename.endsWith(extension)
      );


    const hasValidMimeType =
      allowedTypes.includes(
        selectedFile.type
      );


    if (
      !hasValidExtension &&
      !hasValidMimeType
    ) {

      setError(
        "Please upload a PDF or DOCX file."
      );

      return;
    }


    // -------------------------------------------------------
    // Frontend size validation
    // Backend validates again.
    // -------------------------------------------------------

    const MAX_FILE_SIZE =
      5 * 1024 * 1024;


    if (
      selectedFile.size >
      MAX_FILE_SIZE
    ) {

      setError(
        "File size must be below 5 MB."
      );

      return;
    }


    setError("");

    setFile(selectedFile);
  };


  // ---------------------------------------------------------
  // Drag and drop
  // ---------------------------------------------------------

  const handleDrop = (
    event
  ) => {

    event.preventDefault();

    setIsDragging(false);


    const droppedFile =
      event.dataTransfer.files?.[0];


    handleFile(
      droppedFile
    );
  };


  // ---------------------------------------------------------
  // Remove selected file
  // ---------------------------------------------------------

  const removeFile = () => {

    setFile(null);

    setError("");


    if (inputRef.current) {

      inputRef.current.value = "";

    }

  };


  // ---------------------------------------------------------
  // Upload resume
  // ---------------------------------------------------------

  const handleUpload = async () => {

    if (!file) {
      return;
    }


    setUploading(true);

    setError("");


    try {

      // -----------------------------------------------------
      // Create multipart form data
      // -----------------------------------------------------

      const formData =
        new FormData();


      formData.append(
        "file",
        file
      );


      // -----------------------------------------------------
      // Upload to FastAPI
      // -----------------------------------------------------

      const response =
        await fetch(
          `${API_BASE_URL}/resumes/upload`,
          {
            method: "POST",
            body: formData,
          }
        );


      // -----------------------------------------------------
      // Parse response safely
      // -----------------------------------------------------

      const data =
        await response.json();


      // -----------------------------------------------------
      // Backend error
      // -----------------------------------------------------

      if (!response.ok) {

        throw new Error(
          data.detail ||
          "Failed to upload resume."
        );

      }


      // -----------------------------------------------------
      // Backend must return resume_uuid
      // -----------------------------------------------------

      if (!data.resume_uuid) {

        throw new Error(
          "Resume was uploaded, but no resume ID was returned."
        );

      }


      // -----------------------------------------------------
      // Convert backend response to frontend model
      // -----------------------------------------------------

      const resume = {

        resumeUuid:
          data.resume_uuid,

        resumeId:
          data.id ??
          null,

        name:
          data.filename ||
          data.original_filename ||
          file.name,

        filename:
          data.filename ||
          data.original_filename ||
          file.name,

        fileType:
          data.file_type ||
          file.type,

        fileSize:
          data.file_size ??
          file.size,

        score:
          null,

        version:
          1,

        updated:
          "Added just now",

      };


      // -----------------------------------------------------
      // Store resume in ResumeContext
      // -----------------------------------------------------

      selectResume(
        resume
      );


      // -----------------------------------------------------
      // IMPORTANT
      //
      // A NEW resume does NOT have a scan yet.
      //
      // We therefore navigate to Analyze with ONLY
      // resumeUuid.
      //
      // Analyze must show the FIRST-ANALYSIS / JD INPUT
      // state when scanUuid is missing.
      //
      // After JD submission:
      //
      //     create scan
      //          ↓
      //     receive scanUuid
      //          ↓
      //     /analyze?resumeUuid=XXX&scanUuid=YYY
      //
      // -----------------------------------------------------

      navigate(
        `/analyze?resumeUuid=${encodeURIComponent(
          data.resume_uuid
        )}`
      );


    } catch (err) {

      console.error(
        "Resume upload failed:",
        err
      );


      setError(
        err.message ||
        "Failed to upload resume."
      );


    } finally {

      setUploading(false);

    }

  };


  return (

    <div className="mx-auto max-w-5xl">

      {/* =====================================================
          Header
      ===================================================== */}

      <div className="mb-8">

        <button
          onClick={() =>
            navigate("/resumes")
          }
          className="mb-6 flex items-center gap-2 font-black hover:underline"
        >

          <ArrowLeft
            size={18}
            strokeWidth={3}
          />

          Back to resumes

        </button>


        <p className="mb-2 text-sm font-black uppercase tracking-[0.15em] text-gray-500">

          New Resume

        </p>


        <h1 className="text-5xl font-black tracking-[-0.04em]">

          Upload your resume.

        </h1>


        <p className="mt-3 max-w-xl font-semibold leading-6 text-gray-600">

          Upload your resume once. After it is processed,
          we'll ask for the job description before running
          your first ATS analysis.

        </p>

      </div>


      {/* =====================================================
          Error
      ===================================================== */}

      {error && (

        <div className="mb-6 border-[3px] border-black bg-[#ff7b7b] p-4 font-black shadow-[4px_4px_0_#111]">

          {error}

        </div>

      )}


      {/* =====================================================
          Upload area
      ===================================================== */}

      {!file ? (

        <div
          onDragOver={(event) => {

            event.preventDefault();

            setIsDragging(true);

          }}

          onDragLeave={() =>
            setIsDragging(false)
          }

          onDrop={handleDrop}

          className={`flex min-h-[420px] flex-col items-center justify-center border-[3px] border-black p-10 text-center shadow-[8px_8px_0_#111] transition-all ${
            isDragging
              ? "translate-x-[3px] translate-y-[3px] bg-[#b8ff5a] shadow-[4px_4px_0_#111]"
              : "bg-white"
          }`}
        >

          <div className="flex h-24 w-24 items-center justify-center border-[3px] border-black bg-[#ffcf56] shadow-[5px_5px_0_#111]">

            <Upload
              size={42}
              strokeWidth={3}
            />

          </div>


          <h2 className="mt-8 text-3xl font-black">

            Drop your resume here

          </h2>


          <p className="mt-3 font-semibold text-gray-500">

            or choose a file from your computer

          </p>


          <button
            type="button"
            onClick={() =>
              inputRef.current?.click()
            }
            className="mt-8 border-[3px] border-black bg-[#111111] px-7 py-4 font-black text-white shadow-[5px_5px_0_#b8ff5a] transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#b8ff5a]"
          >

            Browse Files

          </button>


          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            className="hidden"
            onChange={(event) =>
              handleFile(
                event.target.files?.[0]
              )
            }
          />


          <div className="mt-8 flex gap-3 text-xs font-black uppercase tracking-wider text-gray-500">

            <span className="border-2 border-black px-2 py-1">
              PDF
            </span>

            <span className="border-2 border-black px-2 py-1">
              DOCX
            </span>

            <span className="border-2 border-black px-2 py-1">
              Local Processing
            </span>

          </div>

        </div>

      ) : (

        /* ===================================================
           Selected file
        =================================================== */

        <div className="border-[3px] border-black bg-white shadow-[8px_8px_0_#111]">

          {/* -------------------------------------------------
              File preview
          ------------------------------------------------- */}

          <div className="flex items-center justify-between border-b-[3px] border-black p-6">

            <div className="flex items-center gap-4">

              <div className="flex h-16 w-16 items-center justify-center border-[3px] border-black bg-[#b8ff5a] font-black shadow-[4px_4px_0_#111]">

                {file.name
                  .toLowerCase()
                  .endsWith(".pdf")
                  ? "PDF"
                  : "DOCX"}

              </div>


              <div>

                <h2 className="text-xl font-black">

                  {file.name}

                </h2>


                <p className="mt-1 text-sm font-semibold text-gray-500">

                  {formatFileSize(
                    file.size
                  )}

                </p>

              </div>

            </div>


            {!uploading && (

              <button
                type="button"
                onClick={removeFile}
                className="flex h-10 w-10 items-center justify-center border-[3px] border-black bg-[#ff7b7b] shadow-[3px_3px_0_#111] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#111]"
                aria-label="Remove file"
              >

                <X
                  size={18}
                  strokeWidth={3}
                />

              </button>

            )}

          </div>


          {/* -------------------------------------------------
              Validation
          ------------------------------------------------- */}

          <div className="p-6">

            <div className="border-[3px] border-black bg-[#f5f1e8] p-5">

              <div className="flex items-start gap-3">

                <CheckCircle2
                  className="mt-0.5 shrink-0"
                  size={22}
                  strokeWidth={3}
                />

                <div>

                  <p className="font-black">

                    File ready

                  </p>


                  <p className="mt-1 text-sm font-semibold text-gray-600">

                    The resume will be uploaded to your local
                    ATSCheck application. After upload, you'll
                    enter a job description for the first ATS
                    analysis.

                  </p>

                </div>

              </div>

            </div>


            {/* ------------------------------------------------
                Actions
            ------------------------------------------------ */}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">

              <button
                type="button"
                onClick={removeFile}
                disabled={uploading}
                className="border-[3px] border-black bg-white px-6 py-3 font-black shadow-[4px_4px_0_#111] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#111] disabled:cursor-not-allowed disabled:opacity-50"
              >

                Choose Another

              </button>


              <button
                type="button"
                onClick={handleUpload}
                disabled={uploading}
                className="flex flex-1 items-center justify-center gap-2 border-[3px] border-black bg-[#b8ff5a] px-6 py-3 font-black shadow-[4px_4px_0_#111] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#111] disabled:cursor-not-allowed disabled:opacity-60"
              >

                {uploading ? (

                  <>

                    <Loader2
                      size={18}
                      strokeWidth={3}
                      className="animate-spin"
                    />

                    Uploading & Processing...

                  </>

                ) : (

                  <>

                    Upload & Continue

                    <FileText
                      size={18}
                      strokeWidth={3}
                    />

                  </>

                )}

              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );

}


// ===========================================================
// Helpers
// ===========================================================

function formatFileSize(
  bytes
) {

  if (bytes < 1024) {

    return `${bytes} B`;

  }


  if (bytes < 1024 * 1024) {

    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;

  }


  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;

}


export default UploadResume;
