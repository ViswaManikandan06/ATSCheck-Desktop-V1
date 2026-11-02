import { useContext } from "react";
import { FeatureContext } from "../context/featureContextValue";


export function useFeatures() {
  const features = useContext(FeatureContext);

  if (!features) {
    throw new Error("useFeatures must be used within a FeatureProvider.");
  }

  return features;
}
