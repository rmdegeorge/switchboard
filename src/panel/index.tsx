import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./panel.css";

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
