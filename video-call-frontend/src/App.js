
import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import VideoPlayer from './components/VideoPlayer';
import ChatBox from './components/ChatBox';
import './App.css';

const socket = io('http://localhost:3000');

function App() {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [messages, setMessages] = useState([]);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});

  useEffect(() => {
    // Initialize local video stream
    const initLocalStream = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        setError('Failed to access camera or microphone. Please check permissions.');
        console.error('Error accessing media devices:', err);
      }
    };

    initLocalStream();

    // Socket.IO event handlers
    socket.on('user-joined', async (userId) => {
      const peerConnection = createPeerConnection(userId);
      peerConnectionsRef.current[userId] = peerConnection;
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      socket.emit('offer', { offer, to: userId, roomId });
    });

    socket.on('offer', async ({ offer, from }) => {
      const peerConnection = createPeerConnection(from);
      peerConnectionsRef.current[from] = peerConnection;
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('answer', { answer, to: from, roomId });
    });

    socket.on('answer', async ({ answer, from }) => {
      const peerConnection = peerConnectionsRef.current[from];
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('ice-candidate', async ({ candidate, from }) => {
      const peerConnection = peerConnectionsRef.current[from];
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on('user-disconnected', (userId) => {
      if (peerConnectionsRef.current[userId]) {
        peerConnectionsRef.current[userId].close();
        delete peerConnectionsRef.current[userId];
        setRemoteStreams((prev) => prev.filter((stream) => stream.userId !== userId));
      }
    });

    socket.on('chat-message', ({ username, message }) => {
      setMessages((prev) => [...prev, { username, message }]);
    });

    return () => {
      socket.disconnect();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [roomId]);

  const createPeerConnection = (userId) => {
    const peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { candidate: event.candidate, to: userId, roomId });
      }
    };

    peerConnection.ontrack = (event) => {
      setRemoteStreams((prev) => {
        if (!prev.some((stream) => stream.userId === userId)) {
          return [...prev, { userId, stream: event.streams[0] }];
        }
        return prev;
      });
    };

    localStreamRef.current.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStreamRef.current);
    });

    return peerConnection;
  };

  const joinRoom = () => {
    if (!roomId.trim() || !username.trim()) {
      setError('Please enter both a room ID and username.');
      return;
    }
    setError('');
    socket.emit('join-room', roomId);
    setJoined(true);
  };

  const sendMessage = (message) => {
    if (message.trim()) {
      socket.emit('chat-message', { username, message, roomId });
      setMessages((prev) => [...prev, { username, message }]);
    }
  };

  return (
    <div className="container-fluid min-vh-100 bg-light d-flex flex-column align-items-center py-4">
      <h1 className="mb-4 text-center">Video Call App</h1>
      {error && <div className="alert alert-danger w-100 w-md-50">{error}</div>}
      {!joined ? (
        <div className="card w-100 w-md-50 p-4">
          <div className="mb-3">
            <label htmlFor="username" className="form-label">Username</label>
            <input
              type="text"
              className="form-control"
              id="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label htmlFor="roomId" className="form-label">Room ID</label>
            <input
              type="text"
              className="form-control"
              id="roomId"
              placeholder="Enter room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
          </div>
          <button className="btn btn-primary" onClick={joinRoom}>
            Join Room
          </button>
        </div>
      ) : (
        <div className="w-100 position-relative">
          <h2 className="text-center mb-3">Room: {roomId}</h2>
          <div className="row row-cols-1 row-cols-md-2 g-4">
            <div className="col">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title">Your Video</h5>
                  <VideoPlayer videoRef={localVideoRef} muted={true} />
                </div>
              </div>
            </div>
            {remoteStreams.map(({ userId, stream }) => (
              <div className="col" key={userId}>
                <div className="card">
                  <div className="card-body">
                    <h5 className="card-title">User: {userId}</h5>
                    <VideoPlayer stream={stream} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <ChatBox messages={messages} sendMessage={sendMessage} username={username} />
        </div>
      )}
    </div>
  );
}

export default App;
