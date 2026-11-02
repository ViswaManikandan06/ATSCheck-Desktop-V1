import {
  BriefcaseBusiness,
  FilePlus2,
  LayoutDashboard,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-react";

import { NavLink } from "react-router-dom";
import { useFeatures } from "../../hooks/useFeatures";


const navigation = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
  },
];


const tools = [
  {
    label: "Resume Builder",
    icon: FilePlus2,
    path: "/builder",
    feature: "resume_builder",
  },
  {
    label: "Cover Letter",
    icon: Mail,
    path: "/cover-letter",
    feature: "cover_letter",
  },
  {
    label: "Job Tracker",
    icon: BriefcaseBusiness,
    path: "/jobs",
    feature: "job_tracker",
  },
];


function Sidebar({ open, onToggle, onNavigate }) {
  const features = useFeatures();
  const enabledTools = tools.filter((item) => features[item.feature]);

  return (
    <aside
      className={[
        "fixed left-0 top-0 z-30 flex h-screen flex-col border-r-[3px] border-black bg-[#fffdf8] transition-[width,transform] duration-200",
        open ? "w-64 translate-x-0" : "w-20 -translate-x-full md:translate-x-0",
      ].join(" ")}
    >

      {/* =====================================================
          Brand
      ===================================================== */}

      <div className={[
        "border-b-[3px] border-black py-6",
        open ? "px-6" : "px-4",
      ].join(" ")}>

        <div className={[
          "flex items-center",
          open ? "gap-3" : "justify-center",
        ].join(" ")}>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center border-[3px] border-black bg-[#b8ff5a] text-lg font-black shadow-[4px_4px_0_#111]">
            A
          </div>

          <div className={open ? "" : "hidden"}>

            <h1 className="text-xl font-black tracking-[-0.03em]">
              ATSCheck
            </h1>

            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">
              Career Workspace
            </p>

          </div>

        </div>

      </div>


      {/* =====================================================
          Navigation
      ===================================================== */}

      <nav className={[
        "flex-1 overflow-y-auto py-6",
        open ? "px-4" : "px-3",
      ].join(" ")}>

        {/* Workspace */}

        <p className={[
          "mb-3 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-gray-500",
          open ? "" : "hidden",
        ].join(" ")}>
          Workspace
        </p>

        <div className="space-y-2">

          {navigation.map((item) => {

            const Icon = item.icon;

            return (
              <NavItem
                key={item.path}
                item={item}
                Icon={Icon}
                open={open}
                onNavigate={onNavigate}
              />
            );

          })}

        </div>


        {/* Tools */}

        <p className={[
          "mb-3 mt-10 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-gray-500",
          open ? "" : "hidden",
        ].join(" ")}>
          Tools
        </p>

        <div className="space-y-2">

          {enabledTools.map((item) => {

            const Icon = item.icon;

            return (
              <NavItem
                key={item.path}
                item={item}
                Icon={Icon}
                open={open}
                onNavigate={onNavigate}
              />
            );

          })}

        </div>

      </nav>


      {/* =====================================================
          Bottom
      ===================================================== */}

      <div className={[
        "border-t-[3px] border-black p-4",
        open ? "" : "p-3",
      ].join(" ")}>

        {/* Local mode */}

        <div className={[
          "mb-4 border-[3px] border-black bg-[#dcecff] p-3",
          open ? "" : "hidden",
        ].join(" ")}>

          <div className="flex items-center gap-3">

            <div className="flex h-7 w-7 items-center justify-center border-2 border-black bg-white">

              <div className="h-2.5 w-2.5 rounded-full bg-[#55c96f]" />

            </div>

            <div>

              <p className="text-[10px] font-black uppercase tracking-wider">
                Local Mode
              </p>

              <p className="mt-0.5 text-[10px] font-semibold text-gray-600">
                Data stays on device
              </p>

            </div>

          </div>

        </div>


        {/* Settings */}

        <NavLink
          to="/settings"
          onClick={onNavigate}
          className={({ isActive }) =>
            [
              "flex items-center gap-3 border-[3px] px-3 py-3",
              "font-bold transition-all duration-100",
              open ? "" : "justify-center",
              isActive
                ? "border-black bg-[#f5f1e8] shadow-[3px_3px_0_#111]"
                : "border-transparent hover:border-black hover:bg-[#f5f1e8]",
            ].join(" ")
          }
        >

          <Settings
            size={18}
            strokeWidth={2.5}
          />

          <span className={open ? "" : "hidden"}>Settings</span>

        </NavLink>

        <button
          type="button"
          onClick={onToggle}
          aria-label={open ? "Collapse sidebar" : "Expand sidebar"}
          title={open ? "Collapse sidebar" : "Expand sidebar"}
          className={[
            "mt-3 flex w-full items-center gap-3 border-[3px] border-transparent px-3 py-3 font-bold transition-all duration-100 hover:border-black hover:bg-[#f5f1e8]",
            open ? "" : "justify-center",
          ].join(" ")}
        >
          {open ? <PanelLeftClose size={18} strokeWidth={2.5} /> : <PanelLeftOpen size={18} strokeWidth={2.5} />}
          <span className={open ? "" : "hidden"}>{open ? "Collapse sidebar" : "Expand sidebar"}</span>
        </button>

      </div>

    </aside>
  );
}


// ===========================================================
// Navigation Item
// ===========================================================

function NavItem({
  item,
  Icon,
  open,
  onNavigate,
}) {

  return (
    <NavLink
      to={item.path}
      end={item.path === "/"}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 border-[3px] px-3 py-3",
          "font-bold transition-all duration-100",
          open ? "" : "justify-center",
          isActive
            ? "border-black bg-[#b8ff5a] shadow-[4px_4px_0_#111]"
            : "border-transparent hover:border-black hover:bg-[#f5f1e8]",
        ].join(" ")
      }
    >

      <Icon
        size={19}
        strokeWidth={2.5}
      />

      <span className={open ? "" : "hidden"}>{item.label}</span>

    </NavLink>
  );
}


export default Sidebar;