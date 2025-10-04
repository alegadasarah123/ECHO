import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageCircle,
  X,
  Maximize2,
  ArrowLeft,
  Send,
  Search,
} from "lucide-react";
import supabase from "@/supabaseClient.js"; // Make sure you have supabase client configured with VITE_ env vars

// ------------------ CHAT VIEW COMPONENT ------------------
const ChatView = ({
  conversation,
  newMessage,
  setNewMessage,
  handleSendMessage,
  setSelectedConversation,
}) => {
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedConversation(null)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {conversation.avatar || conversation.name.charAt(0)}
            </div>
            {conversation.online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{conversation.name}</h3>
            <p className="text-xs text-gray-500">
              {conversation.online ? "Active now" : "Offline"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {(conversation.messages || []).map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.isOwn ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md ${
                message.isOwn ? "order-1" : "order-2"
              }`}
            >
              <div
                className={`px-4 py-2 rounded-2xl text-sm ${
                  message.isOwn
                    ? "bg-blue-500 text-white rounded-br-md"
                    : "bg-white text-gray-800 rounded-bl-md shadow-sm"
                }`}
              >
                {message.content}
              </div>
              <div
                className={`text-xs text-gray-500 mt-1 px-1 ${
                  message.isOwn ? "text-right" : "text-left"
                }`}
              >
                {message.timestamp}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 bg-white border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Press Enter to send)"
              className="flex-1 bg-transparent text-sm focus:outline-none"
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              newMessage.trim()
                ? "bg-blue-500 hover:bg-blue-600 text-white"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ------------------ CONVERSATION LIST COMPONENT ------------------
const ConversationList = ({
  searchTerm,
  setSearchTerm,
  filteredConversations,
  handleSelectConversation,
}) => (
  <div className="flex flex-col h-full">
    <div className="p-4 border-b border-gray-200">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>

    <div className="flex-1 overflow-y-auto">
      <div className="max-h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
        {filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <p className="text-sm">No conversations found</p>
          </div>
        ) : (
          filteredConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => handleSelectConversation(conversation)}
              className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors"
            >
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {conversation.avatar || conversation.name.charAt(0)}
                </div>
                {conversation.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-gray-900 truncate">
                    {conversation.name}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {conversation.timestamp || ""}
                  </span>
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {conversation.lastMessage || "Tap to chat"}
                </p>
              </div>
              {conversation.unread > 0 && (
                <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                  {conversation.unread}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  </div>
);

// ------------------ MAIN FLOATING MESSAGES COMPONENT ------------------
const FloatingMessages = () => {
  const [viewState, setViewState] = useState("closed");
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const subscriptionRef = useRef(null);

  // Load conversations once
  useEffect(() => {
    fetchConversations();
  }, []);

// ---------------- POLLING SYSTEM (TEMPORARY FIX) ----------------
const [pollingInterval, setPollingInterval] = useState(null);

// Start polling when a conversation is selected
useEffect(() => {
  if (!selectedConversation) {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    return;
  }

  console.log('🔄 Starting message polling for conversation:', selectedConversation.id);

  // Function to check for new messages
  const checkForNewMessages = async () => {
    try {
      const res = await fetch(
        `http://localhost:8000/api/veterinarian/get_conversation/${selectedConversation.id}/`,
        { credentials: "include" }
      );
      
      if (res.ok) {
        const newMessages = await res.json();
        
        setSelectedConversation(prev => {
          if (!prev) return prev;
          
          // Check if messages changed
          const currentMessageIds = prev.messages?.map(m => m.id) || [];
          const newMessageIds = newMessages.map(m => m.id);
          
          // If different, update the messages
          if (JSON.stringify(currentMessageIds) !== JSON.stringify(newMessageIds)) {
            console.log('🆕 New messages detected via polling:', newMessages.length);
            return {
              ...prev,
              messages: newMessages
            };
          }
          
          return prev;
        });
      }
    } catch (error) {
      console.error('❌ Polling error:', error);
    }
  };

  // Check immediately and then every 3 seconds
  checkForNewMessages();
  const interval = setInterval(checkForNewMessages, 3000);
  setPollingInterval(interval);

  return () => {
    if (interval) {
      clearInterval(interval);
    }
  };
}, [selectedConversation]);

