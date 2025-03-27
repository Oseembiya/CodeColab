import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./styles/main.css";
import config from "./config/env";

// Log environment info in development mode
if (config.isDevelopment && config.debug) {
  console.log("Running in development mode");
  console.log("Environment config:", config);
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
