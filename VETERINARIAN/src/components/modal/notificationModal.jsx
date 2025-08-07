import React from "react";

const NotificationModal = ({ isOpen, onClose, notifications = [] }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute right-6 top-16 z-50 w-80">
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Notifications</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {notifications.length === 0 ? (
          <p className="text-sm text-gray-500">No new notifications</p>
        ) : (
          <ul className="space-y-2 max-h-60 overflow-y-auto">
            {notifications.map((note, idx) => (
              <li
                key={idx}
                className="p-3 bg-gray-50 rounded-lg shadow-sm text-gray-700 text-sm"
              >
                {note}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationModal;
