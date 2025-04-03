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

// Default position coordinates - defined outside the component to avoid TDZ issues
const DEFAULT_POSITION = { x: 20, y: 20 };

const CallPanel = ({ sessionId, userId }) => {
  // State for media and UI
  const [peers, setPeers] = useState(new Map());
  const [localStream, setLocalStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [error, setError] = useState(null);
  const [position, setPosition] = useState(DEFAULT_POSITION);
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
  const dragStartRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const remoteVideoRefs = useRef({});
  const remoteAudioRefs = useRef({});
  const positionRef = useRef(DEFAULT_POSITION);

  // Update position ref when state changes to ensure consistency
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Connect streams to video/audio elements using refs instead of srcObject
  useEffect(() => {
    peers.forEach((peerData, peerId) => {
      try {
        if (peerData.mediaType !== "audio" && remoteVideoRefs.current[peerId]) {
          // For video participants, connect to video element
          const videoEl = remoteVideoRefs.current[peerId];
          if (videoEl && videoEl.srcObject !== peerData.stream) {
            console.log(`Connecting video stream for peer ${peerId}`);
            videoEl.srcObject = peerData.stream;

            // Ensure autoplay works
            videoEl.onloadedmetadata = () => {
              console.log(`Remote video metadata loaded for peer ${peerId}`);
              videoEl.play().catch((e) => {
                console.error(
                  `Error playing remote video for peer ${peerId}:`,
                  e
                );
              });
            };
          }
        } else if (remoteAudioRefs.current[peerId]) {
          // For audio-only participants, connect to audio element
          const audioEl = remoteAudioRefs.current[peerId];
          if (audioEl && audioEl.srcObject !== peerData.stream) {
            console.log(`Connecting audio stream for peer ${peerId}`);
            audioEl.srcObject = peerData.stream;

            // Ensure autoplay works
            audioEl.onloadedmetadata = () => {
              console.log(`Remote audio metadata loaded for peer ${peerId}`);
              audioEl.play().catch((e) => {
                console.error(
                  `Error playing remote audio for peer ${peerId}:`,
                  e
                );
              });
            };
          }
        }
      } catch (err) {
        console.error(`Error connecting stream for peer ${peerId}:`, err);
      }
    });
  }, [peers]);

  // Helper to add a peer to state
  const addPeer = useCallback((peerId, call, stream, mediaType) => {
    const newPeer = {
      call,
      stream,
      userId: peerId.split("-")[0], // Assume peerId might be formatted as userId-random
      mediaType,
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

  // Join media room
  const joinMediaRoom = useCallback(() => {
    if (!socket || !peerRef.current) {
      console.warn("Cannot join media room: socket or peer not ready");
      return;
    }

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

  // Initialize media stream (audio/video)
  const initializeMedia = async () => {
    if (!peerRef.current) {
      console.warn("Attempted to initialize media before peer connection");
      return;
    }

    // Print out all WebRTC configuration for debugging
    console.log("=== WebRTC Configuration ===");
    console.log("PeerJS Config:", {
      host: config.peer?.host,
      port: config.peer?.port,
      path: config.peer?.path,
      secure: true,
      debug: config.debug,
    });
    console.log("ICE Servers:", config.webrtc?.iceServers);
    console.log("Audio Constraints:", config.webrtc?.audioConstraints);
    console.log("Video Constraints:", config.webrtc?.videoConstraints);
    console.log("==========================");

    // Track retry attempts to prevent endless retry loops
    const maxRetries = 2;
    let retryCount = 0;
    let retryTimer = null;

    const attemptMediaConnect = async (isRetry = false) => {
      try {
        // Check if we already have an active stream
        if (localStreamRef.current && localStreamRef.current.active) {
          console.log("Using existing media stream");
          // Verify tracks are in good state
          console.log(
            "Local stream tracks:",
            localStreamRef.current.getTracks().map((t) => ({
              kind: t.kind,
              enabled: t.enabled,
              muted: t.muted,
              readyState: t.readyState,
            }))
          );
          return true;
        }

        // Clear any existing retry timer
        if (retryTimer) {
          clearTimeout(retryTimer);
          retryTimer = null;
        }

        // Show retry status to user
        if (isRetry) {
          setError(`Retrying media connection... (Attempt ${retryCount})`);
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
        return true;
      } catch (err) {
        console.error("Error getting user media:", err);

        // Specific error handling with detailed user messaging
        let errorMessage = "";
        let shouldRetry = false;
        let fallbackToAudio = false;

        if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          errorMessage =
            "Could not access camera/microphone (in use by another application)";
          shouldRetry = true;
        } else if (
          err.name === "NotFoundError" ||
          err.name === "DevicesNotFoundError"
        ) {
          errorMessage =
            "No camera or microphone found. Trying audio-only mode.";
          fallbackToAudio = true;
        } else if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          errorMessage =
            "Permission denied. Please allow camera/microphone access in your browser settings and refresh.";
          // Don't retry permission issues - user action needed
        } else if (err.message && err.message.includes("timeout")) {
          errorMessage = "Media request timed out. Retrying...";
          shouldRetry = true;
        } else {
          errorMessage = `Media error: ${err.message}`;
          shouldRetry = true;
        }

        // Set error message with retry info
        setError(
          errorMessage +
            (shouldRetry && retryCount < maxRetries
              ? ` Retrying (${retryCount + 1}/${maxRetries})...`
              : "")
        );

        // Handle fallback to audio
        if (fallbackToAudio && !isAudioMode) {
          console.log("Falling back to audio-only mode");
          setIsAudioMode(true);

          // Try again with audio-only immediately
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
            joinMediaRoom();
            setConnected(true);
            setError(null);
            return true;
          } catch (audioErr) {
            console.error("Failed to get audio-only stream:", audioErr);
          }
        }

        // Try to fallback to empty stream as a last resort
        if (!shouldRetry || retryCount >= maxRetries) {
          console.log("Creating empty fallback media stream");
          const emptyStream = new MediaStream();
          localStreamRef.current = emptyStream;
          setLocalStream(emptyStream);
          joinMediaRoom();

          if (fallbackToAudio) {
            setError(
              "No microphone available. You can hear others but cannot speak."
            );
          }
          return false;
        }

        // Schedule retry if we should retry
        if (shouldRetry && retryCount < maxRetries) {
          retryCount++;
          console.log(
            `Scheduling media connection retry #${retryCount} in 2 seconds`
          );
          retryTimer = setTimeout(() => attemptMediaConnect(true), 2000);
          return false;
        }

        return false;
      }
    };

    // Start the media connection process
    return attemptMediaConnect();
  };

  // PeerJS connection setup
  const setupPeerConnection = useCallback(async () => {
    console.log("Setting up PeerJS connection...");

    try {
      // Configure and create PeerJS instance
      const peerOptions = {
        host: config.peer.host,
        port: config.peer.port,
        path: config.peer.path,
        secure: true,
        config: {
          iceServers: config.webrtc.iceServers,
          sdpSemantics: config.webrtc.sdpSemantics,
          iceTransportPolicy: config.webrtc.iceTransportPolicy,
          bundlePolicy: config.webrtc.bundlePolicy,
          rtcpMuxPolicy: config.webrtc.rtcpMuxPolicy,
        },
        debug: config.debug,
        // Set higher timeouts for Render's environment
        pingInterval: 5000,
        retryTimeouts: [3000, 6000, 10000],
      };

      console.log("PeerJS configuration:", peerOptions);

      // Add enhanced diagnostic flag
      const enableDiagnostics = true;

      // Construct a unique peer ID using userId and sessionId
      const uniquePeerId = `${userId}-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .substr(2, 5)}`;

      console.log(
        `Attempting to connect to PeerJS server with ID: ${uniquePeerId}`
      );

      // Destroy any existing connection first
      if (peerRef.current) {
        try {
          console.log(
            "Destroying existing peer connection before creating new one"
          );
          peerRef.current.destroy();
        } catch (err) {
          console.warn("Error destroying existing peer:", err);
        }
        peerRef.current = null;
      }

      const peer = new Peer(uniquePeerId, peerOptions);
      peerRef.current = peer;

      // Set connection timeout
      const connectionTimeout = setTimeout(() => {
        if (peer && !peer.open) {
          console.warn(
            "PeerJS connection timeout - attempting alternate connection"
          );
          // Try reconnecting with modified options
          try {
            peer.disconnect();
            setTimeout(() => {
              peer.reconnect();
            }, 1000);
          } catch (err) {
            console.error("Error during timeout reconnection:", err);
          }
        }
      }, 15000);

      // Add connection event to confirm successful connection
      peer.on("open", (id) => {
        console.log(`PeerJS connection established with ID: ${id}`);
        setConnected(true);
        clearTimeout(connectionTimeout);

        // Initialize media after successful connection
        initializeMedia().catch((err) => {
          console.error("Error initializing media after connection:", err);
        });
      });

      // Log all peer events for diagnostics
      peer.on("iceStateChanged", (state) => {
        console.log(`ICE connection state changed to: ${state}`);

        // Enhanced diagnostics for ICE connection problems
        if (
          enableDiagnostics &&
          (state === "failed" || state === "disconnected")
        ) {
          console.warn(`ICE connection ${state}. Diagnostics:`, {
            iceServers: config.webrtc.iceServers,
            transportPolicy: config.webrtc.iceTransportPolicy,
            uniquePeerId,
            host: config.peer.host,
            port: config.peer.port,
          });

          // No need to check NAT type here as it can overload the connection
          console.log("ICE connection failed - retry may be needed");
        }
      });

      // Add connection event handler
      peer.on("connection", (conn) => {
        console.log(`Received data connection from peer: ${conn.peer}`);
        conn.on("open", () => {
          console.log(`Data connection with ${conn.peer} opened`);
        });
        conn.on("error", (err) => {
          console.error(`Data connection error with ${conn.peer}:`, err);
        });
      });

      // Handle incoming calls
      peer.on("call", async (call) => {
        console.log(`Receiving call from: ${call.peer}`);

        try {
          // Create a default empty stream if we don't have one
          let streamToAnswer = localStreamRef.current;

          if (!streamToAnswer || !streamToAnswer.active) {
            console.warn(
              `No active local stream when answering call from ${call.peer}, creating empty stream`
            );
            streamToAnswer = new MediaStream();

            // Try to get user media if possible
            try {
              const tempStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                  echoCancellation: true,
                  noiseSuppression: true,
                  autoGainControl: true,
                },
                video: !isAudioMode,
              });

              streamToAnswer = tempStream;

              // Update local stream reference if we didn't have one
              if (!localStreamRef.current) {
                localStreamRef.current = tempStream;
                setLocalStream(tempStream);
              }

              console.log(
                `Created new stream for answering call from ${call.peer}`
              );
            } catch (mediaErr) {
              console.warn(
                `Couldn't get media for answering call, using empty stream:`,
                mediaErr
              );
            }
          }

          // Log the stream we're using to answer
          console.log(
            `Answering call from ${call.peer} with stream tracks:`,
            streamToAnswer
              .getTracks()
              .map((t) => ({ kind: t.kind, enabled: t.enabled }))
          );

          // Answer the call with our stream
          call.answer(streamToAnswer);

          // Monitor connection state to debug issues
          try {
            const pc = call.peerConnection;
            if (pc) {
              // Log ICE connection state changes
              pc.oniceconnectionstatechange = () => {
                console.log(
                  `ICE connection state for call ${call.peer}: ${pc.iceConnectionState}`
                );

                // Report failed connections
                if (pc.iceConnectionState === "failed") {
                  console.error(`ICE connection failed for peer ${call.peer}`);
                  setError(
                    "Connection to peer failed. Try refreshing the page."
                  );
                }

                // Handle disconnections
                if (
                  pc.iceConnectionState === "disconnected" ||
                  pc.iceConnectionState === "closed"
                ) {
                  console.warn(
                    `ICE connection ${pc.iceConnectionState} for peer ${call.peer}`
                  );
                }
              };

              // Log ICE gathering state changes
              pc.onicegatheringstatechange = () => {
                console.log(
                  `ICE gathering state for call ${call.peer}: ${pc.iceGatheringState}`
                );
              };

              // Log ICE candidates
              pc.onicecandidate = (event) => {
                if (event.candidate) {
                  console.log(
                    `ICE candidate for call ${call.peer}:`,
                    event.candidate.candidate
                      ? `Type: ${event.candidate.type}, Protocol: ${event.candidate.protocol}`
                      : "No candidate"
                  );
                }
              };
            }
          } catch (monitorErr) {
            console.warn(
              `Could not monitor call connection: ${monitorErr.message}`
            );
          }

          // Handle incoming stream
          call.on("stream", (remoteStream) => {
            console.log(
              `Received remote stream from ${call.peer} with tracks:`,
              remoteStream.getTracks().map((t) => t.kind)
            );

            if (remoteStream.getTracks().length === 0) {
              console.warn(`Stream from ${call.peer} has no tracks!`);
            }

            // Add to peers map with proper media type detection
            const mediaType =
              remoteStream.getVideoTracks().length > 0 ? "video" : "audio";
            addPeer(call.peer, call, remoteStream, mediaType);
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

        if (err.type === "peer-unavailable") {
          console.log("The peer you're trying to connect to is unavailable");
        } else if (err.type === "network" || err.type === "disconnected") {
          setError(`Network error: ${err.message}. Trying to reconnect...`);

          // Attempt to reconnect if disconnected
          setTimeout(() => {
            if (peerRef.current) {
              console.log("Attempting to reconnect peer...");
              try {
                peerRef.current.reconnect();
              } catch (reconnectErr) {
                console.error("Error reconnecting peer:", reconnectErr);
              }
            }
          }, 2000);
        } else if (err.type === "server-error") {
          setError(`Server error: ${err.message}. Please refresh the page.`);
        } else {
          setError(`Connection error: ${err.type || err.message}`);
        }
      });

      // Handle peer disconnection
      peer.on("disconnected", () => {
        console.log("PeerJS disconnected, attempting to reconnect...");
        setConnected(false);

        // Try to reconnect
        setTimeout(() => {
          if (peerRef.current) {
            try {
              console.log("Attempting to reconnect peer after disconnect");
              peerRef.current.reconnect();
            } catch (err) {
              console.error("Error reconnecting after disconnect:", err);
              setError("Reconnection failed. Please refresh the page.");
            }
          }
        }, 2000);
      });

      // Return cleanup function
      return () => {
        if (peer) {
          console.log("Cleaning up peer connection");
          clearTimeout(connectionTimeout);
          try {
            peer.destroy();
          } catch (err) {
            console.error("Error destroying peer in cleanup:", err);
          }
        }
      };
    } catch (err) {
      console.error("Error setting up PeerJS connection:", err);
      setError(`Failed to establish connection: ${err.message}`);

      // Return empty cleanup function on error
      return () => {};
    }
  }, [userId, addPeer, removePeer, initializeMedia]);

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
        let streamToSend = localStreamRef.current;

        if (
          !streamToSend ||
          !streamToSend.active ||
          streamToSend.getTracks().length === 0
        ) {
          console.warn(
            "No active local stream for outgoing call, using empty stream"
          );
          streamToSend = new MediaStream();

          // Try to initialize media again if needed
          if (!streamToSend.active) {
            setTimeout(() => {
              try {
                initializeMedia();
              } catch (err) {
                console.error("Error reinitializing media:", err);
              }
            }, 1000);
          }
        }

        console.log(
          `Calling peer: ${peerId} with stream tracks:`,
          streamToSend.getTracks().map((t) => ({
            kind: t.kind,
            enabled: t.enabled,
            muted: t.muted,
          }))
        );

        // Set timeout for call operation
        const callTimeout = setTimeout(() => {
          console.warn(`Call to peer ${peerId} timed out after 10 seconds`);
        }, 10000);

        // Make the call with proper error handling
        try {
          const call = peerRef.current.call(peerId, streamToSend);

          if (!call) {
            console.error(`Failed to create call to peer: ${peerId}`);
            clearTimeout(callTimeout);
            return;
          }

          // Add temporary placeholder while connecting
          setPeers((prev) => {
            const updated = new Map(prev);
            updated.set(peerId, {
              call,
              stream: null,
              connecting: true,
              userId: peerId.split("-")[0],
              mediaType: "connecting",
            });
            return updated;
          });

          // Set up event handlers safely
          call.on("stream", (remoteStream) => {
            clearTimeout(callTimeout);
            console.log(
              `Received stream from ${peerId} with tracks:`,
              remoteStream.getTracks().map((t) => t.kind)
            );

            // Determine media type based on tracks
            const mediaType =
              remoteStream.getVideoTracks().length > 0 ? "video" : "audio";

            addPeer(peerId, call, remoteStream, mediaType);
          });

          call.on("close", () => {
            clearTimeout(callTimeout);
            console.log(`Call with ${peerId} closed`);
            removePeer(peerId);
          });

          call.on("error", (err) => {
            clearTimeout(callTimeout);
            console.error(`Call error with ${peerId}:`, err);
            removePeer(peerId);
          });
        } catch (callErr) {
          clearTimeout(callTimeout);
          console.error(`Error initiating call to peer ${peerId}:`, callErr);
        }
      } catch (err) {
        console.error(`Error in callPeer ${peerId}:`, err);
      }
    },
    [addPeer, removePeer, initializeMedia]
  );

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    // Cleanup flag to prevent state updates after unmounting
    let isMounted = true;

    // Handle existing participants
    const handleExistingParticipants = (data) => {
      if (!isMounted) return;
      console.log("Received existing participants:", data.participants);

      // Call each existing participant
      data.participants.forEach((participant) => {
        callPeer(participant.peerId);
      });
    };

    // Handle new participant joining - don't update count here
    // The count will be updated when the peer connection is established
    const handleParticipantJoined = (data) => {
      if (!isMounted) return;
      console.log("New participant joined media room:", data);
    };

    // Handle participant leaving
    const handleParticipantLeft = (data) => {
      if (!isMounted) return;
      console.log("Participant left media room:", data);
      removePeer(data.peerId);
    };

    // Handle participant state changes
    const handleParticipantStateChanged = (data) => {
      if (!isMounted) return;
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

    console.log("Registered media socket event handlers");

    // Cleanup function
    return () => {
      // Set cleanup flag first
      isMounted = false;

      // Then remove all event listeners
      console.log("Removing media socket event handlers");
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

    // Cleanup flag to prevent operations after unmounting
    let isMounted = true;

    // Setup peer connection
    const cleanupPeer = setupPeerConnection();

    // Return cleanup function
    return () => {
      console.log("Cleaning up CallPanel resources");
      isMounted = false;

      // First clean up media resources
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => {
          console.log(`Stopping track: ${track.kind}`);
          track.stop();
        });
        localStreamRef.current = null;
      }

      // Close all peer connections
      if (peersRef.current) {
        peersRef.current.forEach((peerData, peerId) => {
          if (peerData.call) {
            try {
              console.log(`Closing call with peer: ${peerId}`);
              peerData.call.close();
            } catch (err) {
              console.error(`Error closing call with peer ${peerId}:`, err);
            }
          }
        });
        peersRef.current.clear();
      }

      // Emit leave media event if socket is still connected
      if (socket && socket.connected) {
        try {
          socket.emit("leave-media", {
            sessionId,
            userId,
            peerId: peerRef.current?.id,
          });
        } catch (err) {
          console.error("Error emitting leave-media event:", err);
        }
      }

      // Clean up peer connection
      if (cleanupPeer && typeof cleanupPeer === "function") {
        try {
          cleanupPeer();
        } catch (err) {
          console.error("Error in cleanupPeer function:", err);
        }
      }

      // Explicitly destroy peer connection
      if (peerRef.current) {
        try {
          peerRef.current.destroy();
        } catch (err) {
          console.error("Error destroying peer connection:", err);
        }
        peerRef.current = null;
      }

      // Run additional cleanup from leaveMediaRoom but only if it's safe
      try {
        if (socket && socket.connected && sessionId) {
          leaveMediaRoom();
        }
      } catch (err) {
        console.error("Error in leaveMediaRoom:", err);
      }
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

  // Mouse event handlers for dragging - updated to use refs for safety
  const handleMouseDown = (e) => {
    if (
      e.target.closest(".call-controls") ||
      e.target.closest(".remote-video")
    ) {
      return;
    }

    // Use the ref value for current position to avoid TDZ issues
    const currentPosition = positionRef.current;
    setIsDragging(true);
    isDraggingRef.current = true;

    dragStartRef.current = {
      x: e.clientX - currentPosition.x,
      y: e.clientY - currentPosition.y,
    };

    e.preventDefault();
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDraggingRef.current) return;

    requestAnimationFrame(() => {
      const dragStart = dragStartRef.current || { x: 0, y: 0 };
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;

      const updatedPosition = {
        x: Math.max(0, newX),
        y: Math.max(0, newY),
      };

      // Update both state and ref
      setPosition(updatedPosition);
      positionRef.current = updatedPosition;
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
          {peerData.connecting ? (
            // Show connecting state
            <div className="connecting-participant">
              <div className="avatar-placeholder">
                {peerData.userId?.charAt(0) || "U"}
              </div>
              <div className="connecting-indicator">Connecting...</div>
            </div>
          ) : peerData.mediaType === "video" && peerData.stream ? (
            // Video participant
            <video
              ref={(el) => {
                remoteVideoRefs.current[peerId] = el;
                // If element is new and we have a stream, set it immediately
                if (el && peerData.stream && el.srcObject !== peerData.stream) {
                  console.log(`Setting video srcObject for peer ${peerId}`);
                  el.srcObject = peerData.stream;
                  el.onloadedmetadata = () =>
                    el
                      .play()
                      .catch((e) => console.error("Error playing video:", e));
                }
              }}
              autoPlay
              playsInline
              className="remote-video"
            />
          ) : (
            // Audio participant or fallback
            <div className="audio-participant">
              <div className="avatar-placeholder">
                {peerData.userId?.charAt(0) || "U"}
              </div>
              {peerData.stream ? (
                <audio
                  ref={(el) => {
                    remoteAudioRefs.current[peerId] = el;
                    // If element is new and we have a stream, set it immediately
                    if (
                      el &&
                      peerData.stream &&
                      el.srcObject !== peerData.stream
                    ) {
                      console.log(`Setting audio srcObject for peer ${peerId}`);
                      el.srcObject = peerData.stream;
                      el.onloadedmetadata = () =>
                        el
                          .play()
                          .catch((e) =>
                            console.error("Error playing audio:", e)
                          );
                    }
                  }}
                  autoPlay
                />
              ) : (
                <div className="no-stream-indicator">No media</div>
              )}
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

// Define prop types outside of component to prevent temporal dead zone issues
const callPanelPropTypes = {
  sessionId: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired,
};

CallPanel.propTypes = callPanelPropTypes;

export default CallPanel;
