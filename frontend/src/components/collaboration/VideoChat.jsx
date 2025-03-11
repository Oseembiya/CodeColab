import { useEffect, useRef, useState, useCallback } from 'react';
import Peer from 'peerjs';
import PropTypes from 'prop-types';
import { FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash, FaSync, FaGripVertical } from 'react-icons/fa';

const VideoChat = ({ sessionId, userId }) => {
  const [peers, setPeers] = useState(new Map());
  const [stream, setStream] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [error, setError] = useState(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isUnmountingRef = useRef(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: window.innerHeight - 400 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });

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

  const initializePeer = useCallback(async () => {
    if (isUnmountingRef.current) return;

    cleanupPeer();

    try {
      setConnectionStatus('connecting');
      setError(null);

      const peer = new Peer(generatePeerId(), {
        host: import.meta.env.VITE_PEER_HOST || 'localhost',
        port: Number(import.meta.env.VITE_PEER_PORT) || 9000,
        path: '/myapp',
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        },
        // Add retry options
        retryOptions: {
          maxAttempts: 3,
          delay: 1000
        }
      });

      // Store the peer instance
      peerRef.current = peer;

      // Set up event listeners
      peer.on('open', (id) => {
        if (!isUnmountingRef.current) {
          console.log('Connected to peer server with ID:', id);
          setConnectionStatus('connected');
        }
      });

      peer.on('error', (err) => {
        if (!isUnmountingRef.current) {
          console.error('Peer error:', err);
          setError(err.message);
          setConnectionStatus('error');

          // Only attempt reconnection for specific errors
          if (err.type === 'network' || err.type === 'disconnected') {
            setTimeout(() => {
              if (!isUnmountingRef.current) {
                console.log('Attempting to reconnect...');
                initializePeer();
              }
            }, 5000);
          }
        }
      });

      peer.on('disconnected', () => {
        if (!isUnmountingRef.current) {
          console.log('Disconnected from peer server');
          setConnectionStatus('disconnected');
          
          // Attempt to reconnect
          setTimeout(() => {
            if (!isUnmountingRef.current && peerRef.current) {
              console.log('Attempting to reconnect...');
              peer.reconnect();
            }
          }, 2000);
        }
      });

      // Initialize media stream
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      if (!isUnmountingRef.current) {
        setStream(mediaStream);
        streamRef.current = mediaStream;

        // Handle incoming calls
        peer.on('call', (call) => {
          call.answer(mediaStream);
          
          call.on('stream', (remoteStream) => {
            if (!isUnmountingRef.current) {
              setPeers(prev => new Map(prev).set(call.peer, remoteStream));
            }
          });

          call.on('close', () => {
            if (!isUnmountingRef.current) {
              setPeers(prev => {
                const newPeers = new Map(prev);
                newPeers.delete(call.peer);
                return newPeers;
              });
            }
          });

          call.on('error', (error) => {
            console.error('Call error:', error);
          });
        });
      }

    } catch (err) {
      if (!isUnmountingRef.current) {
        console.error('Failed to initialize peer:', err);
        setError(err.message);
        setConnectionStatus('error');
      }
    }
  }, [sessionId, userId, generatePeerId, cleanupPeer]);

  useEffect(() => {
    isUnmountingRef.current = false;
    initializePeer();

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
    };
  }, [initializePeer]);

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
      className={`video-chat-container ${isDragging ? 'dragging' : ''}`}
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
            <div className="video-label">Peer</div>
          </div>
        ))}
      </div>
    </div>
  );
};

VideoChat.propTypes = {
  sessionId: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired
};

export default VideoChat; 