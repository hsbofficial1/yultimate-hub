import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { attendanceSync } from "./lib/attendanceSync";
import { offlineStorage } from "./lib/offlineStorage";

// Initialize offline storage and sync service
offlineStorage.init().then(() => {
  // Sync service will auto-initialize and start syncing
  console.log('Offline storage initialized');
});

// Periodically try to sync (every 30 seconds)
setInterval(() => {
  if (navigator.onLine) {
    attendanceSync.syncPendingData();
  }
}, 30000);

createRoot(document.getElementById("root")!).render(<App />);
