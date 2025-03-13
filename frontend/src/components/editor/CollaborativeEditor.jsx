import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import PropTypes from 'prop-types';
import BaseEditor from './BaseEditor';
import { executeCode } from '../../services/codeExecution';
import { auth } from '../../firebaseConfig';

const CollaborativeEditor = ({ sessionId, userId }) => {
  const [language, setLanguage] = useState('javascript');
  const socketRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      withCredentials: true
    });
    
    socketRef.current = socket;

    socket.emit('join-session', {
      sessionId,
      userId,
      username: auth.currentUser?.displayName || 'Anonymous',
      photoURL: auth.currentUser?.photoURL
    });

    socket.on('code-update', ({ content }) => {
      if (editorRef.current) {
        const position = editorRef.current.getPosition();
        editorRef.current.setValue(content);
        editorRef.current.setPosition(position);
      }
    });

    socket.on('language-change', ({ newLanguage }) => {
      setLanguage(newLanguage);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [sessionId, userId]);

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };

  const handleEditorChange = (value) => {
    socketRef.current?.emit('code-change', {
      sessionId,
      content: value,
      userId
    });
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    socketRef.current?.emit('language-change', {
      sessionId,
      newLanguage,
      userId
    });
  };

  const handleRunCode = async (code) => {
    try {
      const result = await executeCode(code, language);
      return result;
    } catch (error) {
      console.error('Code execution error:', error);
      throw error;
    }
  };

  return (
    <BaseEditor
      onEditorMount={handleEditorMount}
      onEditorChange={handleEditorChange}
      language={language}
      onLanguageChange={handleLanguageChange}
      onRunCode={handleRunCode}
    />
  );
};

CollaborativeEditor.propTypes = {
  sessionId: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired,
};

export default CollaborativeEditor; 