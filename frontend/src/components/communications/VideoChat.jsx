import { useEffect, useRef, useState, useCallback } from "react";
import Peer from "peerjs";
import PropTypes from "prop-types";
import {
  FaVideo,
  FaVideoSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaSync,
  FaGripVertical,
  FaTimes,
} from "react-icons/fa";
import { useSocket } from "../../contexts/SocketContext";

const VideoChat = ({ sessionId, userId }) => {
  const { socket } = useSocket();
  const [peers, setPeers] = useState(new Map());
  const [stream, setStream] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [error, setError] = useState(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isUnmountingRef = useRef(false);
  const [position, setPosition] = useState({
    x: window.innerWidth - 320,
    y: window.innerHeight - 400,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [isCollapsed, setIsCollapsed] = useState(true);
  const participantCount = peers?.length || 0;

  const initializeVideoChat = useCallback(async () => {
    try {
      // 1. Get user media stream
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);

      // 2. Initialize PeerJS
      const peer = new Peer(`${sessionId}-${userId}-${Date.now()}`, {
        host: import.meta.env.VITE_PEER_HOST || "localhost",
        port: Number(import.meta.env.VITE_PEER_PORT) || 9000,
        path: "/myapp",
      });

      peerRef.current = peer;

      // 3. Handle peer open event
      peer.on("open", (peerId) => {
        console.log("My peer ID is:", peerId);
        if (socket) {
          socket.emit("join-video", {
            sessionId,
            userId,
            peerId,
          });
        }
      });

      // 4. Handle incoming calls
      peer.on("call", (call) => {
        console.log("Receiving call from:", call.peer);
        call.answer(streamRef.current);

        call.on("stream", (remoteStream) => {
          console.log("Received remote stream from:", call.peer);
          setPeers((prev) => new Map(prev).set(call.peer, remoteStream));
        });

        call.on("close", () => {
          console.log("Call closed with:", call.peer);
          setPeers((prev) => {
            const newPeers = new Map(prev);
            newPeers.delete(call.peer);
            return newPeers;
          });
        });
      });

      // 5. Handle socket events for peer connections
      if (socket) {
        socket.on("user-joined", ({ peerId: newPeerId }) => {
          console.log("New user joined with peer ID:", newPeerId);
          if (newPeerId !== peer.id && streamRef.current) {
            const call = peer.call(newPeerId, streamRef.current);

            call.on("stream", (remoteStream) => {
              console.log("Received stream from new user:", newPeerId);
              setPeers((prev) => new Map(prev).set(newPeerId, remoteStream));
            });
          }
        });

        socket.on("user-left", ({ peerId }) => {
          console.log("User left:", peerId);
          setPeers((prev) => {
            const newPeers = new Map(prev);
            newPeers.delete(peerId);
            return newPeers;
          });
        });
      }
    } catch (err) {
      console.error("Error initializing video chat:", err);
      setError(err.message);
    }
  }, [sessionId, userId, socket]);

  useEffect(() => {
    isUnmountingRef.current = false;
    let peerInstance = null;

    const setupPeerAndSocket = async () => {
      try {
        // 1. Get user media stream
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        streamRef.current = mediaStream;
        setStream(mediaStream);

        // 2. Initialize PeerJS
        const peer = new Peer(`${sessionId}-${userId}-${Date.now()}`, {
          host: import.meta.env.VITE_PEER_HOST || "localhost",
          port: Number(import.meta.env.VITE_PEER_PORT) || 9000,
          path: "/myapp",
        });

        peerInstance = peer;
        peerRef.current = peer;

        // Set up peer event handlers
        peer.on("open", (peerId) => {
          console.log("My peer ID is:", peerId);
          if (socket && !isUnmountingRef.current) {
            socket.emit("join-video", {
              sessionId,
              userId,
              peerId,
            });
          }
        });

        peer.on("call", (call) => {
          console.log("Receiving call from:", call.peer);
          if (streamRef.current) {
            call.answer(streamRef.current);
          }

          call.on("stream", (remoteStream) => {
            if (!isUnmountingRef.current) {
              console.log("Received remote stream from:", call.peer);
              setPeers((prev) => new Map(prev).set(call.peer, remoteStream));
            }
          });

          call.on("close", () => {
            if (!isUnmountingRef.current) {
              console.log("Call closed with:", call.peer);
              setPeers((prev) => {
                const newPeers = new Map(prev);
                newPeers.delete(call.peer);
                return newPeers;
              });
            }
          });
        });
      } catch (err) {
        console.error("Error initializing video chat:", err);
        setError(err.message);
      }
    };

    // Define socket event handlers
    const handleUserJoined = ({ peerId: newPeerId }) => {
      console.log("New user joined with peer ID:", newPeerId);
      if (
        peerRef.current &&
        newPeerId !== peerRef.current.id &&
        streamRef.current &&
        !isUnmountingRef.current
      ) {
        const call = peerRef.current.call(newPeerId, streamRef.current);

        call.on("stream", (remoteStream) => {
          if (!isUnmountingRef.current) {
            console.log("Received stream from new user:", newPeerId);
            setPeers((prev) => new Map(prev).set(newPeerId, remoteStream));
          }
        });
      }
    };

    const handleUserLeft = ({ peerId }) => {
      console.log("User left:", peerId);
      if (!isUnmountingRef.current) {
        setPeers((prev) => {
          const newPeers = new Map(prev);
          newPeers.delete(peerId);
          return newPeers;
        });
      }
    };

    // Set up everything if socket is available
    if (socket) {
      // First register socket event listeners
      socket.on("user-joined", handleUserJoined);
      socket.on("user-left", handleUserLeft);

      // Then initialize peer and stream
      setupPeerAndSocket();
    }

    // Cleanup function
    return () => {
      console.log("VideoChat component unmounting, cleaning up resources");
      isUnmountingRef.current = true;

      // 1. Remove socket listeners first
      if (socket) {
        socket.off("user-joined", handleUserJoined);
        socket.off("user-left", handleUserLeft);

        // 2. Notify server we're leaving
        if (peerRef.current) {
          console.log(
            "Emitting leave-video event with peerId:",
            peerRef.current.id
          );
          socket.emit("leave-video", {
            sessionId,
            userId,
            peerId: peerRef.current.id,
          });
        }
      }

      // 3. Clean up peer connections
      setPeers(new Map()); // Clear peers state

      // 4. Stop all tracks in the media stream
      if (streamRef.current) {
        console.log("Stopping all media tracks");
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
          console.log(`Stopped ${track.kind} track`);
        });
        streamRef.current = null;
      }

      // 5. Destroy peer after a small delay to ensure events are processed
      if (peerRef.current) {
        const peerToDestroy = peerRef.current;
        console.log("Destroying peer connection:", peerToDestroy.id);

        // Use setTimeout to ensure leave-video event is processed first
        setTimeout(() => {
          try {
            peerToDestroy.destroy();
            console.log("Peer destroyed successfully");
          } catch (err) {
            console.error("Error destroying peer:", err);
          }
        }, 100);

        peerRef.current = null;
      }

      // 6. Clear any pending timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [sessionId, userId, socket]);

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
    if (e.target.closest(".video-controls")) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;

      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;

      // Get window dimensions and container dimensions
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const containerWidth = dragRef.current.offsetWidth;
      const containerHeight = dragRef.current.offsetHeight;

      // Keep video within window bounds
      const boundedX = Math.min(
        Math.max(0, newX),
        windowWidth - containerWidth
      );
      const boundedY = Math.min(
        Math.max(0, newY),
        windowHeight - containerHeight
      );

      setPosition({ x: boundedX, y: boundedY });
    },
    [isDragging]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  return (
    <div
      className={`video-chat-container ${isCollapsed ? "collapsed" : ""}`}
      data-count={participantCount}
      onClick={() => isCollapsed && setIsCollapsed(false)}
      ref={dragRef}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        cursor: isDragging ? "grabbing" : "grab",
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
          className={`control-button ${!videoEnabled ? "disabled" : ""}`}
          title={videoEnabled ? "Disable Video" : "Enable Video"}
        >
          {videoEnabled ? <FaVideo /> : <FaVideoSlash />}
        </button>
        <button
          onClick={toggleAudio}
          className={`control-button ${!audioEnabled ? "disabled" : ""}`}
          title={audioEnabled ? "Disable Audio" : "Enable Audio"}
        >
          {audioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>
      </div>

      <div className="video-grid">
        {/* Local video */}
        <div className="video-container local">
          {stream && (
            <video
              ref={(video) => {
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
              ref={(video) => {
                if (video) video.srcObject = peerStream;
              }}
              autoPlay
              playsInline
            />
            <div className="video-label">Participant</div>
          </div>
        ))}
      </div>

      {error && <div className="video-error">Error: {error}</div>}

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
  userId: PropTypes.string.isRequired,
};

export default VideoChat;
