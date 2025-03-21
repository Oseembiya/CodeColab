import { useEffect, useRef, useState, useCallback } from "react";
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
          },
        });

        // Debug info for audio tracks
        const audioTracks = mediaStream.getAudioTracks();
        if (audioTracks.length > 0) {
          console.log("Local audio track created:", audioTracks[0].label);
          console.log("Audio settings:", audioTracks[0].getSettings());
        } else {
          console.warn("No audio track found in local stream");
        }

        streamRef.current = mediaStream;
        setStream(mediaStream);

        // 2. Initialize PeerJS
        const peer = new Peer(`${sessionId}-${userId}-${Date.now()}`, {
          host: import.meta.env.VITE_PEER_HOST || "localhost",
          port: Number(import.meta.env.VITE_PEER_PORT) || 9000,
          path: "/myapp",
          config: {
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" },
              { urls: "stun:stun2.l.google.com:19302" },
            ],
          },
        });

        peerRef.current = peer;

        // Add connection state debugging
        peer.on("error", (err) => {
          console.error("Peer connection error:", err.type, err);
          setError(`Peer error: ${err.type}`);
        });

        peer.on("disconnected", () => {
          console.log("Peer disconnected");
        });

        peer.on("close", () => {
          console.log("Peer connection closed");
        });

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

        // Add debug for call events
        call.on("error", (err) => {
          console.error("Call error:", err);
        });

        call.on("iceStateChanged", (state) => {
          console.log("ICE connection state changed to:", state);

          // Attempt to recover from failed ICE connections
          if (state === "failed" || state === "disconnected") {
            console.log("Trying to recover from bad ICE connection state");

            // Option 1: Try closing and reopening the call
            setTimeout(() => {
              if (peerRef.current && !isUnmountingRef.current) {
                console.log("Attempting ICE recovery by re-calling peer");
                const newCall = peerRef.current.call(
                  newPeerId,
                  streamRef.current
                );

                // Set up new call handlers
                newCall.on("stream", (recoveredStream) => {
                  console.log("Recovered stream from peer:", newPeerId);
                  setPeers((prev) =>
                    new Map(prev).set(newPeerId, recoveredStream)
                  );
                });

                newCall.on("error", (recErr) => {
                  console.error("Recovery call error:", recErr);
                });
              }
            }, 2000);
          }
        });

        call.on("stream", (remoteStream) => {
          if (!isUnmountingRef.current) {
            console.log("Received stream from new user:", newPeerId);

            // Check and log audio status immediately
            const audioTracks = remoteStream.getAudioTracks();
            console.log(
              `Remote stream received with ${audioTracks.length} audio tracks`
            );

            if (audioTracks.length > 0) {
              console.log("Audio track initial state:", audioTracks[0].enabled);
              // Ensure the track is enabled
              audioTracks[0].enabled = true;
            }

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
                if (video) {
                  video.srcObject = peerStream;
                  video.volume = 1.0; // Ensure volume is up

                  // Force audio output device to default (may help in some browsers)
                  if (
                    video.setSinkId &&
                    navigator.mediaDevices.enumerateDevices
                  ) {
                    navigator.mediaDevices
                      .enumerateDevices()
                      .then((devices) => {
                        const audioOutputs = devices.filter(
                          (device) => device.kind === "audiooutput"
                        );
                        if (audioOutputs.length > 0) {
                          // Try the default device first
                          const defaultDevice = audioOutputs.find(
                            (device) =>
                              device.deviceId === "default" ||
                              device.label.toLowerCase().includes("default")
                          );
                          const deviceId = defaultDevice
                            ? defaultDevice.deviceId
                            : audioOutputs[0].deviceId;
                          console.log("Setting audio output to:", deviceId);
                          return video.setSinkId(deviceId);
                        }
                      })
                      .catch((err) =>
                        console.error("Error setting audio output device:", err)
                      );
                  }

                  // Handle autoplay restrictions
                  video.oncanplay = () => {
                    const playPromise = video.play();
                    if (playPromise !== undefined) {
                      playPromise.catch((error) => {
                        console.error("Autoplay prevented:", error);
                        // Create a play button when autoplay fails
                        const playButton = document.createElement("button");
                        playButton.textContent = "Play Audio";
                        playButton.className = "audio-play-button";
                        playButton.onclick = () => {
                          video.play();
                          playButton.remove();
                        };
                        video.parentNode.appendChild(playButton);
                      });
                    }
                  };

                  // Ensure audio is unmuted periodically (fixes Chrome issues)
                  const ensureAudio = setInterval(() => {
                    if (video && !video.paused) {
                      // Check if we have audio tracks
                      const audioTracks = peerStream.getAudioTracks();
                      if (audioTracks.length > 0 && !audioTracks[0].enabled) {
                        console.log("Re-enabling audio track");
                        audioTracks[0].enabled = true;
                      }
                    }
                  }, 2000);

                  // Clean up interval when video is removed
                  video.onremove = () => clearInterval(ensureAudio);

                  // Log if audio tracks exist
                  const audioTracks = peerStream.getAudioTracks();
                  console.log(
                    `Remote stream has ${audioTracks.length} audio tracks`
                  );
                  if (audioTracks.length > 0) {
                    console.log("Audio track enabled:", audioTracks[0].enabled);
                  }
                }
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
