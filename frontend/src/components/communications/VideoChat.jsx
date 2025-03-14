import { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'peerjs';
import PropTypes from 'prop-types';
import { FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash, FaSync, FaGripVertical, FaTimes } from 'react-icons/fa';
import io from 'socket.io-client';

const VideoChat = ({ sessionId, userId }) => {
  const [peers, setPeers] = useState(new Map());
  const [stream, setStream] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const peerRef = useRef(null);
  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isUnmountingRef = useRef(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: window.innerHeight - 400 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [activeColor, setActiveColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const participantCount = peers?.length || 0;

  const cleanupPeer = useCallback(() => {
    if (peerRef.current) {
      try {
        // Remove all event listeners first
        peerRef.current.removeAllListeners();
        
        // Close any existing connections
        peerRef.current.disconnect();
        
        // Destroy the peer after a short delay
        setTimeout(() => {
          if (peerRef.current && !isUnmountingRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
          }
        }, 100);
      } catch (err) {
        console.warn('Cleanup warning:', err);
      }
    }
  }, []);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      try {
        const tracks = streamRef.current.getTracks();
        tracks.forEach(track => {
          track.stop();
          streamRef.current.removeTrack(track);
        });
        streamRef.current = null;
      } catch (err) {
        console.warn('Stream cleanup warning:', err);
      }
    }
  }, []);

  const generatePeerId = useCallback(() => {
    // Generate a unique peer ID using timestamp and random string
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${sessionId}-${userId}-${timestamp}-${random}`;
  }, [sessionId, userId]);

  const initializeVideoChat = useCallback(async () => {
    try {
      // 1. Initialize Socket.IO connection
      socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
        transports: ['websocket', 'polling']
      });

      // 2. Get user media stream
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);

      // 3. Initialize PeerJS
      const peer = new Peer(`${sessionId}-${userId}-${Date.now()}`, {
        host: import.meta.env.VITE_PEER_HOST || 'localhost',
        port: Number(import.meta.env.VITE_PEER_PORT) || 9000,
        path: '/myapp'
      });

      peerRef.current = peer;

      // 4. Handle peer open event
      peer.on('open', (peerId) => {
        console.log('My peer ID is:', peerId);
        socketRef.current.emit('join-video', {
          sessionId,
          userId,
          peerId
        });
      });

      // 5. Handle incoming calls
      peer.on('call', (call) => {
        console.log('Receiving call from:', call.peer);
        call.answer(streamRef.current);
        
        call.on('stream', (remoteStream) => {
          console.log('Received remote stream from:', call.peer);
          setPeers(prev => new Map(prev).set(call.peer, remoteStream));
        });

        call.on('close', () => {
          console.log('Call closed with:', call.peer);
          setPeers(prev => {
            const newPeers = new Map(prev);
            newPeers.delete(call.peer);
            return newPeers;
          });
        });
      });

      // 6. Handle socket events
      socketRef.current.on('user-joined', ({ peerId: newPeerId }) => {
        console.log('New user joined with peer ID:', newPeerId);
        if (newPeerId !== peer.id && streamRef.current) {
          const call = peer.call(newPeerId, streamRef.current);
          
          call.on('stream', (remoteStream) => {
            console.log('Received stream from new user:', newPeerId);
            setPeers(prev => new Map(prev).set(newPeerId, remoteStream));
          });
        }
      });

      socketRef.current.on('user-left', ({ peerId }) => {
        console.log('User left:', peerId);
        setPeers(prev => {
          const newPeers = new Map(prev);
          newPeers.delete(peerId);
          return newPeers;
        });
      });

    } catch (err) {
      console.error('Error initializing video chat:', err);
      setError(err.message);
    }
  }, [sessionId, userId]);

  useEffect(() => {
    isUnmountingRef.current = false;
    initializeVideoChat();

    return () => {
      isUnmountingRef.current = true;
      
      // Clean up media streams
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Clean up peer connection
      if (peerRef.current) {
        peerRef.current.destroy();
      }
      
      // Clear any pending reconnection attempts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      // Clean up socket connection
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [initializeVideoChat]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
      withCredentials: true
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setError('Connection error. Please try again.');
    });

    socket.on('connect', () => {
      console.log('Socket connected successfully');
      setError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      if (reason === 'io server disconnect') {
        // Reconnect manually if server disconnected
        socket.connect();
      }
    });

    // Clean up on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled;
        setVideoEnabled(!videoEnabled);
      }
    }
  };

  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled;
        setAudioEnabled(!audioEnabled);
      }
    }
  };

  const handleMouseDown = (e) => {
    if (e.target.closest('.video-controls')) return;
    
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStartRef.current.x;
    const newY = e.clientY - dragStartRef.current.y;

    // Get window dimensions and container dimensions
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const containerWidth = dragRef.current.offsetWidth;
    const containerHeight = dragRef.current.offsetHeight;

    // Keep video within window bounds
    const boundedX = Math.min(Math.max(0, newX), windowWidth - containerWidth);
    const boundedY = Math.min(Math.max(0, newY), windowHeight - containerHeight);

    setPosition({ x: boundedX, y: boundedY });
  }, [isDragging]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  return (
    <div 
      className={`video-chat-container ${isCollapsed ? 'collapsed' : ''}`}
      data-count={participantCount}
      onClick={() => isCollapsed && setIsCollapsed(false)}
      ref={dragRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? 'grabbing' : 'grab'
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
      }}
    >
      <div className="video-drag-handle">
        <FaGripVertical />
      </div>
      <div className="video-controls">
        <button 
          onClick={toggleVideo}
          className={`control-button ${!videoEnabled ? 'disabled' : ''}`}
          title={videoEnabled ? 'Disable Video' : 'Enable Video'}
        >
          {videoEnabled ? <FaVideo /> : <FaVideoSlash />}
        </button>
        <button 
          onClick={toggleAudio}
          className={`control-button ${!audioEnabled ? 'disabled' : ''}`}
          title={audioEnabled ? 'Disable Audio' : 'Enable Audio'}
        >
          {audioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>
      </div>

      <div className="video-grid">
        {/* Local video */}
        <div className="video-container local">
          {stream && (
            <video
              ref={video => {
                if (video) {
                  video.srcObject = stream;
                  video.muted = true; // Mute local video to prevent feedback
                }
              }}
              autoPlay
              playsInline
            />
          )}
          <div className="video-label">You</div>
        </div>

        {/* Remote videos */}
        {Array.from(peers.entries()).map(([peerId, peerStream]) => (
          <div key={peerId} className="video-container">
            <video
              ref={video => {
                if (video) video.srcObject = peerStream;
              }}
              autoPlay
              playsInline
            />
            <div className="video-label">Participant</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="video-error">
          Error: {error}
        </div>
      )}

      {!isCollapsed && (
        <button 
          className="collapse-button"
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(true);
          }}
        >
          <FaTimes />
        </button>
      )}
    </div>
  );
};

VideoChat.propTypes = {
  sessionId: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired
};

export default VideoChat; 