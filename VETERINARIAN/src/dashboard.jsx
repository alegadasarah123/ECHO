// src/pages/Dashboard.jsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { FaCalendarAlt, FaUserCheck, FaHeartbeat } from 'react-icons/fa';

const data = [
  { name: 'Checkups', value: 8 },
  { name: 'Vaccinations', value: 5 },
  { name: 'Deworming', value: 3 },
  { name: 'Emergency', value: 1 },
];

const Dashboard = () => {
  return (
    <div className="flex font-sans">
      <div className="w-64" />
      <main className="flex-1 px-10 py-8 bg-gradient-to-br from-white to-blue-100 min-h-screen">
        <div className="bg-white rounded-3xl shadow-[0_10px_25px_rgba(0,0,0,0.1)] p-10 mb-12 border-l-8 border-blue-600 animate-fade-in">
          <h1 className="text-5xl font-extrabold text-blue-900 mb-2">Welcome, Doctor!</h1>
          <p className="text-gray-600 text-lg">Here’s your dashboard for today’s overview.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white p-6 rounded-3xl shadow-xl border-t-4 border-blue-500 transform hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer relative overflow-hidden">
            <FaCalendarAlt className="text-blue-600 text-6xl absolute -top-4 -right-4 opacity-10" />
            <div className="z-10 relative">
              <h2 className="text-xl font-semibold text-gray-700">Today’s Appointments</h2>
              <p className="text-4xl font-bold text-blue-700 mt-2">4</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-xl border-t-4 border-red-500 transform hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer relative overflow-hidden">
            <FaUserCheck className="text-red-600 text-6xl absolute -top-4 -right-4 opacity-10" />
            <div className="z-10 relative">
              <h2 className="text-xl font-semibold text-gray-700">Access Requests</h2>
              <p className="text-4xl font-bold text-red-700 mt-2">2</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-xl border-t-4 border-green-500 transform hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer relative overflow-hidden">
            <FaHeartbeat className="text-green-600 text-6xl absolute -top-4 -right-4 opacity-10" />
            <div className="z-10 relative">
              <h2 className="text-xl font-semibold text-gray-700">New Health Logs</h2>
              <p className="text-4xl font-bold text-green-700 mt-2">6</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-8">This Week’s Activity</h2>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#2563eb" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