// Also poll for conversation list updates
useEffect(() => {
  const pollConversations = async () => {
    try {
      const res = await fetch(
        "http://localhost:8000/api/veterinarian/get_all_users/",
        { credentials: "include" }
      );
      const data = await res.json();
      setConversations(data);
    } catch (error) {
      console.error('❌ Conversation polling error:', error);
    }
  };

  // Poll conversations every 10 seconds
  const interval = setInterval(pollConversations, 10000);
  
  return () => {
    clearInterval(interval);
  };
}, []);

  const fetchConversations = async () => {
    try {
      const res = await fetch(
        "http://localhost:8000/api/veterinarian/get_all_users/",
        { credentials: "include" }
      );
      const data = await res.json();
      setConversations(data);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  };

  const totalUnread = conversations.reduce(
    (sum, conv) => sum + (conv.unread || 0),
    0
  );

  // Select conversation
  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    try {
      const res = await fetch(
        `http://localhost:8000/api/veterinarian/get_conversation/${conversation.id}/`,
        { credentials: "include" }
      );
      const data = await res.json();
      setSelectedConversation({
        ...conversation,
        messages: data || [],
      });

      await fetch(
        `http://localhost:8000/api/veterinarian/mark_messages_as_read/${conversation.id}/`,
        { method: "PUT", credentials: "include" }
      );
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Send message
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const payload = {
      receiver_id: selectedConversation.id,
      message: newMessage,
    };

    try {
      const res = await fetch(
        "http://localhost:8000/api/veterinarian/send_message/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();

      if (res.ok) {
        const newMsg = {
          id: data.data?.[0]?.id || Date.now(),
          sender: "You",
          content: newMessage,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isOwn: true,
        };
        setSelectedConversation((prev) => ({
          ...prev,
          messages: [...(prev.messages || []), newMsg],
        }));
        setNewMessage("");
      } else {
        console.error("Send failed:", data.error);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }, [newMessage, selectedConversation]);

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ---------------- VIEWS ----------------
  if (viewState === "closed") {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setViewState("small")}
          className="relative w-16 h-16 bg-gradient-to-br from-[#D2691E] to-[#8B4513] hover:from-[#8B4513] hover:to-[#A0522D] text-white rounded-full shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-1"
        >
          <MessageCircle className="w-6 h-6" />
          {totalUnread > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-medium">
              {totalUnread}
            </span>
          )}
        </button>
      </div>
    );
  }

  if (viewState === "small") {
    return (
      <div className="fixed bottom-6 right-6 z-1000 w-80 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-[#D2691E] to-[#D2691E] text-white">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <div>
              <h3 className="font-semibold">Messages</h3>
              <p className="text-xs opacity-90">{conversations.length} conversations</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewState("fullscreen")}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              title="Expand"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewState("closed")}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {selectedConversation ? (
          <ChatView
            conversation={selectedConversation}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            handleSendMessage={handleSendMessage}
            setSelectedConversation={setSelectedConversation}
          />
        ) : (
          <ConversationList
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filteredConversations={filteredConversations}
            handleSelectConversation={handleSelectConversation}
          />
        )}
      </div>
    );
  }

  if (viewState === "fullscreen") {
    return (
      <div className="fixed inset-0 z-1000 bg-white flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-[#D2691E] to-[#D2691E] text-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewState("small")}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6" />
              <div>
                <h3 className="text-lg font-semibold">Messages</h3>
                <p className="text-sm opacity-90">{conversations.length} conversations</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setViewState("closed")}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Conversation List Sidebar */}
          <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
            <ConversationList
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filteredConversations={filteredConversations}
              handleSelectConversation={handleSelectConversation}
            />
          </div>

          {/* Chat Area */}
          <div className="flex-1 bg-gray-50 flex flex-col min-h-0">
            {selectedConversation ? (
              <ChatView
                conversation={selectedConversation}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                handleSendMessage={handleSendMessage}
                setSelectedConversation={setSelectedConversation}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-sm">
                    Choose a conversation to start messaging
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default FloatingMessages;
