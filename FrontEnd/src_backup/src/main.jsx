import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { TournamentProvider } from "./context/TournamentContext.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <TournamentProvider>
      <App />
    </TournamentProvider>
  </StrictMode>
);
