"use client"

import { ArrowLeft, Circle, Edit3, LogOut, MessageCircle, MoreHorizontal, Search, Send, Users } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"

function DvmfMessage() {
  const navigate = useNavigate()
  const [currentContact, setCurrentContact] = useState(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [messageInput, setMessageInput] = useState("")
  const [chatData, setChatData] = useState({})
  const [contacts, setContacts] = useState([])
  const [isTyping, setIsTyping] = useState(false)
  const [typingContact, setTypingContact] = useState("")

  const dropdownRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const logoutModalRef = useRef(null)
  const sidebarOverlayRef = useRef(null)

  // Initialize empty states
  const initializeEmptyStates = useCallback(() => {
    setContacts([])
    setChatData({})
  }, [])

  // Mobile sidebars functionality
  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen((prev) => !prev)
    if (!isMobileSidebarOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
  }

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false)
    document.body.style.overflow = ""
  }

  const closeLogoutModal = () => {
    setIsLogoutModalOpen(false)
    document.body.style.overflow = ""
  }

  const confirmLogout = () => {
    localStorage.clear()
    sessionStorage.clear()
    navigate("/")
  }

  // Back button functionality
  const goBack = () => {
    if (window.history.length > 1) {
      window.history.back()
    } else {
      navigate("/Dvmfdashboard")
    }
  }

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditMode((prev) => !prev)
    if (!isEditMode) {
      alert("Edit mode enabled. Click contacts to delete them.")
    }
  }

  // Toggle dropdown menu
  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev)
  }

  // Dropdown menu functions
  const clearChat = () => {
    if (!currentContact) {
      alert("Please select a contact first.")
      setIsDropdownOpen(false)
      return
    }

    if (window.confirm("Are you sure you want to clear this chat?")) {
      setChatData((prev) => ({
        ...prev,
        [currentContact]: [],
      }))
      alert("Chat cleared successfully!")
    }
    setIsDropdownOpen(false)
  }

  const exportChat = () => {
    if (!currentContact || !chatData[currentContact] || chatData[currentContact].length === 0) {
      alert("No messages to export.")
      setIsDropdownOpen(false)
      return
    }

    const messages = chatData[currentContact]
    const contactName = getCurrentContactName()
    let chatText = `Chat with ${contactName}\n\n`

    messages.forEach((msg) => {
      const sender = msg.type === "sent" ? "DVMF" : contactName
      chatText += `[${msg.time}] ${sender}: ${msg.message}\n`
    })

    const blob = new Blob([chatText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `chat_${contactName.replace(" ", "_")}.txt`
    a.click()
    URL.revokeObjectURL(url)

    setIsDropdownOpen(false)
  }

  const blockContact = () => {
    if (!currentContact) {
      alert("Please select a contact first.")
      setIsDropdownOpen(false)
      return
    }

    const contactName = getCurrentContactName()
    if (window.confirm(`Are you sure you want to block ${contactName}?`)) {
      alert(`${contactName} has been blocked.`)
    }
    setIsDropdownOpen(false)
  }

  const reportContact = () => {
    if (!currentContact) {
      alert("Please select a contact first.")
      setIsDropdownOpen(false)
      return
    }

    const contactName = getCurrentContactName()
    if (window.confirm(`Report ${contactName} for inappropriate behavior?`)) {
      alert(`${contactName} has been reported. Thank you for your feedback.`)
    }
    setIsDropdownOpen(false)
  }

  // Get current contact name
  const getCurrentContactName = () => {
    if (!currentContact) return "Select a contact"
    const contact = contacts.find((c) => c.id === currentContact)
    return contact ? contact.name : "Select a contact"
  }

  // Search contacts functionality
  const searchContacts = (query) => {
    setSearchQuery(query)
  }

  const filteredContacts = contacts.filter((contact) => {
    if (!searchQuery) return true
    return (
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.preview.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })

  // Select contact functionality
  const selectContact = (contactId, contactName) => {
    if (isEditMode) {
      if (window.confirm(`Delete conversation with ${contactName}?`)) {
        setContacts((prev) => prev.filter((c) => c.id !== contactId))
        setChatData((prev) => {
          const newData = { ...prev }
          delete newData[contactId]
          return newData
        })

        if (currentContact === contactId) {
          setCurrentContact(null)
        }
      }
      return
    }

    setCurrentContact(contactId)

    // Close mobile sidebars if open
    if (window.innerWidth <= 768) {
      closeMobileSidebar()
    }
  }

  // Show typing indicator
  const showTypingIndicator = (contactName) => {
    setTypingContact(contactName)
    setIsTyping(true)

    setTimeout(() => {
      setIsTyping(false)
    }, 2000)
  }

  // Message functionality
  const sendMessage = () => {
    if (!messageInput.trim()) return

    const newMessage = {
      type: "sent",
      message: messageInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      avatar: "You",
    }

    if (currentContact) {
      setChatData((prev) => ({
        ...prev,
        [currentContact]: [...(prev[currentContact] || []), newMessage],
      }))
    }

    setMessageInput("")
  }

  // Update contact preview in sidebars
  const updateContactPreview = (contactId, message) => {
    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === contactId
          ? {
              ...contact,
              preview: message.length > 30 ? message.substring(0, 30) + "..." : message,
              time: "now",
            }
          : contact,
      ),
    )
  }

  // Handle message input
  const handleMessageInput = (e) => {
    setMessageInput(e.target.value)
    const remaining = 500 - e.target.value.length
    if (remaining < 50) {
      e.target.style.borderColor = remaining < 10 ? "#ff4444" : "#ff8800"
    } else {
      e.target.style.borderColor = "#ddd"
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      sendMessage()
    }
  }

  // Get current date string
  const getCurrentDateString = () => {
    const today = new Date()
    const dateString = today.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
    return `Today, ${dateString}`
  }

  // Effects
  useEffect(() => {
    initializeEmptyStates()
  }, [initializeEmptyStates])

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close dropdown
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }

      // Close logout modal
      if (logoutModalRef.current && event.target === logoutModalRef.current) {
        closeLogoutModal()
      }

      // Close sidebars overlay
      if (sidebarOverlayRef.current && event.target === sidebarOverlayRef.current) {
        closeMobileSidebar()
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        closeMobileSidebar()
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [chatData, currentContact])

  const currentMessages = currentContact ? chatData[currentContact] || [] : []

  return (
    <div className="bodyWrapper">
      <style jsx>{`
       * {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.bodyWrapper {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #ffffff;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Header */
.header {
  background: white;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  z-index: 100;
}

.headerLeft {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.backBtn {
  color: #666;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
  min-width: 36px;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.backBtn:hover {
  background-color: #f0f0f0;
}

.headerTitle {
  font-size: 18px;
  font-weight: 600;
  color: #000;
  white-space: nowrap;
}

.editIcon {
  color: #666;
  font-size: 18px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
  min-width: 36px;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.editIcon:hover {
  background-color: #f0f0f0;
}

.contactName {
  font-size: 16px;
  font-weight: 500;
  color: #000;
  margin-left: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.menuDots {
  color: #666;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
  position: relative;
  min-width: 36px;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.menuDots:hover {
  background-color: #f0f0f0;
}

/* Mobile Menu Toggle */
.mobileMenuToggle {
  display: none;
  color: #0F3D5A;
  font-size: 18px;
  cursor: pointer;
  padding: 8px;
  border-radius: 4px;
  transition: background-color 0.2s;
  min-width: 40px;
  min-height: 40px;
  align-items: center;
  justify-content: center;
}

.mobileMenuToggle:hover {
  background-color: #f0f0f0;
}

/* Dropdown Menu */
.dropdownMenu {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 150px;
  z-index: 1000;
  display: none;
}

.dropdownMenu.show {
  display: block;
}

.dropdownItem {
  padding: 12px 16px;
  cursor: pointer;
  font-size: 13px;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
  min-height: 44px;
  display: flex;
  align-items: center;
}

.dropdownItem:last-child {
  border-bottom: none;
}

.dropdownItem:hover {
  background-color: #f5f5f5;
}

.dropdownItem.logout {
  color: #dc3545;
}

/* Main Container */
.mainContainer {
  display: flex;
  flex: 1;
  height: calc(100vh - 60px);
  position: relative;
}

/* Sidebars */
.sidebars {
  width: 280px;
  background: #f8f9fa;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
}

.searchContainer {
  padding: 12px;
}

.searchInput {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
  background: white;
  min-height: 44px;
}

.contactsList {
  flex: 1;
  overflow-y: auto;
}

.contactItem {
  display: flex;
  align-items: center;
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  background: white;
  transition: background-color 0.2s;
  min-height: 60px;
}

.contactItem:hover {
  background: #f5f5f5;
}

.contactItem.active {
  background: #e3f2fd;
  border-left: 3px solid #0F3D5A;
}

.contactItem.hidden {
  display: none;
}

.contactAvatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #6b7280;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 13px;
  margin-right: 10px;
  flex-shrink: 0;
}

.contactInfo {
  flex: 1;
  min-width: 0;
}

.contactNameText {
  font-weight: 500;
  color: #000;
  font-size: 14px;
  margin-bottom: 2px;
}

.contactPreview {
  color: #666;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.contactTime {
  color: #999;
  font-size: 11px;
  margin-left: 8px;
  flex-shrink: 0;
}

/* Chat Area */
.chatArea {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  min-width: 0;
}

.chatDate {
  text-align: center;
  padding: 12px;
  color: #666;
  font-size: 13px;
  border-bottom: 1px solid #f0f0f0;
}

.messagesContainer {
  flex: 1;
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  max-width: 80%;
  opacity: 0;
  animation: fadeIn 0.3s ease-in-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.received {
  align-self: flex-start;
}

.message.sent {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.messageAvatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #6b7280;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 11px;
  flex-shrink: 0;
}

.messageAvatar.dvmfLogo {
  background: linear-gradient(135deg, #0F3D5A, #d46b6b);
  border: 1px solid #ddd;
}

.messageContent {
  display: flex;
  flex-direction: column;
}

.messageBubble {
  background: #f1f3f4;
  padding: 10px 14px;
  border-radius: 18px;
  font-size: 13px;
  line-height: 1.4;
  color: #000;
  word-wrap: break-word;
}

.message.sent .messageBubble {
  background: #e3f2fd;
  color: #000;
}

.messageTime {
  font-size: 10px;
  color: #999;
  margin-top: 2px;
  align-self: flex-end;
}

.message.received .messageTime {
  align-self: flex-start;
}

/* Message Input */
.messageInputArea {
  padding: 12px 16px;
  border-top: 1px solid #e5e7eb;
  background: white;
  display: flex;
  align-items: center;
  gap: 8px;
}

.messageInput {
  flex: 1;
  padding: 10px 16px;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 13px;
  outline: none;
  background: #f8f9fa;
  transition: all 0.2s;
  min-height: 40px;
  resize: none;
}

.messageInput:focus {
  border-color: #007bff;
  background: white;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.1);
}

.sendBtn {
  background: #0F3D5A;
  color: white;
  border: none;
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 20px;
}

.sendBtn:hover {
  background: #991B1B;
  transform: scale(1.05);
}

.sendBtn:disabled {
  background: #ccc;
  cursor: not-allowed;
  transform: none;
}

/* Typing indicator */
.typingIndicator {
  display: none;
  padding: 8px 16px;
  color: #666;
  font-size: 12px;
  font-style: italic;
}

.typingIndicator.show {
  display: block;
}

/* Empty states */
.noResults,
.emptyContacts,
.emptyMessages {
  padding: 40px 20px;
  text-align: center;
  color: #666;
  font-size: 14px;
  display: none;
}

.noResults.show,
.emptyContacts.show,
.emptyMessages.show {
  display: block;
}

.emptyStateIcon {
  font-size: 56px;
  color: #252222ff;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.emptyStateTitle {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.emptyStateText {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.4;
}

/* Logout Confirmation Modal */
.modalOverlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
}

.modalOverlay.show {
  display: flex;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  width: 100%;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  transform: scale(0.95);
  transition: transform 0.2s;
}

.modalOverlay.show .modal {
  transform: scale(1);
}

.modalHeader {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.modalIcon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #fee2e2;
  color: #dc2626;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
}

.modalTitle {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.modalText {
  color: #6b7280;
  margin-bottom: 24px;
  line-height: 1.5;
}

.modalActions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

.modalBtn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  min-height: 40px;
  min-width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modalBtnCancel {
  background: #f9fafb;
  color: #374151;
  border-color: #d1d5db;
}

.modalBtnCancel:hover {
  background: #f3f4f6;
}

.modalBtnConfirm {
  background: #dc2626;
  color: white;
}

.modalBtnConfirm:hover {
  background: #0F3D5A;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .mobileMenuToggle {
    display: flex;
  }

  .sidebars {
    position: fixed;
    top: 60px;
    left: 0;
    height: calc(100vh - 60px);
    z-index: 1000;
    transform: translateX(-100%);
    width: 100%;
    max-width: 320px;
  }

  .sidebars.show {
    transform: translateX(0);
  }

  .chatArea {
    width: 100%;
  }

  .headerLeft {
    gap: 4px;
  }

  .contactName {
    display: none;
  }

  .editIcon {
    display: none;
  }

  .message {
    max-width: 90%;
  }

  .messageInputArea {
    padding: 8px 12px;
  }

  .messagesContainer {
    padding: 12px;
  }

  .modal {
    margin: 20px;
    max-width: none;
  }

  .modalActions {
    flex-direction: column-reverse;
  }

  .modalBtn {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .header {
    padding: 8px 12px;
  }

  .headerTitle {
    font-size: 16px;
  }

  .messageBubble {
    font-size: 12px;
    padding: 8px 12px;
  }

  .contactItem {
    padding: 8px 12px;
    min-height: 56px;
  }

  .contactAvatar {
    width: 32px;
    height: 32px;
    font-size: 12px;
  }

  .searchInput {
    padding: 10px 12px;
    font-size: 12px;
  }
}

/* Sidebars overlay for mobile */
.sidebarsOverlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: none;
}

.sidebarsOverlay.show {
  display: block;
}

@media (max-width: 768px) {
  .sidebarsOverlay.show {
    display: block;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}
      `}</style>

      {/* Logout Confirmation Modal */}
      {isLogoutModalOpen && (
        <div
          className="modalOverlay show"
          ref={logoutModalRef}
          onClick={(e) => e.target === logoutModalRef.current && closeLogoutModal()}
        >
          <div className="modal">
            <div className="modalHeader">
              <div className="modalIcon">
                <LogOut />
              </div>
              <div className="modalTitle">Confirm Logout</div>
            </div>
            <div className="modalText">
              Are you sure you want to logout? You will need to sign in again to access your messages.
            </div>
            <div className="modalActions">
              <button className="modalBtn modalBtnCancel" onClick={closeLogoutModal}>
                Cancel
              </button>
              <button className="modalBtn modalBtnConfirm" onClick={confirmLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sidebars Overlay */}
      {isMobileSidebarOpen && (
        <div className="sidebarsOverlay show" ref={sidebarOverlayRef} onClick={closeMobileSidebar} />
      )}

      {/* Header */}
      <div className="header">
        <div className="headerLeft">
          <ArrowLeft className="backBtn" onClick={goBack} />
          <span className="headerTitle">Messages</span>
          <Edit3
            className="editIcon"
            onClick={toggleEditMode}
            style={{
              color: isEditMode ? "#0F3D5A" : "#666",
            }}
          />
          <span className="contactName">{getCurrentContactName()}</span>
        </div>
        <div className="menuDots" onClick={toggleDropdown} ref={dropdownRef}>
          <MoreHorizontal />
          <div className={`dropdownMenu ${isDropdownOpen ? "show" : ""}`}>
            <div className="dropdownItem" onClick={clearChat}>
              Clear Chat
            </div>
            <div className="dropdownItem" onClick={exportChat}>
              Export Chat
            </div>
            <div className="dropdownItem" onClick={blockContact}>
              Block Contact
            </div>
            <div className="dropdownItem" onClick={reportContact}>
              Report
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="mainContainer">
        {/* Sidebars */}
        <div className={`sidebars ${isMobileSidebarOpen ? "show" : ""}`}>
          <div className="searchContainer">
            <input
              type="text"
              className="searchInput"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => searchContacts(e.target.value)}
            />
          </div>

          <div className="contactsList">
            {filteredContacts.length === 0 && !searchQuery && (
              <div className="emptyContacts show">
                <div className="emptyStateIcon">
                  <Users />
                </div>
                <div className="emptyStateTitle">No Contacts</div>
                <div className="emptyStateText">
                  You don't have any contacts yet. Start a conversation to see contacts here.
                </div>
              </div>
            )}

            {filteredContacts.length === 0 && searchQuery && (
              <div className="noResults show">
                <div className="emptyStateIcon">
                  <Search />
                </div>
                <div className="emptyStateTitle">No Results</div>
                <div className="emptyStateText">No contacts found matching your search.</div>
              </div>
            )}

            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className={`contactItem ${currentContact === contact.id ? "active" : ""}`}
                onClick={() => selectContact(contact.id, contact.name)}
                data-contact={contact.id}
              >
                <div className="contactAvatar">{contact.avatar}</div>
                <div className="contactInfo">
                  <div className="contactNameText">{contact.name}</div>
                  <div className="contactPreview">{contact.preview}</div>
                </div>
                <div className="contactTime">{contact.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="chatArea">
          <div className="chatDate">{getCurrentDateString()}</div>

          {isTyping && (
            <div className="typingIndicator show">
              <Circle style={{ animation: "pulse 1.5s infinite" }} />
              <span>{typingContact}</span> is typing...
            </div>
          )}

          <div className="messagesContainer" ref={messagesContainerRef}>
            {currentMessages.length === 0 && (
              <div className="emptyMessages show">
                <div className="emptyStateIcon">
                  <MessageCircle />
                </div>
                <div className="emptyStateTitle">No Messages</div>
                <div className="emptyStateText">Select a contact to start messaging or begin a new conversation.</div>
              </div>
            )}

            {currentMessages.map((message, index) => (
              <div key={index} className={`message ${message.type}`}>
                <div className={`messageAvatar ${message.type === "sent" ? "dvmfLogo" : ""}`}>{message.avatar}</div>
                <div className="messageContent">
                  <div className="messageBubble">{message.message}</div>
                  <div className="messageTime">{message.time}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="messageInputArea">
            <input
              type="text"
              className="messageInput"
              placeholder="Type message..."
              maxLength="500"
              value={messageInput}
              onChange={handleMessageInput}
              onKeyPress={handleKeyPress}
            />
            <button className="sendBtn" onClick={sendMessage} disabled={!messageInput.trim()}>
              <Send />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DvmfMessage
