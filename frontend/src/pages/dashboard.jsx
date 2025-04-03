import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUsers,
  FaCode,
  FaLightbulb,
  FaLaptopCode,
  FaComments,
  FaChalkboardTeacher,
  FaRocket,
  FaChartLine,
  FaUserFriends,
  FaPuzzlePiece,
  FaFileCode,
  FaClock,
  FaHandshake,
} from "react-icons/fa";
import { db } from "../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { useUserMetrics } from "../contexts/UserMetricsContext";
import { useSocket } from "../contexts/SocketContext";
import CreateSessionModal from "../components/sessions/CreateSessionModal";
import { useSession } from "../contexts/SessionContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { createSession } = useSession();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isQuickStart, setIsQuickStart] = useState(false);

  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  });

  const { metrics } = useUserMetrics();
  const { socket } = useSocket();

  // Platform statistics with real-time updates
  const [platformStats, setPlatformStats] = useState({
    activeSessions: 0,
    collaboratingUsers: 0,
    codeLinesSynced: "0",
  });

  // Handle the "Get Started Now" button click
  const handleGetStarted = () => {
    setIsQuickStart(true);
    setShowCreateModal(true);
  };

  // Handle the "Create Your First Session" button click
  const handleCreateFirstSession = () => {
    setIsQuickStart(false);
    setShowCreateModal(true);
  };

  // Handle session creation submission
  const handleCreateSession = async (sessionData) => {
    try {
      const sessionId = await createSession(sessionData);
      setShowCreateModal(false);
      // Navigate to the newly created session
      navigate(`/sessions/${sessionId}`);
    } catch (error) {
      console.error("Failed to create session:", error);
      // Handle error (you might want to show this to the user)
    }
  };

  // Fetch platform statistics
  useEffect(() => {
    // Get current active sessions count
    const fetchActiveSessions = async () => {
      try {
        const sessionsRef = collection(db, "sessions");
        const activeSessionsQuery = query(
          sessionsRef,
          where("status", "==", "active")
        );

        const snapshot = await getDocs(activeSessionsQuery);

        // Set initial count
        setPlatformStats((prev) => ({
          ...prev,
          activeSessions: snapshot.size,
        }));

        // Set up real-time listener for active sessions
        const unsubscribe = onSnapshot(activeSessionsQuery, (querySnapshot) => {
          setPlatformStats((prev) => ({
            ...prev,
            activeSessions: querySnapshot.size,
          }));
        });

        return unsubscribe;
      } catch (error) {
        console.error("Error fetching active sessions:", error);
      }
    };

    // Listen for participant updates from socket
    const handleParticipantUpdates = () => {
      if (socket) {
        // Get global users count
        socket.on("global-stats", ({ activeUsers, totalLinesOfCode }) => {
          setPlatformStats((prev) => ({
            ...prev,
            collaboratingUsers: activeUsers,
            codeLinesSynced:
              totalLinesOfCode > 1000
                ? `${Math.round(totalLinesOfCode / 100) / 10}K`
                : totalLinesOfCode.toString(),
          }));
        });

        // Request global stats when dashboard mounts
        socket.emit("request-global-stats");

        return () => {
          socket.off("global-stats");
        };
      }
    };

    const unsubscribeSessions = fetchActiveSessions();
    const unsubscribeSocket = handleParticipantUpdates();

    return () => {
      if (unsubscribeSessions instanceof Function) {
        unsubscribeSessions();
      }
      if (unsubscribeSocket instanceof Function) {
        unsubscribeSocket();
      }
    };
  }, [socket]);

  // User's personal stats section
  const renderPersonalStats = () => {
    if (!metrics) return null;

    return (
      <div className="personal-stats-container">
        <h2 className="section-title">Your Activity</h2>
        <div className="stats-container">
          <div className="stat-item">
            <div className="stat-icon">
              <FaUsers />
            </div>
            <h3>{metrics.totalSessions}</h3>
            <p>Your Sessions</p>
          </div>
          <div className="stat-item">
            <div className="stat-icon">
              <FaClock />
            </div>
            <h3>{metrics.hoursSpent}</h3>
            <p>Hours Spent</p>
          </div>
          <div className="stat-item">
            <div className="stat-icon">
              <FaFileCode />
            </div>
            <h3>{metrics.linesOfCode}</h3>
            <p>Lines Written</p>
          </div>
          <div className="stat-item">
            <div className="stat-icon">
              <FaHandshake />
            </div>
            <h3>{metrics.collaborations || 0}</h3>
            <p>Collaborations</p>
          </div>
        </div>
      </div>
    );
  };

  // Key features
  const keyFeatures = [
    {
      icon: <FaLaptopCode />,
      title: "Real-time Code Editor",
      description:
        "Collaborate on code in real-time with syntax highlighting and auto-completion",
    },
    {
      icon: <FaLightbulb />,
      title: "Interactive Whiteboard",
      description:
        "Visualize concepts and brainstorm solutions with our integrated whiteboard",
    },
    {
      icon: <FaComments />,
      title: "Seamless Communication",
      description: "Stay connected with built-in video and text communication",
    },
  ];

  // Benefits
  const benefits = [
    {
      icon: <FaUsers />,
      title: "Enhance Remote Collaboration",
      description:
        "CodeColab eliminates the need for multiple tools by providing an all-in-one platform",
    },
    {
      icon: <FaChalkboardTeacher />,
      title: "Improve Learning Experience",
      description: "Perfect for teaching, learning, and pair programming",
    },
    {
      icon: <FaChartLine />,
      title: "Streamline Development",
      description:
        "From ideation to implementation, all in one seamless workflow",
    },
  ];

  // Testimonials
  const testimonials = [
    {
      quote: "CodeColab helped our team reduce meeting times by 30%",
      author: "Sarah J., Senior Developer",
    },
    {
      quote: "Our remote development productivity increased significantly",
      author: "Michael T., Project Manager",
    },
  ];

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>{greeting}, Welcome to CodeColab</h1>
          <p>Your collaborative coding platform</p>
        </div>
      </header>

      {/* Welcome/Introduction Section */}
      <div className="intro-section">
        <div className="intro-card">
          <h2>CodeColab</h2>
          <p className="tagline">Where Code Collaboration Meets Creativity</p>
          <p>
            CodeColab is a seamless, real-time collaborative coding platform
            that integrates an interactive whiteboard and built-in communication
            features. Our goal is to enhance productivity by reducing the need
            for external tools and ensuring synchronized, efficient
            collaboration.
          </p>
          <button className="get-started-btn" onClick={handleGetStarted}>
            <FaRocket /> Get Started Now
          </button>
        </div>
      </div>

      {/* User's Personal Stats Section */}
      {renderPersonalStats()}

      {/* Key Features Section */}
      <h2 className="section-title">Key Features</h2>
      <div className="features-grid">
        {keyFeatures.map((feature, index) => (
          <div key={index} className="feature-card">
            <div className="feature-icon">{feature.icon}</div>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Platform Stats */}
      <h2 className="section-title">Platform Activity</h2>
      <div className="stats-container">
        <div className="stat-item">
          <div className="stat-icon">
            <FaCode />
          </div>
          <h3>{platformStats.activeSessions}</h3>
          <p>Active Sessions</p>
        </div>
        <div className="stat-item">
          <div className="stat-icon">
            <FaUsers />
          </div>
          <h3>{platformStats.collaboratingUsers}</h3>
          <p>Users Collaborating Now</p>
        </div>
        <div className="stat-item">
          <div className="stat-icon">
            <FaFileCode />
          </div>
          <h3>{platformStats.codeLinesSynced}</h3>
          <p>Code Lines Synced</p>
        </div>
      </div>

      {/* Benefits Section */}
      <h2 className="section-title">Why Choose CodeColab?</h2>
      <div className="benefits-grid">
        {benefits.map((benefit, index) => (
          <div key={index} className="benefit-card">
            <div className="benefit-icon">{benefit.icon}</div>
            <h3>{benefit.title}</h3>
            <p>{benefit.description}</p>
          </div>
        ))}
      </div>

      {/* Quick Start Guide */}
      <h2 className="section-title">Quick Start Guide</h2>
      <div className="quick-start">
        <div className="quick-start-steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Create or Join a Session</h3>
              <p>
                Start a new coding session or join an existing one with a simple
                click
              </p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Invite Collaborators</h3>
              <p>
                Share your session link with team members to collaborate in
                real-time
              </p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Code, Draw, Communicate</h3>
              <p>
                Use the integrated tools to code, visualize ideas, and discuss
                with your team
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Use Cases */}
      <h2 className="section-title">Perfect For</h2>
      <div className="use-cases-grid">
        <div className="use-case-card">
          <div className="use-case-icon">
            <FaUserFriends />
          </div>
          <h3>Remote Teams</h3>
          <p>Collaborate seamlessly across time zones and locations</p>
        </div>
        <div className="use-case-card">
          <div className="use-case-icon">
            <FaChalkboardTeacher />
          </div>
          <h3>Educators & Students</h3>
          <p>Create interactive coding lessons and pair programming sessions</p>
        </div>
        <div className="use-case-card">
          <div className="use-case-icon">
            <FaPuzzlePiece />
          </div>
          <h3>Technical Interviews</h3>
          <p>
            Conduct effective live coding interviews with real-time feedback
          </p>
        </div>
      </div>

      {/* Testimonials */}
      <h2 className="section-title">What Our Users Say</h2>
      <div className="testimonials">
        {testimonials.map((testimonial, index) => (
          <div key={index} className="testimonial-card">
            <p className="quote">&ldquo;{testimonial.quote}&rdquo;</p>
            <p className="author">— {testimonial.author}</p>
          </div>
        ))}
      </div>

      {/* Call to Action */}
      <div className="cta-section">
        <h2>Ready to Collaborate?</h2>
        <p>Join thousands of developers already using CodeColab</p>
        <button className="cta-button" onClick={handleCreateFirstSession}>
          <FaRocket /> Create Your First Session
        </button>
      </div>

      {showCreateModal && (
        <CreateSessionModal
          isQuickStart={isQuickStart}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSession}
        />
      )}
    </div>
  );
};

export default Dashboard;
