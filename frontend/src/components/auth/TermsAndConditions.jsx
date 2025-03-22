import { useState } from "react";
import PropTypes from "prop-types";
import { FaTimes } from "react-icons/fa";

const TermsAndConditions = ({ onClose }) => {
  const [accepted, setAccepted] = useState(false);

  const handleAccept = () => {
    setAccepted(true);
    onClose(true);
  };

  const handleDecline = () => {
    onClose(false);
  };

  return (
    <div className="terms-modal-overlay">
      <div className="terms-modal">
        <div className="terms-modal-header">
          <h2>Terms and Conditions</h2>
          <button className="close-button" onClick={handleDecline}>
            <FaTimes />
          </button>
        </div>
        <div className="terms-modal-content">
          <h3>Welcome to CodeColab</h3>

          <h4>1. Acceptance of Terms</h4>
          <p>
            By accessing or using CodeColab, you agree to be bound by these
            Terms and Conditions, our Privacy Policy, and any other terms
            referenced herein. If you do not agree with these terms, please do
            not use our service.
          </p>

          <h4>2. Description of Service</h4>
          <p>
            CodeColab is a collaborative coding platform that allows users to
            create, join, and participate in real-time coding sessions. We
            provide tools for code editing, video communication, and knowledge
            sharing.
          </p>

          <h4>3. User Accounts</h4>
          <p>
            To use CodeColab, you must create an account. You are responsible
            for maintaining the confidentiality of your account information and
            for all activities that occur under your account. You agree to
            provide accurate and complete information when creating your
            account.
          </p>

          <h4>4. User Conduct</h4>
          <p>
            You agree not to use CodeColab for any illegal or unauthorized
            purpose. You must not violate any laws in your jurisdiction when
            using our service. You also agree not to:
          </p>
          <ul>
            <li>Post or transmit harmful code or malware</li>
            <li>Harass, abuse, or harm another person</li>
            <li>Share inappropriate or offensive content</li>
            <li>Infringe upon intellectual property rights</li>
            <li>
              Attempt to gain unauthorized access to other accounts or systems
            </li>
          </ul>

          <h4>5. Intellectual Property</h4>
          <p>
            All content created within CodeColab sessions belongs to the
            respective creators. However, you grant CodeColab a non-exclusive
            license to store, display, and process your content for the purpose
            of providing our service.
          </p>

          <h4>6. Data Privacy</h4>
          <p>
            Our Privacy Policy explains how we collect, use, and protect your
            personal information. By using CodeColab, you consent to our data
            practices as described in our Privacy Policy.
          </p>

          <h4>7. Limitation of Liability</h4>
          <p>
            CodeColab is provided &ldquo;as is&rdquo; without warranties of any
            kind, either express or implied. We do not guarantee that our
            service will be uninterrupted, timely, secure, or error-free. In no
            event shall CodeColab be liable for any damages arising from the use
            of our service.
          </p>

          <h4>8. Modification of Terms</h4>
          <p>
            We may modify these terms at any time. Continued use of CodeColab
            after any changes constitutes your acceptance of the new terms.
          </p>

          <h4>9. Termination</h4>
          <p>
            We reserve the right to terminate or suspend your account at our
            discretion, without notice, for conduct that we believe violates
            these terms or is harmful to other users, us, or third parties, or
            for any other reason.
          </p>

          <h4>10. Contact Information</h4>
          <p>
            If you have any questions about these Terms and Conditions, please
            contact us at support@codecolab.com.
          </p>
        </div>

        <div className="terms-modal-footer">
          <button className="decline-button" onClick={handleDecline}>
            Decline
          </button>
          <button
            className="accept-button"
            onClick={handleAccept}
            disabled={accepted}
          >
            {accepted ? "Accepted" : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
};

TermsAndConditions.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default TermsAndConditions;
