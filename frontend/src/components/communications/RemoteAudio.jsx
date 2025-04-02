import { useEffect, useRef, memo, useState } from "react";
import PropTypes from "prop-types";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaExclamationTriangle,
} from "react-icons/fa";

/**
 * RemoteAudio component to handle audio playback for remote peers
 */
const RemoteAudio = memo(
  ({ peerId, peerStream, participantName, onConnectionIssue }) => {
    const audioRef = useRef(null);
    const intervalRef = useRef(null);
    const audioContextRef = useRef(null);
    const setupCompletedRef = useRef(false);
    const [audioActive, setAudioActive] = useState(true);
    const [streamError, setStreamError] = useState(false);
    const errorTimeoutRef = useRef(null);
    const isUnmountingRef = useRef(false);
    const lastActivityRef = useRef(Date.now());

    // Reset error state when stream changes
    useEffect(() => {
      setStreamError(false);

      // Clear any pending error timeout
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }

      return () => {
        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
        }
      };
    }, [peerStream]);

    // Set up audio element and processing
    useEffect(() => {
      const audio = audioRef.current;
      if (!audio || !peerStream) {
        setStreamError(true);
        return;
      }

      // Set stream as source
      try {
        // Extract audio tracks only
        const audioStream = new MediaStream();
        const audioTracks = peerStream.getAudioTracks();

        if (audioTracks.length === 0) {
          console.warn(`No audio tracks available for peer ${peerId}`);
          setStreamError(true);
          // Signal missing audio tracks to parent if callback provided
          if (typeof onConnectionIssue === "function") {
            onConnectionIssue(peerId, "no-audio-tracks");
          }
          return;
        }

        // Add audio tracks to new stream
        audioTracks.forEach((track) => {
          audioStream.addTrack(track);
          // Enable track
          if (!track.enabled) track.enabled = true;
        });

        // Set the stream
        audio.srcObject = audioStream;
        audio.volume = 1.0;
        audio.muted = false;
      } catch (err) {
        console.error(`Error setting audio source for peer ${peerId}:`, err);
        setStreamError(true);
        return;
      }

      // Only run setup logic once
      if (!setupCompletedRef.current) {
        // Configure audio output device if supported
        if (
          typeof audio.setSinkId === "function" &&
          navigator.mediaDevices &&
          navigator.mediaDevices.enumerateDevices
        ) {
          navigator.mediaDevices
            .enumerateDevices()
            .then((devices) => {
              const audioOutputs = devices.filter(
                (device) => device.kind === "audiooutput"
              );
              if (audioOutputs.length > 0) {
                const defaultDevice = audioOutputs.find(
                  (device) => device.deviceId === "default"
                );
                const deviceId = defaultDevice
                  ? defaultDevice.deviceId
                  : audioOutputs[0].deviceId;

                try {
                  audio.setSinkId(deviceId).catch((err) => {
                    console.warn(
                      `Failed to set audio output device: ${err.message}`
                    );
                    audio.muted = false;
                    audio.volume = 1.0;
                  });
                } catch (err) {
                  console.warn(`Error calling setSinkId: ${err.message}`);
                  audio.muted = false;
                  audio.volume = 1.0;
                }
              }
            })
            .catch((err) => {
              console.warn("Error enumerating audio devices:", err);
              audio.muted = false;
              audio.volume = 1.0;
            });
        } else {
          console.log(
            `Browser doesn't support setSinkId, using default audio output for peer ${peerId}`
          );
          audio.muted = false;
          audio.volume = 1.0;
        }

        // Handle autoplay
        const handleCanPlay = () => {
          if (!audio.played.length) {
            audio.play().catch((error) => {
              console.error("Error playing audio:", error);

              // Create play button if autoplay fails
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
                playButton.textContent = "Start Audio";
                playButton.className = "audio-play-button";
                playButton.style.padding = "8px 16px";
                playButton.style.fontSize = "14px";
                playButton.style.cursor = "pointer";
                playButton.style.background = "#4F46E5";
                playButton.style.color = "white";
                playButton.style.border = "none";
                playButton.style.borderRadius = "4px";

                playButton.onclick = () => {
                  audio
                    .play()
                    .then(() => {
                      playButtonContainer.remove();
                    })
                    .catch((playError) => {
                      console.error("Second play attempt failed:", playError);
                      setStreamError(true);
                    });
                };

                playButtonContainer.appendChild(playButton);
                const parentEl =
                  audio.parentNode ||
                  document.querySelector(`.participant-card-${peerId}`);
                if (parentEl) parentEl.appendChild(playButtonContainer);
              }
            });
          }
        };

        audio.addEventListener("canplay", handleCanPlay);

        // Add error event listener
        const handleError = (e) => {
          console.error(`Audio error for peer ${peerId}:`, e);
          setStreamError(true);
        };

        audio.addEventListener("error", handleError);

        // Setup audio monitoring using Web Audio API
        try {
          // Create audio context
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          audioContextRef.current = new AudioContext();

          // Create analyzer
          const analyzer = audioContextRef.current.createAnalyser();
          analyzer.fftSize = 32;

          // Connect audio element to analyzer
          const source =
            audioContextRef.current.createMediaStreamSource(peerStream);
          source.connect(analyzer);

          // Don't connect to destination - prevents feedback
          // source.connect(audioContextRef.current.destination);

          // Setup periodic audio level check
          const dataArray = new Uint8Array(analyzer.frequencyBinCount);
          let lastCheckTime = Date.now();
          const THROTTLE_MS = 500; // Check every 500ms

          const checkAudioLevel = () => {
            if (isUnmountingRef.current) return;

            const now = Date.now();

            // Only check if enough time has passed
            if (now - lastCheckTime >= THROTTLE_MS) {
              // Get audio data
              analyzer.getByteFrequencyData(dataArray);

              // Calculate average level
              let sum = 0;
              for (let i = 0; i < dataArray.length; i++) {
                sum += dataArray[i];
              }
              const average = sum / dataArray.length;

              // Audio active if above threshold (5 is very low threshold)
              const hasAudio = average > 5;

              // Update activity timestamp if audio detected
              if (hasAudio) {
                lastActivityRef.current = now;
              }

              // Mark as inactive if no audio for more than 5 seconds
              const isInactive = now - lastActivityRef.current > 5000;

              // Update state only if changed
              if (hasAudio !== audioActive && !isInactive) {
                setAudioActive(hasAudio);
              }

              // Check audio tracks health
              try {
                const audioTracks = peerStream.getAudioTracks();

                if (audioTracks.length > 0) {
                  const audioTrack = audioTracks[0];

                  // Debug log
                  console.log(
                    `Audio track state for peer ${peerId}: enabled=${audioTrack.enabled}, muted=${audioTrack.muted}, readyState=${audioTrack.readyState}`
                  );

                  // Enable track if disabled
                  if (!audioTrack.enabled) {
                    audioTrack.enabled = true;
                  }

                  // Check if track is ended and try to recover
                  if (audioTrack.readyState === "ended") {
                    console.log(
                      `Audio track ended for peer ${peerId}, attempting to recover`
                    );
                    // Signal to parent component that this peer connection needs recovery
                    if (typeof onConnectionIssue === "function") {
                      onConnectionIssue(peerId);
                    }
                  }
                } else if (!isInactive) {
                  // Only warn if not inactive (prevents excessive warnings for muted users)
                  console.warn(`No audio tracks available for peer ${peerId}`);
                  // Signal missing audio tracks to parent
                  if (typeof onConnectionIssue === "function") {
                    onConnectionIssue(peerId, "no-audio-tracks");
                  }
                }
              } catch (e) {
                // If we can't access tracks, the stream might be gone
                console.warn(
                  `Couldn't access audio tracks for peer ${peerId}:`,
                  e
                );

                // Don't set error immediately, give it a chance to recover
                if (errorTimeoutRef.current) {
                  clearTimeout(errorTimeoutRef.current);
                }

                errorTimeoutRef.current = setTimeout(() => {
                  // Check if tracks are still inaccessible
                  try {
                    const trackCount = peerStream.getTracks().length;
                    if (trackCount === 0) {
                      setStreamError(true);
                    }
                  } catch (trackError) {
                    setStreamError(true);
                  }
                }, 5000);
              }

              lastCheckTime = now;
            }

            // Continue the loop
            intervalRef.current = requestAnimationFrame(checkAudioLevel);
          };

          // Start the RAF loop
          intervalRef.current = requestAnimationFrame(checkAudioLevel);
        } catch (audioContextErr) {
          console.error("Could not initialize audio context:", audioContextErr);
        }

        // Initial play attempt
        if (audio.readyState >= 2) handleCanPlay();
      }

      // Mark setup as completed
      setupCompletedRef.current = true;

      // Cleanup function
      return () => {
        isUnmountingRef.current = true;

        if (audioRef.current) {
          audioRef.current.removeEventListener(
            "canplay",
            audioRef.current.handleCanPlay
          );
          audioRef.current.removeEventListener(
            "error",
            audioRef.current.handleError
          );
        }

        if (intervalRef.current) {
          cancelAnimationFrame(intervalRef.current);
          intervalRef.current = null;
        }

        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
          errorTimeoutRef.current = null;
        }

        // Close audio context
        if (
          audioContextRef.current &&
          audioContextRef.current.state !== "closed" &&
          typeof audioContextRef.current.close === "function"
        ) {
          try {
            audioContextRef.current.close();
          } catch (e) {
            console.warn("Error closing audio context:", e);
          }
        }
      };
    }, [peerId, peerStream, audioActive, onConnectionIssue]);

    // Clean up when component unmounts
    useEffect(() => {
      return () => {
        isUnmountingRef.current = true;
      };
    }, []);

    return (
      <div className={`participant participant-card-${peerId}`}>
        <audio ref={audioRef} autoPlay />
        <div className="participant-name">
          {participantName || `User-${peerId.substring(0, 6)}`}
        </div>

        <div
          className={`microphone-indicator ${
            audioActive ? "active" : "inactive"
          }`}
        >
          {audioActive ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </div>

        {/* Show error state if stream has issues */}
        {streamError && (
          <div className="stream-error-overlay">
            <FaExclamationTriangle />
            <span>Connection issues</span>
          </div>
        )}

        {/* Audio toggle button */}
        <button
          className="manual-audio-toggle"
          onClick={() => {
            const audio = audioRef.current;
            if (!audio) return;

            // Toggle muted state
            audio.muted = !audio.muted;

            // If unmuting, ensure volume is non-zero
            if (!audio.muted && audio.volume === 0) {
              audio.volume = 1.0;
            }
          }}
          title="Toggle sound for this participant"
        >
          Volume
        </button>
      </div>
    );
  }
);

// Add display name
RemoteAudio.displayName = "RemoteAudio";

RemoteAudio.propTypes = {
  peerId: PropTypes.string.isRequired,
  peerStream: PropTypes.object.isRequired,
  participantName: PropTypes.string,
  onConnectionIssue: PropTypes.func,
};

export default RemoteAudio;
