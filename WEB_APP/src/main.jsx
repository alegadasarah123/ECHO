import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import App from "./pages/Auth/App.jsx";
import LogIn from "./pages/Auth/logIn.jsx";
import AccessRequests from "./pages/Ctu-Vetmed/CtuAccessRequest.jsx";
import AccountApproval from "./pages/Ctu-Vetmed/CtuAccountApproval.jsx";
import Announcements from "./pages/Ctu-Vetmed/CtuAnnouncement.jsx";
import CtuDashboard from "./pages/Ctu-Vetmed/CtuDashboard.jsx";
import Directory from "./pages/Ctu-Vetmed/CtuDirectory.jsx";
import HealthReport from "./pages/Ctu-Vetmed/CtuHealthReport.jsx";
import HorseRecord from "./pages/Ctu-Vetmed/CtuHorseRecord.jsx";
import Message from "./pages/Ctu-Vetmed/CtuMessage.jsx";
import Setting from "./pages/Ctu-Vetmed/CtuSettings.jsx";
import AccessRequest from "./pages/DVMF/DvmfAccessRequest.jsx";
import AccountApprovals from "./pages/DVMF/DvmfAccountApproval.jsx";
import Announcement from "./pages/DVMF/DvmfAnnouncement.jsx";
import DvmfDashboard from "./pages/DVMF/DvmfDashboard.jsx";
import Directorys from "./pages/DVMF/DvmfDirectory.jsx";
import HealthReports from "./pages/DVMF/DvmfHealthReport.jsx";
import HorseRecords from "./pages/DVMF/DvmfHorseRecord.jsx";
import Messages from "./pages/DVMF/DvmfMessage.jsx";
import Settingss from "./pages/DVMF/DvmfSettings.jsx";
import VetAccessRequests from "./pages/Veterinarian/accessRequest.jsx";
import VetAppointments from "./pages/Veterinarian/appointment.jsx";
import VetDashboard from "./pages/Veterinarian/dashboard.jsx";
import HealthLogs from "./pages/Veterinarian/healthLog.jsx";
import Settings from "./pages/Veterinarian/settings.jsx";
import SignUp from "./pages/Veterinarian/signUp.jsx";
import VetDirectory from "./pages/Veterinarian/vetDirectory.jsx";

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
