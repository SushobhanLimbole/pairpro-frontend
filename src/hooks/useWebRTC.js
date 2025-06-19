// import { useEffect, useRef, useState, useCallback } from 'react';
// import { socket } from '../socket';

// const SIGNALING_SERVER_URL = 'https://pairpro-backend.onrender.com';
// const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// export default function useWebRTC(roomId) {

//   const localVideoRef = useRef(null);
//   const remoteVideoRef = useRef(null);
//   const screenVideoRef = useRef(null);
//   const socketRef = useRef(null);
//   const peerRef = useRef(null);
//   const localStreamRef = useRef(null);
//   const screenStreamRef = useRef(null);
//   const pendingCandidates = useRef([]);

//   const [muted, setMuted] = useState(false);
//   const [isScreenSharing, setIsScreenSharing] = useState(false);
//   const [isRemoteConnected, setIsRemoteConnected] = useState(false);

//   const cleanupPeer = useCallback(() => {
//     console.log('[Cleanup] Closing peer connection');
//     if (peerRef.current) {
//       peerRef.current.close();
//       peerRef.current = null;
//     }
//     if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
//     setIsRemoteConnected(false);
//   }, []);

//   const createPeerConnection = useCallback((targetSocketId) => {
//     console.log('[PeerConnection] Creating peer for:', targetSocketId);
//     const peer = new RTCPeerConnection(ICE_SERVERS);

//     peer.onicecandidate = ({ candidate }) => {
//       if (candidate) {
//         console.log('[ICE] Local candidate:', candidate);
//         socketRef.current.emit('send-ice-candidate', {
//           candidate,
//           to: targetSocketId,
//         });
//       }
//     };

//     peer.ontrack = (event) => {
//       console.log('[Track] Received remote track');
//       if (remoteVideoRef.current) {
//         remoteVideoRef.current.srcObject = event.streams[0];
//         setIsRemoteConnected(true);
//       }
//     };

//     peer.oniceconnectionstatechange = () => {
//       console.log('[ICE State] Changed to:', peer.iceConnectionState);
//       if (['disconnected', 'failed', 'closed'].includes(peer.iceConnectionState)) {
//         cleanupPeer();
//       }
//     };

//     return peer;
//   }, [cleanupPeer]);

//   const toggleAudio = useCallback(() => {
//     const audioTrack = localStreamRef.current?.getAudioTracks()[0];
//     if (audioTrack) {
//       audioTrack.enabled = !audioTrack.enabled;
//       setMuted(!audioTrack.enabled);
//     }
//   }, []);

//   const shareScreen = useCallback(async () => {
//     if (!peerRef.current) return;

//     try {
//       const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
//       const screenTrack = screenStream.getVideoTracks()[0];
//       const sender = peerRef.current.getSenders().find(s => s.track.kind === 'video');

//       if (sender) sender.replaceTrack(screenTrack);
//       screenVideoRef.current.srcObject = screenStream;
//       screenStreamRef.current = screenStream;
//       setIsScreenSharing(true);

//       screenTrack.onended = () => {
//         const originalTrack = localStreamRef.current.getVideoTracks()[0];
//         const sender = peerRef.current.getSenders().find(s => s.track.kind === 'video');
//         if (sender) sender.replaceTrack(originalTrack);
//         screenVideoRef.current.srcObject = null;
//         setIsScreenSharing(false);
//       };
//     } catch (err) {
//       console.error('[ScreenShare] Error:', err);
//     }
//   }, []);

//   useEffect(() => {
//     const start = async () => {
//       try {

//         socketRef.current = socket;
//         // if (!socket.connected) {
//         //   console.log('socket conncect rtc');
//         //   socket.connect();
//         // }
//         connectSocketIfNeeded(roomId);

//         const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//         localStreamRef.current = stream;
//         if (localVideoRef.current) localVideoRef.current.srcObject = stream;

