import React, { useEffect } from 'react';

const MessagesPage = () => {
  useEffect(() => {
    fetch('sidebar.html')
      .then((res) => res.text())
      .then((data) => {
        const sidebar = document.getElementById('sidebar-placeholder');
        sidebar.innerHTML = data;

        sidebar.addEventListener('mouseenter', () => {
          document.querySelector('.main-content').style.marginLeft = '250px';
        });

        sidebar.addEventListener('mouseleave', () => {
          document.querySelector('.main-content').style.marginLeft = '80px';
        });
      });

    const toggleSidebar = () => {
      const sidebar = document.getElementById('sidebar');
      sidebar.classList.toggle('mobile-open');
    };

    window.toggleSidebar = toggleSidebar;
  }, []);

  return (
    <div className="messages-container">
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Inter', sans-serif; background-color: #f6f6f6; }
        .messages-container { display: flex; min-height: 100vh; }
        .menu-toggle { display: none; background: #D2691E; color: white; border: none; width: 50px; height: 50px; border-radius: 50%; cursor: pointer; position: fixed; top: 1rem; left: 1rem; z-index: 1002; }
        @media (max-width: 768px) { .menu-toggle { display: flex; align-items: center; justify-content: center; } }
        @media (max-width: 768px) { #sidebar { position: fixed; left: -260px; top: 0; height: 100%; width: 260px; background: white; z-index: 1001; transition: left 0.3s ease; } #sidebar.mobile-open { left: 0; } .main-content { flex: 1; transition: margin-left 0.3s ease; } }
        .main-content { flex: 1; padding: 20px; border-radius: 16px; background-color: #fff; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); transition: margin-left 0.3s ease; margin-left: 80px; }
        @media (max-width: 768px) { .main-content { margin: 0px 10px 20px 10px; border-radius: 12px; padding: 16px; } }
        .container { display: flex; height: 100vh; }
        .sidebar-messages { width: 260px; background-color: white; border-right: 1px solid #ccc; display: flex; flex-direction: column; padding: 10px; }
        .sidebar-messages h2 { font-size: 18px; margin-bottom: 10px; }
        .search-input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; margin-bottom: 15px; }
        .contact { display: flex; align-items: center; padding: 8px 0; }
        .contact .avatar { width: 40px; height: 40px; background-color: #ccc; color: black; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: bold; margin-right: 10px; }
        .contact-info { font-size: 14px; }
        .contact-info .name { font-weight: bold; }
        .contact-info .preview { color: gray; font-size: 13px; }
        .chat { flex: 1; display: flex; flex-direction: column; background-color: #fff; }
        .chat-header { padding: 12px 16px; font-weight: bold; border-bottom: 1px solid #ddd; }
        .chat-body { flex: 1; padding: 20px; overflow-y: auto; }
        .chat-date { text-align: center; font-size: 13px; color: #666; margin-bottom: 20px; }
        .message-row { display: flex; margin-bottom: 20px; }
        .message-row.left { justify-content: flex-start; }
        .message-row.right { justify-content: flex-end; }
        .message-bubble { background-color: #fff; border: 1px solid #ccc; padding: 12px; border-radius: 6px; max-width: 350px; font-size: 14px; position: relative; }
        .message-avatar { width: 35px; height: 35px; border-radius: 50%; margin: 0 8px; object-fit: cover; }
        .timestamp { font-size: 12px; color: gray; margin-top: 4px; }
        .chat-footer { display: flex; align-items: center; padding: 10px 16px; border-top: 1px solid #ccc; background-color: #fff; }
        .chat-footer input { flex: 1; padding: 10px 12px; border-radius: 25px; border: 1px solid #ccc; outline: none; }
        .send-icon { width: 24px; height: 24px; margin-left: 10px; cursor: pointer; }
      `}</style>

      <button className="menu-toggle" onClick={() => window.toggleSidebar()}>☰</button>
      <div id="sidebar-placeholder"></div>

      <div className="main-content">
        <div className="container">
          <div className="sidebar-messages">
            <h2>Messages ✏️</h2>
            <input className="search-input" type="text" placeholder="Search......" />
            <div className="contact">
              <div className="avatar">HC</div>
              <div className="contact-info">
                <div className="name">Harold Cabanero</div>
                <div className="preview">I see, okay noted......</div>
              </div>
            </div>
          </div>

          <div className="chat">
            <div className="chat-header">Harold Cabanero</div>
            <div className="chat-body">
              <div className="chat-date">Today, May 5</div>
              <div className="message-row left">
                <div className="avatar">HC</div>
                <div>
                  <div className="message-bubble">
                    Good day, may I request an appointment with the DVMF for my vehicle inspection and clearance?
                  </div>
                  <div className="timestamp">1:00 PM</div>
                </div>
              </div>
              <div className="message-row right">
                <div>
                  <div className="message-bubble">
                    Good day, your appointment has been scheduled for May 5 at 1:00 pm. Please bring all necessary documents and arrive 10 minutes early.
                  </div>
                  <div className="timestamp" style={{ textAlign: 'right' }}>1:30 PM</div>
                </div>
                <img className="message-avatar" src="https://upload.wikimedia.org/wikipedia/commons/2/27/Department_of_Transportation_%28DOTR%29.svg" alt="DVMF Logo" />
              </div>
            </div>

            <div className="chat-footer">
              <input type="text" placeholder="Type message......" />
              <img className="send-icon" src="Images/send.png" alt="Send" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;
