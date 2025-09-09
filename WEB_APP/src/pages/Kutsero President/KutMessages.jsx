import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Maximize2, ArrowLeft, Send, Phone, Video, MoreVertical, Search } from 'lucide-react';

const API_BASE = "http://localhost:8000/api/kutsero_president"; 

const FloatingMessages = () => {
  const [viewState, setViewState] = useState('closed');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [conversations, setConversations] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);

  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Prevent background scroll when fullscreen
  useEffect(() => {
    if (viewState === "fullscreen") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  }, [viewState]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConversation?.messages]);

  // Fetch conversations
  useEffect(() => {
    fetchConversations('');
  }, []);

  const fetchConversations = async (query) => {
    try {
      const res = await fetch(`${API_BASE}/search_users/?q=${encodeURIComponent(query)}`, {
        credentials: "include",
      });
      const data = await res.json();
      const users = data.users || [];
      const mapped = users.map(u => ({
        id: u.id,
        name: u.name || u.email,
        avatar: (u.name || u.email).slice(0, 2).toUpperCase(),
        lastMessage: '',
        timestamp: '',
        unread: 0,
        online: false,
        messages: []
      }));
      setConversations(mapped);
      const unreadSum = mapped.reduce((sum, c) => sum + (c.unread || 0), 0);
      setTotalUnread(unreadSum);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    fetchConversations(term);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const res = await fetch(`${API_BASE}/send_message/`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: "CURRENT_USER_ID", // replace with actual logged-in user id
          receiver_id: selectedConversation.id,
          mes_content: newMessage,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setConversations(prev =>
          prev.map(conv =>
            conv.id === selectedConversation.id
              ? {
                  ...conv,
                  messages: [
                    ...conv.messages,
                    {
                      content: data.mes_content || newMessage,
                      timestamp: new Date(data.mes_date || Date.now()).toLocaleTimeString(),
                      isOwn: true,
                    },
                  ],
                }
              : conv
          )
        );
        setNewMessage("");
        if (textareaRef.current) {
          textareaRef.current.style.height = "20px";
        }
      } else {
        console.error("Failed to send message:", data);
      }
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  const ConversationList = () => (
    <div style={styles.conversationList}>
      <div style={styles.searchHeader}>
        <div style={styles.searchWrapper}>
          <Search style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search conversations..."
            style={styles.searchInput}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>
      <div style={styles.conversationsContainer}>
        {conversations.map(conv => (
          <div
            key={conv.id}
            onClick={() => setSelectedConversation(conv)}
            style={styles.conversationItem}
          >
            <div style={styles.avatarWrapper}>
              <div style={{ ...styles.avatar, background: 'linear-gradient(to bottom right, #3b82f6, #8b5cf6)' }}>
                {conv.avatar}
              </div>
              {conv.online && <div style={styles.onlineBadge}></div>}
            </div>
            <div style={styles.conversationInfo}>
              <div style={styles.conversationHeader}>
                <h4 style={styles.conversationName}>{conv.name}</h4>
                <span style={styles.conversationTimestamp}>{conv.timestamp}</span>
              </div>
              <p style={styles.conversationLastMessage}>{conv.lastMessage}</p>
            </div>
            {conv.unread > 0 && <div style={styles.unreadBadge}>{conv.unread}</div>}
          </div>
        ))}
      </div>
    </div>
  );

  const ChatView = ({ conversation }) => (
    <div style={styles.chatView}>
      <div style={styles.chatHeader}>
        <div style={styles.chatHeaderLeft}>
          <button onClick={() => setSelectedConversation(null)} style={styles.iconButton}>
            <ArrowLeft style={styles.icon} />
          </button>
          <div style={styles.avatarWrapper}>
            <div style={{ ...styles.avatar, width: '40px', height: '40px', fontSize: '14px', background: 'linear-gradient(to bottom right, #3b82f6, #8b5cf6)' }}>
              {conversation.avatar}
            </div>
            {conversation.online && <div style={styles.onlineBadge}></div>}
          </div>
          <div>
            <h3 style={styles.chatName}>{conversation.name}</h3>
            <p style={styles.chatStatus}>{conversation.online ? 'Active now' : 'Last seen 2h ago'}</p>
          </div>
        </div>
        <div style={styles.chatHeaderRight}>
          {[Phone, Video, MoreVertical].map((IconComp, idx) => (
            <button key={idx} style={styles.iconButton}>
              <IconComp style={styles.icon} />
            </button>
          ))}
        </div>
      </div>
      <div style={styles.messagesContainer}>
        {conversation.messages.map((message, index) => (
          <div key={index} style={{ display: 'flex', justifyContent: message.isOwn ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '60%' }}>
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  backgroundColor: message.isOwn ? '#3b82f6' : '#fff',
                  color: message.isOwn ? '#fff' : '#111827',
                  marginBottom: '2px',
                  boxShadow: message.isOwn ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
                  borderBottomRightRadius: message.isOwn ? '4px' : '20px',
                  borderBottomLeftRadius: !message.isOwn ? '4px' : '20px',
                }}
              >
                {message.content}
              </div>
              <div style={{ fontSize: '12px', color: '#6b7280', textAlign: message.isOwn ? 'right' : 'left', paddingLeft: message.isOwn ? '0' : '4px', paddingRight: message.isOwn ? '4px' : '0' }}>
                {message.timestamp}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div style={styles.messageInputContainer}>
        <div style={styles.messageInputWrapper}>
          <textarea
            ref={textareaRef}
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
                textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 80) + "px"; // max 4 lines
              }
            }}
            placeholder="Type a message..."
            style={styles.messageInput}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
        </div>
        <button onClick={handleSendMessage} style={styles.sendButton}>
          <Send style={{ width: '16px', height: '16px' }} />
        </button>
      </div>
    </div>
  );

  const FloatingButton = () => (
    <div style={styles.floatingButtonWrapper}>
      <button onClick={() => setViewState('small')} style={styles.floatingButton}>
        <MessageCircle style={{ width: '24px', height: '24px' }} />
        {totalUnread > 0 && <span style={styles.totalUnread}>{totalUnread}</span>}
      </button>
    </div>
  );

  if (viewState === 'closed') return <FloatingButton />;

  return (
    <div style={viewState === 'fullscreen' ? styles.fullscreenWrapper : styles.smallWrapper}>
      <div style={styles.chatBoxHeader}>
        <div style={styles.chatBoxHeaderLeft}>
          <MessageCircle style={{ width: '20px', height: '20px' }} />
          <div style={{ marginLeft: '8px' }}>
            <h3 style={{ fontWeight: 600, fontSize: '14px' }}>Messages</h3>
            <p style={{ fontSize: '12px', opacity: 0.9 }}>{conversations.length} conversations</p>
          </div>
        </div>
        <div style={styles.chatBoxHeaderRight}>
          <button onClick={() => setViewState('fullscreen')} style={styles.iconButton}>
            <Maximize2 style={styles.icon} />
          </button>
          <button onClick={() => setViewState('closed')} style={styles.iconButton}>
            <X style={styles.icon} />
          </button>
        </div>
      </div>
      {viewState === 'fullscreen' ? (
        <div style={{ flex: 1, display: 'flex' }}>
          <div style={{ width: '300px', borderRight: '1px solid #e5e7eb' }}>
            <ConversationList />
          </div>
          <div style={{ flex: 1 }}>
            {selectedConversation ? <ChatView conversation={selectedConversation} /> : <div style={{ padding: '20px', color: '#6b7280' }}>Select a conversation</div>}
          </div>
        </div>
      ) : (
        selectedConversation ? <ChatView conversation={selectedConversation} /> : <ConversationList />
      )}
    </div>
  );
};

