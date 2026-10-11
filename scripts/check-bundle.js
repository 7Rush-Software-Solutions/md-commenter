// Fails the build if the Azure DevOps SDK ended up in the bundle more than once.
// Two copies = the second one never completes the host handshake and every REST call hangs.
const fs = require("fs");
const path = require("path");

const bundle = fs.readFileSync(path.join(__dirname, "..", "dist", "tab.js"), "utf8");
const copies = bundle.split("AzureDevOps SDK is already loaded").length - 1;

if (copies !== 1) {
  console.error(`✖ dist/tab.js contains ${copies} copies of azure-devops-extension-sdk (expected 1). Check the resolve.alias in webpack.config.js.`);
  process.exit(1);
}
console.log("✔ Bundle check: single copy of azure-devops-extension-sdk");
