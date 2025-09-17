import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X, Maximize2 } from "lucide-react";

const FloatingMessages = () => {
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [clientReady, setClientReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const clientRef = useRef(null);

  if (!clientReady || !clientRef.current) return null;

  // Custom styles
  const styles = {
    floatingButton: {
      position: "fixed",
      bottom: "1rem",
      right: "1rem",
      width: "56px",
      height: "56px",
      borderRadius: "50%",
      background: "linear-gradient(to bottom right, #3b82f6, #6366f1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
      cursor: "pointer",
      zIndex: 1001,
    },
    panel: {
      position: "fixed",
      bottom: isFullscreen ? "0" : "4rem",
      right: isFullscreen ? "0" : "1rem",
      width: isFullscreen ? "100%" : "400px",
      height: isFullscreen ? "100%" : "600px",
      borderRadius: isFullscreen ? "0" : "1rem",
      background: "#fff",
      boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      zIndex: 1000,
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0.5rem 1rem",
      background: "#f3f4f6",
      borderBottom: "1px solid #e5e7eb",
    },
    chatContainer: {
      display: "flex",
      flex: 1,
      overflow: "hidden",
    },
    channelList: {
      width: "260px",
      borderRight: "1px solid #e5e7eb",
    },
    chatArea: {
      flex: 1,
      display: "flex",
      flexDirection: "column",
    },
  };

  return (
    <>
      {/* Floating Icon */}
      {!isOpen && (
        <button style={styles.floatingButton} onClick={() => setIsOpen(true)}>
          <MessageCircle size={28} color="white" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div style={styles.panel}>
          {/* Header */}
          <div style={styles.header}>
            <h3 style={{ margin: 0 }}>Messages</h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                <Maximize2 size={18} />
              </button>
              <button
                style={{ background: "transparent", border: "none", cursor: "pointer" }}
                onClick={() => setIsOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Stream Chat */}
          <Chat client={clientRef.current} theme="messaging light">
            <div style={styles.chatContainer}>
              {/* Channel List */}
              <div style={styles.channelList}>
                <ChannelList
                  filters={{ members: { $in: [clientRef.current.userID] } }}
                  onSelect={(channel) => setSelectedChannel(channel)}
                  selectedChannel={selectedChannel}
                />
              </div>

              {/* Selected Channel */}
              <div style={styles.chatArea}>
                {selectedChannel ? (
                  <Channel channel={selectedChannel}>
                    <ChannelHeader />
                    <MessageList />
                    <MessageInput focus />
                    <Thread />
                  </Channel>
                ) : (
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#6b7280",
                      fontStyle: "italic",
                    }}
                  >
                    Select a conversation
                  </div>
                )}
              </div>
            </div>
          </Chat>
        </div>
      )}
    </>
  );
};

export default FloatingMessages;