// Internal CSS
const styles = {
  conversationList: { display: 'flex', flexDirection: 'column', height: '100%' },
  searchHeader: { padding: '16px', borderBottom: '1px solid #e5e7eb' },
  searchWrapper: { position: 'relative' },
  searchIcon: { position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', width: '16px', height: '16px' },
  searchInput: { width: '100%', padding: '8px 12px 8px 36px', borderRadius: '9999px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' },
  conversationsContainer: { flex: 1, overflowY: 'auto' },
  conversationItem: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', transition: 'background-color 0.2s', backgroundColor: '#fff' },
  avatarWrapper: { position: 'relative' },
  avatar: { width: '48px', height: '48px', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600},
  onlineBadge: { position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', backgroundColor: '#22c55e', border: '2px solid #fff', borderRadius: '9999px' },
  conversationInfo: { flex: 1, minWidth: 0 },
  conversationHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' },
  conversationName: { fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  conversationTimestamp: { fontSize: '12px', color: '#6b7280' },
  conversationLastMessage: { fontSize: '14px', color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  unreadBadge: { width: '20px', height: '20px', backgroundColor: '#3b82f6', color: '#fff', borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 500 },
  chatView: { display: 'flex', flexDirection: 'column', height: '100%' },
  chatHeader: { display: 'flex', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#fff' },
  chatHeaderLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  chatHeaderRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  chatName: { fontWeight: 600, color: '#111827' },
  chatStatus: { fontSize: '12px', color: '#6b7280' },
  iconButton: { padding: '4px', borderRadius: '9999px', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.2s' },
  icon: { width: '16px', height: '16px', color: '#4b5563' },
  messagesContainer: { flex: 1, overflowY: 'auto', padding: '16px', backgroundColor: '#f9fafb', display: 'flex', flexDirection: 'column', gap: '12px' },
  messageInputContainer: { flexShrink: 0, padding: '16px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '8px', backgroundColor: '#fff' },
  messageInputWrapper: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: '20px', display: 'flex', alignItems: 'center', padding: '4px 12px' },
  messageInput: { flex: 1, backgroundColor: 'transparent', border: 'none', outline: 'none', fontSize: '14px', resize: 'none', overflow: 'hidden', lineHeight: '20px', height: '20px' },
  sendButton: { width: '40px', height: '40px', backgroundColor: '#3b82f6', borderRadius: '9999px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s', color: '#fff' },
  floatingButtonWrapper: { position: 'fixed', bottom: '24px', right: '24px', zIndex: 50 },
  floatingButton: { width: '64px', height: '64px', borderRadius: '9999px', background: 'linear-gradient(to bottom right, #D2691E, #A0522D)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', boxShadow: '0 8px 16px rgba(0,0,0,0.25)', position: 'relative', transition: 'all 0.3s' },
  totalUnread: { position: 'absolute', top: '-4px', right: '-4px', width: '24px', height: '24px', borderRadius: '9999px', backgroundColor: '#ef4444', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 500 },
  smallWrapper: { position: 'fixed', bottom: '24px', right: '24px', width: '320px', height: '500px', borderRadius: '24px', backgroundColor: '#fff', boxShadow: '0 16px 32px rgba(0,0,0,0.25)', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 50 },
  fullscreenWrapper: { position: 'fixed', inset: 0, zIndex: 50, backgroundColor: '#fff', display: 'flex', flexDirection: 'column' },
  chatBoxHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid #e5e7eb', background: '#D2691E', color: '#fff' },
  chatBoxHeaderLeft: { display: 'flex', alignItems: 'center', gap: '8px' },
  chatBoxHeaderRight: { display: 'flex', alignItems: 'center', gap: '4px' }
};

export default FloatingMessages;
