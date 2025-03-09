import { useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import PropTypes from 'prop-types';
import { FaVideo, FaVideoSlash, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';

const VideoChat = ({ sessionId, userId }) => {
  const [peers, setPeers] = useState(new Map());
  const [stream, setStream] = useState(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const peerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    // Initialize PeerJS
    peerRef.current = new Peer(`${sessionId}-${userId}`, {
      host: import.meta.env.VITE_PEER_HOST || 'localhost',
      port: import.meta.env.VITE_PEER_PORT || 9000,
      path: '/myapp'
    });

    const peer = peerRef.current;

    // Get user media
    navigator.mediaDevices
      .getUserMedia({ 
        video: true, 
        audio: true 
      })
      .then(stream => {
        setStream(stream);
        streamRef.current = stream;

        // Handle incoming calls
        peer.on('call', call => {
          call.answer(stream);
          call.on('stream', remoteStream => {
            setPeers(prev => new Map(prev).set(call.peer, remoteStream));
          });
        });

        // Handle peer errors
        peer.on('error', error => {
          console.error('PeerJS error:', error);
        });
      })
      .catch(err => {
        console.error('Failed to get user media:', err);
      });

    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
      peer.destroy();
    };
  }, [sessionId, userId]);

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

  return (
    <div className="video-chat-container">
      <div className="video-controls">
        <button 
          onClick={toggleVideo}
          className={`control-button ${!videoEnabled ? 'disabled' : ''}`}
          title={videoEnabled ? 'Disable Video' : 'Enable Video'}
        >
          {videoEnabled ? <FaVideo /> : <FaVideoSlash />}
        </button>
        <button 
          onClick={toggleAudio}
          className={`control-button ${!audioEnabled ? 'disabled' : ''}`}
          title={audioEnabled ? 'Disable Audio' : 'Enable Audio'}
        >
          {audioEnabled ? <FaMicrophone /> : <FaMicrophoneSlash />}
        </button>
      </div>

      <div className="video-grid">
        {/* Local video */}
        <div className="video-container local">
          {stream && (
            <video
              ref={video => {
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
        {Array.from(peers.entries()).map(([peerId, peerStream]) => (
          <div key={peerId} className="video-container">
            <video
              ref={video => {
                if (video) video.srcObject = peerStream;
              }}
              autoPlay
              playsInline
            />
            <div className="video-label">Peer</div>
          </div>
        ))}
      </div>
    </div>
  );
};

VideoChat.propTypes = {
  sessionId: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired
};

export default VideoChat; 