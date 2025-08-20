"use client"
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./CtuAnnouncement.css"; // Import the new CSS file

function CtuAnnouncement() {
  const navigate = useNavigate()

  // State for sidebar and modals
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [modalImageSrc, setModalImageSrc] = useState("")
  //const [searchTerm, setSearchTerm] = useState("") // Declare setSearchTerm variable

  // State for tabs
  const [activeTab, setActiveTab] = useState("information")

  // State for post creation
  const [postInputText, setPostInputText] = useState("")
  const [postErrorMessage, setPostErrorMessage] = useState("")
  const [selectedPhotos, setSelectedPhotos] = useState([]) // Array of { id, file, url }

  // State for posts and notifications
  const [posts, setPosts] = useState([])
  const [notifications, setNotifications] = useState([])

  // State for reply functionality
  const [replyingTo, setReplyingTo] = useState(null) 

  // Refs for click outside functionality and file input
  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)
  const logoutModalRef = useRef(null)
  const imageModalRef = useRef(null)
  const photoUploadAreaRef = useRef(null)
  const photoInputRef = useRef(null)
  const postInputRef = useRef(null) // Ref for the post textarea

  // Reaction emojis data
  const reactions = [
    { name: "like", emoji: "👍🏻", label: "Like" },
    { name: "love", emoji: "❤️", label: "Love" },
    { name: "haha", emoji: "😂", label: "Haha" },
    { name: "wow", emoji: "😮", label: "Wow" },
    { name: "sad", emoji: "😢", label: "Sad" },
    { name: "angry", emoji: "😡", label: "Angry" },
  ]

  // Helper to format time for notifications and comments
  const formatTimeAgo = useCallback((timestamp) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))
    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }, [])

  const getNotificationIconClass = (type) => {
    const icons = {
      info: "fas fa-info-circle",
      success: "fas fa-check-circle",
      warning: "fas fa-exclamation-triangle",
      error: "fas fa-times-circle",
    }
    return icons[type] || icons.info
  }

  const markAsRead = (notificationId) => {
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const deleteNotification = (notificationId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
  }

  const loadNotifications = useCallback(() => {
    // Placeholder for fetching notifications from backend
    setNotifications([
      {
        id: 1,
        title: "New Announcement",
        message: "Check out the latest updates from CTU VET-MED.",
        type: "info",
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        read: false,
      },
      {
        id: 2,
        title: "System Maintenance",
        message: "Scheduled maintenance on 2023-12-01.",
        type: "warning",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        read: true,
      },
    ])
  }, [])

  const handleTabChange = (tabName) => {
    setActiveTab(tabName)
  }

  const handlePhotoSelection = useCallback(
    (files) => {
      files.forEach((file) => {
        if (file.size > 10 * 1024 * 1024) {
          // 10MB limit
          showError("File size should not exceed 10MB")
          return
        }
        if (selectedPhotos.length >= 4) {
          showError("Maximum 4 photos allowed per post")
          return
        }
        const reader = new FileReader()
        reader.onload = (e) => {
          const photoData = {
            id: Date.now() + Math.random(),
            file: file,
            url: e.target.result,
          }
          setSelectedPhotos((prev) => [...prev, photoData])
        }
        reader.readAsDataURL(file)
      })
    },
    [selectedPhotos],
  )

  const removePhoto = useCallback((photoId) => {
    setSelectedPhotos((prev) => prev.filter((photo) => photo.id !== photoId))
  }, [])

  const showError = useCallback((message) => {
    setPostErrorMessage(message)
    if (postInputRef.current) {
      postInputRef.current.classList.add("error")
    }
    setTimeout(() => {
      hideError()
    }, 3000)
  }, [])

  const hideError = useCallback(() => {
    setPostErrorMessage("")
    if (postInputRef.current) {
      postInputRef.current.classList.remove("error")
    }
  }, [])

  const createPost = useCallback(() => {
    const postText = postInputText.trim()
    if (!postText && selectedPhotos.length === 0) {
      showError("Please enter some text or add photos for your announcement")
      return
    }

    const now = new Date()
    const newPost = {
      id: Date.now(),
      content: postText,
      photos: [...selectedPhotos],
      author: "CTU VET-MED",
      date: now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
      timestamp: now,
      likes: [],
      comments: [],
      commentCount: 0,
    }

    setPosts((prev) => [newPost, ...prev]) // Add to beginning of array
    setPostInputText("")
    setSelectedPhotos([])
    hideError()
    console.log("Post created:", newPost)
  }, [postInputText, selectedPhotos, showError, hideError])

  const getReactionIcon = (type) => {
    switch (type) {
      case "like":
        return "fas fa-thumbs-up"
      case "love":
        return "fas fa-heart"
      case "haha":
        return "fas fa-laugh"
      case "wow":
        return "fas fa-surprise"
      case "sad":
        return "fas fa-sad-tear"
      case "angry":
        return "fas fa-angry"
      default:
        return "far fa-thumbs-up"
    }
  }

  const openImageModal = useCallback((imageSrc) => {
    setModalImageSrc(imageSrc)
    setIsImageModalOpen(true)
  }, [])

  const closeImageModal = useCallback(() => {
    setIsImageModalOpen(false)
    setModalImageSrc("")
  }, [])

  const toggleReactionPopup = useCallback((postId) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => ({
        ...post,
        isReactionPopupOpen: post.id === postId ? !post.isReactionPopupOpen : false,
      })),
    )
  }, [])

  const closeReactionPopups = useCallback(
    (event) => {
      // Check if the click is outside any reaction popup or its trigger button
      if (
        !event.target.closest(".reaction-popup") &&
        !event.target.closest(".like-btn") &&
        posts.some((p) => p.isReactionPopupOpen)
      ) {
        setPosts((prevPosts) =>
          prevPosts.map((post) => ({
            ...post,
            isReactionPopupOpen: false,
          })),
        )
      }
    },
    [posts],
  )

  const reactToPost = useCallback((postId, reactionType, event) => {
    event.stopPropagation() // Prevent triggering parent click handlers
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const existingReactionIndex = post.likes.findIndex((like) => like.userId === "current-user")
          if (existingReactionIndex !== -1) {
            // If same reaction, remove it
            if (post.likes[existingReactionIndex].type === reactionType) {
              post.likes.splice(existingReactionIndex, 1)
            } else {
              // Change reaction type
              post.likes[existingReactionIndex].type = reactionType
            }
          } else {
            // Add new reaction
            post.likes.push({
              userId: "current-user",
              type: reactionType,
              timestamp: new Date(),
            })
          }
          return { ...post, isReactionPopupOpen: false } // Close popup after reacting
        }
        return post
      }),
    )
  }, [])

  const toggleComments = useCallback((postId) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === postId ? { ...post, isCommentsOpen: !post.isCommentsOpen } : post)),
    )
  }, [])

  const addComment = useCallback((postId, commentText) => {
    if (!commentText.trim()) return
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const newComment = {
            id: Date.now(),
            author: "You", // Placeholder for current user
            text: commentText,
            timestamp: new Date(),
            likes: [],
            replies: [],
          }
          return {
            ...post,
            comments: [...post.comments, newComment],
            commentCount: post.commentCount + 1,
          }
        }
        return post
      }),
    )
  }, [])

  // NEW: Function to like/unlike a comment
  const toggleCommentLike = useCallback((postId, commentId) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const updatedComments = post.comments.map((comment) => {
            if (comment.id === commentId) {
              const existingLikeIndex = comment.likes.findIndex((like) => like.userId === "current-user")
              if (existingLikeIndex !== -1) {
                // Remove like
                comment.likes.splice(existingLikeIndex, 1)
              } else {
                // Add like
                comment.likes.push({
                  userId: "current-user",
                  timestamp: new Date(),
                })
              }
            }
            return comment
          })
          return { ...post, comments: updatedComments }
        }
        return post
      }),
    )
  }, [])

  // NEW: Function to add a reply to a comment
  const addReply = useCallback((postId, commentId, replyText) => {
    if (!replyText.trim()) return
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const updatedComments = post.comments.map((comment) => {
            if (comment.id === commentId) {
              const newReply = {
                id: Date.now(),
                author: "You",
                text: replyText,
                timestamp: new Date(),
                likes: [],
              }
              return {
                ...comment,
                replies: [...(comment.replies || []), newReply],
              }
            }
            return comment
          })
          return { ...post, comments: updatedComments }
        }
        return post
      }),
    )
    setReplyingTo(null) // Close reply input
  }, [])

  // NEW: Function to toggle reply input
  const toggleReply = useCallback(
    (postId, commentId) => {
      setReplyingTo(replyingTo?.commentId === commentId ? null : { postId, commentId })
    },
    [replyingTo],
  )

  const showMoreComments = useCallback((postId) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === postId ? { ...post, commentsDisplayLimit: post.comments.length } : post)),
    )
  }, [])

  const handleSearchInput = (e) => {
    setSearchTerm(e.target.value.toLowerCase())
    // Implement search logic here for posts and information if needed
  }

  const openLogoutModal = (e) => {
    e.preventDefault()
    setIsLogoutModalOpen(true)
  }

  const closeLogoutModal = () => {
    setIsLogoutModalOpen(false)
  }

  const confirmLogout = () => {
    console.log("User logged out")
    // In a real app, clear authentication tokens/session
    navigate("/login") // Assuming this is your login route
    closeLogoutModal()
  }

  const toggleSidebar = () => {
    setIsSidebarExpanded((prev) => !prev)
  }

  // Effects for initial data loading
  useEffect(() => {
    loadNotifications()
    // Dummy posts for initial render
    setPosts([
      {
        id: 1,
        content: "Important announcement regarding horse health checks next week. Please prepare your horses.",
        photos: [
          { id: 1, url: "/placeholder.svg?height=200&width=300" },
          { id: 2, url: "/placeholder.svg?height=200&width=300" },
        ],
        author: "CTU VET-MED",
        date: "November 15, 2023, 10:30 AM",
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        likes: [{ userId: "user1", type: "like" }],
        comments: [
          {
            id: 1,
            author: "John Doe",
            text: "Understood, thank you for the update!",
            timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
            likes: [],
            replies: [],
          },
          {
            id: 2,
            author: "Jane Smith",
            text: "Will prepare my horses.",
            timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            likes: [{ userId: "current-user", timestamp: new Date() }],
            replies: [
              {
                id: 21,
                author: "You",
                text: "Great! Let me know if you need any help.",
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                likes: [],
              },
            ],
          },
        ],
        commentCount: 2,
        isCommentsOpen: false,
        isReactionPopupOpen: false,
        commentsDisplayLimit: 3,
      },
      {
        id: 2,
        content: "Reminder: Annual vaccination drive for all registered horses is scheduled for December.",
        photos: [{ id: 3, url: "/placeholder.svg?height=200&width=400" }],
        author: "CTU VET-MED",
        date: "November 10, 2023, 02:00 PM",
        timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        likes: [
          { userId: "user2", type: "love" },
          { userId: "user3", type: "like" },
        ],
        comments: [],
        commentCount: 0,
        isCommentsOpen: false,
        isReactionPopupOpen: false,
        commentsDisplayLimit: 3,
      },
    ])
  }, [loadNotifications])

  // Effects for click outside and resize
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close notification dropdown
      if (
        notificationBellRef.current &&
        !notificationBellRef.current.contains(event.target) &&
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target)
      ) {
        setIsNotificationDropdownOpen(false)
      }

      // Close logout modal
      if (isLogoutModalOpen && logoutModalRef.current && event.target === logoutModalRef.current) {
        closeLogoutModal()
      }

      // Close image modal
      if (isImageModalOpen && imageModalRef.current && event.target === imageModalRef.current) {
        closeImageModal()
      }

      // Close mobile sidebar
      const sidebar = document.getElementById("sidebar")
      const mobileMenuBtn = document.querySelector(".mobile-menu-btn")
      if (
        window.innerWidth <= 768 &&
        isSidebarExpanded &&
        sidebar &&
        !sidebar.contains(event.target) &&
        mobileMenuBtn &&
        !mobileMenuBtn.contains(event.target)
      ) {
        setIsSidebarExpanded(false)
      }

      // Close reaction popups
      closeReactionPopups(event)
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [
    isNotificationDropdownOpen,
    isLogoutModalOpen,
    isImageModalOpen,
    isSidebarExpanded,
    closeImageModal,
    closeReactionPopups,
  ])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsSidebarExpanded(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closeImageModal()
        closeLogoutModal()
        setIsNotificationDropdownOpen(false)
        setReplyingTo(null) // Close reply input on escape
        setPosts((prevPosts) =>
          prevPosts.map((post) => ({
            ...post,
            isReactionPopupOpen: false,
          })),
        )
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [closeImageModal])

  const unreadNotificationCount = notifications.filter((n) => !n.read).length

  // Helper to render post images
  const renderPostImages = (photos) => {
    if (!photos || photos.length === 0) return null

    let gridClass = "single"
    if (photos.length === 2) gridClass = "double"
    else if (photos.length === 3) gridClass = "triple"
    else if (photos.length >= 4) gridClass = "multiple"

    const imagesToShow = photos.slice(0, 4)
    const remainingCount = photos.length - 4

    return (
      <div className={`post-images ${gridClass}`}>
        {imagesToShow.map((photo, index) => (
          <div className="post-image" key={photo.id} onClick={() => openImageModal(photo.url)}>
            <img src={photo.url || "/placeholder.svg"} alt={`Post image ${index + 1}`} />
            {index === 3 && remainingCount > 0 && <div className="more-images-overlay">{`+${remainingCount}`}</div>}
          </div>
        ))}
      </div>
    )
  }

  // UPDATED: Helper to render comments with working like and reply functionality
  const renderComments = (comments, limit = 3) => {
    if (!comments || comments.length === 0) return null

    const sortedComments = [...comments].sort((a, b) => b.timestamp - a.timestamp)
    const displayComments = sortedComments.slice(0, limit)

    return (
      <div className="comments-list">
        {displayComments.map((comment) => {
          const userLiked = comment.likes.some((like) => like.userId === "current-user")
          const likeCount = comment.likes.length

          return (
            <div className="comment-item" key={comment.id}>
              <div className="comment-avatar">
                <img
                  src={`/placeholder.svg?height=32&width=32&text=${comment.author.charAt(0)}`}
                  alt={`${comment.author} avatar`}
                />
              </div>
              <div className="comment-content">
                <div className="comment-bubble">
                  <div className="comment-author">{comment.author}</div>
                  <div className="comment-text">{comment.text}</div>
                </div>
                <div className="comment-actions">
                  <button
                    className={`comment-action ${userLiked ? "liked" : ""}`}
                    onClick={() =>
                      toggleCommentLike(
                        comment.postId || posts.find((p) => p.comments.includes(comment))?.id,
                        comment.id,
                      )
                    }
                  >
                    <i className={userLiked ? "fas fa-thumbs-up" : "far fa-thumbs-up"}></i>
                    Like {likeCount > 0 && `(${likeCount})`}
                  </button>
                  <button
                    className="comment-action"
                    onClick={() =>
                      toggleReply(comment.postId || posts.find((p) => p.comments.includes(comment))?.id, comment.id)
                    }
                  >
                    <i className="fas fa-reply"></i>
                    Reply
                  </button>
                  <span className="comment-time">{formatTimeAgo(comment.timestamp)}</span>
                </div>

                {/* Reply input */}
                {replyingTo?.commentId === comment.id && (
                  <div className="reply-input-container">
                    <div className="comment-avatar">
                      <img src="/images/logo.png" alt="Your avatar" />
                    </div>
                    <div className="reply-input-wrapper">
                      <input
                        type="text"
                        className="reply-input"
                        placeholder={`Reply to ${comment.author}...`}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            addReply(replyingTo.postId, comment.id, e.target.value)
                            e.target.value = ""
                          }
                          if (e.key === "Escape") {
                            setReplyingTo(null)
                          }
                        }}
                        autoFocus
                      />
                      <button
                        className="reply-submit"
                        onClick={(e) => {
                          const inputElement = e.currentTarget.previousElementSibling
                          addReply(replyingTo.postId, comment.id, inputElement.value)
                          inputElement.value = ""
                        }}
                      >
                        <i className="fas fa-paper-plane"></i>
                      </button>
                    </div>
                  </div>
                )}

                {/* Render replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="replies-container">
                    {comment.replies.map((reply) => (
                      <div className="reply-item" key={reply.id}>
                        <div className="comment-avatar">
                          <img
                            src={`/placeholder.svg?height=28&width=28&text=${reply.author.charAt(0)}`}
                            alt={`${reply.author} avatar`}
                          />
                        </div>
                        <div className="comment-content">
                          <div className="comment-bubble">
                            <div className="comment-author">{reply.author}</div>
                            <div className="comment-text">{reply.text}</div>
                          </div>
                          <div className="comment-actions">
                            <button className="comment-action">
                              <i className="far fa-thumbs-up"></i>
                              Like
                            </button>
                            <span className="comment-time">{formatTimeAgo(reply.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="bodyWrapper">
      <button className="mobile-menu-btn" onClick={toggleSidebar}>
        ☰
      </button>

      <div className={`sidebar ${isSidebarExpanded ? "open" : ""}`} id="sidebar">
        <div className="sidebar-logo">
          <img src="/images/logo.png" alt="CTU Logo" className="logo" />
        </div>
        <nav className="nav-menu">
          {[
            { name: "Dashboard", iconClass: "fas fa-th-large", path: "/CtuDashboard" },
            { name: "Account Approval", iconClass: "fas fa-user-check", path: "/CtuAccountApproval" },
            { name: "Access Requests", iconClass: "fas fa-file-alt", path: "/CtuAccessRequest" },
            { name: "Horse Records", iconClass: "fas fa-clipboard-list", path: "/CtuHorseRecord" },
            { name: "Health Reports", iconClass: "fas fa-chart-bar", path: "/CtuHealthReport" },
            { name: "Announcements", iconClass: "fas fa-bullhorn", path: "/CtuAnnouncement", active: true },
            { name: "Directory", iconClass: "fas fa-folder", path: "/CtuDirectory" },
            { name: "Settings", iconClass: "fas fa-cog", path: "/CtuSettings" },
          ].map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`nav-item ${item.active ? "active" : ""}`}
              onClick={() => {
                if (isSidebarExpanded) {
                  setIsSidebarExpanded(false)
                }
              }}
            >
              <i className={`nav-icon ${item.iconClass}`}></i>
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="logout">
          <a href="#" className="logout-btn" id="logoutBtn" onClick={openLogoutModal}>
            <i className="logout-icon fas fa-sign-out-alt"></i>
            Log Out
          </a>
        </div>
      </div>

      <div className="main-content">
        <header className="header">
          <div className="search-container">
            <div className="search-icon"></div>
            <input
              type="text"
              className="search-input"
              placeholder="Search......"
              id="searchInput"
              onChange={handleSearchInput}
            />
          </div>
          <div
            className="notification-bell"
            id="notification-bell"
            ref={notificationBellRef}
            onClick={() => setIsNotificationDropdownOpen((prev) => !prev)}
          >
            <i className="fas fa-bell"></i>
            {unreadNotificationCount > 0 && (
              <div className="notification-count" style={{ display: "flex" }}>
                {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
              </div>
            )}
            <div
              className={`notification-dropdown ${isNotificationDropdownOpen ? "show" : ""}`}
              id="notification-dropdown"
              ref={notificationDropdownRef}
            >
              <div className="notification-header">
                <h3>Notifications</h3>
                {unreadNotificationCount > 0 && (
                  <button className="mark-all-read" onClick={markAllAsRead}>
                    Mark all as read
                  </button>
                )}
              </div>
              <div id="notificationList">
                {notifications.length === 0 ? (
                  <div className="empty-state">
                    <i className="fas fa-bell-slash"></i>
                    <h3>No notifications</h3>
                    <p>You're all caught up!</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div key={notification.id} className={`notification-item ${!notification.read ? "unread" : ""}`}>
                      <div className="notification-actions">
                        {!notification.read && (
                          <button
                            className="notification-action"
                            onClick={() => markAsRead(notification.id)}
                            title="Mark as read"
                          >
                            <i className="fas fa-check"></i>
                          </button>
                        )}
                        <button
                          className="notification-action"
                          onClick={() => deleteNotification(notification.id)}
                          title="Delete"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </div>
                      <div className="notification-title">
                        <i
                          className={`notification-icon ${notification.type} ${getNotificationIconClass(
                            notification.type,
                          )}`}
                        ></i>
                        {notification.title}
                      </div>
                      <div className="notification-message">{notification.message}</div>
                      <div className="notification-time">{formatTimeAgo(notification.timestamp)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="content-area">
          <div className="profile-section">
            <div className="profile-logo">
              <img src="/images/logo.png" alt="CTU Logo" className="logo" />
            </div>
            <div className="profile-details">
              <h1>Cebu City CTU</h1>
              <div className="detail-item">
                <i className="fas fa-map-marker-alt"></i>
                <span>M. J. Cuenco Ave, Cebu City</span>
              </div>
              <div className="detail-item">
                <i className="fas fa-phone"></i>
                <span>(032) 256-1234</span>
              </div>
              <div className="detail-item">
                <i className="fas fa-envelope"></i>
                <span>ctu.city@ctu.edu.ph</span>
              </div>
            </div>
          </div>

          <div className="tabs-section">
            <button
              className={`tab-button ${activeTab === "information" ? "active" : ""}`}
              onClick={() => handleTabChange("information")}
            >
              Information
            </button>
            <button
              className={`tab-button ${activeTab === "post" ? "active" : ""}`}
              onClick={() => handleTabChange("post")}
            >
              Post
            </button>
          </div>

          {activeTab === "information" && (
            <div className="content-section" id="information-content">
              <div className="section-title">About CTU</div>
              <div className="description-box">
                <h3>Description</h3>
                <p>
                  The College of Technological University Veterinary Medical (CTU VET-MED) is responsible for ensuring
                  the health and welfare of animals within the city limits, including horses used by kutseros for
                  transportation.
                </p>
              </div>
              <div className="section-title">Location</div>
              <div className="location-box">
                <p>
                  <strong>M. J. Cuenco Ave, Cebu City</strong>
                  <br />
                  Cebu, Philippines 6000
                </p>
              </div>
              <div className="section-title">Available Hours</div>
              <div className="hours-grid">
                <div className="hours-item">
                  <div className="day">Monday</div>
                  <div className="time">8:00 AM - 5:00 PM</div>
                </div>
                <div className="hours-item">
                  <div className="day">Tuesday</div>
                  <div className="time">8:00 AM - 5:00 PM</div>
                </div>
                <div className="hours-item">
                  <div className="day">Wednesday</div>
                  <div className="time">8:00 AM - 5:00 PM</div>
                </div>
                <div className="hours-item">
                  <div className="day">Thursday</div>
                  <div className="time">8:00 AM - 5:00 PM</div>
                </div>
                <div className="hours-item">
                  <div className="day">Friday</div>
                  <div className="time">8:00 AM - 5:00 PM</div>
                </div>
                <div className="hours-item">
                  <div className="day">Saturday</div>
                  <div className="time">8:00 AM - 12:00 PM</div>
                </div>
                <div className="hours-item">
                  <div className="day">Sunday</div>
                  <div className="time">Closed</div>
                </div>
              </div>
              <div className="section-title">Services</div>
              <div className="services-container">
                <div className="services-column">
                  <ul>
                    <li>Horse health examinations</li>
                    <li>Vaccinations</li>
                    <li>Parasite control</li>
                  </ul>
                </div>
                <div className="services-column">
                  <ul>
                    <li>Treatment of injuries and illnesses</li>
                    <li>Nutritional counseling</li>
                    <li>Horse registration and monitoring</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === "post" && (
            <div className="content-section" id="post-content">
              <div className="post-creation">
                <div className="post-input-container">
                  <textarea
                    className={`post-input ${postErrorMessage ? "error" : ""}`}
                    placeholder="What's on your mind?"
                    rows="3"
                    value={postInputText}
                    onChange={(e) => setPostInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        createPost()
                      }
                    }}
                    ref={postInputRef}
                  ></textarea>
                  {postErrorMessage && <div className="error-message">{postErrorMessage}</div>}
                  <div
                    className="photo-upload-area"
                    id="photoUploadArea"
                    ref={photoUploadAreaRef}
                    onClick={() => photoInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault()
                      photoUploadAreaRef.current?.classList.add("dragover")
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault()
                      photoUploadAreaRef.current?.classList.remove("dragover")
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      photoUploadAreaRef.current?.classList.remove("dragover")
                      const files = Array.from(e.dataTransfer.files).filter((file) => file.type.startsWith("image/"))
                      handlePhotoSelection(files)
                    }}
                  >
                    <div className="upload-icon">
                      <i className="fas fa-cloud-upload-alt"></i>
                    </div>
                    <div className="upload-text">Click to upload photos or drag and drop</div>
                    <div className="upload-subtext">PNG, JPG, GIF up to 10MB each</div>
                    <input
                      type="file"
                      id="photoInput"
                      multiple
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => handlePhotoSelection(Array.from(e.target.files))}
                      ref={photoInputRef}
                    />
                  </div>
                  {selectedPhotos.length > 0 && (
                    <div className="photo-preview-container" id="photoPreviewContainer">
                      {selectedPhotos.map((photo) => (
                        <div className="photo-preview" key={photo.id}>
                          <img src={photo.url || "/placeholder.svg"} alt="Preview" />
                          <button className="photo-remove" onClick={() => removePhoto(photo.id)}>
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="post-actions-bar">
                    <div className="post-media-controls">
                      <button className="media-btn" id="photoBtn" onClick={() => photoInputRef.current?.click()}>
                        <i className="fas fa-image"></i> Photo
                      </button>

                    </div>
                    <button className="post-btn" id="createPostBtn" onClick={createPost}>
                      Post
                    </button>
                  </div>
                </div>
              </div>

              {posts.length === 0 ? (
                <div className="empty-state" id="postsEmptyState">
                  <i className="fas fa-bullhorn"></i>
                  <h3>No announcements yet</h3>
                  <p>Create your first announcement to get started</p>
                </div>
              ) : (
                <div id="postsContainer">
                  {posts.map((post) => {
                    const totalReactions = post.likes.length
                    const userReaction = post.likes.find((like) => like.userId === "current-user")
                    const userReactionClass = userReaction ? `liked-${userReaction.type}` : ""

                    const reactionCounts = {}
                    reactions.forEach((reaction) => {
                      reactionCounts[reaction.name] = post.likes.filter((like) => like.type === reaction.name).length
                    })

                    let reactionDisplay = null
                    if (totalReactions > 0) {
                      const topReactions = Object.entries(reactionCounts)
                        .filter(([_, count]) => count > 0)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 3)

                      const reactionIcons = topReactions.map(([type, _]) => {
                        const reaction = reactions.find((r) => r.name === type)
                        return (
                          <div className="reaction-icon" key={type}>
                            {reaction.emoji}
                          </div>
                        )
                      })

                      reactionDisplay = (
                        <div className="reaction-count">
                          {reactionIcons}
                          <span className="reaction-text">{totalReactions}</span>
                        </div>
                      )
                    }

                    return (
                      <div className="post-item" key={post.id}>
                        <div className="post-header">
                          <div className="post-avatar">
                            <img src="/images/logo.png" alt="CTU Logo" />
                          </div>
                          <div className="post-info">
                            <div className="post-author">{post.author}</div>
                            <div className="post-date">{post.date}</div>
                          </div>
                        </div>
                        <div className="post-content">
                          {post.content && <p>{post.content}</p>}
                          {renderPostImages(post.photos)}
                        </div>
                        {reactionDisplay}
                        <div className="post-actions">
                          <button
                            className={`action-btn like-btn ${userReactionClass}`}
                            onClick={() => toggleReactionPopup(post.id)}
                          >
                            <i className={userReaction ? getReactionIcon(userReaction.type) : "far fa-thumbs-up"}></i>
                            {userReaction
                              ? userReaction.type.charAt(0).toUpperCase() + userReaction.type.slice(1)
                              : "Like"}
                            {post.isReactionPopupOpen && (
                              <div className="reaction-popup active" id={`reaction-popup-${post.id}`}>
                                {reactions.map((reaction) => (
                                  <button
                                    className="reaction-btn"
                                    key={reaction.name}
                                    onClick={(e) => reactToPost(post.id, reaction.name, e)}
                                  >
                                    <span>{reaction.emoji}</span>
                                    <span className="reaction-label">{reaction.label}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </button>
                          <button className="action-btn comment-btn" onClick={() => toggleComments(post.id)}>
                            <i className="fas fa-commentt"></i>
                            Comment {post.commentCount > 0 ? `(${post.commentCount})` : ""}
                          </button>
                        </div>
                        {post.isCommentsOpen && (
                          <div className="comment-section active" id={`comment-section-${post.id}`}>
                            <div className="comment-form">
                              <div className="comment-avatar">
                                <img src="/images/logo.png" alt="Your avatar" />
                              </div>
                              <div className="comment-input-container">
                                <input
                                  type="text"
                                  className="comment-input"
                                  placeholder="Write a comment..."
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      addComment(post.id, e.target.value)
                                      e.target.value = ""
                                    }
                                  }}
                                />
                                <button
                                  className="comment-submit"
                                  onClick={(e) => {
                                    const inputElement = e.currentTarget.previousElementSibling
                                    addComment(post.id, inputElement.value)
                                    inputElement.value = ""
                                  }}
                                >
                                  <i className="fas fa-paper-plane"></i>
                                </button>
                              </div>
                            </div>
                            {renderComments(post.comments, post.commentsDisplayLimit)}
                            {post.comments.length > (post.commentsDisplayLimit || 3) && (
                              <div className="comments-more">
                                <button className="comments-more-btn" onClick={() => showMoreComments(post.id)}>
                                  View more comments
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Widget - Button Only */}
      <div className="chat-widget">
        <button className="chat-button" id="chatButton" onClick={() => navigate("/CtuMessage")}>
          <div className="chat-dots">
            <div className="chat-dot"></div>
            <div className="chat-dot"></div>
            <div className="chat-dot"></div>
          </div>
        </button>
      </div>

      <div className={`modal-overlay ${isLogoutModalOpen ? "active" : ""}`} id="logoutModal" ref={logoutModalRef}>
        <div className="logout-modal">
          <div className="logout-modal-icon">
            <i className="fas fa-sign-out-alt"></i>
          </div>
          <h3>Confirm Logout</h3>
          <p>Are you sure you want to log out of your account?</p>
          <div className="logout-modal-buttons">
            <button className="logout-modal-btn cancel" onClick={closeLogoutModal}>
              No
            </button>
            <button className="logout-modal-btn confirm" onClick={confirmLogout}>
              Yes
            </button>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {isImageModalOpen && (
        <div className="image-modal active" id="imageModal" ref={imageModalRef}>
          <button className="image-modal-close" onClick={closeImageModal}>
            &times;
          </button>
          <img id="modalImage" src={modalImageSrc || "/placeholder.svg"} alt="Full size image" />
        </div>
      )}
    </div>
  )
}

export default CtuAnnouncement
