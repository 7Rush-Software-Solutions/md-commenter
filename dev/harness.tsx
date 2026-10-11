// Local harness: the real App against an in-memory mock of the Azure DevOps API (no SDK, no host).
import { createRoot } from "react-dom/client";
import React from "react";
import { App } from "../src/components/App";
import "../src/styles/styles.css";

createRoot(document.getElementById("root")!).render(<App />);
