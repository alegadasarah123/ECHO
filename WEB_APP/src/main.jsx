import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import AccessRequests from "./CtuAccessRequest.jsx"
import AccountApproval from "./CtuAccountApproval.jsx"
import Announcements from "./CtuAnnouncement.jsx"
import CtuDashboard from "./CtuDashboard.jsx"
import Directory from "./CtuDirectory.jsx"
import HealthReport from "./CtuHealthReport.jsx"
import HorseRecord from "./CtuHorseRecord.jsx"
import Message from "./CtuMessage.jsx"
import Setting from "./CtuSettings.jsx"
import AccessRequest from "./DvmfAccessRequest.jsx"
import AccountApprovals from "./DvmfAccountApproval.jsx"
import Announcement from "./DvmfAnnouncement.jsx"
import Directorys from "./DvmfDirectory.jsx"
import HealthReports from "./DvmfHealthReport.jsx"
import HorseRecords from "./DvmfHorseRecord.jsx"
import Messages from "./DvmfMessage.jsx"
import Settingss from "./DvmfSettings.jsx"
import "./index.css"
import App from "./pages/Auth/App.jsx"
import LogIn from "./pages/Auth/logIn.jsx"
import VetAccessRequests from "./pages/Veterinarian/accessRequest.jsx"
import VetAppointments from "./pages/Veterinarian/appointment.jsx"
import VetDashboard from "./pages/Veterinarian/dashboard.jsx"
import HealthLogs from "./pages/Veterinarian/healthLog.jsx"
import Settings from "./pages/Veterinarian/settings.jsx"
import SignUp from "./pages/Veterinarian/signUp.jsx"
import VetDirectory from "./pages/Veterinarian/vetDirectory.jsx"

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
        <Route path="/CtuSettings" element={<Setting />} />
        <Route path="/CtuMessage" element={<Message />} />
        <Route path="/DvmfDashboard" element={<DvmfDashboard />} />
        <Route path="/DvmfAccountApproval" element={<AccountApprovals />} />
        <Route path="/DvmfAccessRequest" element={<AccessRequest />} />
        <Route path="/DvmfHorseRecord" element={<HorseRecords />} />
        <Route path="/DvmfHealthReport" element={<HealthReports />} />
        <Route path="/DvmfAnnouncement" element={<Announcement />} />
        <Route path="/DvmfDirectory" element={<Directorys />} />
        <Route path="/DvmfSettings" element={<Settingss />} />
        <Route path="/DvmfMessage" element={<Messages />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
