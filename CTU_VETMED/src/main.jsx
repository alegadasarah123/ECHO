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
import CtuLogin from "./CtuLogin.jsx"
import Message from "./CtuMessage.jsx"
import Settings from "./CtuSettings.jsx"
//import ForgotPassword from "./CtuForgotPassword.jsx"
//import ResetCode from "./CtuResetCode.jsx"



ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CtuLogin />} />
        <Route path="/CtuLogin" element={<CtuLogin />} /> {/* Add this line */}
        <Route path="/CtuDashboard" element={<CtuDashboard />} />
        <Route path="/CtuAccountApproval" element={<AccountApproval />} />
        <Route path="/CtuAccessRequest" element={<AccessRequests />} />
        <Route path="/CtuHorseRecord" element={<HorseRecord />} />
        <Route path="/CtuHealthReport" element={<HealthReport />} />
        <Route path="/CtuAnnouncement" element={<Announcements />} />
        <Route path="/CtuDirectory" element={<Directory />} />
        <Route path="/CtuSettings" element={<Settings />} />
        <Route path="/CtuMessage" element={<Message />} />
         {/*<Route path="/ForgotPassword" element={<ForgotPassword />} />
        <Route path="/ResetCode" element={<ResetCode />} /> */}
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
