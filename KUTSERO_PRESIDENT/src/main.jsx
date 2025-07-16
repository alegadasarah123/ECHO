// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LogIn from "./logIn";
import Dashboard from "./dashboard";
import MessagesPage from "./messages";
import Settings from "./settings";
import UserManagement from "./userManagement";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LogIn />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/users" element={<UserManagement />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
