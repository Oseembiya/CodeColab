import { useEffect, useRef, useState, useCallback } from "react";
import Peer from "peerjs";
import PropTypes from "prop-types";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../hooks/useAuth";
import config from "../../config/env";

/**
 * Shared communication manager that handles WebRTC and PeerJS connections
 * This component doesn't render anything but provides connection management
 * for Audio and Video components
 */
const CommunicationManager = ({
  sessionId,
  userId,
  onPeerConnected,
  onStreamReady,
  onError,
  mediaConstraints = { audio: true, video: true },
  children,
}) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [peers, setPeers] = useState(new Map());
  const [stream, setStream] = useState(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isUnmountingRef = useRef(false);
  const [error, setError] = useState(null);

  // Connection management state
  const [reconnectCount, setReconnectCount] = useState(0);
  const knownStaleIdsRef = useRef(new Set());
  const peerTimestampsRef = useRef(new Map());
  const localPeerIdRef = useRef(null); // Track our own peer ID
  const initialJoinCompleteRef = useRef(false); // Flag for initial join
  const processedPeersRef = useRef(new Set()); // Track processed peers
  const [initialSetupDone, setInitialSetupDone] = useState(false);

  // Helper function to add peer to state
  const addPeerToState = useCallback(
    (peerId, peerStream, name) => {
      console.log(`Adding peer to state: ${peerId} with name: ${name}`);

      setPeers((prevPeers) => {
        const newPeers = new Map(prevPeers);
        newPeers.set(peerId, {
          stream: peerStream,
          name: name || `User-${peerId.substring(0, 6)}`,
        });
        return newPeers;
      });

      processedPeersRef.current.add(peerId);

      // Call the onPeerConnected callback
      if (onPeerConnected) {
        onPeerConnected(peerId, peerStream, name);
      }
    },
    [onPeerConnected]
  );

  // Helper function to remove peer from state
  const removePeerFromState = useCallback((peerId) => {
    console.log(`Removing peer from state: ${peerId}`);
    setPeers((prevPeers) => {
      const newPeers = new Map(prevPeers);
      newPeers.delete(peerId);
      return newPeers;
    });

    // Remove from processed peers list to allow reconnection
    processedPeersRef.current.delete(peerId);
  }, []);

  // Ensure friendly name for display
  const ensureFriendlyName = useCallback((peerId, providedName) => {
    if (providedName && providedName !== "undefined") {
      return providedName;
    }

    // Extract user ID from peer ID
    const peerIdParts = peerId.split("-");
    const extractedUserId = peerIdParts.length > 1 ? peerIdParts[1] : "unknown";

    // Try to find a stored name for this user ID
    const storedName = localStorage.getItem(`user-${extractedUserId}`);
    if (storedName) {
      return storedName;
    }

    // Fallback to a generic name with ID
    return `User-${extractedUserId.substring(0, 6)}`;
  }, []);

  // Track peer timestamps to detect stale peers
  const trackPeerTimestamp = useCallback((peerId) => {
    peerTimestampsRef.current.set(peerId, Date.now());
  }, []);

  // Check if a peer is stale (no updates for a long time)
  const isPeerStale = useCallback((peerId) => {
    const lastSeen = peerTimestampsRef.current.get(peerId);
    if (!lastSeen) return false;

    // If the peer ID is more than 5 minutes old without updates
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return lastSeen < fiveMinutesAgo;
  }, []);

  // Mark a peer ID as known to be stale
  const markPeerAsStale = useCallback((peerId) => {
    knownStaleIdsRef.current.add(peerId);
    peerTimestampsRef.current.delete(peerId);
  }, []);

  // Handle connection issues reported by remote peers
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
    [peers, addPeerToState, removePeerFromState, markPeerAsStale]
  );

  // Retry connection when disconnected
  const retryConnection = useCallback(() => {
    console.log("Manually retrying connection...");
    setError(null);
    onError?.(null);

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
    const initializationKey = `${sessionId}_${userId}_init`;
    sessionStorage.removeItem(initializationKey);

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
  }, [sessionId, userId, onError]);

  // Main setup effect for PeerJS and WebRTC connections
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

        // Configure audio options for optimal quality
        const audioOptions = mediaConstraints.audio
          ? {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 48000,
              channelCount: 2,
              latency: 0.01,
              highpassFilter: true,
              volume: 1.0,
            }
          : false;

        // Use provided constraints but ensure our audio quality settings
        const streamConstraints = {
          ...mediaConstraints,
          audio: mediaConstraints.audio ? audioOptions : false,
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(
          streamConstraints
        );

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
        onStreamReady?.(mediaStream);

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
            onError?.(null);
          } else if (err.type === "server-error") {
            console.error("PeerJS server error:", err);
            const errMsg =
              "Server communication error. Please refresh the page.";
            setError(errMsg);
            onError?.(errMsg);
          } else if (err.type === "network" || err.type === "disconnected") {
            const errMsg = `Peer error: ${err.type}`;
            setError(errMsg);
            onError?.(errMsg);
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
            const errMsg = `Peer error: ${err.type}`;
            setError(errMsg);
            onError?.(errMsg);
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

          // Mark initial setup as done
          setInitialSetupDone(true);
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
        console.error("Error initializing communication:", err);
        setError(err.message);
        onError?.(err.message);
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
                await navigator.mediaDevices.getUserMedia(mediaConstraints);

              // Replace the old stream
              streamRef.current.getTracks().forEach((track) => track.stop());
              streamRef.current = freshMediaStream;
              setStream(freshMediaStream);
              onStreamReady?.(freshMediaStream);

              console.log("Media stream refreshed successfully");
            } catch (mediaErr) {
              console.error("Failed to refresh media stream:", mediaErr);
              const errMsg =
                "Camera/microphone access error. Please check permissions and try again.";
              setError(errMsg);
              onError?.(errMsg);
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

      // Remove peer from our UI
      removePeerFromState(peerId);
    };

    // Set up event listeners
    if (socket) {
      console.log("Setting up socket event listeners for peer management");

      // Joining and leaving events
      socket.on("user-joined-video", handleUserJoined);
      socket.on("user-left-video", handleUserLeft);

      // Historical participants (anyone who was already in the session)
      socket.on("historical-participants", ({ participants = [] }) => {
        console.log(
          `Found ${participants.length} historical participants for session ${sessionId}`
        );
        participants.forEach((participant) => {
          if (!participant.peerId || participant.userId === userId) return;
          handleUserJoined(participant);
        });

        // Mark initial join as completed
        initialJoinCompleteRef.current = true;
      });

      // Set up PeerJS and socket connection
      setupPeerAndSocket();
    }

    // Cleanup function
    return () => {
      isUnmountingRef.current = true;

      // Remove event listeners
      if (socket) {
        socket.off("user-joined-video", handleUserJoined);
        socket.off("user-left-video", handleUserLeft);
        socket.off("historical-participants");
      }

      // Leave the session
      if (socket && localPeerIdRef.current) {
        console.log(`Starting leave process for session: ${sessionId}`);
        socket.emit("leave-video", {
          sessionId,
          userId,
          peerId: localPeerIdRef.current,
        });
        console.log("Leave process completed, navigating away");
      }

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

      // Remove setupPeerForSession from window
      window.setupPeerForSession = null;
    };
  }, [
    sessionId,
    userId,
    socket,
    mediaConstraints,
    user?.displayName,
    onStreamReady,
    onError,
    addPeerToState,
    removePeerFromState,
    ensureFriendlyName,
    trackPeerTimestamp,
    markPeerAsStale,
  ]);

  return children({
    stream,
    peers: Array.from(peers.entries()).map(([peerId, peerData]) => [
      peerId,
      peerData.stream || peerData, // Handle both new format and legacy format
      peerData.name || `User-${peerId.substring(0, 6)}`, // Ensure name is always populated
    ]),
    error,
    retryConnection,
    handleConnectionIssue,
  });
};

CommunicationManager.propTypes = {
  sessionId: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired,
  onPeerConnected: PropTypes.func,
  onStreamReady: PropTypes.func,
  onError: PropTypes.func,
  mediaConstraints: PropTypes.object,
  children: PropTypes.func.isRequired,
};

export default CommunicationManager;
