import { useState, useRef, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import {
  FaVideo,
  FaVideoSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaGripVertical,
  FaTimes,
} from "react-icons/fa";
import RemoteVideo from "./RemoteVideo";
import CommunicationManager from "./CommunicationManager";

/**
 * VideoChat component handles the video chat functionality
 * Uses the CommunicationManager for all WebRTC connection handling
 */
const VideoChat = ({ sessionId, userId }) => {
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [error, setError] = useState(null);
  const streamRef = useRef(null);

  // UI state
  const [position, setPosition] = useState({
    x: window.innerWidth - 320,
    y: window.innerHeight - 400,
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [isCollapsed, setIsCollapsed] = useState(true);
  const dragPositionRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const animFrameRef = useRef(null);

  // Toggle local video
  const toggleVideo = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoEnabled;
        setVideoEnabled(!videoEnabled);
      }
    }
  };

  // Toggle local audio
  const toggleAudio = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioEnabled;
        setAudioEnabled(!audioEnabled);
      }
    }
  };

  // Mouse event handlers for dragging
  const handleMouseDown = (e) => {
    if (e.target.closest(".video-controls")) return;

    setIsDragging(true);
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = useCallback((e) => {
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
  }, []);

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

  // Use CommunicationManager to handle WebRTC connections
  return (
    <CommunicationManager
      sessionId={sessionId}
      userId={userId}
      mediaConstraints={{ audio: true, video: true }}
      onError={setError}
      onStreamReady={(stream) => {
        streamRef.current = stream;
      }}
    >
      {({
        stream,
        peers,
        error: connectionError,
        retryConnection,
        handleConnectionIssue,
      }) => {
        const participantCount = peers.length + 1; // Include local user

        return (
          <div
            className={`video-chat-container ${
              isCollapsed ? "collapsed" : ""
            } ${isDragging ? "dragging" : ""}`}
            data-count={participantCount}
            onClick={() => isCollapsed && setIsCollapsed(false)}
            ref={dragRef}
            style={{
              "--x": `${position.x}px`,
              "--y": `${position.y}px`,
              cursor: isDragging ? "grabbing" : "grab",
            }}
            onMouseDown={handleMouseDown}
          >
            <div className="video-drag-handle">
              <FaGripVertical />
            </div>
            <div className="video-controls">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleVideo();
                }}
                className={`control-button ${!videoEnabled ? "disabled" : ""}`}
                title={videoEnabled ? "Disable Video" : "Enable Video"}
              >
                {videoEnabled ? <FaVideo /> : <FaVideoSlash />}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleAudio();
                }}
                className={`control-button ${!audioEnabled ? "disabled" : ""}`}
                title={audioEnabled ? "Disable Audio" : "Enable Audio"}
              >
                {audioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
              </button>
            </div>

            <div className="volume-control">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                defaultValue="1"
                onClick={(e) => e.stopPropagation()}
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
                        console.log(
                          `Set volume for a video element to ${volume}`
                        );
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
                {peers.map(([peerId, peerStream, participantName]) => (
                  <RemoteVideo
                    key={peerId}
                    peerId={peerId}
                    peerStream={peerStream}
                    isInitialSetup={true}
                    participantName={participantName}
                    onConnectionIssue={handleConnectionIssue}
                  />
                ))}
              </div>
            </div>

            {(error || connectionError) && (
              <div className="video-error">
                Error: {error || connectionError}
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
      }}
    </CommunicationManager>
  );
};

VideoChat.propTypes = {
  sessionId: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired,
};

export default VideoChat;
