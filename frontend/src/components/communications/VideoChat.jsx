import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Peer from "peerjs";
import PropTypes from "prop-types";
import {
  FaVideo,
  FaVideoSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaGripVertical,
  FaTimes,
} from "react-icons/fa";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../hooks/useAuth";
import RemoteVideo from "./RemoteVideo";

const VideoChat = ({ sessionId, userId }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
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
  const participantCount = peers.size + 1; // Add 1 to include the local user

  // Refs for dragging
  const dragPositionRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const animFrameRef = useRef(null);
  const [initialSetupDone, setInitialSetupDone] = useState(false);

  useEffect(() => {
    setInitialSetupDone(true);
  }, []);

  // Helper function to add peer to state
  const addPeerToState = (peerId, stream, userName) => {
    if (isUnmountingRef.current) return;

    // Ensure we have a friendly display name
    const friendlyName = ensureFriendlyName(peerId, userName);

    setPeers((prev) =>
      new Map(prev).set(peerId, {
        stream,
        label: friendlyName,
      })
    );
  };

  // Helper function to ensure we show a friendly name
  const ensureFriendlyName = (peerId, providedName) => {
    // Extract userId from peerId (format: sessionId-userId-timestamp)
    const peerIdParts = peerId.split("-");
    const extractedUserId = peerIdParts.length > 1 ? peerIdParts[1] : null;

    // Try all options for a friendly name
    const friendlyName =
      // 1. Use the provided name first
      providedName ||
      // 2. Check if we have a stored name for this peer
      localStorage.getItem(`remoteUser-${peerId}`) ||
      // 3. Use a name stored by userId (more stable than peerId)
      (extractedUserId && localStorage.getItem(`user-${extractedUserId}`)) ||
      // 4. Default to User-XXXXX format
      `User-${(extractedUserId || peerId).substring(0, 6)}`;

    // Store this name for future reference if it's not a generic one
    if (friendlyName && !friendlyName.startsWith("User-") && extractedUserId) {
      localStorage.setItem(`user-${extractedUserId}`, friendlyName);
    }

    return friendlyName;
  };

  // Helper function to remove peer from state
  const removePeerFromState = (peerId) => {
    if (isUnmountingRef.current) return;
    setPeers((prev) => {
      const newPeers = new Map(prev);
      newPeers.delete(peerId);
      return newPeers;
    });
  };

  useEffect(() => {
    isUnmountingRef.current = false;

    const setupPeerAndSocket = async () => {
      try {
        // 1. Get user media stream
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
            channelCount: 2,
            latency: 0.01,
            highpassFilter: true,
            volume: 1.0,
          },
        });

        streamRef.current = mediaStream;
        setStream(mediaStream);

        // 2. Initialize PeerJS
        const peer = new Peer(`${sessionId}-${userId}-${Date.now()}`, {
          host: import.meta.env.VITE_PEER_HOST || "localhost",
          port: Number(import.meta.env.VITE_PEER_PORT) || 9000,
          path: "/myapp",
          debug: 1, // Reduced debug level
          config: {
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" },
              { urls: "stun:stun2.l.google.com:19302" },
            ],
            sdpTransform: (sdp) => {
              return sdp.replace(
                "useinbandfec=1",
                "useinbandfec=1; stereo=1; maxaveragebitrate=512000"
              );
            },
          },
          pingInterval: 5000,
          retryAttempts: 5,
          iceTransportPolicy: "all",
        });

        peerRef.current = peer;

        // Error handling
        peer.on("error", (err) => {
          console.error("Peer error:", err.type);
          setError(`Peer error: ${err.type}`);

          if (err.type === "network" || err.type === "disconnected") {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(() => {
              if (!isUnmountingRef.current && peerRef.current) {
                if (peerRef.current.disconnected) {
                  peerRef.current.reconnect();
                }
              }
            }, 3000);
          }
        });

        peer.on("disconnected", () => {
          if (!isUnmountingRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(() => {
              if (peerRef.current && !isUnmountingRef.current) {
                if (peerRef.current.disconnected) {
                  peerRef.current.reconnect();
                }
              }
            }, 2000);
          }
        });

        peer.on("close", () => {
          console.error("Peer connection closed");
        });

        // Connect to server when peer is ready
        peer.on("open", (peerId) => {
          if (socket && !isUnmountingRef.current) {
            const userName =
              user?.displayName ||
              user?.email?.split("@")[0] ||
              localStorage.getItem("userName") ||
              sessionStorage.getItem("userName") ||
              `User-${userId.substring(0, 6)}`;

            // Store in localStorage for consistency across sessions
            if (
              !localStorage.getItem("userName") &&
              userName !== `User-${userId.substring(0, 6)}`
            ) {
              localStorage.setItem("userName", userName);
              localStorage.setItem(`user-${userId}`, userName);
            }

            socket.emit("join-video", {
              sessionId,
              userId,
              peerId,
              userName,
            });
          }
        });

        // Handle incoming calls
        peer.on("call", (call) => {
          if (streamRef.current) {
            call.answer(streamRef.current);
          }

          call.on("stream", (remoteStream) => {
            const peerIdParts = call.peer.split("-");
            const remoteUserId =
              peerIdParts.length > 1 ? peerIdParts[1] : "unknown";

            // Get the socket-provided name or use a more friendly fallback
            const name =
              localStorage.getItem(`remoteUser-${call.peer}`) ||
              `User-${remoteUserId.substring(0, 6)}`;

            addPeerToState(call.peer, remoteStream, name);
          });

          call.on("close", () => {
            removePeerFromState(call.peer);
          });
        });
      } catch (err) {
        console.error("Error initializing video chat:", err);
        setError(err.message);
      }
    };

    // Socket event handlers
    const handleUserJoined = ({
      peerId: newPeerId,
      userId: remoteUserId,
      name,
    }) => {
      // Store the remote user's name for future reference
      if (name && name !== `User-${remoteUserId.substring(0, 6)}`) {
        localStorage.setItem(`remoteUser-${newPeerId}`, name);
        // Also store by userId for more stability (peerId changes between sessions)
        localStorage.setItem(`user-${remoteUserId}`, name);
      }

      if (
        peerRef.current &&
        newPeerId !== peerRef.current.id &&
        streamRef.current &&
        !isUnmountingRef.current
      ) {
        const call = peerRef.current.call(newPeerId, streamRef.current);

        call.on("error", (err) => {
          console.error("Call error:", err);
        });

        call.on("iceStateChanged", (state) => {
          if (state === "failed" || state === "disconnected") {
            setTimeout(() => {
              if (peerRef.current && !isUnmountingRef.current) {
                const newCall = peerRef.current.call(
                  newPeerId,
                  streamRef.current
                );

                newCall.on("stream", (recoveredStream) => {
                  addPeerToState(newPeerId, recoveredStream, name);
                });
              }
            }, 2000);
          }
        });

        call.on("stream", (remoteStream) => {
          // Enable audio tracks
          const audioTracks = remoteStream.getAudioTracks();
          if (audioTracks.length > 0) {
            audioTracks[0].enabled = true;
          }

          // Use our ensureFriendlyName function for consistent naming
          const friendlyName = ensureFriendlyName(newPeerId, name);

          addPeerToState(newPeerId, remoteStream, friendlyName);
        });
      }
    };

    const handleUserLeft = ({ peerId, userId }) => {
      // Clean up the localStorage entries for this peer
      localStorage.removeItem(`remoteUser-${peerId}`);

      // Don't remove user-{userId} references as they're useful across sessions
      // But we could clear them if we knew the user account was deleted

      // Existing code to remove peer from state
      removePeerFromState(peerId);
    };

    // Set up everything if socket is available
    if (socket) {
      socket.on("user-joined", handleUserJoined);
      socket.on("user-left", handleUserLeft);

      socket.on("existing-video-participants", ({ participants }) => {
        if (peerRef.current && streamRef.current && !isUnmountingRef.current) {
          participants.forEach(({ peerId, name, userId: remoteUserId }) => {
            // Store name reference right away if it's a valid name
            if (name && name !== `User-${remoteUserId.substring(0, 6)}`) {
              localStorage.setItem(`remoteUser-${peerId}`, name);
              localStorage.setItem(`user-${remoteUserId}`, name);
            }

            const call = peerRef.current.call(peerId, streamRef.current);

            call.on("stream", (remoteStream) => {
              const audioTracks = remoteStream.getAudioTracks();
              if (audioTracks.length > 0) {
                audioTracks[0].enabled = true;
              }

              const friendlyName = ensureFriendlyName(peerId, name);

              addPeerToState(peerId, remoteStream, friendlyName);
            });
          });
        }
      });

      setupPeerAndSocket();
    }

    // Cleanup function
    return () => {
      isUnmountingRef.current = true;

      // Remove socket listeners
      if (socket) {
        socket.off("user-joined", handleUserJoined);
        socket.off("user-left", handleUserLeft);
        socket.off("existing-video-participants");

        // Notify server we're leaving
        if (peerRef.current) {
          socket.emit("leave-video", {
            sessionId,
            userId,
            peerId: peerRef.current.id,
          });
        }
      }

      // Clear peers state
      setPeers(new Map());

      // Stop media tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
        streamRef.current = null;
      }

      // Destroy peer connection
      if (peerRef.current) {
        const peerToDestroy = peerRef.current;
        setTimeout(() => {
          try {
            peerToDestroy.destroy();
          } catch (err) {
            console.error("Error destroying peer:", err);
          }
        }, 100);
        peerRef.current = null;
      }

      // Clear timeouts
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [sessionId, userId, socket, user?.displayName]);

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
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  // Use requestAnimationFrame for dragging to avoid forced reflow
  const handleMouseMove = useCallback(
    (e) => {
      if (!isDraggingRef.current) return;

      // Cancel any pending animation frame
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      // Schedule position update on next animation frame
      animFrameRef.current = requestAnimationFrame(() => {
        if (!dragRef.current) return;

        // Calculate new position directly from the initial drag offset
        const newX = e.clientX - dragStartRef.current.x;
        const newY = e.clientY - dragStartRef.current.y;

        // Get container dimensions
        const containerRect = dragRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // Apply boundaries
        const boundedX = Math.max(
          0,
          Math.min(newX, viewportWidth - containerRect.width)
        );
        const boundedY = Math.max(
          0,
          Math.min(newY, viewportHeight - containerRect.height)
        );

        // Update position state
        setPosition({
          x: boundedX,
          y: boundedY,
        });
      });
    },
    [isDragging]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
    isDraggingRef.current = false;

    // Cancel any pending animation frames
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  };

  // Add event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  // Clean up animation frame on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  // Memoize the peers list to prevent unnecessary re-renders
  const memoizedPeers = useMemo(() => {
    return Array.from(peers.entries()).map(([peerId, peerData]) => [
      peerId,
      peerData.stream || peerData, // Handle both new format and legacy format
      peerData.label || `User-${peerId.substring(0, 6)}`, // Ensure label is always populated
    ]);
  }, [peers]);

  return (
    <div
      className={`video-chat-container ${isCollapsed ? "collapsed" : ""} ${
        isDragging ? "dragging" : ""
      }`}
      data-count={participantCount}
      onClick={() => isCollapsed && setIsCollapsed(false)}
      ref={dragRef}
      style={{
        "--x": `${position.x}px`,
        "--y": `${position.y}px`,
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

      <div className="audio-device-selector">
        <select
          onChange={(e) => {
            if (streamRef.current) {
              navigator.mediaDevices
                .getUserMedia({
                  video: true,
                  audio: {
                    deviceId: { exact: e.target.value },
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 48000,
                    channelCount: 2,
                  },
                })
                .then((newStream) => {
                  const audioTrack = newStream.getAudioTracks()[0];
                  const oldTrack = streamRef.current.getAudioTracks()[0];
                  streamRef.current.removeTrack(oldTrack);
                  streamRef.current.addTrack(audioTrack);
                });
            }
          }}
        >
          {/* Dynamically populate with available audio devices */}
        </select>
      </div>

      <div className="volume-control">
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          defaultValue="1"
          onChange={(e) => {
            // Cache the volume value
            const volume = e.target.value;

            // Use requestAnimationFrame to batch DOM updates
            requestAnimationFrame(() => {
              // Update volume for all remote videos
              document
                .querySelectorAll(".video-container:not(.local) video")
                .forEach((video) => {
                  video.volume = volume;
                });
            });
          }}
        />
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
        <div className="remote-videos">
          {memoizedPeers.map(([peerId, peerStream, participantName]) => (
            <RemoteVideo
              key={peerId}
              peerId={peerId}
              peerStream={peerStream}
              isInitialSetup={!initialSetupDone && !isDragging}
              participantName={participantName}
            />
          ))}
        </div>
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
