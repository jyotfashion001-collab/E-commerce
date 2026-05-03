import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const basePath = (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={basePath || "/"}>
    <App />
  </BrowserRouter>,
);
