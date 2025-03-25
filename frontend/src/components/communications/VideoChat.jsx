import { useEffect, useRef, useState, useCallback, useMemo, memo } from "react";
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

// Create a separate RemoteVideo component to prevent re-rendering during parent drags
const RemoteVideo = memo(
  ({ peerId, peerStream, isInitialSetup, participantName }) => {
    const videoRef = useRef(null);
    const intervalRef = useRef(null);
    const sinkIdSetRef = useRef(false);
    const setupCompletedRef = useRef(false); // Track if initial setup is complete

    // Set up the video element once
    useEffect(() => {
      const video = videoRef.current;
      if (video && peerStream) {
        // Only log during initial setup
        if (!setupCompletedRef.current && isInitialSetup) {
          console.log(`Setting up video for peer ${peerId}:`);
          console.log(`- Video tracks: ${peerStream.getVideoTracks().length}`);
          console.log(`- Audio tracks: ${peerStream.getAudioTracks().length}`);
        }

        // Set the stream as source
        video.srcObject = peerStream;
        video.volume = 1.0;

        // Ensure the video is not muted
        video.muted = false;

        // Ensure all tracks are enabled - only once
        if (!setupCompletedRef.current) {
          peerStream.getTracks().forEach((track) => {
            if (!track.enabled) {
              if (isInitialSetup) {
                console.log(`Enabling ${track.kind} track that was disabled`);
              }
              track.enabled = true;
            }
          });
        }

        // Set sink ID only once
        if (
          !sinkIdSetRef.current &&
          video.setSinkId &&
          navigator.mediaDevices.enumerateDevices
        ) {
          sinkIdSetRef.current = true;
          navigator.mediaDevices
            .enumerateDevices()
            .then((devices) => {
              const audioOutputs = devices.filter(
                (device) => device.kind === "audiooutput"
              );
              if (audioOutputs.length > 0) {
                // Try the default device first
                const defaultDevice = audioOutputs.find(
                  (device) => device.deviceId === "default"
                );
                const deviceId = defaultDevice
                  ? defaultDevice.deviceId
                  : audioOutputs[0].deviceId;
                if (isInitialSetup) {
                  console.log("Setting audio output to:", deviceId);
                }
                return video.setSinkId(deviceId);
              }
            })
            .catch((err) =>
              console.error("Error setting audio output device:", err)
            );
        }

        // Handle autoplay once
        const handleCanPlay = () => {
          // Only try to play if we haven't successfully played yet
          if (!video.played.length) {
            video
              .play()
              .then(() => {
                if (isInitialSetup) console.log("Video playing successfully");
              })
              .catch((error) => {
                console.error("Autoplay prevented:", error);

                // Check if a play button already exists
                if (!document.querySelector(`.play-button-${peerId}`)) {
                  const playButtonContainer = document.createElement("div");
                  playButtonContainer.className = `play-button-container play-button-${peerId}`;
                  playButtonContainer.style.position = "absolute";
                  playButtonContainer.style.top = "0";
                  playButtonContainer.style.left = "0";
                  playButtonContainer.style.width = "100%";
                  playButtonContainer.style.height = "100%";
                  playButtonContainer.style.display = "flex";
                  playButtonContainer.style.justifyContent = "center";
                  playButtonContainer.style.alignItems = "center";
                  playButtonContainer.style.background = "rgba(0,0,0,0.5)";
                  playButtonContainer.style.zIndex = "5";

                  const playButton = document.createElement("button");
                  playButton.textContent = "Click to Play";
                  playButton.className = "audio-play-button";
                  playButton.style.padding = "12px 24px";
                  playButton.style.fontSize = "16px";
                  playButton.style.cursor = "pointer";
                  playButton.style.background = "#4F46E5";
                  playButton.style.color = "white";
                  playButton.style.border = "none";
                  playButton.style.borderRadius = "4px";

                  playButton.onclick = () => {
                    video
                      .play()
                      .then(() => {
                        if (isInitialSetup)
                          console.log("Video playing after user interaction");
                        playButtonContainer.remove();
                      })
                      .catch((err) => {
                        console.error("Still can't play after click:", err);
                      });
                  };

                  playButtonContainer.appendChild(playButton);
                  video.parentNode.appendChild(playButtonContainer);
                }
              });
          }
        };

        // Add event listener only once
        if (!setupCompletedRef.current) {
          video.addEventListener("canplay", handleCanPlay);
        }

        // Check if audio tracks exist, but only log during initial setup
        if (!setupCompletedRef.current && isInitialSetup) {
          const audioTracks = peerStream.getAudioTracks();
          console.log(`Remote stream has ${audioTracks.length} audio tracks`);
          if (audioTracks.length > 0) {
            console.log("Audio track enabled:", audioTracks[0].enabled);
          }
        }

        // Ensure audio is checked periodically (fixes Chrome issues)
        // Only set up interval if it doesn't exist yet
        if (!intervalRef.current) {
          intervalRef.current = setInterval(() => {
            if (video && !video.paused) {
              // Check if we have audio tracks in the stream
              const audioTracks = peerStream.getAudioTracks();
              if (audioTracks.length > 0) {
                // Only log and take action if there's an issue
                if (!audioTracks[0].enabled) {
                  console.log("Re-enabling audio track");
                  audioTracks[0].enabled = true;
                }

                // Check if video is muted and unmute it if needed
                if (video.muted) {
                  console.log("Unmuting remote video that was muted");
                  video.muted = false;
                }
              }
            }
          }, 10000); // Increased to 10 seconds to reduce logs even further
        }

        // Try initial play if not already played
        if (!setupCompletedRef.current && video.readyState >= 2) {
          // HAVE_CURRENT_DATA or higher
          handleCanPlay();
        }

        // Mark setup as completed
        setupCompletedRef.current = true;

        // Clean up
        return () => {
          if (!setupCompletedRef.current) {
            video.removeEventListener("canplay", handleCanPlay);
          }
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        };
      }
    }, [peerId, peerStream, isInitialSetup]); // isInitialSetup only affects logging, not setup behavior

    return (
      <div className="video-container">
        <video ref={videoRef} autoPlay playsInline />
        <div className="video-label">{participantName || "Participant"}</div>

        {/* Manual audio toggle button */}
        <button
          className="manual-audio-toggle"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;

            // Toggle muted state
            video.muted = !video.muted;
            console.log(`Video ${video.muted ? "muted" : "unmuted"} manually`);
          }}
          style={{
            position: "absolute",
            bottom: "10px",
            right: "10px",
            background: "rgba(0,0,0,0.5)",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: "30px",
            height: "30px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: "5",
          }}
        >
          <FaMicrophone />
        </button>
      </div>
    );
  }
);

