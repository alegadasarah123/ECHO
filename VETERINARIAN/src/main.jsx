import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import "./index.css"
import App from "./App.jsx"
import LogIn from "./logIn.jsx"
import SignUp from "./signUp.jsx"
import VetDashboard from "./dashboard.jsx"
import VetAppointments from "./appointment.jsx"
import VetAccessRequests from "./accessRequest.jsx"
import HealthLogs from "./healthLog.jsx"
import VetDirectory from "./vetDirectory.jsx"
import Settings from "./settings.jsx"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<LogIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<VetDashboard />} />
        <Route path="/appointments" element={<VetAppointments />} />
        <Route path="/access-request" element={<VetAccessRequests />} />
        <Route path="/health-logs" element={<HealthLogs />} />
        <Route path="/vet-directory" element={<VetDirectory />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
