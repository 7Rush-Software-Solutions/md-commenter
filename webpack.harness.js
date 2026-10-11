// Builds dev/harness.tsx into harness-dist/ with adoClient swapped for the in-memory mock.
const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const base = require("./webpack.config.js")({}, { mode: "development" });

module.exports = {
  ...base,
  mode: "development",
  entry: { harness: "./dev/harness.tsx" },
  output: { path: path.resolve(__dirname, "harness-dist"), filename: "[name].js", clean: true },
  module: {
    rules: [
      { test: /\.tsx?$/, loader: "esbuild-loader", exclude: /node_modules/, options: { tsconfig: "./tsconfig.json" } },
      { test: /\.css$/, use: ["style-loader", "css-loader"] }
    ]
  },
  plugins: [
    new webpack.NormalModuleReplacementPlugin(/services[\\/]adoClient$/, path.resolve(__dirname, "dev/mockAdoClient.ts")),
    new HtmlWebpackPlugin({
      filename: "index.html",
      templateContent: `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>MD Commenter (harness)</title></head><body><div id="root"></div></body></html>`
    })
  ]
};