// Add display name
RemoteVideo.displayName = "RemoteVideo";

RemoteVideo.propTypes = {
  peerId: PropTypes.string.isRequired,
  peerStream: PropTypes.object.isRequired,
  isInitialSetup: PropTypes.bool.isRequired,
  participantName: PropTypes.string,
};

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
  const participantCount = peers.size || 0;

  // Add a reference for tracking dragging position to avoid state updates during drag
  const dragPositionRef = useRef({ x: 0, y: 0 });
  // Add a reference for tracking if we're currently dragging
  const isDraggingRef = useRef(false);
  // Reference for animation frame
  const animFrameRef = useRef(null);

  // Replace the isDragging related prop with an initialSetup flag
  const [initialSetupDone, setInitialSetupDone] = useState(false);
  useEffect(() => {
    // After initial mounting, mark initial setup as done to prevent future logging
    setInitialSetupDone(true);
  }, []);

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
            sdpTransform: (sdp) => {
              // Prefer Opus codec for better audio quality
              return sdp.replace(
                "useinbandfec=1",
                "useinbandfec=1; stereo=1; maxaveragebitrate=512000"
              );
            },
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
            // Get user's display name from auth context, localStorage, or generate a default
            const userName =
              user?.displayName ||
              localStorage.getItem("userName") ||
              sessionStorage.getItem("userName") ||
              `User-${userId.substring(0, 6)}`;

            socket.emit("join-video", {
              sessionId,
              userId,
              peerId,
              userName,
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

              // Get peer ID parts to extract user info
              const peerIdParts = call.peer.split("-");
              const remoteUserId =
                peerIdParts.length > 1 ? peerIdParts[1] : "unknown";

              // Store with name information
              setPeers((prev) =>
                new Map(prev).set(call.peer, {
                  stream: remoteStream,
                  label: `User-${remoteUserId.substring(0, 6)}`,
                })
              );
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
    const handleUserJoined = ({
      peerId: newPeerId,
      userId: remoteUserId,
      name,
    }) => {
      console.log(
        "New user joined with peer ID:",
        newPeerId,
        "and name:",
        name
      );
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

            // Store stream and user name together
            setPeers((prev) =>
              new Map(prev).set(newPeerId, {
                stream: remoteStream,
                label: name || `User-${remoteUserId.substring(0, 6)}`,
              })
            );
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

      // Handle existing participants when joining a session
      socket.on("existing-video-participants", ({ participants }) => {
        console.log(
          `Received ${participants.length} existing participants to connect with`
        );

        // Only proceed if we have our peer connection and stream ready
        if (peerRef.current && streamRef.current && !isUnmountingRef.current) {
          // Call each existing participant
          participants.forEach(({ peerId, name, userId: remoteUserId }) => {
            console.log(
              `Calling existing participant: ${peerId}, name: ${name}`
            );

            const call = peerRef.current.call(peerId, streamRef.current);

            // Set up call event handlers
            call.on("error", (err) => {
              console.error("Call error to existing participant:", err);
            });

            call.on("stream", (remoteStream) => {
              console.log(
                `Received stream from existing participant: ${peerId}`
              );

              // Check audio track status
              const audioTracks = remoteStream.getAudioTracks();
              console.log(
                `Remote stream has ${audioTracks.length} audio tracks`
              );

              if (audioTracks.length > 0) {
                console.log(
                  "Audio track initial state:",
                  audioTracks[0].enabled
                );
                // Ensure track is enabled
                audioTracks[0].enabled = true;
              }

              // Add peer to the peers map with name information
              if (!isUnmountingRef.current) {
                setPeers((prev) =>
                  new Map(prev).set(peerId, {
                    stream: remoteStream,
                    label: name || `User-${remoteUserId.substring(0, 6)}`,
                  })
                );
              }
            });
          });
        }
      });

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
        socket.off("existing-video-participants");

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
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging && !isDraggingRef.current) return;

      // Store position in ref to avoid state updates during drag
      dragPositionRef.current = {
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      };

      // Cancel any existing animation frame
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }

      // Schedule position update on next animation frame
      animFrameRef.current = requestAnimationFrame(() => {
        if (!dragRef.current) return;

        // Get cached dimensions for better performance
        const containerWidth = dragRef.current.offsetWidth;
        const containerHeight = dragRef.current.offsetHeight;

        // Calculate bounded position
        const boundedX = Math.min(
          Math.max(0, dragPositionRef.current.x),
          window.innerWidth - containerWidth
        );
        const boundedY = Math.min(
          Math.max(0, dragPositionRef.current.y),
          window.innerHeight - containerHeight
        );

        // Update position state only when animation frame runs
        setPosition({ x: boundedX, y: boundedY });
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
      peerData.label,
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
              // Get new constraints with selected device
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
                  // Replace the audio track
                  const audioTrack = newStream.getAudioTracks()[0];
                  const oldTrack = streamRef.current.getAudioTracks()[0];
                  streamRef.current.removeTrack(oldTrack);
                  streamRef.current.addTrack(audioTrack);

                  // Update all peer connections
                  // (This would require modifying how peer connections are managed)
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
            // Update volume for all remote videos
            document
              .querySelectorAll(".video-container:not(.local) video")
              .forEach((video) => {
                video.volume = e.target.value;
              });
          }}
        />
      </div>

      <div className="video-grid">
        {/* Local video - Make it display at the top and take full width */}
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

        {/* Remote videos - Using the memoized component */}
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
