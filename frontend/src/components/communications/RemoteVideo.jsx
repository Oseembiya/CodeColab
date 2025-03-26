import { useEffect, useRef, memo } from "react";
import PropTypes from "prop-types";
import { FaMicrophone } from "react-icons/fa";

// RemoteVideo component to handle video playback of remote peers
const RemoteVideo = memo(
  ({ peerId, peerStream, isInitialSetup, participantName }) => {
    const videoRef = useRef(null);
    const intervalRef = useRef(null);
    const sinkIdSetRef = useRef(false);
    const setupCompletedRef = useRef(false);

    // Set up the video element once
    useEffect(() => {
      const video = videoRef.current;
      if (!video || !peerStream) return;

      // Set the stream as source
      video.srcObject = peerStream;
      video.volume = 1.0;
      video.muted = false;

      // Only run setup logic once
      if (!setupCompletedRef.current) {
        // Enable all tracks
        peerStream.getTracks().forEach((track) => {
          if (!track.enabled) track.enabled = true;
        });

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
                    .catch(console.error);
                };

                playButtonContainer.appendChild(playButton);
                video.parentNode.appendChild(playButtonContainer);
              }
            });
          }
        };

        video.addEventListener("canplay", handleCanPlay);

        // Ensure audio is checked periodically (fixes Chrome issues)
        intervalRef.current = setInterval(() => {
          if (video && !video.paused) {
            const audioTracks = peerStream.getAudioTracks();
            if (audioTracks.length > 0) {
              if (!audioTracks[0].enabled) {
                audioTracks[0].enabled = true;
              }
              if (video.muted) {
                video.muted = false;
              }
            }
          }
        }, 10000);

        // Initial play attempt
        if (video.readyState >= 2) handleCanPlay();
      }

      // Mark setup as completed
      setupCompletedRef.current = true;

      // Clean up
      return () => {
        video.removeEventListener("canplay", video.handleCanPlay);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [peerId, peerStream]);

    return (
      <div className="video-container">
        <video ref={videoRef} autoPlay playsInline />
        <div className="video-label">
          {participantName || `User-${peerId.substring(0, 6)}`}
        </div>

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
