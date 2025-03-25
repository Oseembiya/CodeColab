import { useState, useEffect, useRef, useCallback } from "react";
import PropTypes from "prop-types";
import BaseEditor from "./BaseEditor";
import { executeCode } from "../../services/codeExecution";
import { useSocket } from "../../contexts/SocketContext";
import { useAuth } from "../../hooks/useAuth";

const CollaborativeEditor = ({ sessionId, userId }) => {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [language, setLanguage] = useState("javascript");
  const editorRef = useRef(null);
  const lastSentContent = useRef("");
  const debounceTimeout = useRef(null);
  const cursorUpdateTimeoutRef = useRef(null);
  const [remoteCursors, setRemoteCursors] = useState({});
  const decorationsRef = useRef({});

  const handleEditorMount = (editor) => {
    editorRef.current = editor;

    // Configure editor for better performance
    editor.getModel()?.setEOL("\n");
    editor.updateOptions({
      quickSuggestions: false,
      suggestOnTriggerCharacters: false,
      acceptSuggestionOnEnter: "off",
      wordBasedSuggestions: false,
      glyphMargin: true, // Enable glyph margin for cursor labels
    });

    // Track cursor position changes
    editor.onDidChangeCursorPosition((e) => {
      if (socket) {
        // Clear any existing timeout to debounce cursor updates
        if (cursorUpdateTimeoutRef.current) {
          clearTimeout(cursorUpdateTimeoutRef.current);
        }

        // Debounce cursor position updates to avoid flooding
        cursorUpdateTimeoutRef.current = setTimeout(() => {
          const position = editor.getPosition();
          socket.emit("cursor-update", {
            sessionId,
            userId,
            position: {
              lineNumber: position.lineNumber,
              column: position.column,
            },
            userName: user?.displayName || `User-${userId.substring(0, 6)}`,
          });

          // Also emit typing start to show user is active
          socket.emit("typing-start", { sessionId, userId });

          // Stop typing indicator after 2 seconds of inactivity
          setTimeout(() => {
            socket.emit("typing-end", { sessionId, userId });
          }, 2000);
        }, 100);
      }
    });
  };

  // Update remote cursors using Monaco's built-in decoration system
  const updateRemoteCursors = useCallback(() => {
    const editor = editorRef.current;
    const model = editor?.getModel();
    if (!editor || !model) return;

    // Clear previous decorations for each user
    Object.values(decorationsRef.current).forEach((decorationIds) => {
      if (decorationIds && decorationIds.length) {
        editor.deltaDecorations(decorationIds, []);
      }
    });

    decorationsRef.current = {};

    // Add new decorations for each remote user
    Object.entries(remoteCursors).forEach(([remoteUserId, data]) => {
      if (remoteUserId !== userId && data.position) {
        const position = data.position;
        const userName =
          data.userName || `User-${remoteUserId.substring(0, 6)}`;
        const cursorColor = getColorForUser(remoteUserId);

        // Create cursor decoration with inline widget
        const cursorDecoration = {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          },
          options: {
            className: `remote-cursor cursor-${remoteUserId}`,
            hoverMessage: { value: userName },
            stickiness: 1,
            zIndex: 1000,
            beforeContentClassName: `remote-cursor-label-${remoteUserId}`,
            before: {
              content: userName,
              backgroundColor: cursorColor,
              color: "white",
              padding: "2px 8px",
              borderRadius: "3px",
              fontWeight: "bold",
              fontSize: "12px",
              marginLeft: "-1px",
              width: "max-content",
            },
          },
        };

        // Apply decoration
        const decorationIds = editor.deltaDecorations([], [cursorDecoration]);
        decorationsRef.current[remoteUserId] = decorationIds;

        // Add a custom style for this user's cursor and label
        const styleId = `cursor-style-${remoteUserId}`;
        let styleElement = document.getElementById(styleId);

        if (!styleElement) {
          styleElement = document.createElement("style");
          styleElement.id = styleId;
          document.head.appendChild(styleElement);
        }

        styleElement.textContent = `
          .cursor-${remoteUserId} {
            background-color: ${cursorColor} !important;
            width: 2px !important;
            height: 18px !important;
          }
          .remote-cursor-label-${remoteUserId}::after {
            content: "${userName}";
            position: absolute;
            top: 0;
            left: 25px;
            background-color: ${cursorColor};
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 12px;
            font-weight: bold;
            white-space: nowrap;
            z-index: 1000;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
          }
        `;

        console.log(
          `Added cursor decoration for ${userName} at line ${position.lineNumber}, column ${position.column}`
        );
      }
    });
  }, [remoteCursors, userId]);

  // Function to generate a consistent color based on user ID
  const getColorForUser = (userId) => {
    // Generate a simple hash from the userId
    const hash = userId.split("").reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    // Convert to HSL color with good saturation and lightness
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 70%, 45%)`;
  };

  // Update the cursor decorations when remoteCursors changes
  useEffect(() => {
    if (editorRef.current) {
      updateRemoteCursors();
    }
  }, [remoteCursors, updateRemoteCursors]);

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
    if (!socket) return;

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

    // Listen for cursor position updates from other users
    socket.on(
      "cursor-update",
      ({ userId: remoteUserId, position, userName }) => {
        if (remoteUserId !== userId) {
          console.log(
            `Received cursor update from ${userName || remoteUserId}:`,
            position
          );
          setRemoteCursors((prev) => ({
            ...prev,
            [remoteUserId]: { position, userName },
          }));
        }
      }
    );

    // Clean up listeners
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      if (cursorUpdateTimeoutRef.current) {
        clearTimeout(cursorUpdateTimeoutRef.current);
      }
      socket.off("code-update");
      socket.off("language-change");
      socket.off("cursor-update");
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
    [sessionId, userId, socket]
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
