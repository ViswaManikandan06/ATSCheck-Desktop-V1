import {
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  FileText,
  Link2,
  Plus,
  Trash2,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useResume } from "../context/ResumeContext";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1";

const STAGES = [
  { id: "saved", label: "Saved" },
  { id: "applied", label: "Applied" },
  { id: "screening", label: "Screening" },
  { id: "interview", label: "Interview" },
  { id: "offer", label: "Offer" },
  { id: "rejected", label: "Rejected" },
  { id: "withdrawn", label: "Withdrawn" },
];

const EMPTY_FORM = {
  company: "",
  position: "",
  stage: "saved",
  resumeUuid: "",
  source: "",
  jobUrl: "",
  dateApplied: "",
  notes: "",
  jobDescription: "",
};

const formatDate = (value) => {
  if (!value) return "Not set";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

function JobTracker() {
  const { selectedResume, selectedResumeUuid } = useResume();

  const [jobs, setJobs] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedStageFilter, setSelectedStageFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState(null);

  const [form, setForm] = useState({
    ...EMPTY_FORM,
    resumeUuid: selectedResumeUuid || "",
  });

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/jobs`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Failed to load jobs.");
        }

        const mappedJobs = Array.isArray(data.jobs)
          ? data.jobs.map((job) => ({
              id: job.job_uuid,
              jobUuid: job.job_uuid,
              company: job.company,
              position: job.position,
              stage: job.stage,
              resumeUuid: job.resume_uuid || "",
              resumeName: job.resume_name || "Not linked",
              source: job.source || "",
              jobUrl: job.job_url || "",
              dateApplied: job.date_applied || "",
              notes: job.notes || "",
              jobDescription: job.job_description || "",
              createdAt: job.created_at,
            }))
          : [];

        setJobs(mappedJobs);
      } catch (error) {
        console.error("Failed to load job tracker data:", error);
      }
    };

    loadJobs();
  }, []);

  useEffect(() => {
    const loadResumes = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/resumes`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.detail || "Failed to load resumes.");
        }

        const mappedResumes = Array.isArray(data.resumes)
          ? data.resumes.map((resume) => ({
              resumeUuid: resume.resume_uuid,
              name:
                resume.filename ||
                resume.original_filename ||
                "Untitled Resume",
              label:
                resume.filename ||
                resume.original_filename ||
                "Untitled Resume",
            }))
          : [];

        setResumes(mappedResumes);
      } catch (error) {
        console.error("Failed to load resumes for tracker:", error);
      } finally {
        setLoadingResumes(false);
      }
    };

    loadResumes();
  }, []);

  useEffect(() => {
    if (!selectedResumeUuid) {
      return;
    }

    setForm((current) => ({
      ...current,
      resumeUuid: current.resumeUuid || selectedResumeUuid,
    }));
  }, [selectedResumeUuid]);

  const visibleJobs = useMemo(() => {
    if (selectedStageFilter === "all") {
      return jobs;
    }

    return jobs.filter((job) => job.stage === selectedStageFilter);
  }, [jobs, selectedStageFilter]);

  const boardStages = useMemo(
    () =>
      selectedStageFilter === "all"
        ? STAGES
        : STAGES.filter((stage) => stage.id === selectedStageFilter),
    [selectedStageFilter]
  );

  const totals = useMemo(
    () => ({
      all: jobs.length,

      active: jobs.filter((job) =>
        ["saved", "applied", "screening", "interview"].includes(job.stage)
      ).length,

      offers: jobs.filter((job) => job.stage === "offer").length,
    }),
    [jobs]
  );

  const insights = useMemo(() => {
    const total = jobs.length || 1;

    const interviews = jobs.filter((job) =>
      ["interview", "offer"].includes(job.stage)
    ).length;

    const thisMonth = jobs.filter((job) => {
      if (!job.dateApplied) return false;

      const appliedDate = new Date(job.dateApplied);
      const now = new Date();

      return (
        appliedDate.getMonth() === now.getMonth() &&
        appliedDate.getFullYear() === now.getFullYear()
      );
    }).length;

    const pipelineHealth = jobs.filter((job) =>
      ["screening", "interview", "offer"].includes(job.stage)
    ).length;

    return {
      interviews,
      interviewRate: Math.round((interviews / total) * 100),
      thisMonth,
      pipelineHealth,
    };
  }, [jobs]);

  const stageBreakdown = useMemo(() => {
    const total = jobs.length || 1;

    return STAGES.map((stage) => {
      const count = jobs.filter((job) => job.stage === stage.id).length;

      return {
        ...stage,
        count,
        percent: Math.round((count / total) * 100),
      };
    });
  }, [jobs]);

  const analytics = useMemo(() => {
    const now = new Date();

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const applicationsThisWeek = jobs.filter((job) => {
      if (!job.dateApplied) return false;

      const date = new Date(job.dateApplied);

      return date >= startOfWeek && date <= now;
    }).length;

    const applicationsThisMonth = jobs.filter((job) => {
      if (!job.dateApplied) return false;

      const date = new Date(job.dateApplied);

      return date >= startOfMonth && date <= now;
    }).length;

    const applied = jobs.filter((job) =>
      [
        "applied",
        "screening",
        "interview",
        "offer",
        "rejected",
      ].includes(job.stage)
    ).length;

    const screening = jobs.filter((job) =>
      ["screening", "interview", "offer"].includes(job.stage)
    ).length;

    const interviews = jobs.filter((job) =>
      ["interview", "offer"].includes(job.stage)
    ).length;

    const offers = jobs.filter((job) => job.stage === "offer").length;

    const rejected = jobs.filter(
      (job) => job.stage === "rejected"
    ).length;

    const active = jobs.filter((job) =>
      ["saved", "applied", "screening", "interview"].includes(job.stage)
    ).length;

    const interviewRate = applied
      ? Math.round((interviews / applied) * 100)
      : 0;

    const offerRate = applied
      ? Math.round((offers / applied) * 100)
      : 0;

    const screeningRate = applied
      ? Math.round((screening / applied) * 100)
      : 0;

    const rejectionRate = applied
      ? Math.round((rejected / applied) * 100)
      : 0;

    const sourceMap = {};

    jobs.forEach((job) => {
      const source = job.source?.trim() || "Unknown";

      if (!sourceMap[source]) {
        sourceMap[source] = {
          source,
          applications: 0,
          interviews: 0,
          offers: 0,
        };
      }

      sourceMap[source].applications += 1;

      if (["interview", "offer"].includes(job.stage)) {
        sourceMap[source].interviews += 1;
      }

      if (job.stage === "offer") {
        sourceMap[source].offers += 1;
      }
    });

    const sourcePerformance = Object.values(sourceMap)
      .map((item) => ({
        ...item,
        interviewRate: item.applications
          ? Math.round(
              (item.interviews / item.applications) * 100
            )
          : 0,
      }))
      .sort((a, b) => b.applications - a.applications);

    return {
      applicationsThisWeek,
      applicationsThisMonth,
      applied,
      screening,
      interviews,
      offers,
      rejected,
      active,
      interviewRate,
      offerRate,
      screeningRate,
      rejectionRate,
      sourcePerformance,
    };
  }, [jobs]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.company.trim() || !form.position.trim()) {
      return;
    }

    try {
      const payload = {
        company: form.company.trim(),
        position: form.position.trim(),
        stage: form.stage,
        resume_uuid: form.resumeUuid || null,
        source: form.source.trim() || null,
        job_url: form.jobUrl.trim() || null,
        date_applied: form.dateApplied || null,
        notes: form.notes.trim() || null,
        job_description:
          form.jobDescription.trim() || null,
      };

      const response = await fetch(`${API_BASE_URL}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to save job."
        );
      }

      const savedJob = {
        id: data.job_uuid,
        jobUuid: data.job_uuid,
        company: data.company,
        position: data.position,
        stage: data.stage,
        resumeUuid: data.resume_uuid || "",
        resumeName:
          data.resume_name ||
          selectedResume?.name ||
          "Not linked",
        source: data.source || "",
        jobUrl: data.job_url || "",
        dateApplied: data.date_applied || "",
        notes: data.notes || "",
        jobDescription: data.job_description || "",
        createdAt: data.created_at,
      };

      setJobs((current) => [savedJob, ...current]);

      setIsFormOpen(false);

      setForm({
        ...EMPTY_FORM,
        resumeUuid: selectedResumeUuid || "",
      });
    } catch (error) {
      console.error("Failed to save job application:", error);
    }
  };

  const moveJobStage = async (jobId, direction) => {
    const job = jobs.find((item) => item.id === jobId);

    if (!job || !job.jobUuid) {
      return;
    }

    const currentIndex = STAGES.findIndex(
      (stage) => stage.id === job.stage
    );

    const nextIndex = Math.min(
      STAGES.length - 1,
      Math.max(0, currentIndex + direction)
    );

    const nextStage = STAGES[nextIndex].id;

    if (nextStage === job.stage) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/jobs/${job.jobUuid}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stage: nextStage,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || "Failed to update job stage."
        );
      }

      setJobs((current) =>
        current.map((item) => {
          if (item.id !== jobId) {
            return item;
          }

          return {
            ...item,
            stage: data.stage,
            resumeUuid: data.resume_uuid || "",
            resumeName:
              data.resume_name || item.resumeName,
            source: data.source || item.source,
            jobUrl: data.job_url || "",
            dateApplied: data.date_applied || "",
            notes: data.notes || "",
            jobDescription:
              data.job_description || "",
          };
        })
      );

      setSelectedJob((current) => {
        if (!current || current.id !== jobId) {
          return current;
        }

        return {
          ...current,
          stage: data.stage,
          resumeUuid: data.resume_uuid || "",
          resumeName:
            data.resume_name || current.resumeName,
          source: data.source || current.source,
          jobUrl: data.job_url || "",
          dateApplied: data.date_applied || "",
          notes: data.notes || "",
          jobDescription:
            data.job_description || "",
        };
      });
    } catch (error) {
      console.error(
        "Failed to move job stage:",
        error
      );
    }
  };
  const deleteJob = async (jobId) => {
    const job = jobs.find((item) => item.id === jobId);

    if (!job || !job.jobUuid) {
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/jobs/${job.jobUuid}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response
          .json()
          .catch(() => ({}));

        throw new Error(
          data.detail || "Failed to delete job."
        );
      }

      setJobs((current) =>
        current.filter((item) => item.id !== jobId)
      );

      setSelectedJob((current) =>
        current?.id === jobId ? null : current
      );
    } catch (error) {
      console.error(
        "Failed to delete job:",
        error
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-[28px] border-[3px] border-black bg-[radial-gradient(circle_at_top_left,_#fffef9,_#f5f1e8_60%,_#efe7d8)] p-6 shadow-[10px_10px_0_#111111]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
              Career pipeline
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-gray-900">
              Job Tracker
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full border-[3px] border-black bg-[#b8ff5a] px-5 py-3 text-sm font-black shadow-[4px_4px_0_#111111] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#111111]"
          >
            <Plus size={16} />
            Add job
          </button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Total"
          value={totals.all}
          accent="bg-white"
          icon="○"
          detail="All applications"
        />

        <StatCard
          label="Active"
          value={totals.active}
          accent="bg-[#f5f1e8]"
          icon="◎"
          detail="In motion"
        />

        <StatCard
          label="Interviews"
          value={insights.interviews}
          accent="bg-[#dcecff]"
          icon="◌"
          detail={`${insights.interviewRate}% conversion`}
        />

        <StatCard
          label="Offers"
          value={totals.offers}
          accent="bg-[#e7f7c7]"
          icon="✓"
          detail={`${insights.thisMonth} this month`}
        />
      </div>

      {/* Analytics */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* Application Funnel */}
        <div className="rounded-[28px] border-[3px] border-black bg-white p-5 shadow-[8px_8px_0_#111111]">
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
              Conversion funnel
            </p>

            <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-gray-900">
              Application journey
            </h2>
          </div>

          <div className="space-y-3">
            <FunnelRow
              label="Applications"
              value={analytics.applied}
              percent={100}
            />

            <FunnelRow
              label="Reached screening"
              value={analytics.screening}
              percent={analytics.screeningRate}
            />

            <FunnelRow
              label="Reached interview"
              value={analytics.interviews}
              percent={analytics.interviewRate}
            />

            <FunnelRow
              label="Offers"
              value={analytics.offers}
              percent={analytics.offerRate}
            />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <MiniMetric
              label="Screening"
              value={`${analytics.screeningRate}%`}
            />

            <MiniMetric
              label="Interview"
              value={`${analytics.interviewRate}%`}
            />

            <MiniMetric
              label="Offer"
              value={`${analytics.offerRate}%`}
            />
          </div>
        </div>

        {/* Application Activity */}
        <div className="rounded-[28px] border-[3px] border-black bg-[#f5f1e8] p-5 shadow-[8px_8px_0_#111111]">
          <div className="mb-5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
              Application activity
            </p>

            <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-gray-900">
              Your momentum
            </h2>
          </div>

          <div className="space-y-3">
            <ActivityMetric
              label="This week"
              value={analytics.applicationsThisWeek}
              detail="applications"
            />

            <ActivityMetric
              label="This month"
              value={analytics.applicationsThisMonth}
              detail="applications"
            />

            <ActivityMetric
              label="Active pipeline"
              value={analytics.active}
              detail="opportunities"
            />

            <ActivityMetric
              label="Rejected"
              value={analytics.rejected}
              detail={`${analytics.rejectionRate}% of applications`}
            />
          </div>
        </div>
      </div>

      {/* Source Performance */}
      <div className="rounded-[28px] border-[3px] border-black bg-white p-5 shadow-[8px_8px_0_#111111]">
        <div className="mb-5">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
            Source analytics
          </p>

          <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-gray-900">
            Where your opportunities come from
          </h2>
        </div>

        {analytics.sourcePerformance.length === 0 ? (
          <div className="rounded-[16px] border-[2px] border-dashed border-black/50 bg-[#f8f5ef] p-5 text-center text-sm font-bold text-gray-500">
            Add a source to your applications to see source performance.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-3 border-b-[2px] border-black pb-2 text-[10px] font-black uppercase tracking-[0.12em] text-gray-500">
                <span>Source</span>
                <span>Applications</span>
                <span>Interviews</span>
                <span>Conversion</span>
              </div>

              <div className="divide-y-[2px] divide-black/10">
                {analytics.sourcePerformance.map(
                  (item) => (
                    <div
                      key={item.source}
                      className="grid grid-cols-[1.5fr_1fr_1fr_1fr] items-center gap-3 py-3"
                    >
                      <span className="text-sm font-black text-gray-900">
                        {item.source}
                      </span>

                      <span className="text-sm font-bold text-gray-700">
                        {item.applications}
                      </span>

                      <span className="text-sm font-bold text-gray-700">
                        {item.interviews}
                      </span>

                      <span className="inline-flex w-fit rounded-full border-[2px] border-black bg-[#dff7b8] px-2 py-1 text-[10px] font-black">
                        {item.interviewRate}%
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stage Analytics */}
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.9fr]">
        <div className="rounded-[28px] border-[3px] border-black bg-white p-4 shadow-[8px_8px_0_#111111]">
          <div className="mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
              Pipeline analytics
            </p>

            <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-gray-900">
              Stage mix
            </h2>
          </div>

          <StageDistributionChart
            data={stageBreakdown}
          />
        </div>

        <div className="rounded-[28px] border-[3px] border-black bg-white p-4 shadow-[8px_8px_0_#111111]">
          <div className="mb-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
              Breakdown
            </p>

            <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-gray-900">
              Applications by stage
            </h2>
          </div>

          <div className="space-y-3">
            {stageBreakdown.map((stage) => (
              <div key={stage.id}>
                <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-gray-700">
                  <span>{stage.label}</span>
                  <span>{stage.count}</span>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full border-[2px] border-black bg-[#f5f1e8]">
                  <div
                    className="h-full rounded-full bg-[#111111]"
                    style={{
                      width: `${stage.percent}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="rounded-[28px] border-[3px] border-black bg-white p-4 shadow-[8px_8px_0_#111111]">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setSelectedStageFilter("all")
            }
            className={[
              "rounded-full border-[2px] border-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition",
              selectedStageFilter === "all"
                ? "bg-[#111111] text-white"
                : "bg-white text-gray-700 hover:bg-[#f5f1e8]",
            ].join(" ")}
          >
            All
          </button>

          {STAGES.map((stage) => (
            <button
              key={stage.id}
              type="button"
              onClick={() =>
                setSelectedStageFilter(stage.id)
              }
              className={[
                "rounded-full border-[2px] border-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] transition",
                selectedStageFilter === stage.id
                  ? "bg-[#b8ff5a] text-black"
                  : "bg-white text-gray-700 hover:bg-[#f5f1e8]",
              ].join(" ")}
            >
              {stage.label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-[1200px] gap-4">
            {boardStages.map((stage) => {
              const cards = visibleJobs.filter(
                (job) => job.stage === stage.id
              );

              const stageColors = {
                saved: "bg-[#f5f1e8]",
                applied: "bg-[#dcecff]",
                screening: "bg-[#fce9c7]",
                interview: "bg-[#f7d7ff]",
                offer: "bg-[#dff7b8]",
                rejected: "bg-[#ffe0db]",
                withdrawn: "bg-[#e7e7e7]",
              };

              return (
                <div
                  key={stage.id}
                  className={`flex h-[560px] min-w-[260px] flex-1 flex-col overflow-hidden rounded-[26px] border-[3px] border-black ${stageColors[stage.id]} p-3 shadow-[6px_6px_0_#111111]`}
                >
                  <div className="mb-3 flex items-center justify-between border-b-[2px] border-black/70 pb-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-700">
                      {stage.label}
                    </h3>

                    <span className="flex h-8 w-8 items-center justify-center rounded-full border-[2px] border-black bg-white text-xs font-black text-gray-800">
                      {cards.length}
                    </span>
                  </div>

                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {cards.length === 0 ? (
                      <div className="flex min-h-[100px] items-center justify-center rounded-[18px] border-[2px] border-dashed border-black/60 bg-white/60 p-3 text-center text-[11px] font-bold text-gray-500">
                        No jobs here
                      </div>
                    ) : (
                      cards.map((job) => (
                        <div
                          key={job.id}
                          onClick={() =>
                            setSelectedJob(job)
                          }
                          className="cursor-pointer rounded-[16px] border-[3px] border-black bg-white p-3 shadow-[4px_4px_0_#111111] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#111111]"
                        >
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-black leading-tight text-gray-900">
                                {job.company}
                              </p>

                              <p className="mt-1 text-[11px] font-bold text-gray-600">
                                {job.position}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                deleteJob(job.id);
                              }}
                              className="shrink-0 rounded-full border-[2px] border-black bg-[#f5f1e8] p-1 text-gray-500 transition hover:text-red-600"
                              aria-label={`Delete ${job.company}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          <div className="rounded-[12px] border-[2px] border-black bg-[#f8f5ef] p-2 text-[11px] text-gray-700">
                            <div className="flex items-center gap-2">
                              <BriefcaseBusiness
                                size={12}
                                className="shrink-0 text-gray-600"
                              />

                              <span className="font-semibold text-gray-800">
                                {job.position}
                              </span>
                            </div>

                            <div className="mt-1.5 space-y-1">
                              <div className="flex items-center gap-2">
                                <FileText
                                  size={12}
                                  className="shrink-0 text-gray-600"
                                />

                                <span className="truncate">
                                  {job.resumeName}
                                </span>
                              </div>

                              {job.dateApplied && (
                                <div className="flex items-center gap-2">
                                  <CalendarDays
                                    size={12}
                                    className="shrink-0 text-gray-600"
                                  />

                                  <span>
                                    {formatDate(
                                      job.dateApplied
                                    )}
                                  </span>
                                </div>
                              )}

                              {job.jobUrl && (
                                <a
                                  href={job.jobUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(event) =>
                                    event.stopPropagation()
                                  }
                                  className="flex items-center gap-2 text-blue-700 underline underline-offset-2"
                                >
                                  <Link2
                                    size={12}
                                    className="shrink-0"
                                  />

                                  View listing
                                </a>
                              )}
                            </div>
                          </div>

                          {job.notes && (
                            <div className="mt-2 rounded-[10px] border-[2px] border-dashed border-black/50 bg-white p-2 text-[10px] leading-4 text-gray-700">
                              <div className="mb-1 flex items-center gap-1.5">
                                <Check
                                  size={10}
                                  className="text-green-700"
                                />

                                <span className="font-black uppercase tracking-[0.12em] text-gray-600">
                                  Notes
                                </span>
                              </div>

                              {job.notes}
                            </div>
                          )}

                          {job.jobDescription && (
                            <div className="mt-2 rounded-[10px] border-[2px] border-black bg-[#f5f1e8] p-2 text-[10px] leading-4 text-gray-700">
                              <span className="font-black uppercase tracking-[0.12em] text-gray-600">
                                JD snapshot
                              </span>

                              <div className="mt-1 line-clamp-4">
                                {job.jobDescription}
                              </div>
                            </div>
                          )}

                          <div className="mt-2 flex items-center justify-between gap-2 border-t-[2px] border-black/70 pt-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                moveJobStage(
                                  job.id,
                                  -1
                                );
                              }}
                              className="flex items-center justify-center rounded-full border-[2px] border-black bg-white p-1.5 transition hover:bg-[#f5f1e8]"
                              aria-label={`Move ${job.company} back one stage`}
                            >
                              <ChevronLeft size={12} />
                            </button>

                            <span className="rounded-full border-[2px] border-black bg-[#b8ff5a] px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-gray-900">
                              {job.stage}
                            </span>

                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                moveJobStage(
                                  job.id,
                                  1
                                );
                              }}
                              className="flex items-center justify-center rounded-full border-[2px] border-black bg-white p-1.5 transition hover:bg-[#f5f1e8]"
                              aria-label={`Move ${job.company} forward one stage`}
                            >
                              <ChevronRight size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Job Drawer */}
      {selectedJob && (
        <div className="fixed inset-0 z-40 flex justify-end bg-[#111111]/45 p-4">
          <div className="h-full w-full max-w-md overflow-y-auto rounded-[28px] border-[3px] border-black bg-[#fffdf8] p-5 shadow-[12px_12px_0_#111111]">
            <div className="mb-5 flex items-center justify-between gap-3 border-b-[3px] border-black pb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                  Job summary
                </p>

                <h2 className="mt-1 text-2xl font-black text-gray-900">
                  {selectedJob.company}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="rounded-full border-[2px] border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em]"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-[18px] border-[3px] border-black bg-[#f5f1e8] p-3">
                <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-600">
                  Position
                </p>

                <p className="mt-2 text-lg font-black text-gray-900">
                  {selectedJob.position}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <InfoPill
                  label="Stage"
                  value={selectedJob.stage}
                />

                <InfoPill
                  label="Resume"
                  value={
                    selectedJob.resumeName ||
                    "Not linked"
                  }
                />

                {selectedJob.dateApplied && (
                  <InfoPill
                    label="Applied"
                    value={formatDate(
                      selectedJob.dateApplied
                    )}
                  />
                )}

                {selectedJob.source && (
                  <InfoPill
                    label="Source"
                    value={selectedJob.source}
                  />
                )}
              </div>

              {selectedJob.jobUrl && (
                <a
                  href={selectedJob.jobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-[14px] border-[3px] border-black bg-[#dcecff] p-3 text-sm font-bold text-blue-800"
                >
                  <Link2 size={14} />
                  Open job listing
                </a>
              )}

              {selectedJob.notes && (
                <div className="rounded-[18px] border-[3px] border-black bg-white p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-600">
                    Notes
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-700">
                    {selectedJob.notes}
                  </p>
                </div>
              )}

              {selectedJob.jobDescription && (
                <div className="rounded-[18px] border-[3px] border-black bg-[#f8f5ef] p-3">
                  <p className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-600">
                    Job description
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-700">
                    {selectedJob.jobDescription}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    moveJobStage(
                      selectedJob.id,
                      -1
                    );
                  }}
                  className="rounded-full border-[2px] border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em]"
                >
                  Move back
                </button>

                <button
                  type="button"
                  onClick={() => {
                    moveJobStage(
                      selectedJob.id,
                      1
                    );
                  }}
                  className="rounded-full border-[2px] border-black bg-[#b8ff5a] px-3 py-2 text-xs font-black uppercase tracking-[0.12em]"
                >
                  Move forward
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Job Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#111111]/45 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border-[3px] border-black bg-[#fffdf8] p-5 shadow-[12px_12px_0_#111111]">
            <div className="mb-5 flex items-center justify-between gap-3 border-b-[3px] border-black pb-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                  New application
                </p>

                <h2 className="mt-1 text-2xl font-black text-gray-900">
                  Add job to tracker
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-full border-[2px] border-black bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em]"
              >
                Close
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid gap-4 md:grid-cols-2"
            >
              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">
                  Company
                </span>

                <input
                  name="company"
                  value={form.company}
                  onChange={handleInputChange}
                  placeholder="Acme Labs"
                  className="w-full rounded-[14px] border-[3px] border-black bg-white px-3 py-2 font-medium outline-none"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">
                  Position
                </span>

                <input
                  name="position"
                  value={form.position}
                  onChange={handleInputChange}
                  placeholder="Senior Product Engineer"
                  className="w-full rounded-[14px] border-[3px] border-black bg-white px-3 py-2 font-medium outline-none"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">
                  Resume used
                </span>

                <select
                  name="resumeUuid"
                  value={form.resumeUuid}
                  onChange={handleInputChange}
                  className="w-full rounded-[14px] border-[3px] border-black bg-white px-3 py-2 font-medium outline-none"
                  disabled={loadingResumes}
                >
                  <option value="">
                    Select a resume
                  </option>

                  {resumes.map((resume) => (
                    <option
                      key={resume.resumeUuid}
                      value={resume.resumeUuid}
                    >
                      {resume.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">
                  Current stage
                </span>

                <select
                  name="stage"
                  value={form.stage}
                  onChange={handleInputChange}
                  className="w-full rounded-[14px] border-[3px] border-black bg-white px-3 py-2 font-medium outline-none"
                >
                  {STAGES.map((stage) => (
                    <option
                      key={stage.id}
                      value={stage.id}
                    >
                      {stage.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">
                  Job URL
                </span>

                <input
                  name="jobUrl"
                  value={form.jobUrl}
                  onChange={handleInputChange}
                  placeholder="https://company.com/jobs/123"
                  className="w-full rounded-[14px] border-[3px] border-black bg-white px-3 py-2 font-medium outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">
                  Date applied
                </span>

                <input
                  type="date"
                  name="dateApplied"
                  value={form.dateApplied}
                  onChange={handleInputChange}
                  className="w-full rounded-[14px] border-[3px] border-black bg-white px-3 py-2 font-medium outline-none"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">
                  Source
                </span>

                <input
                  name="source"
                  value={form.source}
                  onChange={handleInputChange}
                  placeholder="LinkedIn, referral, recruiter"
                  className="w-full rounded-[14px] border-[3px] border-black bg-white px-3 py-2 font-medium outline-none"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">
                  Job description
                </span>

                <textarea
                  name="jobDescription"
                  value={form.jobDescription}
                  onChange={handleInputChange}
                  rows={6}
                  className="w-full resize-none rounded-[16px] border-[3px] border-black bg-white px-3 py-2 font-medium outline-none"
                  placeholder="Paste the JD here. You can keep notes, skills, requirements, and responsibilities."
                />
              </label>

              <label className="block md:col-span-2">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">
                  Notes
                </span>

                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full resize-none rounded-[16px] border-[3px] border-black bg-white px-3 py-2 font-medium outline-none"
                  placeholder="Recruiter follow-up, key people, salary range, customizations, next steps..."
                />
              </label>

              <div className="flex justify-end gap-3 pt-2 md:col-span-2">
                <button
                  type="button"
                  onClick={() =>
                    setIsFormOpen(false)
                  }
                  className="rounded-full border-[3px] border-black bg-white px-4 py-2 text-sm font-black"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-full border-[3px] border-black bg-[#b8ff5a] px-4 py-2 text-sm font-black shadow-[3px_3px_0_#111111]"
                >
                  Save job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FunnelRow({
  label,
  value,
  percent,
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-black text-gray-800">
          {label}
        </span>

        <span className="text-xs font-black text-gray-500">
          {value}
        </span>
      </div>

      <div className="h-3 overflow-hidden rounded-full border-[2px] border-black bg-[#f5f1e8]">
        <div
          className="h-full rounded-full bg-[#111111] transition-all"
          style={{
            width: `${Math.min(percent, 100)}%`,
          }}
        />
      </div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-[14px] border-[2px] border-black bg-[#f8f5ef] p-3 text-center">
      <p className="text-[9px] font-black uppercase tracking-[0.12em] text-gray-500">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-gray-900">
        {value}
      </p>
    </div>
  );
}

function ActivityMetric({
  label,
  value,
  detail,
}) {
  return (
    <div className="flex items-center justify-between rounded-[16px] border-[2px] border-black bg-white p-3">
      <div>
        <p className="text-xs font-black text-gray-900">
          {label}
        </p>

        <p className="mt-0.5 text-[10px] font-semibold text-gray-500">
          {detail}
        </p>
      </div>

      <p className="text-2xl font-black tracking-[-0.04em] text-gray-900">
        {value}
      </p>
    </div>
  );
}

function StageDistributionChart({ data }) {
  const total =
    data.reduce(
      (sum, item) => sum + item.count,
      0
    ) || 1;

  const strokeWidth = 14;
  const radius = 42;
  const circumference =
    2 * Math.PI * radius;

  let offset = 0;

  const stageColors = {
    saved: "#f5f1e8",
    applied: "#dcecff",
    screening: "#fce9c7",
    interview: "#f7d7ff",
    offer: "#dff7b8",
    rejected: "#ffe0db",
    withdrawn: "#e7e7e7",
  };

  return (
    <div className="flex items-center justify-center gap-4">
      <svg
        viewBox="0 0 120 120"
        className="h-32 w-32"
      >
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#f5f1e8"
          strokeWidth={strokeWidth}
        />

        {data.map((stage) => {
          const segmentLength =
            (stage.count / total) *
            circumference;

          const dashArray = `${segmentLength} ${
            circumference - segmentLength
          }`;

          const dashOffset = -offset;

          offset += segmentLength;

          return (
            <circle
              key={stage.id}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={
                stageColors[stage.id]
              }
              strokeWidth={strokeWidth}
              strokeDasharray={dashArray}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
          );
        })}
      </svg>

      <div className="space-y-2">
        {data.map((stage) => (
          <div
            key={stage.id}
            className="flex items-center gap-2 text-[11px] font-bold text-gray-700"
          >
            <span
              className="h-2.5 w-2.5 rounded-full border-[2px] border-black"
              style={{
                backgroundColor:
                  stageColors[stage.id],
              }}
            />

            <span>{stage.label}</span>

            <span className="ml-auto text-gray-500">
              {stage.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoPill({
  label,
  value,
}) {
  return (
    <div className="rounded-[14px] border-[2px] border-black bg-white p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-sm font-bold text-gray-800">
        {value}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  icon,
  detail,
}) {
  return (
    <div
      className={`rounded-[22px] border-[3px] border-black p-4 shadow-[5px_5px_0_#111111] ${accent}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
            {label}
          </p>

          <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-gray-900">
            {value}
          </p>

          {detail && (
            <p className="mt-1 text-[11px] font-semibold text-gray-600">
              {detail}
            </p>
          )}
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-black bg-white text-lg font-black text-gray-900">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default JobTracker;