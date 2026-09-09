import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { configureCognito } from "./auth/cognito";
import "./styles.css";

configureCognito();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider><App /></AuthProvider>
  </StrictMode>
);