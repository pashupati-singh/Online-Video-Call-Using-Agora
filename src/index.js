import React, { StrictMode }  from 'react';

import { createRoot } from "react-dom/client";

import AgoraRTC, { AgoraRTCProvider } from "agora-rtc-react";

import App from "./App";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);

const client = AgoraRTC.createClient({ mode: "rtc", codec: "h264" });

root.render(
  <StrictMode>
    <AgoraRTCProvider client={client}>
      <App />
    </AgoraRTCProvider>
  </StrictMode>
);
