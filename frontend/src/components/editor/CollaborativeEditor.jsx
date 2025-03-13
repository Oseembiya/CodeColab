import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import PropTypes from 'prop-types';
import BaseEditor from './BaseEditor';
import { executeCode } from '../../services/codeExecution';
import { auth } from '../../firebaseConfig';

const CollaborativeEditor = ({ sessionId, userId }) => {
  const [language, setLanguage] = useState('javascript');
  const socketRef = useRef(null);
  const editorRef = useRef(null);
  const lastSentContent = useRef('');
  const debounceTimeout = useRef(null);

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    
    // Configure editor for better performance
    editor.getModel()?.setEOL('\n');
    editor.updateOptions({
      quickSuggestions: false,
      suggestOnTriggerCharacters: false,
      acceptSuggestionOnEnter: "off",
      wordBasedSuggestions: false
    });
  };

  const sendCodeUpdate = useCallback((content) => {
    if (socketRef.current && content !== lastSentContent.current) {
      socketRef.current.emit('code-change', {
        sessionId,
        content,
        userId
      });
      lastSentContent.current = content;
    }
  }, [sessionId, userId]);

  const handleEditorChange = useCallback((value) => {
    // Clear any existing timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // Debounce the update
    debounceTimeout.current = setTimeout(() => {
      sendCodeUpdate(value);
    }, 100); // 100ms debounce
  }, [sendCodeUpdate]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
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
        const editor = editorRef.current;
        const position = editor.getPosition();
        const selections = editor.getSelections();
        
        // Only update if content is different
        if (editor.getValue() !== content) {
          editor.setValue(content);
          lastSentContent.current = content;
          
          // Restore cursor and selections
          editor.setPosition(position);
          editor.setSelections(selections);
        }
      }
    });

    socket.on('language-change', ({ newLanguage }) => {
      setLanguage(newLanguage);
    });

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      socket.disconnect();
    };
  }, [sessionId, userId]);

  const handleLanguageChange = useCallback((newLanguage) => {
    setLanguage(newLanguage);
    socketRef.current?.emit('language-change', {
      sessionId,
      newLanguage,
      userId
    });
  }, [sessionId, userId]);

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