//         // console.log('[Join] Joining room:', roomId);
//         // socketRef.current.emit('join-room', { roomId });

//         // 🔁 Reconnect on socket connect (handles routing)
//         // socket.on('connect', () => {
//         //   console.log('[Socket] Reconnected:', socket.id);
//         //   socket.emit('join-room', { roomId });
//         // });

//         socketRef.current.on('user-joined', ({ socketId }) => {
//           console.log('[Signal] User joined:', socketId);
//           if (peerRef.current) return; // prevent duplicate

//           peerRef.current = createPeerConnection(socketId);
//           stream.getTracks().forEach(track => peerRef.current.addTrack(track, stream));

//           peerRef.current.createOffer()
//             .then(offer => peerRef.current.setLocalDescription(offer))
//             .then(() => {
//               console.log('[Offer] Sending offer to:', socketId);
//               socketRef.current.emit('send-offer', {
//                 offer: peerRef.current.localDescription,
//                 to: socketId,
//               });
//             })
//             .catch(err => console.error('[Offer] Error creating offer:', err));
//         });

//         socketRef.current.on('receive-offer', async ({ offer, from }) => {
//           console.log('[Offer] Received offer from:', from);
//           if (peerRef.current) return;

//           peerRef.current = createPeerConnection(from);
//           stream.getTracks().forEach(track => peerRef.current.addTrack(track, stream));

//           await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
//           console.log('[Offer] Set remote description');

//           const answer = await peerRef.current.createAnswer();
//           await peerRef.current.setLocalDescription(answer);
//           console.log('[Answer] Sending answer to:', from);

//           socketRef.current.emit('send-answer', {
//             answer: peerRef.current.localDescription,
//             to: from,
//           });

//           // Apply any buffered ICE candidates
//           for (const candidate of pendingCandidates.current) {
//             console.log('[ICE] Applying buffered candidate:', candidate);
//             await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
//           }
//           pendingCandidates.current = [];
//         });

//         socketRef.current.on('receive-answer', async ({ answer }) => {
//           console.log('[Answer] Received answer');
//           if (peerRef.current) {
//             await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
//             console.log('[Answer] Set remote description');
//           }
//         });

//         socketRef.current.on('receive-ice-candidate', async ({ candidate }) => {
//           console.log('[ICE] Received remote candidate:', candidate);
//           if (peerRef.current && peerRef.current.remoteDescription) {
//             try {
//               await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
//               console.log('[ICE] Candidate added successfully');
//             } catch (err) {
//               console.error('[ICE] Error adding candidate:', err);
//             }
//           } else {
//             console.log('[ICE] Candidate buffered');
//             pendingCandidates.current.push(candidate);
//           }
//         });

//         socketRef.current.on('user-left', () => {
//           console.log('[Signal] User left');
//           cleanupPeer();
//         });

//       } catch (err) {
//         console.error('[Init] WebRTC setup error:', err);
//       }
//     };

//     start();

//     return () => {
//       console.log('[Cleanup] Leaving room');
//       socketRef.current?.disconnect();
//       cleanupPeer();
//       localStreamRef.current?.getTracks().forEach(t => t.stop());
//       screenStreamRef.current?.getTracks().forEach(t => t.stop());
//     };
//   }, [roomId, createPeerConnection, cleanupPeer]);

//   return {
//     localVideoRef,
//     remoteVideoRef,
//     screenVideoRef,
//     toggleAudio,
//     shareScreen,
//     muted,
//     isScreenSharing,
//     isRemoteConnected,
//   };
// }

// import { useEffect, useRef, useState, useCallback } from 'react';
// import { socket } from '../socket';

// const ICE_SERVERS = {
//   iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
// };

// export default function useWebRTC(roomId) {
//   const localVideoRef = useRef(null);
//   const remoteVideoRef = useRef(null);
//   const screenVideoRef = useRef(null);
//   // const socketRef = useRef(null); //
//   // const stream = useRef(null);  //
//   const peerRef = useRef(null);
//   const localStreamRef = useRef(null);
//   const screenStreamRef = useRef(null);
//   const pendingCandidates = useRef([]);

