import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import PropTypes from 'prop-types';
import BaseEditor from './BaseEditor';
import { executeCode } from '../../services/codeExecution';

const CollaborativeEditor = ({ sessionId, userId, initialLanguage }) => {
  const [language, setLanguage] = useState(initialLanguage);
  const socketRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_SOCKET_URL);
    socketRef.current = socket;

    socket.emit('join-session', {
      sessionId,
      userId,
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

    return () => socket.disconnect();
  }, [sessionId, userId]);

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };

  const handleEditorChange = useCallback((value) => {
    socketRef.current?.emit('code-change', {
      sessionId,
      content: value,
      senderId: userId
    });
  }, [socketRef, sessionId, userId]);

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socketRef.current?.emit('language-change', {
      sessionId,
      newLanguage,
      senderId: userId
    });
  };

  const handleRunCode = async (code) => {
    const result = await executeCode(code, language);
    return result;
  };

  const handleCheck = useCallback(() => {
    console.log('Collaborative check not implemented');
  }, []);

  return (
    <BaseEditor
      onEditorMount={handleEditorMount}
      onEditorChange={handleEditorChange}
      onCheck={handleCheck}
      language={language}
      onLanguageChange={handleLanguageChange}
      onRunCode={handleRunCode}
    />
  );
};

CollaborativeEditor.propTypes = {
  sessionId: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired,
  initialLanguage: PropTypes.string
};

export default CollaborativeEditor; 