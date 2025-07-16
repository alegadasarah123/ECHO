// src/components/Sidebar.jsx
import { Link, useLocation } from 'react-router-dom';
import {
  FaTachometerAlt,
  FaCalendarAlt,
  FaUserCheck,
  FaHeartbeat,
  FaUsers,
  FaCog,
} from 'react-icons/fa';

const Sidebar = () => {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: <FaTachometerAlt /> },
    { name: 'Appointments', path: '/appointments', icon: <FaCalendarAlt /> },
    { name: 'Access Requests', path: '/access-requests', icon: <FaUserCheck /> },
    { name: 'Health Logs', path: '/health-logs', icon: <FaHeartbeat /> },
    { name: 'Vet Directory', path: '/vet-directory', icon: <FaUsers /> },
    { name: 'Settings', path: '/settings', icon: <FaCog /> },
  ];

  return (
    <aside className="fixed top-0 left-0 w-64 h-full bg-gradient-to-b from-blue-900 to-blue-800 text-white p-6 shadow-2xl z-10 flex flex-col">
      <div className="mb-12">
        <h2 className="text-3xl font-extrabold tracking-wide text-center">Vet Panel</h2>
      </div>
      <nav className="flex flex-col gap-3">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 hover:bg-blue-700 ${
              location.pathname === item.path ? 'bg-blue-700' : ''
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-md font-medium">{item.name}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;