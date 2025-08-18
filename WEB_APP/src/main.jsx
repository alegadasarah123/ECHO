import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import "./index.css"
import App from "./pages/Auth/App.jsx"
import LogIn from "./pages/Auth/logIn.jsx"
import SignUp from "./pages/Veterinarian/signUp.jsx"
import VetDashboard from "./pages/Veterinarian/dashboard.jsx"
import VetAppointments from "./pages/Veterinarian/appointment.jsx"
import VetAccessRequests from "./pages/Veterinarian/accessRequest.jsx"
import HealthLogs from "./pages/Veterinarian/healthLog.jsx"
import VetDirectory from "./pages/Veterinarian/vetDirectory.jsx"
import Settings from "./pages/Veterinarian/settings.jsx"
import AccessRequests from "./CtuAccessRequest.jsx"
import AccountApproval from "./CtuAccountApproval.jsx"
import Announcements from "./CtuAnnouncement.jsx"
import CtuDashboard from "./CtuDashboard.jsx"
import Directory from "./CtuDirectory.jsx"
import HealthReport from "./CtuHealthReport.jsx"
import HorseRecord from "./CtuHorseRecord.jsx"
import Message from "./CtuMessage.jsx"
import Settings from "./CtuSettings.jsx"

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
        <Route path="/CtuDashboard" element={<CtuDashboard />} />
        <Route path="/CtuAccountApproval" element={<AccountApproval />} />
        <Route path="/CtuAccessRequest" element={<AccessRequests />} />
        <Route path="/CtuHorseRecord" element={<HorseRecord />} />
        <Route path="/CtuHealthReport" element={<HealthReport />} />
        <Route path="/CtuAnnouncement" element={<Announcements />} />
        <Route path="/CtuDirectory" element={<Directory />} />
        <Route path="/CtuSettings" element={<Settings />} />
        <Route path="/CtuMessage" element={<Message />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
