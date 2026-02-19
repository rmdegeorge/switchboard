import { createRoot } from "react-dom/client";
import ErrorBoundary from "@shared/ErrorBoundary";
import App from "./App";
import "./panel.css";

const root = createRoot(document.getElementById("root")!);
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
