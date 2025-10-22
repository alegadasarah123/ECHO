import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageCircle,
  X,
  Maximize2,
  ArrowLeft,
  Send,
  Search,
} from "lucide-react";
import supabase from "@/supabaseClient.js";

// Helper function to get initials from name
const getInitials = (name) => {
  if (!name) return "?";
  const cleanName = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const nameParts = cleanName.split(' ').filter(part => part.length > 0);
  if (nameParts.length === 0) return "?";
  if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
  return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
};

// Helper function to format date header
const formatDateHeader = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    const messageDate = new Date(timestamp);
    if (isNaN(messageDate.getTime())) {
      return '';
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const messageDay = new Date(messageDate.getFullYear(), messageDate.getMonth(), messageDate.getDate());
    
    if (messageDay.getTime() === today.getTime()) {
      return 'Today';
    } else if (messageDay.getTime() === yesterday.getTime()) {
      return 'Yesterday';
    } else {
      return `${messageDate.getMonth() + 1}-${messageDate.getDate()}-${messageDate.getFullYear().toString().slice(-2)}`;
    }
  } catch (error) {
    return '';
  }
};

// Helper function to format message time only
const formatMessageTime = (timestamp) => {
  if (!timestamp) return '';
  
  try {
    // If it's already a formatted time string (like "02:30 PM"), return it directly
    if (typeof timestamp === 'string' && (timestamp.includes('AM') || timestamp.includes('PM'))) {
      return timestamp;
    }
    
    const messageDate = new Date(timestamp);
    if (isNaN(messageDate.getTime())) {
      return '';
    }
    
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    return '';
  }
};

