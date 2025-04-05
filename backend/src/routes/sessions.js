const express = require("express");
const router = express.Router();
const { db } = require("../config/firebase");
const { authenticateUser } = require("../middleware/auth");

// Collection reference
const sessionsCollection = db.collection("sessions");

// Create a new session
router.post("/", authenticateUser, async (req, res) => {
  try {
    const { title, language, description } = req.body;

    if (!title) {
      return res.status(400).json({
        status: "error",
        message: "Session title is required",
      });
    }

    const session = {
      title,
      language: language || "javascript",
      description: description || "",
      code: "",
      createdBy: req.user.uid,
      createdAt: new Date(),
      participants: [req.user.uid],
      isActive: true,
    };

    const docRef = await sessionsCollection.add(session);

    res.status(201).json({
      status: "success",
      data: {
        id: docRef.id,
        ...session,
      },
    });
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to create session",
    });
  }
});

// Get all sessions for a user
router.get("/", authenticateUser, async (req, res) => {
  try {
    const sessionsSnapshot = await sessionsCollection
      .where("participants", "array-contains", req.user.uid)
      .get();

    const sessions = [];
    sessionsSnapshot.forEach((doc) => {
      sessions.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json({
      status: "success",
      data: sessions,
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch sessions",
    });
  }
});

// Get a specific session
router.get("/:id", authenticateUser, async (req, res) => {
  try {
    const sessionDoc = await sessionsCollection.doc(req.params.id).get();

    if (!sessionDoc.exists) {
      return res.status(404).json({
        status: "error",
        message: "Session not found",
      });
    }

    const sessionData = sessionDoc.data();

    // Check if user is a participant
    if (!sessionData.participants.includes(req.user.uid)) {
      return res.status(403).json({
        status: "error",
        message: "Access denied: You are not a participant in this session",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        id: sessionDoc.id,
        ...sessionData,
      },
    });
  } catch (error) {
    console.error("Error fetching session:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch session",
    });
  }
});

// Update a session
router.put("/:id", authenticateUser, async (req, res) => {
  try {
    const sessionRef = sessionsCollection.doc(req.params.id);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({
        status: "error",
        message: "Session not found",
      });
    }

    const sessionData = sessionDoc.data();

    // Check if user is a participant
    if (!sessionData.participants.includes(req.user.uid)) {
      return res.status(403).json({
        status: "error",
        message: "Access denied: You are not a participant in this session",
      });
    }

    const { title, language, description, code } = req.body;
    const updateData = {};

    if (title) updateData.title = title;
    if (language) updateData.language = language;
    if (description !== undefined) updateData.description = description;
    if (code !== undefined) updateData.code = code;

    await sessionRef.update({
      ...updateData,
      updatedAt: new Date(),
    });

    res.status(200).json({
      status: "success",
      message: "Session updated successfully",
    });
  } catch (error) {
    console.error("Error updating session:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to update session",
    });
  }
});

// Add a participant to a session
router.post("/:id/participants", authenticateUser, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Participant email is required",
      });
    }

    // Get user by email
    const userRecord = await db
      .collection("users")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (userRecord.empty) {
      return res.status(404).json({
        status: "error",
        message: "User not found with the provided email",
      });
    }

    const userId = userRecord.docs[0].id;

    // Get session
    const sessionRef = sessionsCollection.doc(req.params.id);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({
        status: "error",
        message: "Session not found",
      });
    }

    const sessionData = sessionDoc.data();

    // Check if user is already a participant
    if (sessionData.participants.includes(userId)) {
      return res.status(400).json({
        status: "error",
        message: "User is already a participant in this session",
      });
    }

    // Add user to participants
    await sessionRef.update({
      participants: [...sessionData.participants, userId],
      updatedAt: new Date(),
    });

    res.status(200).json({
      status: "success",
      message: "Participant added successfully",
    });
  } catch (error) {
    console.error("Error adding participant:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to add participant",
    });
  }
});

// Delete a session
router.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const sessionRef = sessionsCollection.doc(req.params.id);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return res.status(404).json({
        status: "error",
        message: "Session not found",
      });
    }

    const sessionData = sessionDoc.data();

    // Check if user is the creator
    if (sessionData.createdBy !== req.user.uid) {
      return res.status(403).json({
        status: "error",
        message: "Access denied: Only the session creator can delete it",
      });
    }

    await sessionRef.delete();

    res.status(200).json({
      status: "success",
      message: "Session deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting session:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to delete session",
    });
  }
});

module.exports = router;
