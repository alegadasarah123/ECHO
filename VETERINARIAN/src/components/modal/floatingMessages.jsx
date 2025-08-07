import React, { useState } from 'react';
import { MessageCircle, X, Maximize2, ArrowLeft, Send, Phone, Video, MoreVertical, Search } from 'lucide-react';

const mockConversations = [
  {
    id: '1',
    name: 'Dr. Johnson',
    avatar: 'DJ',
    lastMessage: 'Perfect! Thanks for the quick turnaround.',
    timestamp: '2:33 PM',
    unread: 2,
    online: true,
    messages: [
      {
        id: '1',
        sender: 'Dr. Johnson',
        content: 'Hey, could you check the lab results for Thunder?',
        timestamp: '2:30 PM',
        isOwn: false,
      },
      {
        id: '2',
        sender: 'You',
        content: 'Sure! I just reviewed them. Everything looks normal.',
        timestamp: '2:32 PM',
        isOwn: true,
      },
      {
        id: '3',
        sender: 'Dr. Johnson',
        content: 'Perfect! Thanks for the quick turnaround.',
        timestamp: '2:33 PM',
        isOwn: false,
      }
    ]
  },
  {
    id: '2',
    name: 'Maria Luna',
    avatar: 'ML',
    lastMessage: 'Hi Dr. Santos, is it possible to reschedule...',
    timestamp: '1:45 PM',
    unread: 1,
    online: false,
    messages: [
      {
        id: '1',
        sender: 'Maria Luna',
        content: 'Hi Dr. Santos, is it possible to reschedule Thunder\'s appointment?',
        timestamp: '1:45 PM',
        isOwn: false,
      },
      {
        id: '2',
        sender: 'You',
        content: 'Of course! Let me check the schedule for you.',
        timestamp: '1:47 PM',
        isOwn: true,
      }
    ]
  },
  {
    id: '3',
    name: 'Dr. Peterson',
    avatar: 'DP',
    lastMessage: 'Great! I\'ll be there in 5 minutes.',
    timestamp: '12:16 PM',
    unread: 0,
    online: true,
    messages: [
      {
        id: '1',
        sender: 'Dr. Peterson',
        content: 'The vaccine shipment has arrived. Ready for inventory check.',
        timestamp: '12:15 PM',
        isOwn: false,
      },
      {
        id: '2',
        sender: 'You',
        content: 'Great! I\'ll be there in 5 minutes.',
        timestamp: '12:16 PM',
        isOwn: true,
      }
    ]
  },
  {
    id: '4',
    name: 'Emergency Team',
    avatar: 'ET',
    lastMessage: 'Golden Retriever incoming with possible...',
    timestamp: '10:45 AM',
    unread: 0,
    online: true,
    messages: [
      {
        id: '1',
        sender: 'Emergency Team',
        content: 'Golden Retriever incoming with possible fracture. ETA 10 mins.',
        timestamp: '10:45 AM',
        isOwn: false,
      }
    ]
  }
];

const FloatingMessages = () => {
  const [viewState, setViewState] = useState('closed');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  
  const totalUnread = mockConversations.reduce((sum, conv) => sum + conv.unread, 0);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      console.log('Sending message:', newMessage);
      setNewMessage('');
    }
  };

  const ConversationList = () => (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto">
        {mockConversations.map((conversation) => (
          <div
            key={conversation.id}
            onClick={() => setSelectedConversation(conversation)}
            className="flex items-center gap-3 p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors"
          >
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                {conversation.avatar}
              </div>
              {conversation.online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="font-semibold text-gray-900 truncate">{conversation.name}</h4>
                <span className="text-xs text-gray-500">{conversation.timestamp}</span>
              </div>
              <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
            </div>
            {conversation.unread > 0 && (
              <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                {conversation.unread}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const ChatView = ({ conversation }) => (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
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
              {conversation.avatar}
            </div>
            {conversation.online && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{conversation.name}</h3>
            <p className="text-xs text-gray-500">{conversation.online ? 'Active now' : 'Last seen 2h ago'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Phone className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Video className="w-4 h-4 text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {conversation.messages.map((message, index) => (
          <div key={index} className={`flex ${message.isOwn ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md ${message.isOwn ? 'order-1' : 'order-2'}`}>
              <div
                className={`px-4 py-2 rounded-2xl text-sm ${
                  message.isOwn
                    ? 'bg-blue-500 text-white rounded-br-md'
                    : 'bg-white text-gray-800 rounded-bl-md shadow-sm'
                }`}
              >
                {message.content}
              </div>
              <div className={`text-xs text-gray-500 mt-1 px-1 ${message.isOwn ? 'text-right' : 'text-left'}`}>
                {message.timestamp}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Message Input */}
      <div className="flex-shrink-0 p-4 bg-white border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 flex items-center gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-transparent text-sm focus:outline-none"
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
          </div>
          <button
            onClick={handleSendMessage}
            className="w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  if (viewState === 'closed') {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setViewState('small')}
          className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-full shadow-xl hover:shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 hover:-translate-y-1"
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

  if (viewState === 'small') {
    return (
      <div className="fixed bottom-6 right-6 z-50 w-80 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <div>
              <h3 className="font-semibold">Messages</h3>
              <p className="text-xs opacity-90">{mockConversations.length} conversations</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setViewState('fullscreen')}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              title="Expand"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewState('closed')}
              className="p-1.5 hover:bg-white/20 rounded transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {selectedConversation ? (
          <ChatView conversation={selectedConversation} />
        ) : (
          <ConversationList />
        )}
      </div>
    );
  }

  if (viewState === 'fullscreen') {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewState('small')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6" />
              <div>
                <h3 className="text-lg font-semibold">Messages</h3>
                <p className="text-sm opacity-90">{mockConversations.length} conversations</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setViewState('closed')}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex">
          {/* Conversation List Sidebar */}
          <div className="w-80 border-r border-gray-200 bg-white">
            <ConversationList />
          </div>
          
          {/* Chat Area */}
          <div className="flex-1 bg-gray-50">
            {selectedConversation ? (
              <ChatView conversation={selectedConversation} />
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
                  <p className="text-sm">Choose a conversation to start messaging</p>
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
