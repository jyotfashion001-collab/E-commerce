import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { initApiBaseUrl } from "./lib/api";
import "./index.css";

const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

initApiBaseUrl();

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={basePath || "/"}>
    <App />
  </BrowserRouter>,
);
