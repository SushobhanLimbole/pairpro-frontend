import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuid } from 'uuid';
import styles from './home_page.module.css';

export default function HomePage() {
    
    const navigate = useNavigate();
    const [roomCode, setRoomCode] = useState('');

    const createRoom = () => {
        const newRoomId = uuid();
        navigate(`/room/${newRoomId}`);
    };

    const joinRoom = () => {
        if (roomCode.trim()) {
            navigate(`/room/${roomCode.trim()}`);
        }
    };

    return (
        <>
            <div className={styles.container}>
                <h1 className={styles.heading}>PairPro</h1>
                <button onClick={createRoom} className={styles.createButton}>
                    Create Room
                </button>
                <div className={styles.inputGroup}>
                    <input
                        className={styles.roomInput}
                        placeholder="Enter room ID"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value)}
                    />
                    <button onClick={joinRoom} className={styles.joinButton}>
                        Join Room
                    </button>
                </div>
            </div>
        </>
    );
}
