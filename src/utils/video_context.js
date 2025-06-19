import { createContext, useContext, useRef, useState } from 'react';

const VideoContext = createContext();

export function VideoProvider({ children }) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenVideoRef = useRef(null);

  const [videoRefs] = useState({
    localVideoRef,
    remoteVideoRef,
    screenVideoRef
  });

  return (
    <VideoContext.Provider value={videoRefs}>
      {children}
    </VideoContext.Provider>
  );
}

export function useVideoContext() {
  return useContext(VideoContext);
}
