import { useEffect, useState } from "react";
import { loadClassConfig } from "../utils/fareCalculator";

// Coach class labels, fare rates and booking limits, fetched once from the
// server and shared across components.
export function useClassConfig() {
  const [config, setConfig] = useState(null);
  useEffect(() => {
    loadClassConfig().then(setConfig).catch(() => {});
  }, []);
  return config;
}
