import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { registerPushServiceWorker } from "@/lib/push";

createRoot(document.getElementById("root")!).render(<App />);

// Register the push service worker and route notification clicks
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    registerPushServiceWorker().catch((e) => console.warn("[push] SW registration failed", e));
  });

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "PUSH_NOTIFICATION_CLICK" && event.data.url) {
      window.history.pushState({}, "", event.data.url);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }
  });
}