// ------------------ AVATAR COMPONENT ------------------
const Avatar = ({ user, size = "md" }) => {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base"
  };

  if (user?.avatar) {
    return (
      <img 
        src={user.avatar} 
        alt={user?.name || 'User'}
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <div className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold`}>
      {getInitials(user?.name)}
    </div>
  );
};

// ------------------ TYPING INDICATOR COMPONENT ------------------
const TypingIndicator = () => {
  return (
    <div className="flex items-center space-x-1">
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
      <span className="text-xs text-gray-500">typing...</span>
    </div>
  );
};

// ------------------ MESSAGES WITH DATE HEADERS COMPONENT ------------------
const MessagesWithDateHeaders = ({ messages, isTyping, isNewConversation }) => {
  // Show "Start conversation" message when it's a new conversation with no messages
  if (isNewConversation && (!messages || messages.length === 0)) {
    return (
      <div className="flex justify-center my-8">
        <div className="text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md">
            <MessageCircle className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Start a conversation
            </h3>
            <p className="text-gray-600 text-sm">
              Send a message to start chatting and build your connection
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return null;
  }

  // Group messages by date
  const groupedMessages = [];
  let currentDate = null;
  let currentGroup = [];

  messages.forEach((message, index) => {
    const messageDate = formatDateHeader(message.originalTimestamp || message.timestamp);
    
    if (messageDate !== currentDate) {
      // Push previous group if exists
      if (currentGroup.length > 0) {
        groupedMessages.push({
          date: currentDate,
          messages: [...currentGroup]
        });
      }
      // Start new group
      currentDate = messageDate;
      currentGroup = [message];
    } else {
      // Add to current group
      currentGroup.push(message);
    }
    
    // Push the last group
    if (index === messages.length - 1) {
      groupedMessages.push({
        date: currentDate,
        messages: [...currentGroup]
      });
    }
  });

  return (
    <>
      {groupedMessages.map((group, groupIndex) => (
        <div key={groupIndex}>
          {/* Date Header */}
          <div className="flex justify-center my-4">
            <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
              {group.date}
            </div>
          </div>
          
          {/* Messages for this date */}
          {group.messages.map((message, messageIndex) => (
            <div
              key={message.id || messageIndex}
              className={`flex ${
                message.isOwn ? "justify-end" : "justify-start"
              } mb-4`}
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
                  {formatMessageTime(message.timestamp)}
                </div>
                
                {/* ✅ FIXED: ONLY show "Seen" for the last message sent by current user AND is_read is EXPLICITLY TRUE */}
                {message.isOwn && 
                 messageIndex === group.messages.length - 1 && 
                 groupIndex === groupedMessages.length - 1 && 
                 message.is_read === true && (
                  <div className="text-right mt-1">
                    <span className="text-xs text-blue-500 font-medium">Seen</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
      
      {/* Typing Indicator */}
      {isTyping && (
        <div className="flex justify-start mb-4">
          <div className="max-w-xs lg:max-w-md order-2">
            <div className="px-4 py-2 rounded-2xl text-sm bg-white text-gray-800 rounded-bl-md shadow-sm">
              <TypingIndicator />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ------------------ CHAT VIEW COMPONENT ------------------
const ChatView = ({
  conversation,
  newMessage,
  setNewMessage,
  handleSendMessage,
  setSelectedConversation,
  currentUserId,
  isTyping,
  handleTypingStart,
  handleTypingStop,
  showBackButton = true,
  isNewConversation = false,
}) => {
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const lastTypingRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, isTyping]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
      handleTypingStop();
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

    const now = Date.now();
    if (now - lastTypingRef.current > 500) {
      if (value.length > 0) {
        handleTypingStart();
      } else {
        handleTypingStop();
      }
      lastTypingRef.current = now;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 1500);
  };

  if (!conversation) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">No conversation selected</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          {showBackButton && (
            <button
              onClick={() => setSelectedConversation(null)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          )}
          <div className="relative">
            <Avatar user={conversation} size="md" />
            {conversation.online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{conversation.name}</h3>
            <p className="text-xs text-gray-500">
              {isTyping ? (
                <span className="text-green-500">typing...</span>
              ) : (
                conversation.online ? "Active now" : "Offline"
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {/* ✅ FIXED: Show "Start conversation" when conversation is empty */}
        {(!conversation.messages || conversation.messages.length === 0) && (
          <div className="flex justify-center my-8">
            <div className="text-center">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md">
                <MessageCircle className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Start a conversation
                </h3>
                <p className="text-gray-600 text-sm">
                  Send a message to start chatting and build your connection
                </p>
              </div>
            </div>
          </div>
        )}
        
        <MessagesWithDateHeaders 
          messages={conversation.messages || []} 
          isTyping={isTyping}
          isNewConversation={isNewConversation}
        />
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 bg-white border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={(!conversation.messages || conversation.messages.length === 0) ? "Send your first message..." : "Type a message... (Press Enter to send)"}
              className="flex-1 bg-transparent text-sm focus:outline-none"
            />
          </div>
          <button
            onClick={() => {
              handleSendMessage();
              handleTypingStop();
            }}
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
  isSearching,
  allUsers,
  currentUserId,
  selectedConversation,
}) => {
  const displayConversations = isSearching ? allUsers : filteredConversations;

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={isSearching ? "Search all users..." : "Search conversations..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => {
              if (!isSearching) {
                setSearchTerm("");
              }
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
          {!displayConversations || displayConversations.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              <p className="text-sm">
                {isSearching ? "No users found" : "No conversations found"}
              </p>
            </div>
          ) : (
            displayConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => handleSelectConversation(conversation)}
                className={`flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors ${
                  selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="relative">
                  <Avatar user={conversation} size="lg" />
                  {conversation.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-gray-900 truncate">
                      {conversation.name}
                    </h4>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 truncate flex-1 mr-2">
                      {conversation.lastMessage || "Tap to chat"}
                    </p>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {conversation.timestamp || ""}
                    </span>
                  </div>
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
};

// ------------------ MAIN FLOATING MESSAGES COMPONENT ------------------
const FloatingMessages = () => {
  const [viewState, setViewState] = useState("closed");
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const messagesSubscriptionRef = useRef(null);
  const typingChannelRef = useRef(null);
  const onlineChannelRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const selectedConversationRef = useRef(null);
  const currentUserIdRef = useRef(null);

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
    currentUserIdRef.current = currentUserId;
  }, [selectedConversation, currentUserId]);

  // Setup online presence
  const setupOnlinePresence = useCallback(async () => {
    if (!currentUserId) return;

    // Remove existing channel if any
    if (onlineChannelRef.current) {
      supabase.removeChannel(onlineChannelRef.current);
    }

    // Create presence channel
    onlineChannelRef.current = supabase.channel('online-users', {
      config: {
        presence: {
          key: currentUserId.toString(),
        },
      },
    });

    // Track presence state changes
    onlineChannelRef.current
      .on('presence', { event: 'sync' }, () => {
        const state = onlineChannelRef.current.presenceState();
        const onlineUserIds = new Set();
        
        Object.keys(state).forEach(key => {
          onlineUserIds.add(key);
        });
        
        setOnlineUsers(onlineUserIds);
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUsers(prev => new Set([...prev, key]));
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await onlineChannelRef.current.track({
            user_id: currentUserId,
            online_at: new Date().toISOString(),
            last_seen: new Date().toISOString(),
          });
        }
      });
  }, [currentUserId]);

  useEffect(() => {
    fetchCurrentUserId();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchConversations();
      fetchAllUsers();
      setupOnlinePresence();
    }

    return () => {
      if (messagesSubscriptionRef.current) {
        messagesSubscriptionRef.current.unsubscribe();
      }
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
      }
      if (onlineChannelRef.current) {
        supabase.removeChannel(onlineChannelRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentUserId, setupOnlinePresence]);

  const fetchCurrentUserId = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/veterinarian/vet_profile/", {
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentUserId(data.profile?.vet_id);
      }
    } catch (error) {
      console.error("Error fetching current user ID:", error);
    }
  };

  const handleTypingStart = useCallback(() => {
    if (!selectedConversation || !currentUserId) return;

    if (typingChannelRef.current) {
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: currentUserId,
          receiverId: selectedConversation.id,
          isTyping: true,
          timestamp: Date.now()
        }
      });
    }
  }, [selectedConversation, currentUserId]);

  const handleTypingStop = useCallback(() => {
    if (!selectedConversation || !currentUserId) return;

    if (typingChannelRef.current) {
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: currentUserId,
          receiverId: selectedConversation.id,
          isTyping: false,
          timestamp: Date.now()
        }
      });
    }
  }, [selectedConversation, currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    if (messagesSubscriptionRef.current) {
      messagesSubscriptionRef.current.unsubscribe();
    }
    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current);
    }

    // Messages subscription
    messagesSubscriptionRef.current = supabase
      .channel('global-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message',
        },
        async (payload) => {
          const newMessageData = payload.new;
          
          const currentSelectedConv = selectedConversationRef.current;
          const currentUserId = currentUserIdRef.current;
          
          const involvesCurrentUser = 
            newMessageData.user_id === currentUserId || 
            newMessageData.receiver_id === currentUserId;
          
          if (involvesCurrentUser) {
            if (newMessageData.user_id === currentUserId) {
              return;
            }
            
            await fetchConversations();
            
            if (currentSelectedConv) {
              const isForCurrentConversation = 
                newMessageData.user_id === currentSelectedConv.id || 
                newMessageData.receiver_id === currentSelectedConv.id;
              
              if (isForCurrentConversation) {
                // Store both the formatted time and original timestamp
                const formattedMessage = {
                  id: newMessageData.mes_id,
                  content: newMessageData.mes_content,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  originalTimestamp: newMessageData.mes_date,
                  isOwn: newMessageData.user_id === currentUserId,
                  is_read: newMessageData.is_read, // Use the actual database value
                };
                
                setSelectedConversation(prev => {
                  if (!prev) return prev;
                  const messageExists = prev.messages?.some(msg => msg.id === formattedMessage.id);
                  if (messageExists) return prev;
                  
                  return {
                    ...prev,
                    messages: [...(prev.messages || []), formattedMessage]
                  };
                });

                // ✅ FIXED: Only mark as read if conversation is open (but don't override the actual database value)
                if (newMessageData.receiver_id === currentUserId && currentSelectedConv) {
                  try {
                    await fetch(
                      `http://localhost:8000/api/veterinarian/mark_messages_as_read/${currentSelectedConv.id}/`,
                      { 
                        method: "PUT", 
                        credentials: "include",
                        headers: {
                          'Content-Type': 'application/json',
                        }
                      }
                    );
                    
                    // Update conversations list only
                    setConversations(prev => {
                      if (!prev) return [];
                      return prev.map(conv => 
                        conv.id === currentSelectedConv.id 
                          ? { ...conv, unread: 0 }
                          : conv
                      );
                    });
                  } catch (error) {
                    console.error("Error marking message as read:", error);
                  }
                }
              }
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'message',
        },
        async (payload) => {
          const updatedMessage = payload.new;
          const currentSelectedConv = selectedConversationRef.current;
          const currentUserId = currentUserIdRef.current;

          // If a message was marked as read and it's our message in the current conversation
          if (updatedMessage.is_read && 
              updatedMessage.user_id === currentUserId &&
              currentSelectedConv && 
              updatedMessage.receiver_id === currentSelectedConv.id) {
            
            // Update local state to mark the message as read
            setSelectedConversation(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                messages: prev.messages?.map(msg => 
                  msg.id === updatedMessage.mes_id 
                    ? { ...msg, is_read: true }
                    : msg
                ) || []
              };
            });
          }
        }
      )
      .subscribe();

    // Typing channel
    typingChannelRef.current = supabase.channel('typing-channel-global');

    typingChannelRef.current
      .on('broadcast', { event: 'typing' }, (payload) => {
        const { userId, receiverId, isTyping: typingStatus } = payload.payload;
        const currentSelectedConv = selectedConversationRef.current;
        const currentUserId = currentUserIdRef.current;
        
        if (currentSelectedConv && userId !== currentUserId) {
          const isForMe = receiverId === currentUserId;
          const isFromCurrentConversationPartner = userId === currentSelectedConv.id;
          
          if (isForMe && isFromCurrentConversationPartner) {
            if (typingStatus) {
              setIsTyping(true);
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
              typingTimeoutRef.current = setTimeout(() => {
                setIsTyping(false);
              }, 2000);
            } else {
              setIsTyping(false);
              if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
              }
            }
          }
        }
      })
      .subscribe();

    return () => {
      if (messagesSubscriptionRef.current) {
        messagesSubscriptionRef.current.unsubscribe();
      }
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
      }
    };
  }, [currentUserId]);

  // Check if it's a new conversation (user selected from search, not from existing conversations)
  const isNewConversation = selectedConversation && 
    isSearching && 
    conversations?.some(conv => conv.id === selectedConversation.id);

  // Add online status to conversations and users - FIXED: Add null checks
  const conversationsWithOnlineStatus = (conversations || []).map(conv => ({
    ...conv,
    online: onlineUsers.has(conv.id?.toString())
  }));

  const allUsersWithOnlineStatus = (allUsers || []).map(user => ({
    ...user,
    online: onlineUsers.has(user.id?.toString())
  }));

  const fetchConversations = async () => {
    try {
      const res = await fetch(
        "http://localhost:8000/api/veterinarian/get_conversations/", 
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setConversations(data || []);
      } else {
        setConversations([]);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setConversations([]);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await fetch(
        "http://localhost:8000/api/veterinarian/get_all_users/",
        { credentials: "include" }
      );
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data || []);
      } else {
        setAllUsers([]);
      }
    } catch (error) {
      console.error("Error fetching all users:", error);
      setAllUsers([]);
    }
  };

  const totalUnread = (conversations || []).reduce((sum, conv) => sum + (conv.unread || 0), 0);

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setIsSearching(value.length > 0);
  };

  const handleSelectConversation = async (conversation) => {
    if (!conversation) return;
    
    setSelectedConversation(conversation);
    setIsSearching(false);
    setSearchTerm("");
    setIsTyping(false);
    
    try {
      const res = await fetch(
        `http://localhost:8000/api/veterinarian/get_conversation/${conversation.id}/`,
        { credentials: "include" }
      );
      
      if (res.ok) {
        const data = await res.json();
        
        // Transform the messages - USE THE ACTUAL DATABASE is_read VALUES
        const transformedMessages = (data || []).map(msg => ({
          ...msg,
          timestamp: msg.timestamp,
          originalTimestamp: msg.originalTimestamp || new Date().toISOString(),
          is_read: msg.is_read // Use the actual database value, don't override
        }));

        const updatedConversation = {
          ...conversation,
          messages: transformedMessages,
        };

        setSelectedConversation(updatedConversation);

        try {
          const markReadResponse = await fetch(
            `http://localhost:8000/api/veterinarian/mark_messages_as_read/${conversation.id}/`,
            { 
              method: "PUT", 
              credentials: "include",
              headers: {
                'Content-Type': 'application/json',
              }
            }
          );
          
          if (markReadResponse.ok) {
            console.log("✅ Messages marked as read in database");
            
            setConversations(prev => {
              if (!prev) return [];
              return prev.map(conv => 
                conv.id === conversation.id 
                  ? { ...conv, unread: 0 }
                  : conv
              );
            });
          } else {
            console.error("❌ Failed to mark messages as read on conversation open");
          }
        } catch (error) {
          console.error("❌ Error marking messages as read on conversation open:", error);
        }
        
        fetchConversations();
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() || !selectedConversation || !currentUserId) return;

    const now = new Date();
    const tempMessage = {
      id: `temp-${Date.now()}`,
      content: newMessage,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      originalTimestamp: now.toISOString(),
      isOwn: true,
      is_read: false, // Start as false
    };

    setIsTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setSelectedConversation(prev => ({
      ...prev,
      messages: [...(prev.messages || []), tempMessage]
    }));

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
      
      if (res.ok) {
        setNewMessage("");
        fetchConversations();
      } else {
        setSelectedConversation(prev => ({
          ...prev,
          messages: prev.messages?.filter(msg => msg.id !== tempMessage.id) || []
        }));
      }
    } catch (error) {
      setSelectedConversation(prev => ({
        ...prev,
        messages: prev.messages?.filter(msg => msg.id !== tempMessage.id) || []
      }));
    }
  }, [newMessage, selectedConversation, currentUserId]);

  const filteredConversations = (conversationsWithOnlineStatus || []).filter((c) =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAllUsers = (allUsersWithOnlineStatus || []).filter((user) =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (viewState === "closed") {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setViewState("small")}
          className="relative w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-1"
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
        {!selectedConversation && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-600 text-white">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              <div>
                <h3 className="font-semibold">Messages</h3>
                <p className="text-xs opacity-90">{(conversations || []).length} conversations</p>
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
        )}

        {selectedConversation ? (
          <ChatView
            conversation={selectedConversation}
            newMessage={newMessage}
            setNewMessage={setNewMessage}
            handleSendMessage={handleSendMessage}
            setSelectedConversation={setSelectedConversation}
            currentUserId={currentUserId}
            isTyping={isTyping}
            handleTypingStart={handleTypingStart}
            handleTypingStop={handleTypingStop}
            isNewConversation={isNewConversation}
          />
        ) : (
          <ConversationList
            searchTerm={searchTerm}
            setSearchTerm={handleSearchChange}
            filteredConversations={isSearching ? filteredAllUsers : filteredConversations}
            handleSelectConversation={handleSelectConversation}
            isSearching={isSearching}
            allUsers={filteredAllUsers}
            currentUserId={currentUserId}
            selectedConversation={selectedConversation}
          />
        )}
      </div>
    );
  }

  if (viewState === "fullscreen") {
    return (
      <div className="fixed inset-0 z-1000 bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-600 text-white">
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
                <p className="text-sm opacity-90">{(conversations || []).length} conversations</p>
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

        {/* Main Content Area - Always show conversation list on the left */}
        <div className="flex-1 flex min-h-0">
          {/* Conversation List - Always visible in fullscreen mode */}
          <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
            <ConversationList
              searchTerm={searchTerm}
              setSearchTerm={handleSearchChange}
              filteredConversations={isSearching ? filteredAllUsers : filteredConversations}
              handleSelectConversation={handleSelectConversation}
              isSearching={isSearching}
              allUsers={filteredAllUsers}
              currentUserId={currentUserId}
              selectedConversation={selectedConversation}
            />
          </div>

          {/* Chat View or Empty State */}
          <div className="flex-1 bg-gray-50 flex flex-col min-h-0">
            {selectedConversation ? (
              <ChatView
                conversation={selectedConversation}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                handleSendMessage={handleSendMessage}
                setSelectedConversation={setSelectedConversation}
                currentUserId={currentUserId}
                isTyping={isTyping}
                handleTypingStart={handleTypingStart}
                handleTypingStop={handleTypingStop}
                showBackButton={false}
                isNewConversation={isNewConversation}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">
                    {isSearching ? "Select a user to start chatting" : "Select a conversation"}
                  </h3>
                  <p className="text-sm">
                    {isSearching 
                      ? "Choose a user to start a new conversation" 
                      : "Choose a conversation from the list to start messaging"}
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