//   const [muted, setMuted] = useState(false);
//   const [isScreenSharing, setIsScreenSharing] = useState(false);
//   const [isRemoteConnected, setIsRemoteConnected] = useState(false);

//   const cleanupPeer = useCallback(() => {
//     console.log('[Cleanup] Closing peer connection');
//     if (peerRef.current) {
//       peerRef.current.close();
//       peerRef.current = null;
//     }
//     if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
//     setIsRemoteConnected(false);
//   }, []);

//   const createPeerConnection = useCallback((targetSocketId) => {
//     console.log('[PeerConnection] Creating peer for:', targetSocketId);
//     const peer = new RTCPeerConnection(ICE_SERVERS);

//     peer.onicecandidate = ({ candidate }) => {
//       if (candidate) {
//         console.log('[ICE] Local candidate:', candidate);
//         socket.emit('send-ice-candidate', {
//           candidate,
//           to: targetSocketId,
//         });
//       }
//     };

//     peer.ontrack = (event) => {
//       console.log('[Track] Received remote track');
//       if (remoteVideoRef.current) {
//         remoteVideoRef.current.srcObject = event.streams[0];
//         setIsRemoteConnected(true);
//       }
//     };

//     peer.oniceconnectionstatechange = () => {
//       console.log('[ICE State] Changed to:', peer.iceConnectionState);
//       if (['disconnected', 'failed', 'closed'].includes(peer.iceConnectionState)) {
//         cleanupPeer();
//       }
//     };

//     return peer;
//   }, [cleanupPeer]);

//   const toggleAudio = useCallback(() => {
//     const audioTrack = localStreamRef.current?.getAudioTracks()[0];
//     if (audioTrack) {
//       audioTrack.enabled = !audioTrack.enabled;
//       setMuted(!audioTrack.enabled);
//     }
//   }, []);

//   const shareScreen = useCallback(async () => {
//     if (!peerRef.current) return;

//     try {
//       const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
//       const screenTrack = screenStream.getVideoTracks()[0];
//       const sender = peerRef.current.getSenders().find(s => s.track.kind === 'video');

//       if (sender) sender.replaceTrack(screenTrack);
//       screenVideoRef.current.srcObject = screenStream;
//       screenStreamRef.current = screenStream;
//       setIsScreenSharing(true);

//       screenTrack.onended = () => {
//         const originalTrack = localStreamRef.current.getVideoTracks()[0];
//         const sender = peerRef.current.getSenders().find(s => s.track.kind === 'video');
//         if (sender) sender.replaceTrack(originalTrack);
//         screenVideoRef.current.srcObject = null;
//         setIsScreenSharing(false);
//       };
//     } catch (err) {
//       console.error('[ScreenShare] Error:', err);
//     }
//   }, []);

//   useEffect(() => {
//     const start = async () => {
//       try {
//         if (!socket.connected) {
//           console.log('[Socket] Connecting...');
//           socket.connect();
//         }

//         socket.emit('join-room', { roomId });

//         try {
//           const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
//           localStreamRef.current = stream;
//           if (localVideoRef.current) localVideoRef.current.srcObject = stream;
//         } catch (err) {
//           console.error('[Media] Failed to get media:', err);
//           alert("Unable to access camera or mic. Please check browser permissions.");
//           return;
//         }

//         socket.on('user-joined', async ({ socketId }) => {
//           console.log('[Signal] User joined:', socketId);
//           if (peerRef.current) return;

//           peerRef.current = createPeerConnection(socketId);
//           localStreamRef.current.getTracks().forEach(track => {
//             peerRef.current.addTrack(track, localStreamRef.current);
//           });

//           const offer = await peerRef.current.createOffer();
//           await peerRef.current.setLocalDescription(offer);

