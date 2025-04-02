import { useState, useRef } from "react";
import PropTypes from "prop-types";
import { FaMicrophone, FaMicrophoneSlash, FaTimes } from "react-icons/fa";
import CommunicationManager from "./CommunicationManager";
import RemoteAudio from "./RemoteAudio";

/**
 * AudioChat component that handles audio-only communication
 * Uses CommunicationManager for connection handling
 */
const AudioChat = ({ sessionId, userId }) => {
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [error, setError] = useState(null);
  const streamRef = useRef(null);

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

  // Render audio UI
  return (
    <CommunicationManager
      sessionId={sessionId}
      userId={userId}
      mediaConstraints={{ audio: true, video: false }}
      onError={setError}
      onStreamReady={(stream) => {
        streamRef.current = stream;
      }}
    >
      {({ stream, peers, error: connectionError, retryConnection }) => {
        const participantCount = peers.length + 1; // Include local user

        return (
          <div
            className={`audio-chat-container ${isCollapsed ? "collapsed" : ""}`}
            data-count={participantCount}
            onClick={() => isCollapsed && setIsCollapsed(false)}
          >
            <div className="audio-controls">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleAudio();
                }}
                className={`control-button ${!audioEnabled ? "disabled" : ""}`}
                title={audioEnabled ? "Mute Microphone" : "Unmute Microphone"}
              >
                {audioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
              </button>
            </div>

            <div className="audio-participants">
              <div className="participant local">
                <div className="participant-name">You</div>
                <div
                  className={`microphone-indicator ${
                    audioEnabled ? "active" : "muted"
                  }`}
                >
                  {audioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
                </div>
              </div>

              {/* Remote participants */}
              {peers.map(([peerId, peerStream, participantName]) => (
                <RemoteAudio
                  key={peerId}
                  peerId={peerId}
                  peerStream={peerStream}
                  participantName={participantName}
                />
              ))}
            </div>

            {(error || connectionError) && (
              <div className="audio-error">
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

AudioChat.propTypes = {
  sessionId: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired,
};

export default AudioChat;
