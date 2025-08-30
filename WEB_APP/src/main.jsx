import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import App from "./pages/Auth/App.jsx";
import LogIn from "./pages/Auth/logIn.jsx";
import SignUp from "./pages/Auth/signUp.jsx";
import AccessRequests from "./pages/Ctu-Vetmed/CtuAccessRequest.jsx";
import AccountApproval from "./pages/Ctu-Vetmed/CtuAccountApproval.jsx";
import Announcements from "./pages/Ctu-Vetmed/CtuAnnouncement.jsx";
import CtuDashboard from "./pages/Ctu-Vetmed/CtuDashboard.jsx";
import Directory from "./pages/Ctu-Vetmed/CtuDirectory.jsx";
import HealthReport from "./pages/Ctu-Vetmed/CtuHealthReport.jsx";
import HorseRecord from "./pages/Ctu-Vetmed/CtuHorseRecord.jsx";
import Message from "./pages/Ctu-Vetmed/CtuMessage.jsx";
import Setting from "./pages/Ctu-Vetmed/CtuSettings.jsx";
import AccessRequest from "./pages/Dvmf/DvmfAccessRequest.jsx";
import AccountApprovals from "./pages/Dvmf/DvmfAccountApproval.jsx";
import Announcement from "./pages/Dvmf/DvmfAnnouncement.jsx";
import DvmfDashboard from "./pages/Dvmf/DvmfDashboard.jsx";
import Directorys from "./pages/Dvmf/DvmfDirectory.jsx";
import HealthReports from "./pages/Dvmf/DvmfHealthReport.jsx";
import HorseRecords from "./pages/Dvmf/DvmfHorseRecord.jsx";
import Messages from "./pages/Dvmf/DvmfMessage.jsx";
import Settingss from "./pages/Dvmf/DvmfSettings.jsx";
import VetAppointment from "./pages/Veterinarian/VetAppointment.jsx";
import VetDashboard from "./pages/Veterinarian/VetDashboard.jsx";
import VetDirectory from "./pages/Veterinarian/vetDirectory.jsx";
import VetRequest from "./pages/Veterinarian/VetRequest.jsx";
import VetSettings from "./pages/Veterinarian/VetSettings.jsx";
import VetHealthLog from "./pages/Veterinarian/VetHealthLog.jsx";
import KutDashboard from "./pages/Kutsero President/KutDashboard.jsx";
import KutUserManagement from "./pages/Kutsero President/KutUserApproval.jsx";
import KutUserAccount from "./pages/Kutsero President/KutUserAcc.jsx";
import KutSettings from "./pages/Kutsero President/KutSettings.jsx"
import KutMessages from "./pages/Kutsero President/KutMessages.jsx"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<LogIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/KutDashboard" element={<KutDashboard />} />
        <Route path="/KutUserManagement" element={<KutUserManagement />} />
        <Route path="/KutUserAccount" element={<KutUserAccount />} />
        <Route path="/KutSettings" element={<KutSettings />} />
        <Route path="/KutMessages" element={<KutMessages />} />
        <Route path="/VetDashboard" element={<VetDashboard />} />
        <Route path="/VetAppointment" element={<VetAppointment />} />
        <Route path="/VetRequest" element={<VetRequest />} />
        <Route path="/VetHealthLog" element={<VetHealthLog />} />
        <Route path="/VetDirectory" element={<VetDirectory />} />
        <Route path="/VetSettings" element={<VetSettings />} />
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
