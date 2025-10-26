import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { MapProvider } from "react-map-gl/mapbox";
const rootElement = document.getElementById("root")!;
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <MapProvider>
      <App />
    </MapProvider>
  </React.StrictMode>
);
