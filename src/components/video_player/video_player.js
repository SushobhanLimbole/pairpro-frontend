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
  // Determine which video to display based on the connection and screen-sharing state
  const onlyLocal = !isRemoteConnected && !isScreenSharing;
  const bothConnected = isRemoteConnected && !isScreenSharing;
  const screenShareActive = isScreenSharing;

  return (
    <div className={styles.videoContainer}>
      {/* Screen Share */}
      <video
        ref={screenVideoRef}
        autoPlay
        playsInline
        muted
        onClick={toggleFullScreen}
        className={`${styles.video} ${screenShareActive ? styles.screenActive : styles.screenInactive
          }`}
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
          }`}
      />
    </div>
  );
}
