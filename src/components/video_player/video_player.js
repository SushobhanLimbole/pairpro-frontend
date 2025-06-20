import { useEffect } from "react";
import styles from "./video_player.module.css";

export default function VideoPlayer({
  localVideoRef,
  remoteVideoRef,
  screenVideoRef,
  isScreenFull,
  toggleFullScreen,
  isScreenSharing,
  isRemoteConnected,
}) {
  const onlyLocal = !isRemoteConnected && !isScreenSharing;
  const bothConnected = isRemoteConnected && !isScreenSharing;
  const screenShareActive = isScreenSharing;

  useEffect(() => {
    console.log("[VideoPlayer] Component mounted - checking video refs");

    const refs = [
      { name: "localVideoRef", ref: localVideoRef },
      { name: "remoteVideoRef", ref: remoteVideoRef },
      { name: "screenVideoRef", ref: screenVideoRef },
    ];

    refs.forEach(({ name, ref }) => {
      if (ref?.current) {
        const stream = ref.current.srcObject;
        console.log(`[VideoPlayer] ${name} DOM node found`);

        if (stream) {
          console.log(`[VideoPlayer] ${name} already has stream, rebinding...`);
          ref.current.srcObject = null; // force reset
          ref.current.srcObject = stream;
        } else {
          console.warn(`[VideoPlayer] ${name} has NO stream`);
        }
      } else {
        console.error(`[VideoPlayer] ${name} is NULL`);
      }
    });
  }, []);

  useEffect(() => {
    console.log('[VideoPlayer] Checking stream rebinding');
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      console.log('[VideoPlayer] Local video is ready');
    } else {
      console.log('[VideoPlayer] Local video not ready or no stream');
    }
  }, []);

  useEffect(() => {
    return () => {
      console.log('[VideoPlayer] Unmounting - cleaning up streams');
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      if (screenVideoRef.current) screenVideoRef.current.srcObject = null;
    };
  }, []);



  return (
    <div className={styles.videoContainer}>
      {/* Screen Share */}
      <video
        ref={screenVideoRef}
        autoPlay
        playsInline
        muted
        onClick={toggleFullScreen}
        className={`${styles.video} ${screenShareActive ? styles.screenActive : styles.screenInactive}`}
      />

      {/* Remote Video */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={`${styles.video} ${bothConnected
          ? styles.remoteFull
          : screenShareActive
            ? styles.remoteSmall
            : styles.remoteHidden
          }`}
      />

      {/* Local Video */}
      <video
        ref={localVideoRef}
        autoPlay
        playsInline
        muted
        className={`${styles.video} ${screenShareActive
          ? styles.localHidden
          : onlyLocal
            ? styles.localFull
            : bothConnected
              ? styles.localSmall
              : styles.localHidden
          } ${styles.mirror}`}
      />
    </div>
  );
}
