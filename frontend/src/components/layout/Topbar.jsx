import {
  Menu,
  Plus,
  Search,
  X,
} from "lucide-react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";


function Topbar({ onToggleSidebar, sidebarOpen }) {

  const navigate = useNavigate();
  const location = useLocation();


  const pageInfo =
    getPageInfo(location.pathname);


  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b-[3px] border-black bg-[#fffdf8] px-8">

      {/* =====================================================
          Page context
      ===================================================== */}

      <div>

        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-500">
          {pageInfo.section}
        </p>

        <h2 className="mt-1 text-lg font-black">
          {pageInfo.title}
        </h2>

      </div>


      {/* =====================================================
          Actions
      ===================================================== */}

      <div className="flex items-center gap-3">

        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          className="flex h-11 w-11 items-center justify-center border-[3px] border-black bg-white shadow-[4px_4px_0_#111] transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#111]"
        >
          {sidebarOpen ? <X size={19} strokeWidth={3} /> : <Menu size={19} strokeWidth={3} />}
        </button>

        {/* Search */}

        <button
          className="flex h-11 w-11 items-center justify-center border-[3px] border-black bg-white shadow-[4px_4px_0_#111] transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#111]"
          aria-label="Search"
        >

          <Search
            size={19}
            strokeWidth={2.5}
          />

        </button>

        {/* Upload */}

        <button
          onClick={() =>
            navigate("/upload")
          }
          className="flex h-11 items-center gap-2 border-[3px] border-black bg-[#b8ff5a] px-4 font-black shadow-[4px_4px_0_#111] transition-all duration-100 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#111]"
        >

          <Plus
            size={18}
            strokeWidth={3}
          />

          <span className="hidden sm:inline">
            Upload Resume
          </span>

        </button>

      </div>

    </header>
  );
}


// ===========================================================
// Page information
// ===========================================================

function getPageInfo(
  pathname
) {

  if (pathname === "/") {
    return {
      section: "Workspace",
      title: "Your resumes",
    };
  }

  if (pathname.startsWith("/settings")) {
    return {
      section: "Preferences",
      title: "Settings",
    };
  }

  if (pathname.startsWith("/jobs")) {
    return {
      section: "Tools",
      title: "Job Tracker",
    };
  }

  if (pathname.startsWith("/upload")) {
    return {
      section: "Resume",
      title: "Upload Resume",
    };
  }

  if (pathname.startsWith("/analyze")) {
    return {
      section: "Resume",
      title: "ATS Analysis",
    };
  }

  if (pathname.startsWith("/tailor")) {
    return {
      section: "Resume",
      title: "Tailor Resume",
    };
  }

  if (pathname.includes("/versions")) {
    return {
      section: "Resume",
      title: "Version History",
    };
  }

  if (pathname.startsWith("/analytics")) {
    return {
      section: "Resume",
      title: "Analytics",
    };
  }

  return {
    section: "ATSCheck",
    title: "Career Workspace",
  };
}


export default Topbar;