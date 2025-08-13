import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import AccessRequests from "./DvmfAccessRequest.jsx"
import AccountApproval from "./DvmfAccountApproval.jsx"
import Announcements from "./DvmfAnnouncement.jsx"
import DvmfDashboard from "./DvmfDashboard.jsx"
import Directory from "./DvmfDirectory.jsx"
import HealthReport from "./DvmfHealthReport.jsx"
import HorseRecord from "./DvmfHorseRecord.jsx"
import DvmfLogin from "./DvmfLogin.jsx"
import Message from "./DvmfMessage.jsx"
import Settings from "./DvmfSettings.jsx"
//import ForgotPassword from "./CtuForgotPassword.jsx"

//import ResetCode from "./CtuResetCode.jsx"



ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DvmfLogin />} />
        <Route path="/DvmfLogin" element={<DvmfLogin />} /> {/* Add this line */}
        <Route path="/DvmfDashboard" element={<DvmfDashboard />} />
        <Route path="/DvmfAccountApproval" element={<AccountApproval />} />
        <Route path="/DvmfAccessRequest" element={<AccessRequests />} />
        <Route path="/DvmfHorseRecord" element={<HorseRecord />} />
        <Route path="/DvmfHealthReport" element={<HealthReport />} />
        <Route path="/DvmfAnnouncement" element={<Announcements />} />
        <Route path="/DvmfDirectory" element={<Directory />} />
        <Route path="/DvmfSettings" element={<Settings />} />
        <Route path="/DvmfMessage" element={<Message />} />
         {/*<Route path="/ForgotPassword" element={<ForgotPassword />} />
        <Route path="/ResetCode" element={<ResetCode />} /> */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
