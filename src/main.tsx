import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "./ui/Router";
import "./styles/theme.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router />
  </StrictMode>,
);