//           console.log('[Offer] Sending offer to:', socketId);
//           socket.emit('send-offer', {
//             offer: peerRef.current.localDescription,
//             to: socketId,
//           });
//         });

//         // socket.on('receive-offer', async ({ offer, from }) => {
//         //   console.log('[Offer] Received offer from:', from);
//         //   if (peerRef.current) return;

//         //   peerRef.current = createPeerConnection(from);
//         //   localStreamRef.current.getTracks().forEach(track => {
//         //     peerRef.current.addTrack(track, localStreamRef.current);
//         //   });

//         //   await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
//         //   const answer = await peerRef.current.createAnswer();
//         //   await peerRef.current.setLocalDescription(answer);

//         //   console.log('[Answer] Sending answer to:', from);
//         //   socket.emit('send-answer', {
//         //     answer: peerRef.current.localDescription,
//         //     to: from,
//         //   });

//         //   for (const candidate of pendingCandidates.current) {
//         //     await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
//         //   }
//         //   pendingCandidates.current = [];
//         // });


//         socket.on('receive-offer', async ({ offer, from }) => {
//           console.log('[Offer] Received offer from:', from);
//           if (peerRef.current) return;

//           peerRef.current = createPeerConnection(from);
//           // stream.getTracks().forEach(track => peerRef.current.addTrack(track, stream));
//           localStreamRef.current.getTracks().forEach(track => {
//             peerRef.current.addTrack(track, localStreamRef.current);
//           });


//           await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
//           console.log('[Offer] Set remote description');

//           const answer = await peerRef.current.createAnswer();
//           await peerRef.current.setLocalDescription(answer);
//           console.log('[Answer] Sending answer to:', from);

//           socket.emit('send-answer', {
//             answer: peerRef.current.localDescription,
//             to: from,
//           });

//           // Apply any buffered ICE candidates
//           for (const candidate of pendingCandidates.current) {
//             console.log('[ICE] Applying buffered candidate:', candidate);
//             await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
//           }
//           pendingCandidates.current = [];
//         });

//         socket.on('receive-answer', async ({ answer }) => {
//           console.log('[Answer] Received answer');
//           if (peerRef.current) {
//             await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
//             console.log('[Answer] Set remote description');
//           }
//         });

//         socket.on('receive-ice-candidate', async ({ candidate }) => {
//           console.log('[ICE] Received candidate');
//           if (peerRef.current && peerRef.current.remoteDescription) {
//             try {
//               await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
//               console.log('[ICE] Added candidate');
//             } catch (err) {
//               console.error('[ICE] Error adding:', err);
//             }
//           } else {
//             console.log('[ICE] Buffering candidate');
//             pendingCandidates.current.push(candidate);
//           }
//         });

//         socket.on('user-left', ({ socketId }) => {
//           console.log('[Signal] User left:', socketId);
//           cleanupPeer();
//         });

//       } catch (err) {
//         console.error('[Init] WebRTC error:', err);
//       }
//     };

//     start();

//     return () => {
//       console.log('[Cleanup] useWebRTC cleanup');
//       socket.emit("leave-room", { roomId });
//       cleanupPeer();
//       localStreamRef.current?.getTracks().forEach(t => t.stop());
//       screenStreamRef.current?.getTracks().forEach(t => t.stop());

//       socket.off('user-joined');
//       socket.off('receive-offer');
//       socket.off('receive-answer');
//       socket.off('receive-ice-candidate');
//       socket.off('user-left');
//     };
//   }, [roomId, createPeerConnection, cleanupPeer]);

//   return {
//     localVideoRef,
//     remoteVideoRef,
//     screenVideoRef,
//     toggleAudio,
//     shareScreen,
//     muted,
//     isScreenSharing,
//     isRemoteConnected,
//   };
// }




//### new changes
import { useEffect, useRef, useState, useCallback } from 'react';
import { socket } from '../socket';

const ICE_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

