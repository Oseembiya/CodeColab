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
import config from "../../config/env";

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

  // Add this right after the useState declarations
  const [reconnectCount, setReconnectCount] = useState(0);
  const knownStaleIdsRef = useRef(new Set());
  const peerTimestampsRef = useRef(new Map());
  const localPeerIdRef = useRef(null); // Track our own peer ID
  const initialJoinCompleteRef = useRef(false); // Flag for initial join
  const processedPeersRef = useRef(new Set()); // Track processed peers

  // Add this new useEffect to enumerate audio devices
  const [audioInputDevices, setAudioInputDevices] = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);

  useEffect(() => {
    // Only run if browser supports the API
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const inputs = devices.filter(
            (device) => device.kind === "audioinput"
          );
          const outputs = devices.filter(
            (device) => device.kind === "audiooutput"
          );

          console.log("Available audio input devices:", inputs);
          console.log("Available audio output devices:", outputs);

          setAudioInputDevices(inputs);
          setAudioOutputDevices(outputs);
        })
        .catch((err) => {
          console.error("Error enumerating audio devices:", err);
        });
    } else {
      console.warn(
        "This browser does not support mediaDevices.enumerateDevices()"
      );
    }
  }, []);

  // Suppress PeerJS console errors
  useEffect(() => {
    // Save original console.error
    const originalConsoleError = console.error;

    // Replace with filtered version
    console.error = (...args) => {
      // Filter out common PeerJS errors
      const errorString = args.join(" ");
      if (
        errorString.includes("Could not connect to peer") ||
        errorString.includes("peer-unavailable") ||
        errorString.includes("ERR_ICE_CONNECTION_FAILURE")
      ) {
        // Only log these at debug level
        console.debug(...args);
        return;
      }

      // Pass through all other errors
      originalConsoleError(...args);
    };

    // Restore original on cleanup
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  useEffect(() => {
    setInitialSetupDone(true);
  }, []);

  // Helper function to add peer to state
  const addPeerToState = (peerId, stream, userName) => {
    if (isUnmountingRef.current) return;

    // Critical checks to prevent duplicates:

    // 1. Don't add self
    if (localPeerIdRef.current && peerId === localPeerIdRef.current) {
      console.debug("Preventing self from being added to peers list");
      return;
    }

    // 2. Check if we've already processed this peer in this session
    if (processedPeersRef.current.has(peerId)) {
      console.debug(`Already processed peer ${peerId}, preventing duplicate`);
      return;
    }

    // Mark as processed
    processedPeersRef.current.add(peerId);

    // Ensure we have a friendly display name
    const friendlyName = ensureFriendlyName(peerId, userName);

    setPeers((prev) => {
      // If peer already exists with the same ID, don't add it again
      if (prev.has(peerId)) {
        console.debug(`Peer ${peerId} already exists, not adding duplicate`);
        return prev;
      }

      return new Map(prev).set(peerId, {
        stream,
        label: friendlyName,
      });
    });
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
    console.log(`Removing peer from state: ${peerId}`);
    setPeers((prevPeers) => {
      const newPeers = new Map(prevPeers);
      newPeers.delete(peerId);
      return newPeers;
    });

    // Remove from processed peers list to allow reconnection
    processedPeersRef.current.delete(peerId);
  };

  // Update to track when a peer ID was last seen active
  const trackPeerTimestamp = (peerId) => {
    peerTimestampsRef.current.set(peerId, Date.now());
  };

  // Check if a peer ID is likely stale based on timestamp
  const isPeerLikelyStale = (peerId) => {
    // If we know it's stale from prior connection attempts
    if (knownStaleIdsRef.current.has(peerId)) {
      return true;
    }

    const lastSeen = peerTimestampsRef.current.get(peerId);
    if (!lastSeen) return false; // No data to judge

    // If the peer ID is more than 5 minutes old without updates
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return lastSeen < fiveMinutesAgo;
  };

  // Mark a peer ID as known to be stale
  const markPeerAsStale = (peerId) => {
    knownStaleIdsRef.current.add(peerId);
    peerTimestampsRef.current.delete(peerId);
  };

  // Handle connection issues reported by RemoteVideo component
  const handleConnectionIssue = useCallback(
    (peerId, issueType = "general") => {
      console.log(`Connection issue detected for peer ${peerId}: ${issueType}`);

      // Skip if peer is already being processed or is known to be stale
      if (knownStaleIdsRef.current.has(peerId)) {
        console.log(`Skipping recovery for known stale peer: ${peerId}`);
        return;
      }

      // Try to recover the connection by reinitializing the call
      if (peerRef.current && streamRef.current && !isUnmountingRef.current) {
        setTimeout(() => {
          try {
            // Get peer info from current state
            const peerInfo = peers.get(peerId);
            if (!peerInfo) {
              console.log(`No peer info found for ${peerId}, cannot recover`);
              return;
            }

            console.log(`Attempting to recover connection with peer ${peerId}`);

            // End existing call if any
            const existingCall =
              peerRef.current._mediaConnections &&
              peerRef.current._mediaConnections[peerId];

            if (existingCall) {
              try {
                console.log(`Closing existing call to ${peerId}`);
                existingCall.close();
              } catch (e) {
                console.warn(`Error closing existing call: ${e.message}`);
              }
            }

            // Create a new call after a short delay
            setTimeout(() => {
              if (peerRef.current && streamRef.current) {
                console.log(`Initiating new call to ${peerId}`);
                const newCall = peerRef.current.call(peerId, streamRef.current);

                newCall.on("stream", (remoteStream) => {
                  console.log(`Received stream from recovered peer ${peerId}`);
                  addPeerToState(peerId, remoteStream, peerInfo.name);
                });

                newCall.on("error", (callErr) => {
                  console.error(`Recovery call error for ${peerId}:`, callErr);
                  if (callErr.type === "peer-unavailable") {
                    // Mark as stale if truly unavailable after recovery attempt
                    markPeerAsStale(peerId);
                    removePeerFromState(peerId);
                  }
                });
              }
            }, 500);
          } catch (err) {
            console.error(
              `Error during connection recovery for ${peerId}:`,
              err
            );
          }
        }, 1000);
      }
    },
    [peers]
  );

  useEffect(() => {
    isUnmountingRef.current = false;

    const setupPeerAndSocket = async () => {
      // Track initialization state to prevent multiple setup calls
      const initializationKey = `${sessionId}_${userId}_init`;
      if (sessionStorage.getItem(initializationKey)) {
        console.debug(
          "Setup already initialized for this session, skipping duplicate initialization"
        );
        return;
      }

      try {
        // Mark as initialized at the start to prevent duplicate setups
        sessionStorage.setItem(initializationKey, Date.now().toString());

        // 1. Get user media stream
        console.log("Attempting to get user media stream...");
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
        console.log("User media stream acquired successfully");
        console.log(
          "Media stream tracks:",
          mediaStream
            .getTracks()
            .map(
              (track) =>
                `${track.kind}: ${track.label} (enabled: ${track.enabled}, muted: ${track.muted})`
            )
        );

        streamRef.current = mediaStream;
        setStream(mediaStream);

        // 2. Initialize PeerJS
        const peerId = `${sessionId}-${userId}-${Date.now()}`;
        console.log(`Initializing PeerJS with ID: ${peerId}`);
        console.log(
          `Connecting to PeerJS server: ${config.peer.host}:${config.peer.port}`
        );

        // If connection fails with CSP error, the Content-Security-Policy in netlify.toml
        // might need updating to include 'https://0.peerjs.com wss://0.peerjs.com'
        const peer = new Peer(peerId, {
          host: config.peer.host,
          port: config.peer.port,
          path: config.peer.path,
          secure: config.peer.secure,
          debug: 3, // Enable full debugging
          config: {
            iceServers: config.webrtc.iceServers,
            iceTransportPolicy: "all",
            iceCandidatePoolSize: 10,
            bundlePolicy: "max-bundle",
            rtcpMuxPolicy: "require",
            sdpSemantics: "unified-plan",
            reconnectTimer: 3000,
            peerIdentity: null,
            sdpTransform: (sdp) => {
              // Add better audio codecs configuration
              let newSdp = sdp;

              // Improve opus codec parameters
              newSdp = newSdp.replace(
                "useinbandfec=1",
                "useinbandfec=1; stereo=1; maxaveragebitrate=510000; maxplaybackrate=48000"
              );

              // Prioritize opus for better audio
              if (newSdp.includes("opus/48000")) {
                // Move opus to the top of the codec list
                const mediaSection = newSdp.match(/m=audio.*\r\n/g);
                if (mediaSection && mediaSection.length > 0) {
                  const codecSection = newSdp
                    .split(mediaSection[0])[1]
                    .split("m=")[0];

                  // Find opus
                  const opusRTPLine = codecSection.match(
                    /a=rtpmap:(\d+) opus\/48000.*/
                  )[0];
                  const opusPayloadType =
                    opusRTPLine.match(/a=rtpmap:(\d+)/)[1];

                  // Modify the media section to prioritize opus
                  const newMediaSection = mediaSection[0].replace(
                    /m=audio \d+ UDP\/TLS\/RTP\/SAVPF (.*)/,
                    (match, payloadTypes) => {
                      const types = payloadTypes.split(" ");
                      types.splice(types.indexOf(opusPayloadType), 1);
                      return `m=audio ${
                        newSdp.match(/m=audio (\d+)/)[1]
                      } UDP/TLS/RTP/SAVPF ${opusPayloadType} ${types.join(
                        " "
                      )}`;
                    }
                  );

                  newSdp = newSdp.replace(mediaSection[0], newMediaSection);
                }
              }

              console.log("Audio SDP modified to improve quality");
              return newSdp;
            },
          },
          pingInterval: config.peer.pingInterval || 10000, // Use config value or default to 10s
          retryAttempts: config.peer.reconnectAttempts || 10, // More reconnection attempts
          iceTransportPolicy: "all",
          reliable: true,
        });

        peerRef.current = peer;

        // Error handling
        peer.on("error", (err) => {
          console.error("Peer error:", err.type, err);

          // Track stale peer IDs
          if (err.type === "peer-unavailable") {
            const errorMessage = err.message || "";
            const match = errorMessage.match(/Could not connect to peer (.*)/);
            if (match && match[1]) {
              const stalePeerId = match[1];
              console.log(`Marking unavailable peer as stale: ${stalePeerId}`);
              markPeerAsStale(stalePeerId);
            }

            console.log(
              "Attempted to connect to unavailable peer, this is normal if users reconnected"
            );
            // Don't display this error to users
            setError(null);
          } else if (err.type === "server-error") {
            console.error("PeerJS server error:", err);
            setError("Server communication error. Please refresh the page.");
          } else if (err.type === "network" || err.type === "disconnected") {
            setError(`Peer error: ${err.type}`);
            console.log("Attempting to reconnect due to network error");

            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(() => {
              if (!isUnmountingRef.current && peerRef.current) {
                if (peerRef.current.disconnected) {
                  setReconnectCount((prev) => prev + 1);
                  try {
                    // First try to reconnect to the existing peer
                    console.log("Attempting to reconnect to PeerJS server...");
                    peerRef.current.reconnect();

                    // If we have too many reconnection attempts, try to destroy and recreate
                    if (
                      reconnectCount > config.webrtc.reconnectionAttempts ||
                      reconnectCount > 3
                    ) {
                      console.log(
                        "Multiple reconnect attempts failed, recreating peer"
                      );
                      setTimeout(() => {
                        try {
                          if (peerRef.current) {
                            console.log("Destroying peer and recreating...");
                            peerRef.current.destroy();

                            // Clear the initialization key to allow recreation
                            sessionStorage.removeItem(initializationKey);

                            // Setup again with slight delay to ensure clean slate
                            setTimeout(() => {
                              setupPeerAndSocket();
                            }, 1000);
                          }
                        } catch (e) {
                          console.error("Error recreating peer:", e);
                        }
                      }, 1000);
                    }
                  } catch (e) {
                    console.error("Error during reconnection:", e);
                  }
                }
              }
            }, 2000);
          } else {
            setError(`Peer error: ${err.type}`);
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
          // Store local peer ID to prevent self-connections
          localPeerIdRef.current = peerId;

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

            // Join after a short delay to ensure WebRTC is fully initialized
            setTimeout(() => {
              socket.emit("join-video", {
                sessionId,
                userId,
                peerId,
                userName,
              });
            }, 300);
          }
        });

        // Handle incoming calls
        peer.on("call", (call) => {
          console.log(`Received incoming call from ${call.peer}`);
          if (streamRef.current) {
            console.log(
              `Answering call with local stream (${
                streamRef.current.getTracks().length
              } tracks)`
            );
            call.answer(streamRef.current);
          } else {
            console.error("Cannot answer call - no local stream available");
          }

          call.on("stream", (remoteStream) => {
            console.log(
              `Received remote stream from ${call.peer} with ${
                remoteStream.getTracks().length
              } tracks`
            );
            console.log(
              "Remote tracks:",
              remoteStream
                .getTracks()
                .map(
                  (track) =>
                    `${track.kind}: ${track.readyState} (enabled: ${track.enabled})`
                )
            );

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
        // Remove initialization mark if failed
        sessionStorage.removeItem(initializationKey);
      }
    };

    // Make setupPeerAndSocket accessible for retry
    window.setupPeerForSession = setupPeerAndSocket;

    // Socket event handlers
    const handleUserJoined = async ({
      peerId: newPeerId,
      userId: remoteUserId,
      name,
    }) => {
      // Safety checks to prevent race conditions and duplicate connections

      // 1. Skip if this is our own peer ID
      if (localPeerIdRef.current && newPeerId === localPeerIdRef.current) {
        console.debug("Ignoring own join event");
        return;
      }

      // 2. Skip if we've already processed this peer
      if (processedPeersRef.current.has(newPeerId)) {
        console.debug(`Already processed peer ${newPeerId}, skipping`);
        return;
      }

      // 3. Skip if peer is in our known stale list
      if (knownStaleIdsRef.current.has(newPeerId)) {
        console.debug(`Skipping known stale peer: ${newPeerId}`);
        return;
      }

      // Store the remote user's name for future reference
      if (name && name !== `User-${remoteUserId.substring(0, 6)}`) {
        localStorage.setItem(`remoteUser-${newPeerId}`, name);
        localStorage.setItem(`user-${remoteUserId}`, name);
      }

      if (peerRef.current && streamRef.current && !isUnmountingRef.current) {
        // Use a try-catch to handle any potential errors
        try {
          console.debug(`Attempting to call peer: ${newPeerId}`);

          // Check if we have permission to access the camera/microphone
          if (
            streamRef.current
              .getTracks()
              .some((track) => track.readyState === "ended")
          ) {
            console.error(
              "Media tracks have ended. Attempting to recreate media stream..."
            );

            // Try to refresh the media stream
            try {
              const freshMediaStream =
                await navigator.mediaDevices.getUserMedia({
                  video: true,
                  audio: true,
                });

              // Replace the old stream
              streamRef.current.getTracks().forEach((track) => track.stop());
              streamRef.current = freshMediaStream;
              setStream(freshMediaStream);

              console.log("Media stream refreshed successfully");
            } catch (mediaErr) {
              console.error("Failed to refresh media stream:", mediaErr);
              setError(
                "Camera/microphone access error. Please check permissions and try again."
              );
              return;
            }
          }

          const call = peerRef.current.call(newPeerId, streamRef.current);

          call.on("error", (err) => {
            console.debug("Call error:", err);

            // Mark as stale if unavailable
            if (err.type === "peer-unavailable") {
              markPeerAsStale(newPeerId);
            }
          });

          call.on("iceStateChanged", (state) => {
            if (state === "failed" || state === "disconnected") {
              setTimeout(() => {
                if (
                  peerRef.current &&
                  !isUnmountingRef.current &&
                  !knownStaleIdsRef.current.has(newPeerId)
                ) {
                  console.debug(`Attempting ICE reconnect to: ${newPeerId}`);
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
            try {
              const audioTracks = remoteStream.getAudioTracks();
              if (audioTracks.length > 0) {
                audioTracks[0].enabled = true;
              }
            } catch (trackErr) {
              console.debug("Error enabling audio tracks:", trackErr);
            }

            // Use our ensureFriendlyName function for consistent naming
            const friendlyName = ensureFriendlyName(newPeerId, name);

            addPeerToState(newPeerId, remoteStream, friendlyName);
            trackPeerTimestamp(newPeerId);
          });
        } catch (callErr) {
          console.debug("Error calling peer:", callErr);
        }
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
        // Only process this once to avoid duplicate connections
        if (initialJoinCompleteRef.current) {
          console.debug(
            "Already completed initial join, ignoring participant list"
          );
          return;
        }

        initialJoinCompleteRef.current = true;

        if (peerRef.current && streamRef.current && !isUnmountingRef.current) {
          // Create a Set of active peers to track connection attempts
          const activePeerIds = new Set();
          const connectionAttempts = new Map();

          // Add a delay to allow local peer setup to complete
          setTimeout(() => {
            // First pass - update timestamps and filter out stale peers
            const validParticipants = participants.filter(({ peerId }) => {
              // Skip self connections
              if (localPeerIdRef.current && peerId === localPeerIdRef.current) {
                console.debug("Skipping self in participant list");
                return false;
              }

              // Skip if we've already processed this peer
              if (processedPeersRef.current.has(peerId)) {
                console.debug(`Already processed peer ${peerId}, skipping`);
                return false;
              }

              // Update timestamp for any peer we see
              trackPeerTimestamp(peerId);

              // Skip known stale peers
              if (knownStaleIdsRef.current.has(peerId)) {
                console.debug(`Skipping known stale peer: ${peerId}`);
                return false;
              }

              return true;
            });

            console.debug(
              `Processing ${validParticipants.length} valid participants`
            );

            // Process each valid participant sequentially to avoid connection storms
            const processNextParticipant = (index) => {
              if (index >= validParticipants.length) {
                console.debug("Finished processing all participants");

                // After processing all, clean up stale peers
                peers.forEach((_, existingPeerId) => {
                  if (isPeerLikelyStale(existingPeerId)) {
                    console.debug(`Removing stale peer: ${existingPeerId}`);
                    removePeerFromState(existingPeerId);
                  }
                });

                return;
              }

              const {
                peerId,
                name,
                userId: remoteUserId,
              } = validParticipants[index];

              // Add to active peers tracking
              activePeerIds.add(peerId);

              // Track by user ID to prevent duplicate connections
              if (connectionAttempts.has(remoteUserId)) {
                console.debug(
                  `Already connecting to user ${remoteUserId}, skipping duplicate`
                );
                // Process next after a short delay
                setTimeout(() => processNextParticipant(index + 1), 100);
                return;
              }

              connectionAttempts.set(remoteUserId, peerId);

              // Store name for future use
              if (name && name !== `User-${remoteUserId.substring(0, 6)}`) {
                localStorage.setItem(`remoteUser-${peerId}`, name);
                localStorage.setItem(`user-${remoteUserId}`, name);
              }

              // Skip if already connected
              if (peers.has(peerId)) {
                console.debug(`Already connected to peer ${peerId}, skipping`);
                setTimeout(() => processNextParticipant(index + 1), 100);
                return;
              }

              try {
                console.debug(`Initiating call to peer: ${peerId}`);
                const call = peerRef.current.call(peerId, streamRef.current);

                // Set timeout to move to next participant if call doesn't complete
                const callTimeoutId = setTimeout(() => {
                  console.debug(
                    `Call to ${peerId} timed out, moving to next participant`
                  );
                  setTimeout(() => processNextParticipant(index + 1), 100);
                }, 3000);

                call.on("error", (err) => {
                  console.debug(`Call error for ${peerId}:`, err);
                  clearTimeout(callTimeoutId);

                  if (err.type === "peer-unavailable") {
                    markPeerAsStale(peerId);
                  }

                  // Move to next participant
                  setTimeout(() => processNextParticipant(index + 1), 100);
                });

                call.on("stream", (remoteStream) => {
                  console.debug(`Received stream from ${peerId}`);
                  clearTimeout(callTimeoutId);

                  try {
                    // Enable audio
                    const audioTracks = remoteStream.getAudioTracks();
                    if (audioTracks.length > 0) {
                      audioTracks[0].enabled = true;
                    }

                    // Add to peers list
                    const friendlyName = ensureFriendlyName(peerId, name);
                    addPeerToState(peerId, remoteStream, friendlyName);
                    trackPeerTimestamp(peerId);

                    // Move to next participant
                    setTimeout(() => processNextParticipant(index + 1), 300);
                  } catch (streamErr) {
                    console.debug("Error handling stream:", streamErr);
                    setTimeout(() => processNextParticipant(index + 1), 100);
                  }
                });

                // Also move forward if call is closed
                call.on("close", () => {
                  clearTimeout(callTimeoutId);
                  setTimeout(() => processNextParticipant(index + 1), 100);
                });
              } catch (callErr) {
                console.debug(`Error initiating call to ${peerId}:`, callErr);
                setTimeout(() => processNextParticipant(index + 1), 100);
              }
            };

            // Start processing participants
            if (validParticipants.length > 0) {
              processNextParticipant(0);
            }
          }, 500); // Small delay to ensure peer is ready
        }
      });

      setupPeerAndSocket();
    }

    // Cleanup function
    return () => {
      isUnmountingRef.current = true;

      // Clear stale peer tracking
      knownStaleIdsRef.current.clear();
      peerTimestampsRef.current.clear();
      processedPeersRef.current.clear();
      initialJoinCompleteRef.current = false;
      localPeerIdRef.current = null;

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

      // Remove setupPeerAndSocket from window
      window.setupPeerForSession = null;
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

  // Add a retry function to reconnect
  const retryConnection = () => {
    console.log("Manually retrying connection...");
    setError(null);

    // Clear any existing timeouts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Destroy existing peer if any
    if (peerRef.current) {
      try {
        peerRef.current.destroy();
      } catch (e) {
        console.error("Error destroying peer during retry:", e);
      }
    }

    // Clear the session storage to allow reinitialization
    sessionStorage.removeItem(`${sessionId}_${userId}_init`);

    // Reset all state
    setPeers(new Map());
    setReconnectCount(0);
    knownStaleIdsRef.current.clear();
    peerTimestampsRef.current.clear();
    processedPeersRef.current.clear();
    initialJoinCompleteRef.current = false;

    // Restart the peer setup process
    setTimeout(() => {
      if (window.setupPeerForSession) {
        window.setupPeerForSession();
      }
    }, 1000);
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
              console.log(`Changing audio input device to: ${e.target.value}`);
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
                  console.log(
                    `New audio stream acquired with ${
                      newStream.getAudioTracks().length
                    } audio tracks`
                  );
                  const audioTrack = newStream.getAudioTracks()[0];
                  const oldTrack = streamRef.current.getAudioTracks()[0];

                  if (oldTrack) {
                    console.log(`Removing old audio track: ${oldTrack.label}`);
                    streamRef.current.removeTrack(oldTrack);
                    oldTrack.stop();
                  }

                  if (audioTrack) {
                    console.log(`Adding new audio track: ${audioTrack.label}`);
                    streamRef.current.addTrack(audioTrack);
                    audioTrack.enabled = true;
                  }
                })
                .catch((err) => {
                  console.error(`Error changing audio device: ${err.message}`);
                });
            }
          }}
        >
          <option value="">Select audio input device</option>
          {audioInputDevices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label ||
                `Microphone ${audioInputDevices.indexOf(device) + 1}`}
            </option>
          ))}
        </select>
      </div>

      {/* Add output device selector if setSinkId is available */}
      {audioOutputDevices.length > 0 &&
        typeof HTMLMediaElement.prototype.setSinkId === "function" && (
          <div className="audio-output-selector">
            <select
              onChange={(e) => {
                const sinkId = e.target.value;
                console.log(`Changing audio output to: ${sinkId}`);

                // Apply to all video elements
                document
                  .querySelectorAll(".video-container:not(.local) video")
                  .forEach((video) => {
                    if (typeof video.setSinkId === "function") {
                      video.setSinkId(sinkId).catch((err) => {
                        console.error(
                          `Error setting audio output: ${err.message}`
                        );
                      });
                    }
                  });
              }}
            >
              <option value="">Select speaker</option>
              {audioOutputDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label ||
                    `Speaker ${audioOutputDevices.indexOf(device) + 1}`}
                </option>
              ))}
            </select>
            <span className="output-label">Speaker</span>
          </div>
        )}

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
            console.log(`Setting volume for all peers to: ${volume}`);

            // Use requestAnimationFrame to batch DOM updates
            requestAnimationFrame(() => {
              // Update volume for all remote videos
              document
                .querySelectorAll(".video-container:not(.local) video")
                .forEach((video) => {
                  video.volume = volume;
                  console.log(`Set volume for a video element to ${volume}`);
                });
            });
          }}
        />
        <span className="volume-label">Volume</span>
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
              isInitialSetup={initialSetupDone}
              participantName={participantName}
              onConnectionIssue={handleConnectionIssue}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="video-error">
          Error: {error}
          <button
            onClick={(e) => {
              e.stopPropagation();
              retryConnection();
            }}
            className="retry-button"
          >
            Retry Connection
          </button>
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
  userId: PropTypes.string.isRequired,
};

export default VideoChat;
