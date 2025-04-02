import { useState, useEffect, useRef, useCallback } from "react";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../hooks/useAuth";
import Peer from "peerjs";
import PropTypes from "prop-types";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaPhone,
  FaPhoneSlash,
  FaArrowsAlt,
  FaUsers,
  FaExpand,
  FaCompress,
  FaVolumeUp,
  FaVolumeMute,
} from "react-icons/fa";
import config from "../../config/env";
import "../../styles/components/_call-panel.css";

const CallPanel = ({ sessionId, userId }) => {
  // State for media and UI
  const [peers, setPeers] = useState(new Map());
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [error, setError] = useState(null);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);
  const [connected, setConnected] = useState(false);

  // Socket and auth contexts
  const { socket } = useSocket();
  const { user } = useAuth();

  // Refs for DOM and persistent data
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const peersRef = useRef(new Map());
  const dragStartRef = useRef(null);
  const isDraggingRef = useRef(false);
  const remoteVideoRefs = useRef({});
  const remoteAudioRefs = useRef({});

  // Connect streams to video/audio elements using refs instead of srcObject
  useEffect(() => {
    peers.forEach((peerData, peerId) => {
      if (peerData.mediaType !== "audio" && remoteVideoRefs.current[peerId]) {
        remoteVideoRefs.current[peerId].srcObject = peerData.stream;
      } else if (remoteAudioRefs.current[peerId]) {
        remoteAudioRefs.current[peerId].srcObject = peerData.stream;
      }
    });
  }, [peers]);

  // Setup PeerJS connection
  const setupPeerConnection = useCallback(async () => {
    try {
      if (peerRef.current) {
        console.log("Using existing peer connection");
        // If we already have a peer, just reinitialize media
        initializeMedia();
        return () => {
          if (peerRef.current) {
            peerRef.current.destroy();
          }
        };
      }

      console.log("Setting up new peer connection with config:", {
        host: config.peer?.host || "0.peerjs.com",
        port: config.peer?.port || 443,
        path: config.peer?.path || "/",
        secure: config.peer?.secure !== false,
      });

      // Create a new peer with the configured options
      const peer = new Peer(userId, {
        host: config.peer?.host || "0.peerjs.com",
        port: config.peer?.port || 443,
        path: config.peer?.path || "/",
        secure: config.peer?.secure !== false,
        debug: config.debug || 1,
        config: {
          iceServers: config.webrtc?.iceServers || [
            { urls: "stun:stun.l.google.com:19302" },
            { urls: "stun:stun1.l.google.com:19302" },
          ],
        },
      });

      // Handle peer open event
      peer.on("open", (id) => {
        console.log(`PeerJS connection established with ID: ${id}`);
        peerRef.current = peer;

        // Once peer is open, try to get media stream
        initializeMedia();
      });

      // Handle incoming calls
      peer.on("call", async (call) => {
        console.log(`Receiving call from: ${call.peer}`);

        try {
          // Create a default empty stream if we don't have one
          const streamToAnswer = localStreamRef.current || new MediaStream();

          // Answer the call with our stream
          call.answer(streamToAnswer);

          // Handle incoming stream
          call.on("stream", (remoteStream) => {
            console.log(`Received remote stream from ${call.peer}`);

            // Add to peers map
            addPeer(call.peer, call, remoteStream);
          });

          // Handle call close
          call.on("close", () => {
            console.log(`Call with ${call.peer} closed`);
            removePeer(call.peer);
          });

          // Handle call errors
          call.on("error", (err) => {
            console.error(`Call error with ${call.peer}:`, err);
            removePeer(call.peer);
          });
        } catch (err) {
          console.error("Error handling incoming call:", err);
        }
      });

      // Handle peer errors
      peer.on("error", (err) => {
        console.error("PeerJS connection error:", err);
        setError(`Connection error: ${err.type}`);

        // Attempt to reconnect if disconnected
        if (err.type === "disconnected" || err.type === "network") {
          setTimeout(() => {
            if (peerRef.current) {
              console.log("Attempting to reconnect peer...");
              peerRef.current.reconnect();
            }
          }, 2000);
        }
      });

      // Handle peer disconnection
      peer.on("disconnected", () => {
        console.log("PeerJS disconnected, attempting to reconnect...");
        setConnected(false);

        // Try to reconnect
        setTimeout(() => {
          if (peerRef.current) {
            peerRef.current.reconnect();
          }
        }, 2000);
      });

      // Return cleanup function
      return () => {
        if (peer) {
          console.log("Cleaning up peer connection");
          peer.destroy();
        }
      };
    } catch (err) {
      console.error("Error setting up PeerJS connection:", err);
      setError(`Failed to establish connection: ${err.message}`);

      // Return empty cleanup function on error
      return () => {};
    }
  }, [userId]);

  // Initialize media stream (audio/video)
  const initializeMedia = async () => {
    if (!peerRef.current) {
      console.warn("Attempted to initialize media before peer connection");
      return;
    }

    try {
      // Check if we already have an active stream
      if (localStreamRef.current && localStreamRef.current.active) {
        console.log("Using existing media stream");
        return;
      }

      // Determine which devices to request based on mode
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: !isAudioMode
          ? {
              width: { ideal: 320 },
              height: { ideal: 240 },
              frameRate: { ideal: 24 },
            }
          : false,
      };

      console.log(`Requesting media with constraints:`, constraints);

      // Check for permission state if available
      try {
        const permissions = await navigator.permissions.query({
          name: "microphone",
        });
        console.log(`Microphone permission status: ${permissions.state}`);

        if (permissions.state === "denied") {
          throw new Error("Microphone access denied in browser permissions");
        }
      } catch (permError) {
        // Not all browsers support permissions API, so ignore this error
        console.log("Cannot check permissions API:", permError.message);
      }

      // First try to enumerate devices to see what's available
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter((d) => d.kind === "audioinput");
        const videoDevices = devices.filter((d) => d.kind === "videoinput");

        console.log(
          `Found ${audioDevices.length} audio input devices and ${videoDevices.length} video devices`
        );

        if (audioDevices.length === 0) {
          console.warn("No audio input devices found");
        }
      } catch (enumError) {
        console.warn("Could not enumerate devices:", enumError);
      }

      // Request media with timeout to prevent hanging
      const mediaPromise = navigator.mediaDevices.getUserMedia(constraints);

      // Set a timeout in case getUserMedia hangs
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Media request timeout after 10 seconds")),
          10000
        );
      });

      // Race between media request and timeout
      const stream = await Promise.race([mediaPromise, timeoutPromise]);

      console.log(
        "Got local stream with tracks:",
        stream.getTracks().map((t) => ({
          kind: t.kind,
          enabled: t.enabled,
          muted: t.muted,
          id: t.id,
          label: t.label,
        }))
      );

      // Verify we actually got audio tracks
      const hasMicrophoneAccess = stream.getAudioTracks().length > 0;
      if (!hasMicrophoneAccess) {
        console.warn("No audio tracks in media stream");
      }

      // Store stream references
      localStreamRef.current = stream;
      setLocalStream(stream);

      // Connect local stream to video element if in video mode
      if (localVideoRef.current && !isAudioMode) {
        localVideoRef.current.srcObject = stream;

        // Add playback detection
        localVideoRef.current.onloadedmetadata = () => {
          console.log("Local video metadata loaded");
          localVideoRef.current.play().catch((e) => {
            console.error("Error playing local video:", e);
          });
        };
      }

      // Set initial mute state based on user preference
      if (isMuted && stream.getAudioTracks().length > 0) {
        stream.getAudioTracks().forEach((track) => {
          track.enabled = false;
        });
        console.log(
          "Audio tracks muted:",
          stream.getAudioTracks().map((t) => t.enabled)
        );
      } else if (stream.getAudioTracks().length > 0) {
        // Ensure audio tracks are explicitly enabled
        stream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });
        console.log(
          "Audio tracks enabled:",
          stream.getAudioTracks().map((t) => t.enabled)
        );
      }

      // Set initial video state based on user preference
      if (!isVideoEnabled && stream.getVideoTracks().length > 0) {
        stream.getVideoTracks().forEach((track) => {
          track.enabled = false;
        });
      }

      // Now join the session's media room
      joinMediaRoom();

      // Successfully connected
      setConnected(true);
      setError(null);
    } catch (err) {
      console.error("Error getting user media:", err);

      // More detailed error handling
      if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setError(
          "Could not access camera/microphone (in use by another application)"
        );
      } else if (
        err.name === "NotFoundError" ||
        err.name === "DevicesNotFoundError"
      ) {
        setError("No camera or microphone found. Try audio-only mode.");
        setIsAudioMode(true);

        // Try to get audio only if video failed
        if (!isAudioMode) {
          try {
            const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
              video: false,
            });
            localStreamRef.current = audioOnlyStream;
            setLocalStream(audioOnlyStream);
            setIsAudioMode(true);
            joinMediaRoom();
            setConnected(true);
            setError(null);
          } catch (audioErr) {
            console.error("Failed to get audio-only stream:", audioErr);
            // Create an empty stream for connection
            const emptyStream = new MediaStream();
            localStreamRef.current = emptyStream;
            setLocalStream(emptyStream);
            joinMediaRoom();
            setError(
              "No microphone available. You can hear others but cannot speak."
            );
          }
        }
      } else if (
        err.name === "NotAllowedError" ||
        err.name === "PermissionDeniedError"
      ) {
        setError(
          "Permission denied. Please allow camera/microphone access in your browser settings and refresh the page."
        );
      } else if (err.message && err.message.includes("timeout")) {
        setError(
          "Media request timed out. Please check your camera/microphone connection and refresh."
        );
      } else {
        setError(`Media error: ${err.message}`);

        // Create an empty stream as fallback
        const emptyStream = new MediaStream();
        localStreamRef.current = emptyStream;
        setLocalStream(emptyStream);
        joinMediaRoom();
      }
    }
  };

  // Join the session's media room
  const joinMediaRoom = useCallback(() => {
    if (!socket || !peerRef.current) {
      console.warn("Cannot join media room: socket or peer not ready");
      return;
    }

    // Emit join event to inform other participants
    socket.emit("join-media", {
      sessionId,
      userId,
      peerId: peerRef.current.id,
      userName: user?.displayName || "User",
      mediaType: isAudioMode ? "audio" : "video",
    });

    console.log(
      `Joined media room for session ${sessionId} as ${
        isAudioMode ? "audio" : "video"
      } participant`
    );
  }, [socket, sessionId, userId, user, isAudioMode]);

  // Leave the media room
  const leaveMediaRoom = useCallback(() => {
    if (!socket) return;

    console.log("Leaving media room...");

    // Emit leave event
    socket.emit("leave-media", {
      sessionId,
      userId,
      peerId: peerRef.current?.id,
    });

    // Close all peer connections
    peersRef.current.forEach((peerData, peerId) => {
      if (peerData.call) {
        peerData.call.close();
      }
    });

    // Clear peers
    peersRef.current.clear();
    setPeers(new Map());

    // Stop local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
      setLocalStream(null);
    }

    // Destroy peer connection
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    setConnected(false);
  }, [socket, sessionId, userId]);

  // Helper to add a peer to state
  const addPeer = useCallback((peerId, call, stream) => {
    const newPeer = {
      call,
      stream,
      userId: peerId.split("-")[0], // Assume peerId might be formatted as userId-random
      mediaType: "unknown", // Will be updated with participant data
    };

    peersRef.current.set(peerId, newPeer);
    setPeers(new Map(peersRef.current));
    setParticipantCount(peersRef.current.size + 1); // +1 for local user
  }, []);

  // Helper to remove a peer
  const removePeer = useCallback((peerId) => {
    if (peersRef.current.has(peerId)) {
      peersRef.current.delete(peerId);
      setPeers(new Map(peersRef.current));
      setParticipantCount(peersRef.current.size + 1); // +1 for local user
    }
  }, []);

  // Call a peer when we discover them
  const callPeer = useCallback(
    (peerId) => {
      if (!peerRef.current) {
        console.warn("Cannot call peer: peer connection not ready");
        return;
      }

      try {
        // Check if we already have a call with this peer
        if (peersRef.current.has(peerId)) {
          console.log(`Already connected to peer: ${peerId}`);
          return;
        }

        // Check if we have a local stream
        const streamToSend = localStreamRef.current || new MediaStream();

        console.log(
          `Calling peer: ${peerId} with stream tracks:`,
          streamToSend.getTracks().map((t) => t.kind)
        );

        // Make the call with proper error handling
        try {
          const call = peerRef.current.call(peerId, streamToSend);

          if (!call) {
            console.error(`Failed to create call to peer: ${peerId}`);
            return;
          }

          // Set up event handlers safely
          call.on("stream", (remoteStream) => {
            console.log(`Received stream from ${peerId}`);
            addPeer(peerId, call, remoteStream);
          });

          call.on("close", () => {
            console.log(`Call with ${peerId} closed`);
            removePeer(peerId);
          });

          call.on("error", (err) => {
            console.error(`Call error with ${peerId}:`, err);
            removePeer(peerId);
          });
        } catch (callErr) {
          console.error(`Error initiating call to peer ${peerId}:`, callErr);
        }
      } catch (err) {
        console.error(`Error in callPeer ${peerId}:`, err);
      }
    },
    [addPeer, removePeer]
  );

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Handle existing participants
    const handleExistingParticipants = (data) => {
      console.log("Received existing participants:", data.participants);

      // Call each existing participant
      data.participants.forEach((participant) => {
        callPeer(participant.peerId);
      });
    };

    // Handle new participant joining - don't update count here
    // The count will be updated when the peer connection is established
    const handleParticipantJoined = (data) => {
      console.log("New participant joined media room:", data);
    };

    // Handle participant leaving
    const handleParticipantLeft = (data) => {
      console.log("Participant left media room:", data);
      removePeer(data.peerId);
    };

    // Handle participant state changes
    const handleParticipantStateChanged = (data) => {
      console.log("Participant state changed:", data);

      // Update peer data
      if (peersRef.current.has(data.peerId)) {
        const peerData = peersRef.current.get(data.peerId);
        peersRef.current.set(data.peerId, { ...peerData, ...data.updates });
        setPeers(new Map(peersRef.current));
      }
    };

    // Register event listeners
    socket.on("existing-participants", handleExistingParticipants);
    socket.on("participant-joined", handleParticipantJoined);
    socket.on("participant-left", handleParticipantLeft);
    socket.on("participant-state-changed", handleParticipantStateChanged);

    // Cleanup function
    return () => {
      // Remove event listeners
      socket.off("existing-participants", handleExistingParticipants);
      socket.off("participant-joined", handleParticipantJoined);
      socket.off("participant-left", handleParticipantLeft);
      socket.off("participant-state-changed", handleParticipantStateChanged);
    };
  }, [socket, callPeer, removePeer]);

  // Initialize PeerJS and media
  useEffect(() => {
    // Only initialize if we have both sessionId and userId
    if (!sessionId || !userId || !socket) return;

    // Setup peer connection
    const cleanupPeer = setupPeerConnection();

    // Return cleanup function
    return () => {
      cleanupPeer();
      leaveMediaRoom();
    };
  }, [sessionId, userId, socket, setupPeerConnection, leaveMediaRoom]);

  // Toggle media mode between audio and video
  const toggleMediaMode = () => {
    // Clean up existing connections
    leaveMediaRoom();

    // Toggle mode
    setIsAudioMode((prev) => !prev);

    // Reinitialize with new mode
    setTimeout(() => {
      setupPeerConnection();
    }, 500);
  };

  // Toggle mute state
  const toggleMute = () => {
    if (!localStreamRef.current) return;

    const audioTracks = localStreamRef.current.getAudioTracks();
    if (audioTracks.length > 0) {
      const newMuteState = !isMuted;
      audioTracks.forEach((track) => {
        track.enabled = !newMuteState;
      });

      setIsMuted(newMuteState);

      // Notify others about state change
      if (socket && peerRef.current) {
        socket.emit("media-state-change", {
          sessionId,
          userId,
          peerId: peerRef.current.id,
          updates: { audioEnabled: !newMuteState },
        });
      }
    }
  };

  // Toggle video on/off
  const toggleVideo = () => {
    if (!localStreamRef.current || isAudioMode) return;

    const videoTracks = localStreamRef.current.getVideoTracks();
    if (videoTracks.length > 0) {
      const newVideoState = !isVideoEnabled;
      videoTracks.forEach((track) => {
        track.enabled = newVideoState;
      });

      setIsVideoEnabled(newVideoState);

      // Notify others about state change
      if (socket && peerRef.current) {
        socket.emit("media-state-change", {
          sessionId,
          userId,
          peerId: peerRef.current.id,
          updates: { videoEnabled: newVideoState },
        });
      }
    }
  };

  // Toggle collapse state
  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  // Mouse event handlers for dragging
  const handleMouseDown = (e) => {
    if (
      e.target.closest(".call-controls") ||
      e.target.closest(".remote-video")
    ) {
      return;
    }

    setIsDragging(true);
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };

    e.preventDefault();
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return;

    requestAnimationFrame(() => {
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;

      setPosition({
        x: Math.max(0, newX),
        y: Math.max(0, newY),
      });
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    isDraggingRef.current = false;
  }, []);

  // Add global mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    } else {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Render functions for different states
  const renderControls = () => (
    <div className="call-controls">
      <button
        className={`control-btn ${isMuted ? "active" : ""}`}
        onClick={toggleMute}
      >
        {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
      </button>

      {!isAudioMode && (
        <button
          className={`control-btn ${!isVideoEnabled ? "active" : ""}`}
          onClick={toggleVideo}
        >
          {isVideoEnabled ? <FaVideo /> : <FaVideoSlash />}
        </button>
      )}

      <button className="control-btn mode-toggle" onClick={toggleMediaMode}>
        {isAudioMode ? <FaVideo /> : <FaMicrophone />}
      </button>

      <button className="control-btn" onClick={toggleCollapse}>
        {isCollapsed ? <FaExpand /> : <FaCompress />}
      </button>

      <button className="control-btn end-call" onClick={leaveMediaRoom}>
        <FaPhoneSlash />
      </button>
    </div>
  );

  const renderError = () => (
    <div className="call-error">
      <p>{error}</p>
      <button onClick={setupPeerConnection}>Retry</button>
    </div>
  );

  const renderParticipantCounter = () => (
    <div className="participant-counter">
      <FaUsers />
      <span>In Call: {participantCount}</span>
    </div>
  );

  const renderLocalVideo = () => (
    <div className="local-video-container">
      {!isAudioMode && (
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className={isVideoEnabled ? "" : "video-off"}
        />
      )}
      {(!isVideoEnabled || isAudioMode) && (
        <div className="avatar-placeholder">
          {user?.displayName?.charAt(0) || "U"}
        </div>
      )}
      {isMuted && <FaMicrophoneSlash className="muted-indicator" />}
    </div>
  );

  const renderRemoteParticipants = () => (
    <div className="remote-participants">
      {Array.from(peers.entries()).map(([peerId, peerData]) => (
        <div key={peerId} className="remote-participant">
          {peerData.mediaType !== "audio" ? (
            <video
              ref={(el) => (remoteVideoRefs.current[peerId] = el)}
              autoPlay
              playsInline
              className="remote-video"
            />
          ) : (
            <div className="audio-participant">
              <div className="avatar-placeholder">
                {peerData.userId?.charAt(0) || "U"}
              </div>
              <audio
                ref={(el) => (remoteAudioRefs.current[peerId] = el)}
                autoPlay
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={`call-panel ${isAudioMode ? "audio-mode" : "video-mode"} ${
        isCollapsed ? "collapsed" : ""
      }`}
      style={{
        "--x": `${position.x}px`,
        "--y": `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="call-header">
        <div className="call-title">
          {isAudioMode ? "Audio Call" : "Video Call"}
          {renderParticipantCounter()}
        </div>
        {!isCollapsed && renderControls()}
      </div>

      {isCollapsed ? (
        <div className="collapsed-content" onClick={toggleCollapse}>
          {isAudioMode ? <FaMicrophone /> : <FaVideo />}
          <div className="call-badge">
            <FaUsers />
            <span>{participantCount}</span>
          </div>
        </div>
      ) : (
        <div className="call-content">
          {error ? (
            renderError()
          ) : (
            <>
              {renderLocalVideo()}
              {renderRemoteParticipants()}
            </>
          )}
        </div>
      )}
    </div>
  );
};

CallPanel.propTypes = {
  sessionId: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired,
};

export default CallPanel;
