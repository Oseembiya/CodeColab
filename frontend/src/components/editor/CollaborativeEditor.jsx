import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import PropTypes from 'prop-types';
import BaseEditor from './BaseEditor';
import { executeCode } from '../../services/codeExecution';
import { auth } from '../../firebaseConfig';

// Add debounce utility
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const CollaborativeEditor = ({ sessionId, userId }) => {
  const [language, setLanguage] = useState('javascript');
  const socketRef = useRef(null);
  const editorRef = useRef(null);

  // Debounced code change handler
  const debouncedCodeChange = useCallback(
    debounce((value) => {
      socketRef.current?.emit('code-change', {
        sessionId,
        content: value,
        senderId: userId
      });
    }, 100), // 100ms debounce
    [sessionId, userId]
  );

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ['websocket']
    });
    
    socketRef.current = socket;

    socket.emit('join-session', {
      sessionId,
      userId,
      username: auth.currentUser?.displayName || 'Anonymous',
      photoURL: auth.currentUser?.photoURL
    });

    socket.on('code-update', ({ content, senderId }) => {
      if (senderId !== userId && editorRef.current) {
        const position = editorRef.current.getPosition();
        editorRef.current.setValue(content);
        editorRef.current.setPosition(position);
      }
    });

    socket.on('language-change', ({ newLanguage, senderId }) => {
      if (senderId !== userId) {
        setLanguage(newLanguage);
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [sessionId, userId]);

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    // Set editor options for better performance
    editor.updateOptions({
      quickSuggestions: false,
      suggestOnTriggerCharacters: false,
      acceptSuggestionOnEnter: false,
      wordBasedSuggestions: false,
      parameterHints: false,
      automaticLayout: false,
      folding: false,
      minimap: { enabled: false }
    });
  };

  const handleEditorChange = useCallback((value) => {
    debouncedCodeChange(value);
  }, [debouncedCodeChange]);

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    socketRef.current?.emit('language-change', {
      sessionId,
      newLanguage,
      senderId: userId
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