import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { missingProfileFields } from "./data/profile";

// Development reminder so placeholder details never ship by accident.
if (import.meta.env.DEV) {
  const missing = missingProfileFields();
  if (missing.length) console.info(`[portfolio] Fill in src/data/profile.js: ${missing.join(", ")}`);
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
