import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '../../components/video_player/video_player';
import { FaSlideshare, FaPhoneSlash, FaMicrophoneSlash, FaMicrophone, FaEllipsisV } from 'react-icons/fa';
import styles from './room_page.module.css';
import VideoNavbar from '../../components/video_navbar/video_navbar';
import { useWebRTCContext } from '../../utils/webRTC_context';
import ChatSection from '../../components/chat_section/chat_section';

export default function RoomPage() {

  const { roomId } = useParams();
  const navigate = useNavigate();

  const {
    localVideoRef,
    remoteVideoRef,
    screenVideoRef,
    toggleAudio,
    shareScreen,
    muted,
    disconnectCall,
    isScreenSharing,
    isRemoteConnected,
    joinRoom
  } = useWebRTCContext();


  useEffect(() => {
    joinRoom(roomId); // Only call once
  }, [roomId]);

  const [isScreenFull, setIsScreenFull] = useState(false);
  const [isOpenChat, setIsOpenChat] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleFullScreen = () => {
    setIsScreenFull(!isScreenFull);
  };

  const handleChatSection = () => {
    console.log('handleChatSection called');
    setMenuOpen(false);
    setIsOpenChat(!isOpenChat);
  }
  
  const handleMenuOption = (option) => {
    console.log("Selected:", option);
    setMenuOpen(false);
    if (option !== "") {
      navigate(option);
    }
  };
  
  return (
    <section className={styles.roomPage}>

      <VideoNavbar roomId={roomId} />

      {
        isOpenChat ? <ChatSection handleChat={handleChatSection} roomId={roomId} /> : <></>
      }

      <div className={styles.container}>
        <VideoPlayer
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          screenVideoRef={screenVideoRef}
          isScreenFull={isScreenFull}
          toggleFullScreen={toggleFullScreen}
          isScreenSharing={isScreenSharing}
          isRemoteConnected={isRemoteConnected}
        />

        <div className={styles.controls}>
          <button
            onClick={toggleAudio}
            style={{
              backgroundColor: muted ? 'gray' : 'rgba(33, 149, 243, 0.77)',
            }}
            className={`${styles.controlButton} ${styles.audioButton}`}
          >
            {muted ? <FaMicrophoneSlash /> : <FaMicrophone />}
          </button>

          <button
            onClick={shareScreen}
            className={`${styles.controlButton} ${styles.screenShareButton}`}
            style={{
              backgroundColor: isScreenSharing ? '#22c55e' : 'rgba(33, 149, 243, 0.77)', // green when active
            }}
          >
            <FaSlideshare />
          </button>

          <button
            onClick={() => {
              disconnectCall(roomId);
              navigate('/');
            }}
            className={`${styles.controlButton} ${styles.endCallButton}`}
          >
            <FaPhoneSlash />
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className={styles.menuButton}
          >
            <FaEllipsisV />
          </button>


          {menuOpen && (
            <div className={styles.dropdownMenu}>
              <div onClick={() => handleMenuOption(`/code-editor/${roomId}`)} className={styles.menuItem}>
                <span className={styles.icon}>{`{}`}</span> Code Editor
              </div>
              <div onClick={handleChatSection} className={styles.menuItem}>
                <span className={styles.icon}>💬</span> Chat
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