export default function useWebRTC(roomId) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const pendingCandidates = useRef([]);

  const [muted, setMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isRemoteConnected, setIsRemoteConnected] = useState(false);

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
    console.log('[PeerConnection] Creating peer for:', targetSocketId);
    const peer = new RTCPeerConnection(ICE_SERVERS);

    peer.onicecandidate = ({ candidate }) => {
      if (candidate) {
        console.log('[ICE] Local candidate:', candidate);
        socket.emit('send-ice-candidate', { candidate, to: targetSocketId });
      }
    };

    peer.ontrack = (event) => {
      console.log('[Track] Remote track received');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setIsRemoteConnected(true);
      }
    };

    peer.oniceconnectionstatechange = () => {
      console.log('[ICE State] Changed to:', peer.iceConnectionState);
      if (['disconnected', 'failed', 'closed'].includes(peer.iceConnectionState)) {
        cleanupPeer();
      }
    };

    return peer;
  }, [cleanupPeer]);

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

  useEffect(() => {
    const start = async () => {
      try {
        if (!socket.connected) {
          console.log('[Socket] Reconnecting...');
          socket.connect();
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        console.log('[Media] Local stream set');

        socket.emit('join-room', { roomId });
        console.log('[Socket] Emitted join-room:', roomId);

        socket.on('user-joined', async ({ socketId }) => {
          console.log('[Signal] user-joined:', socketId);
          if (peerRef.current) return;

          peerRef.current = createPeerConnection(socketId);
          stream.getTracks().forEach(track => {
            peerRef.current.addTrack(track, stream);
          });

          const offer = await peerRef.current.createOffer();
          await peerRef.current.setLocalDescription(offer);
          console.log('[Offer] Sending offer to:', socketId);

          socket.emit('send-offer', {
            offer: peerRef.current.localDescription,
            to: socketId,
          });
        });

        socket.on('receive-offer', async ({ offer, from }) => {
          console.log('[Offer] Received offer from:', from);
          if (peerRef.current) return;

          peerRef.current = createPeerConnection(from);
          stream.getTracks().forEach(track => peerRef.current.addTrack(track, stream));

          await peerRef.current.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await peerRef.current.createAnswer();
          await peerRef.current.setLocalDescription(answer);

          console.log('[Answer] Sending answer to:', from);
          socket.emit('send-answer', {
            answer: peerRef.current.localDescription,
            to: from,
          });

          for (const candidate of pendingCandidates.current) {
            await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
          }
          pendingCandidates.current = [];
        });

        socket.on('receive-answer', async ({ answer }) => {
          console.log('[Answer] Received answer');
          if (peerRef.current) {
            await peerRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          }
        });

        socket.on('receive-ice-candidate', async ({ candidate }) => {
          if (peerRef.current && peerRef.current.remoteDescription) {
            try {
              await peerRef.current.addIceCandidate(new RTCIceCandidate(candidate));
              console.log('[ICE] Candidate added');
            } catch (err) {
              console.error('[ICE] Error adding candidate:', err);
            }
          } else {
            console.log('[ICE] Buffering ICE candidate');
            pendingCandidates.current.push(candidate);
          }
        });

        socket.on('user-left', ({ socketId }) => {
          console.log('[Signal] user-left:', socketId);
          cleanupPeer();
        });

      } catch (err) {
        console.error('[Init] WebRTC error:', err);
      }
    };

    start();

    return () => {
      console.log('[Cleanup] useWebRTC cleanup');
      socket.emit('leave-room', { roomId });
      cleanupPeer();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());

      socket.off('user-joined');
      socket.off('receive-offer');
      socket.off('receive-answer');
      socket.off('receive-ice-candidate');
      socket.off('user-left');
    };
  }, [roomId, createPeerConnection, cleanupPeer]);

  return {
    localVideoRef,
    remoteVideoRef,
    screenVideoRef,
    toggleAudio,
    shareScreen,
    muted,
    isScreenSharing,
    isRemoteConnected,
  };
}
