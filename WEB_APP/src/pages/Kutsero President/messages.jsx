import React, { useState } from "react";

const FloatingChat = ({
  title = "Messages",
  userName = "You",
  contactName = "Harold Cabanero",
  messages = [],
  onSend = () => {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");

  const toggleChat = () => setIsOpen(!isOpen);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSend({ sender: userName, text: newMessage, timestamp: new Date().toLocaleTimeString() });
      setNewMessage("");
    }
  };

  return (
    <>
      {/* Floating Button */}
      <div
        onClick={toggleChat}
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          backgroundColor: "#D2691E",
          borderRadius: "50%",
          width: "60px",
          height: "60px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: "24px",
          cursor: "pointer",
          zIndex: 9999,
          boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
        }}
      >
        💬
      </div>

      {/* Fullscreen Modal */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "white",
            zIndex: 9998,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "1rem",
              borderBottom: "1px solid #ddd",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <h2 style={{ margin: 0 }}>{title}</h2>
            <button onClick={toggleChat} style={{ fontSize: "20px", border: "none", background: "none", cursor: "pointer" }}>
              ✖
            </button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: "1rem", overflowY: "auto" }}>
            {messages.length === 0 && (
              <p style={{ textAlign: "center", color: "#aaa" }}>No messages yet.</p>
            )}
            {messages.map((msg, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  justifyContent: msg.sender === userName ? "flex-end" : "flex-start",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    backgroundColor: msg.sender === userName ? "#dcf8c6" : "#f1f0f0",
                    padding: "10px",
                    borderRadius: "10px",
                    maxWidth: "70%",
                    fontSize: "14px",
                  }}
                >
                  <div style={{ fontWeight: "bold" }}>{msg.sender}</div>
                  <div>{msg.text}</div>
                  <div style={{ textAlign: "right", fontSize: "12px", color: "#777" }}>{msg.timestamp}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div
            style={{
              display: "flex",
              padding: "10px",
              borderTop: "1px solid #ccc",
              alignItems: "center",
            }}
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "20px",
                border: "1px solid #ccc",
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
            />
            <button
              onClick={handleSend}
              style={{
                marginLeft: "10px",
                backgroundColor: "#D2691E",
                color: "white",
                padding: "8px 16px",
                borderRadius: "20px",
                border: "none",
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingChat;
