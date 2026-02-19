const path = require("path");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");

/** @type {import('webpack').Configuration} */
module.exports = {
  entry: {
    background: path.resolve(__dirname, "src/background/index.ts"),
    popup: path.resolve(__dirname, "src/popup/index.tsx"),
    panel: path.resolve(__dirname, "src/panel/index.tsx"),
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true,
            compilerOptions: { noEmit: false },
          },
        },
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias: {
      "@shared": path.resolve(__dirname, "src/shared"),
      "@background": path.resolve(__dirname, "src/background"),
      "@popup": path.resolve(__dirname, "src/popup"),
      "@panel": path.resolve(__dirname, "src/panel"),
    },
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { from: "public/manifest.json", to: "manifest.json" },
        { from: "public/icons", to: "icons" },
      ],
    }),
    new HtmlWebpackPlugin({
      template: "public/popup.html",
      filename: "popup.html",
      chunks: ["popup"],
    }),
    new HtmlWebpackPlugin({
      template: "public/panel.html",
      filename: "panel.html",
      chunks: ["panel"],
    }),
  ],
};
