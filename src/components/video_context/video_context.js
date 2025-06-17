import { createContext, useRef, useContext } from "react";

const VideoContext = createContext();

export function VideoProvider({ children }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenVideoRef = useRef(null);

  return (
    <VideoContext.Provider value={{ localVideoRef, remoteVideoRef, screenVideoRef }}>
      {children}
    </VideoContext.Provider>
  );
}

export const useVideoContext = () => useContext(VideoContext);
