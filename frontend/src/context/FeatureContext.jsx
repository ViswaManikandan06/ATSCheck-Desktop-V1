import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { FeatureContext } from "./featureContextValue";


const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000/api/v1";

const featureNames = [
  "ats_scan",
  "resume_builder",
  "cover_letter",
  "job_tracker",
];


export function FeatureProvider({ children }) {
  const [features, setFeatures] = useState(null);
  const [error, setError] = useState("");

  const loadFeatures = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/features`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Failed to load feature settings.");
      }

      if (
        !featureNames.every(
          (feature) => typeof data[feature] === "boolean"
        )
      ) {
        throw new Error("The feature settings response is invalid.");
      }

      setFeatures(data);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Failed to load feature settings.");
    }
  }, []);

  useEffect(() => {
    loadFeatures();
  }, [loadFeatures]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f1e8] p-6 text-[#111111]">
        <section className="max-w-lg border-[3px] border-black bg-[#ffdddd] p-8 shadow-[7px_7px_0_#111]">
          <h1 className="text-2xl font-black">Feature settings unavailable</h1>
          <p className="mt-3 font-semibold">{error}</p>
          <button
            type="button"
            onClick={loadFeatures}
            className="mt-5 border-[3px] border-black bg-white px-4 py-2 font-black shadow-[3px_3px_0_#111]"
          >
            Retry
          </button>
        </section>
      </main>
    );
  }

  if (!features) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f1e8] text-[#111111]">
        <div className="border-[3px] border-black bg-white px-8 py-6 font-black shadow-[7px_7px_0_#111]">
          Loading feature settings...
        </div>
      </main>
    );
  }

  return (
    <FeatureContext.Provider value={features}>
      {children}
    </FeatureContext.Provider>
  );
}
