
import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#f5f1e8] text-[#111111]">

      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((current) => !current)}
        onNavigate={() => setSidebarOpen(false)}
      />

      <main
        className={[
          "min-h-screen transition-[margin] duration-200",
          sidebarOpen ? "md:ml-64" : "md:ml-20",
        ].join(" ")}
      >

        <Topbar
          onToggleSidebar={() => setSidebarOpen((current) => !current)}
          sidebarOpen={sidebarOpen}
        />

        <div className="p-6 lg:p-10">
          <Outlet />
        </div>

      </main>

    </div>
  );
}

export default AppShell;
