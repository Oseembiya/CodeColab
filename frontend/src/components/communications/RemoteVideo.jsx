import { useEffect, useRef, memo, useState } from "react";
import PropTypes from "prop-types";
import { FaMicrophone, FaExclamationTriangle } from "react-icons/fa";

// RemoteVideo component to handle video playback of remote peers
const RemoteVideo = memo(
  ({ peerId, peerStream, isInitialSetup, participantName }) => {
    const videoRef = useRef(null);
    const intervalRef = useRef(null);
    const sinkIdSetRef = useRef(false);
    const setupCompletedRef = useRef(false);
    const [streamError, setStreamError] = useState(false);
    const errorTimeoutRef = useRef(null);
    const isUnmountingRef = useRef(false);

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

    // Set up the video element once
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !peerStream) {
        setStreamError(true);
        return;
      }

      // Set the stream as source
      try {
        video.srcObject = peerStream;
        video.volume = 1.0;
        video.muted = false;
      } catch (err) {
        console.error(`Error setting video source for peer ${peerId}:`, err);
        setStreamError(true);
        return;
      }

      // Only run setup logic once
      if (!setupCompletedRef.current) {
        // Enable all tracks
        try {
          peerStream.getTracks().forEach((track) => {
            if (!track.enabled) track.enabled = true;
          });
        } catch (err) {
          console.error(`Error enabling tracks for peer ${peerId}:`, err);
        }

        // Configure audio output device
        if (video.setSinkId && navigator.mediaDevices.enumerateDevices) {
          sinkIdSetRef.current = true;
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
                return video.setSinkId(deviceId);
              }
            })
            .catch((err) =>
              console.error("Error setting audio output device:", err)
            );
        }

        // Handle autoplay
        const handleCanPlay = () => {
          if (!video.played.length) {
            video.play().catch((error) => {
              console.error("Error playing video:", error);

              // Create play button only if autoplay fails
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
                      playButtonContainer.remove();
                    })
                    .catch((playError) => {
                      console.error("Second play attempt failed:", playError);
                      setStreamError(true);
                    });
                };

                playButtonContainer.appendChild(playButton);
                video.parentNode.appendChild(playButtonContainer);
              }
            });
          }
        };

        video.addEventListener("canplay", handleCanPlay);

        // Add error event listener
        const handleError = (e) => {
          console.error(`Video error for peer ${peerId}:`, e);
          setStreamError(true);
        };

        video.addEventListener("error", handleError);

        // Ensure audio is checked periodically (fixes Chrome issues)
        // OPTIMIZATION: Use requestAnimationFrame + throttling instead of setInterval
        // This prevents the browser's "long task" warning
        let lastCheckTime = Date.now();
        const THROTTLE_MS = 10000; // Same as original interval: check every 10 seconds

        const checkAudioState = () => {
          const now = Date.now();
          const timeElapsed = now - lastCheckTime;

          // Only run the check if enough time has passed
          if (timeElapsed >= THROTTLE_MS) {
            if (video && !video.paused) {
              try {
                const audioTracks = peerStream.getAudioTracks();
                if (audioTracks.length > 0) {
                  if (!audioTracks[0].enabled) {
                    audioTracks[0].enabled = true;
                  }
                  if (video.muted) {
                    video.muted = false;
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
            }

            // Update the last check time
            lastCheckTime = now;
          }

          // Schedule the next check using requestAnimationFrame
          // This is much more performance-friendly than setInterval
          if (!isUnmountingRef.current) {
            intervalRef.current = requestAnimationFrame(checkAudioState);
          }
        };

        // Start the RAF loop
        intervalRef.current = requestAnimationFrame(checkAudioState);

        // Initial play attempt
        if (video.readyState >= 2) handleCanPlay();
      }

      // Mark setup as completed
      setupCompletedRef.current = true;

      // Clean up
      return () => {
        // Set unmounting flag to true to stop the RAF loop
        isUnmountingRef.current = true;

        if (video) {
          video.removeEventListener("canplay", video.handleCanPlay);
          video.removeEventListener("error", video.handleError);
        }

        if (intervalRef.current) {
          // Cancel animation frame instead of clearInterval
          cancelAnimationFrame(intervalRef.current);
          intervalRef.current = null;
        }

        if (errorTimeoutRef.current) {
          clearTimeout(errorTimeoutRef.current);
          errorTimeoutRef.current = null;
        }
      };
    }, [peerId, peerStream]);

    // Clean up when component unmounts
    useEffect(() => {
      return () => {
        isUnmountingRef.current = true;
      };
    }, []);

    return (
      <div className="video-container">
        <video ref={videoRef} autoPlay playsInline />
        <div className="video-label">
          {participantName || `User-${peerId.substring(0, 6)}`}
        </div>

        {/* Show error state if stream has issues */}
        {streamError && (
          <div className="stream-error-overlay">
            <FaExclamationTriangle />
            <span>Connection issues</span>
          </div>
        )}

        {/* Manual audio toggle button */}
        <button
          className="manual-audio-toggle"
          onClick={() => {
            const video = videoRef.current;
            if (!video) return;
            video.muted = !video.muted;
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

export default RemoteVideo;
