import { createContext, useContext, useEffect, useState } from "react";
import { socket } from "../socket";
import { useNavigate } from "react-router-dom";

const MonitoringContext = createContext();

export function MonitoringProvider({ children, userId, roomId }) {
  const [showWarning, setShowWarning] = useState(false);
  const [maliciousDetected, setMaliciousDetected] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const navigate = useNavigate();
  const isCreator = sessionStorage.getItem('isCreator') === 'true';

  useEffect(() => {
     if (isCreator) return; // ❌ skip monitoring for creator

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        const updatedCount = tabSwitchCount + 1;
        setTabSwitchCount(updatedCount);

        if (updatedCount === 3) {
          setMaliciousDetected(true);

          // Notify peer and server
          socket.emit("last-tab-warning", { userId, roomId });
          socket.emit("malicious-detected", { userId, roomId });

          // Leave meeting
          setTimeout(() => {
            socket.emit("leave-room", { userId, roomId });
            navigate("/"); // Redirect user out of meeting
          }, 3000);
        } else {
          setShowWarning(true);
          socket.emit("tab-warning", { userId, roomId });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [tabSwitchCount, userId, roomId, navigate]);

  useEffect(() => {
    if (showWarning) {
      const timer = setTimeout(() => setShowWarning(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showWarning]);

  return (
    <MonitoringContext.Provider value={{ showWarning, maliciousDetected }}>
      {children}
    </MonitoringContext.Provider>
  );
}

export const useMonitoring = () => useContext(MonitoringContext);