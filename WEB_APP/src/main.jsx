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
import VetAppointmentRequest from"./pages/Veterinarian/VetAppRequest";
import VetMedRecord from "./pages/Veterinarian/VetMedRecord.jsx";
import VetSettings from "./pages/Veterinarian/VetSettings.jsx";
import AppointmentDetails from "./pages/Veterinarian/AppointmentDetails.jsx";
import ScheduleCalendar from "./pages/Veterinarian/VetScheduleCalendar.jsx";
import KutDashboard from "./pages/KutseroPresident/KutDashboard.jsx";
import KutUserApproval from "./pages/KutseroPresident/KutUserApproval.jsx";
import KutUserAccount from "./pages/KutseroPresident/KutUserAcc.jsx";
import KutSettings from "./pages/KutseroPresident/KutSettings.jsx"
import KutMessages from "./pages/KutseroPresident/KutMessages.jsx"
import KutUserManagement from "./pages/KutseroPresident/KutUserManagement.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<LogIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/KutDashboard" element={<KutDashboard />} />
        <Route path="/KutUserApproval" element={<KutUserApproval />} />
        <Route path="/KutUserAccount" element={<KutUserAccount />} />
        <Route path="/KutSettings" element={<KutSettings />} />
        <Route path="/KutMessages" element={<KutMessages />} />
        <Route path="/KutUserManagement" element={<KutUserManagement />} />
        <Route path="/VetDashboard" element={<VetDashboard />} />
        <Route path="/VetAppointmentRequests" element={<VetAppointmentRequest/>}/>
        <Route path="/VetAppointments" element={<VetAppointment />} />
        <Route path="/VetAppointmentDetails/:id" element={<AppointmentDetails />} />
        <Route path="/VetScheduleCalendar" element={<ScheduleCalendar />} />
        <Route path="/VetMedRecord" element={<VetMedRecord />} />
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
