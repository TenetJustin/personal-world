import { createRoot } from "react-dom/client";
import App from "./App";
if (new URLSearchParams(location.search).get("benchmark") === "1440x900")
  document.documentElement.dataset.benchmark = "true";
createRoot(document.getElementById("root")!).render(<App />);
