import React, { Component } from "react";
import config from "../config/env";

/**
 * ErrorFallback component displayed when an error occurs
 */
const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div className="error-boundary">
    <div className="error-container">
      <h2>Something went wrong</h2>
      <p className="error-message">
        {error.message || "An unexpected error occurred"}
      </p>
      {config.isDevelopment && <pre className="error-stack">{error.stack}</pre>}
      <button className="error-reset-button" onClick={resetErrorBoundary}>
        Try again
      </button>
    </div>
  </div>
);

/**
 * Error boundary component to catch JavaScript errors
 * and display a fallback UI instead of crashing the app
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({ errorInfo });

    // In production, you could send this to an error reporting service
    if (config.isProduction) {
      // Example: sendToErrorReporting(error, errorInfo);
      console.error("Uncaught error:", error.message);
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Call onReset callback if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Render fallback UI
      return (
        <ErrorFallback
          error={this.state.error}
          resetErrorBoundary={this.resetErrorBoundary}
        />
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
