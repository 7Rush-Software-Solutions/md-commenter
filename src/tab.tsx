import * as SDK from "azure-devops-extension-sdk";
import { createRoot } from "react-dom/client";
import React from "react";
import { App } from "./components/App";
import "./styles/styles.css";

SDK.init({ loaded: false, applyTheme: true });

SDK.ready().then(() => {
  // The manifest declares registeredObjectId; register it so the host can talk to the tab.
  SDK.register("md-commenter-pr-tab", {});
  createRoot(document.getElementById("root")!).render(<App />);
  SDK.notifyLoadSucceeded();
});
