import { createContext, useContext, useRef, useState, useEffect, useCallback } from 'react';
import { socket } from '../socket';
import { useVideoContext } from './video_context';

const WebRTCContext = createContext();

export function WebRTCProvider({ children }) {
    const peerRef = useRef(null);
    const localStreamRef = useRef(null);
    const screenStreamRef = useRef(null);
    const pendingCandidates = useRef([]);
    const hasJoinedRoom = useRef(false);

    const { localVideoRef, remoteVideoRef, screenVideoRef } = useVideoContext();

    const [muted, setMuted] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [isRemoteConnected, setIsRemoteConnected] = useState(false);

    const toggleAudio = useCallback(() => {
        const audioTrack = localStreamRef.current?.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setMuted(!audioTrack.enabled);
        }
    }, []);

    const shareScreen = useCallback(async () => {
        if (!peerRef.current) return;

        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            const screenTrack = screenStream.getVideoTracks()[0];
            const sender = peerRef.current.getSenders().find(s => s.track.kind === 'video');

            if (sender) sender.replaceTrack(screenTrack);
            screenVideoRef.current.srcObject = screenStream;
            screenStreamRef.current = screenStream;
            setIsScreenSharing(true);

            screenTrack.onended = () => {
                const originalTrack = localStreamRef.current.getVideoTracks()[0];
                const sender = peerRef.current.getSenders().find(s => s.track.kind === 'video');
                if (sender) sender.replaceTrack(originalTrack);
                screenVideoRef.current.srcObject = null;
                setIsScreenSharing(false);
            };
        } catch (err) {
            console.error('[ScreenShare] Error:', err);
        }
    }, []);

    const cleanupPeer = useCallback(() => {
        console.log('[Cleanup] Closing peer connection');
        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        setIsRemoteConnected(false);
    }, []);

    const createPeerConnection = useCallback((targetSocketId) => {
        const peer = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        peer.onicecandidate = ({ candidate }) => {
            if (candidate) {
                socket.emit('send-ice-candidate', { candidate, to: targetSocketId });
            }
        };

        peer.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
                setIsRemoteConnected(true);
            }
        };

        peer.oniceconnectionstatechange = () => {
            const state = peer.iceConnectionState;
            if (['disconnected', 'failed', 'closed'].includes(state)) {
                cleanupPeer();
            }
        };

        return peer;
    }, [cleanupPeer]);

    const joinRoom = useCallback(async (roomId) => {
        if (peerRef.current) {
            console.log('[WebRTC] Already connected');
            return;
        }

        if (hasJoinedRoom.current) {
            console.log('[WebRTC] Already joined room, skipping joinRoom');
            return;
        }
        hasJoinedRoom.current = true;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            socket.emit('join-room', { roomId });
            console.log('[WebRTC] Joined room:', roomId);

            socket.emit('get-existing-peers', { roomId });
            console.log('[WebRTC] get existing peers of the room:', roomId);

            socket.on('existing-peers', async (peers) => {
                console.log('existing peers listener called, got peers ',peers);
                if (peers.length === 0) return;

                const targetId = peers[0]; // For 1-to-1
                if (peerRef.current) return;

                peerRef.current = createPeerConnection(targetId);
                stream.getTracks().forEach(track => peerRef.current.addTrack(track, stream));

                const offer = await peerRef.current.createOffer();
                await peerRef.current.setLocalDescription(offer);

                socket.emit('send-offer', { offer: peerRef.current.localDescription, to: targetId });
                console.log('send-offer emitted');
            });

            socket.on('user-joined', async ({ socketId }) => {
                if (peerRef.current) return;

                peerRef.current = createPeerConnection(socketId);
                stream.getTracks().forEach(track => peerRef.current.addTrack(track, stream));

                const offer = await peerRef.current.createOffer();
                await peerRef.current.setLocalDescription(offer);

                socket.emit('send-offer', { offer: peerRef.current.localDescription, to: socketId });
            });

            socket.on('receive-offer', async ({ offer, from }) => {
                if (peerRef.current) return;

                peerRef.current = createPeerConnection(from);
                stream.getTracks().forEach(track => peerRef.current.addTrack(track, stream));

                await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await peerRef.current.createAnswer();
                await peerRef.current.setLocalDescription(answer);

                socket.emit('send-answer', { answer: peerRef.current.localDescription, to: from });

                for (const candidate of pendingCandidates.current) {
                    await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                }
                pendingCandidates.current = [];
            });

            socket.on('receive-answer', async ({ answer }) => {
                if (peerRef.current) {
                    await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
                }
            });

            socket.on('receive-ice-candidate', async ({ candidate }) => {
                if (peerRef.current && peerRef.current.remoteDescription) {
                    await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
                } else {
                    pendingCandidates.current.push(candidate);
                }
            });

            socket.on('user-left', ({ socketId }) => {
                cleanupPeer();
            });

        } catch (error) {
            console.error('[WebRTC] Error joining room:', error);
        }
    }, [createPeerConnection]);

    const disconnectCall = useCallback((roomId) => {
        console.log('[WebRTC] Disconnecting...');

        // Close peer connection
        if (peerRef.current) {
            peerRef.current.close();
            peerRef.current = null;
        }

        // Stop all media tracks
        localStreamRef.current?.getTracks().forEach(track => track.stop());
        screenStreamRef.current?.getTracks().forEach(track => track.stop());

        // Clear video element sources
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        if (screenVideoRef.current) screenVideoRef.current.srcObject = null;

        // Optionally inform server
        socket.emit('leave-room', { roomId });

        // Reset state
        hasJoinedRoom.current = false;
        setIsRemoteConnected(false);
        setIsScreenSharing(false);
        setMuted(false);

        console.log('[WebRTC] Disconnected and cleaned up');
    }, []);


    useEffect(() => {
        return () => {
            console.log('[WebRTCContext] Cleanup');
            cleanupPeer();
            localStreamRef.current?.getTracks().forEach(t => t.stop());
            screenStreamRef.current?.getTracks().forEach(t => t.stop());

            socket.off('user-joined');
            socket.off('receive-offer');
            socket.off('receive-answer');
            socket.off('receive-ice-candidate');
            socket.off('user-left');
        };
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            if (localVideoRef.current && localStreamRef.current && !localVideoRef.current.srcObject) {
                console.log('[WebRTC] Force rebind: local video');
                localVideoRef.current.srcObject = localStreamRef.current;
            }

            if (remoteVideoRef.current && remoteVideoRef.current.srcObject === null && peerRef.current) {
                const receiverStreams = peerRef.current.getReceivers()
                    .map(r => r.track)
                    .filter(Boolean);

                const remoteStream = new MediaStream(receiverStreams);
                console.log('[WebRTC] Force rebind: remote video', remoteStream);
                remoteVideoRef.current.srcObject = remoteStream;
            }

            if (screenVideoRef.current && screenStreamRef.current && !screenVideoRef.current.srcObject) {
                console.log('[WebRTC] Force rebind: screen video');
                screenVideoRef.current.srcObject = screenStreamRef.current;
            }
        }, 1000); // Check every second

        return () => clearInterval(interval);
    }, []);


    return (
        <WebRTCContext.Provider
            value={{
                joinRoom,
                toggleAudio,
                shareScreen,
                muted,
                isScreenSharing,
                disconnectCall,
                isRemoteConnected,
                localVideoRef,
                remoteVideoRef,
                screenVideoRef,
            }}
        >
            {children}
        </WebRTCContext.Provider>
    );
}

export function useWebRTCContext() {
    return useContext(WebRTCContext);
}
