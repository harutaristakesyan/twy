import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";

const Root = () => (
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element #root not found in document");
}

ReactDOM.createRoot(rootElement).render(<Root />);
