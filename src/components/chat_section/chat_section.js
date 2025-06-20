import { useEffect, useState } from 'react';
import styles from './chat_section.module.css';
import { FaTimes } from 'react-icons/fa';
import { socket } from '../../socket';

export default function ChatSection({ handleChat, roomId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [myId, setMyId] = useState(null);

  useEffect(() => {
    console.log('[Chat] Component mounted, joining room:', roomId);
    setMyId(socket.id);
    console.log('[Chat] My socket ID:', socket.id);

    // 1. request chat history
    socket.emit('get-chat-history', { roomId });
    console.log('[Chat] Requested chat history for room:', roomId);

    socket.on('chat-history', (history) => {
      console.log('[Chat] Received chat history:', history);
      const sorted = [...history].sort((a, b) => a.timestamp - b.timestamp);
      setMessages(sorted);
    });

    // 2. Live incoming message
    socket.on('receive-message', (message) => {
      console.log('[Chat] Incoming message:', message);
      setMessages((prev) => {
        const newMessages = [...prev, message];
        const sorted = newMessages.sort((a, b) => a.timestamp - b.timestamp);
        return sorted;
      });
    });

    return () => {
      console.log('[Chat] Cleaning up socket listeners');
      socket.off('chat-history');
      socket.off('receive-message');
    };
  }, []);

  const sendMessage = () => {
    if (input.trim() === '') {
      console.warn('[Chat] Tried to send empty message');
      return;
    }

    const message = {
      text: input,
      senderId: socket.id,
      timestamp: Date.now()
    };

    console.log('[Chat] Sending message:', message);

    // Show message in UI immediately
    setMessages((prev) => {
      const newMessages = [...prev, message];
      const sorted = newMessages.sort((a, b) => a.timestamp - b.timestamp);
      return sorted;
    });

    // Emit to server
    socket.emit('send-message', { roomId, message });

    setInput('');
  };

  return (
    <div className={styles.chatSection}>
      <div className={styles.chatHeader}>
        <span>Chat</span>
        <FaTimes
          className={styles.closeIcon}
          onClick={() => {
            console.log('[Chat] Closing chat panel');
            handleChat();
          }}
          title="Close chat"
        />
      </div>

      <div className={styles.messageList}>
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === myId;
          console.log(`[Chat] Rendering message #${idx} from ${isMe ? 'me' : 'other'}:`, msg);
          return (
            <div
              key={idx}
              className={`${styles.message} ${isMe ? styles.sent : styles.received}`}
              title={new Date(msg.timestamp).toLocaleTimeString()}
            >
              {msg.text}
            </div>
          );
        })}
      </div>

      <div className={styles.inputContainer}>
        <input
          value={input}
          onChange={(e) => {
            console.log('[Chat] Input changed:', e.target.value);
            setInput(e.target.value);
          }}
          placeholder="Type a message..."
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              console.log('[Chat] Enter key pressed');
              sendMessage();
            }
          }}
          className={styles.input}
        />
        <button
          onClick={() => {
            console.log('[Chat] Send button clicked');
            sendMessage();
          }}
          className={styles.sendButton}
        >
          Send
        </button>
      </div>
    </div>
  );
}
