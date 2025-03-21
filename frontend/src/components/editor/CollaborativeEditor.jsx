import { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import BaseEditor from "./BaseEditor";
import { executeCode } from "../../services/codeExecution";
import { useSocket } from "../../contexts/SocketContext";

const CollaborativeEditor = ({ sessionId, userId }) => {
  const { socket } = useSocket();
  const [language, setLanguage] = useState("javascript");
  const editorRef = useRef(null);
  const lastSentContent = useRef("");
  const debounceTimeout = useRef(null);

  const handleEditorMount = (editor) => {
    editorRef.current = editor;

    // Configure editor for better performance
    editor.getModel()?.setEOL("\n");
    editor.updateOptions({
      quickSuggestions: false,
      suggestOnTriggerCharacters: false,
      acceptSuggestionOnEnter: "off",
      wordBasedSuggestions: false,
    });
  };

  const sendCodeUpdate = useCallback(
    (content) => {
      if (socket && content !== lastSentContent.current) {
        socket.emit("code-change", {
          sessionId,
          content,
          userId,
        });
        lastSentContent.current = content;
      }
    },
    [sessionId, userId, socket]
  );

  const handleEditorChange = useCallback(
    (value) => {
      // Clear any existing timeout
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }

      // Debounce the update
      debounceTimeout.current = setTimeout(() => {
        sendCodeUpdate(value);
      }, 100); // 100ms debounce
    },
    [sendCodeUpdate]
  );

  useEffect(() => {
    // No need to emit join-session here, it's already done in liveSession.jsx
    // socket.emit("join-session", {
    //   sessionId,
    //   userId,
    //   username: auth.currentUser?.displayName || "Anonymous",
    //   photoURL: auth.currentUser?.photoURL,
    // });

    socket.on("code-update", ({ content, senderId }) => {
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

    socket.on("language-change", ({ newLanguage }) => {
      setLanguage(newLanguage);
    });

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [sessionId, userId, socket]);

  const handleLanguageChange = useCallback(
    (newLanguage) => {
      setLanguage(newLanguage);
      socket.emit("language-change", {
        sessionId,
        newLanguage,
        userId,
      });
    },
    [sessionId, userId]
  );

  const handleRunCode = async (code) => {
    try {
      const result = await executeCode(code, language);
      return result;
    } catch (error) {
      console.error("Code execution error:", error);
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
