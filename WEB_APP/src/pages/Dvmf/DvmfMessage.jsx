"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import "./DvmfMessage.css"

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
      navigate("/dvmf-dashboard")
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
    if (!currentContact) {
      alert("Please select a contact first.")
      return
    }

    const text = messageInput.trim()
    if (text) {
      const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

      const messageObj = {
        type: "sent",
        avatar: "D",
        message: text,
        time: time,
      }

      setChatData((prev) => ({
        ...prev,
        [currentContact]: [...(prev[currentContact] || []), messageObj],
      }))

      setMessageInput("")

      // Update contact preview
      updateContactPreview(currentContact, text)

      // Scroll to bottom
      setTimeout(() => {
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
        }
      }, 100)
    }
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
                <i className="fas fa-sign-out-alt" />
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
        <div className="sidebarOverlay show" ref={sidebarOverlayRef} onClick={closeMobileSidebar} />
      )}

      {/* Header */}
      <div className="header">
        <div className="headerLeft">
          
          <i className="fas fa-arrow-left backBtn" onClick={goBack} />
          <span className="headerTitle">Messages</span>
          <i
            className="fas fa-edit editIcon"
            onClick={toggleEditMode}
            style={{
              color: isEditMode ? "#B91C1C" : "#666",
            }}
          />
          <span className="contactName">{getCurrentContactName()}</span>
        </div>
        <div className="menuDots" onClick={toggleDropdown} ref={dropdownRef}>
          <i className="fas fa-ellipsis-h" />
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
                  <i className="fas fa-users" />
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
                  <i className="fas fa-search" />
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
              <i className="fas fa-circle" style={{ animation: "pulse 1.5s infinite" }} />
              <span>{typingContact}</span> is typing...
            </div>
          )}

          <div className="messagesContainer" ref={messagesContainerRef}>
            {currentMessages.length === 0 && (
              <div className="emptyMessages show">
                <div className="emptyStateIcon">
                  <i className="fas fa-comments" />
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
              <i className="fas fa-paper-plane" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DvmfMessage
