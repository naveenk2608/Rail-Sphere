import React from "react";
import ReactDOM from "react-dom/client";
// Global tokens first, so component stylesheets can build on and override them.
import "./styles/global.css";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
