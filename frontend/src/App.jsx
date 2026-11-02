import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import AppShell from "./components/layout/AppShell";

import Dashboard from "./pages/Dashboard";
import UploadResume from "./pages/UploadResume";
import Analyze from "./pages/Analyze";
import Tailor from "./pages/Tailor";
import ResumeVersions from "./pages/ResumeVersions";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import ResumeWorkspace from "./pages/ResumeWorkspace";
import JobTracker from "./pages/JobTracker";
import CoverLetters from "./pages/CoverLetter";
import ResumeBuilder from "./pages/ResumeBuilder";

import { ResumeProvider } from "./context/ResumeContext";
import { FeatureProvider } from "./context/FeatureContext";
import { useFeatures } from "./hooks/useFeatures";

function FeatureRoute({ feature, children }) {
  const features = useFeatures();

  return features[feature]
    ? children
    : <Navigate to="/" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <FeatureProvider>
        <ResumeProvider>
          <Routes>
            <Route element={<AppShell />}>
            <Route
              path="/"
              element={<Dashboard />}
            />

            <Route
              path="/resumes"
              element={<Navigate to="/" replace />}
            />

            <Route
              path="/upload"
              element={<UploadResume />}
            />

            <Route
              path="/analyze"
              element={
                <FeatureRoute feature="ats_scan">
                  <Analyze />
                </FeatureRoute>
              }
            />

            <Route
              path="/resumes/:resumeUuid"
              element={<ResumeWorkspace />}
            />

            <Route
              path="/tailor"
              element={
                <FeatureRoute feature="ats_scan">
                  <Tailor />
                </FeatureRoute>
              }
            />

            <Route
              path="/jobs"
              element={
                <FeatureRoute feature="job_tracker">
                  <JobTracker />
                </FeatureRoute>
              }
            />

            <Route
              path="/cover-letter"
              element={
                <FeatureRoute feature="cover_letter">
                  <CoverLetters />
                </FeatureRoute>
              }
            />

            <Route
              path="/builder"
              element={
                <FeatureRoute feature="resume_builder">
                  <ResumeBuilder />
                </FeatureRoute>
              }
            />

            <Route
              path="/resumes/:resumeUuid/versions"
              element={
                <FeatureRoute feature="ats_scan">
                  <ResumeVersions />
                </FeatureRoute>
              }
            />

            <Route
              path="/analytics"
              element={
                <FeatureRoute feature="ats_scan">
                  <Analytics />
                </FeatureRoute>
              }
            />
            <Route
              path="/settings"
              element={<Settings />}
            />

            <Route
              path="*"
              element={
                <Navigate
                  to="/"
                  replace
                />
              }
            />
            </Route>
          </Routes>
        </ResumeProvider>
      </FeatureProvider>
    </BrowserRouter>
  );
}

export default App;
