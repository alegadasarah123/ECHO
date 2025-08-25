"use client"
import React, { useCallback, useEffect, useRef, useState } from "react"

import { Link, useNavigate } from "react-router-dom"

import {
  AlertTriangle,
  Angry,
  BarChart3,
  Bell,
  BellOff,
  CheckCircle,
  ClipboardList,
  FileText,
  Folder,
  Frown,
  Heart,
  Info,
  Laugh,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Search,
  Settings,
  ThumbsUp,
  Upload,
  UserCheck,
  XCircle,
  Zap,
} from "lucide-react"

function CtuAnnouncement() {
  const navigate = useNavigate()

  // State for sidebar and modals
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [modalImageSrc, setModalImageSrc] = useState("")
  const [searchTerm, setSearchTerm] = useState("") // Declare setSearchTerm variable

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

  const getNotificationIcon = (type) => {
    const icons = {
      info: Info,
      success: CheckCircle,
      warning: AlertTriangle,
      error: XCircle,
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
        return ThumbsUp
      case "love":
        return Heart
      case "haha":
        return Laugh
      case "wow":
        return Zap
      case "sad":
        return Frown
      case "angry":
        return Angry
      default:
        return ThumbsUp
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
            <img src={photo.url || "/Images/logo1.png"} alt={`Post image ${index + 1}`} />
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
                  src={`/placeholder-32x32.png?key=4yf41&height=32&width=32&text=${comment.author.charAt(0)}`}
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
                      <img src="/Images/logo1.png" alt="Your avatar" />
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
                            src={`/placeholder_nfpe5.png?key=nfpe5&height=28&width=28&text=${reply.author.charAt(0)}`}
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

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/CtuDashboard" },
    { name: "Account Approval", icon: UserCheck, path: "/CtuAccountApproval" },
    { name: "Access Requests", icon: FileText, path: "/CtuAccessRequest" },
    { name: "Horse Records", icon: ClipboardList, path: "/CtuHorseRecord" },
    { name: "Health Reports", icon: BarChart3, path: "/CtuHealthReport" },
    { name: "Announcements", icon: Megaphone, path: "/CtuAnnouncement", active: true },
    { name: "Directory", icon: Folder, path: "/CtuDirectory" },
    { name: "Settings", icon: Settings, path: "/CtuSettings" },
  ]

  return (
    <div className="bodyWrapper">
      <style>{`
       

/* General Styles */
body {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.bodyWrapper {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  background-color: #f5f5f5;
  display: flex;
  height: 100vh;
  overflow-x: hidden;
  width: 100%;
}

/* Sidebar Styles */
.sidebars {
  width: 250px;
  background-color:#b91c1c;
  color: white;
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  left: 0;
  top: 0;
  z-index: 1000;
  transition: transform 0.3s ease;
}

.sidebars-logo {
  padding: 5px;
  display: flex;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebars-logo img {
  width: 250px;
  height: 200px;
  object-fit: contain;
}

.nav-menu {
  flex: 1;
  padding: 20px 0;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 40px;
  color: white;
  text-decoration: none;
  transition: all 0.3s ease;
  font-size: clamp(13px, 2vw, 15px);
  font-weight: 500;
  cursor: pointer;
  margin: 0px 0px 2px 0;
  position: relative;
  margin-left: 10px;
  min-height: 44px;
}

.nav-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 25px 0 0 25px;
}

.nav-item.active {
  background-color: #f3f4f6;
  color: #b91c1c;
  border-radius: 20px 0 0 20px;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 240px;
  margin-left: 10px;
}

.nav-icon {
  width: 20px;
  height: 20px;
  margin-right: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.nav-item.active .nav-icon {
  color: #b91c1c;
}

 .logouts {
  padding: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.logout-btns {
  display: flex;
  align-items: center;
  color: white;
  text-decoration: none;
  font-size: clamp(13px, 2vw, 15px);
  font-weight: 500;
  cursor: pointer;
  padding: 14px 40px;
  border-radius: 25px;
  transition: all 0.3s ease;
  min-height: 44px;
}

.logout-btns:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.logout-icons {
  width: 20px;
  height: 20px;
  margin-right: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}


.main-content {
  margin-left: 250px;
  flex: 1;
  display: flex;
  flex-direction: column;
  width: calc(100% - 250px);
}

.headers {
  background: white;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex-wrap: wrap;
  gap: 16px;
}

.search-containers {
  flex: 1;
  max-width: 400px;
  margin-right: 20px;
  position: relative;
  min-width: 200px;
}

.search-input {
  width: 100%;
  padding: 8px 16px 8px 40px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  font-size: clamp(12px, 2vw, 14px);
  outline: none;
  min-height: 40px;
}

.search-input:focus {
  border-color:#b91c1c;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
}

.search-icon::before {
  content: "";
  position: absolute;
  width: 10px;
  height: 10px;
  border: 2px solid #6b7280;
  border-radius: 50%;
  top: 0;
  left: 0;
}

.search-icon::after {
  content: "";
  position: absolute;
  width: 2px;
  height: 5px;
  background: #6b7280;
  transform: rotate(45deg);
  bottom: 1px;
  right: 1px;
}

.notification-bell {
  font-size: clamp(18px, 3vw, 20px);
  color: #666;
  cursor: pointer;
  position: relative;
  margin-right: 20px;
  padding: 8px;
  min-height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.notification-count {
  position: absolute;
  top: 2px;
  right: 2px;
  background-color: #b91c1c;
  color: white;
  font-size: 10px;
  width: 15px;
  height: 15px;
  border-radius: 50%;
  display: none;
  align-items: center;
  justify-content: center;
}

.notification-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: min(350px, 90vw);
  background-color: white;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  display: none;
  max-height: 400px;
  overflow-y: auto;
}

.notification-dropdown.show {
  display: block;
}

.notification-header {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  background: #f8f9fa;
  border-radius: 8px 8px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notification-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.mark-all-read {
  background: none;
  border: none;
  color: #b91c1c;
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}

.notification-item {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  cursor: pointer;
  position: relative;
  transition: background-color 0.2s;
}

.notification-item:hover {
  background-color: #f8f9fa;
}

.notification-item.unread {
  background-color: #f0f8ff;
  border-left: 3px solid #b91c1c;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 5px;
  color: #333;
  display: flex;
  align-items: center;
  gap: 8px;
}

.notification-message {
  font-size: 13px;
  color: #666;
  margin-bottom: 5px;
  line-height: 1.4;
}

.notification-time {
  font-size: 11px;
  color: #999;
}

.notification-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.notification-icon.info {
  color: #3b82f6;
}
.notification-icon.success {
  color: #10b981;
}
.notification-icon.warning {
  color: #f59e0b;
}
.notification-icon.error {
  color: #ef4444;
}

.notification-actions {
  position: absolute;
  top: 10px;
  right: 15px;
  display: flex;
  gap: 5px;
}

.notification-action {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  padding: 2px;
  border-radius: 3px;
  font-size: 12px;
}

.notification-action:hover {
  background: #f0f0f0;
  color: #666;
}

.content-areas {
  flex: 1;
  background: #e5e7eb;
  overflow-y: auto;
}

.profile-section {
  background: white;
  padding: clamp(16px, 3vw, 30px);
  display: flex;
  align-items: center;
  gap: clamp(12px, 3vw, 20px);
  margin-bottom: 0;
  flex-wrap: wrap;
}

.profile-logo {
  width: clamp(50px, 8vw, 60px);
  height: clamp(50px, 8vw, 60px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2px solid #b91c1c;
  flex-shrink: 0;
}

.profile-logo img {
  width: clamp(70px, 12vw, 90px);
  height: clamp(70px, 12vw, 90px);
  object-fit: cover;
  margin-top: 14px;
}

.profile-details h1 {
  font-size: clamp(18px, 4vw, 24px);
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}

.profile-details .detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: clamp(12px, 2vw, 14px);
  margin-bottom: 4px;
  word-wrap: break-word;
}

.profile-details .detail-item i {
  width: 16px;
  color: #9ca3af;
  flex-shrink: 0;
}

.tabs-section {
  background: white;
  border-top: 1px solid #e5e7eb;
  display: flex;
  overflow-x: auto;
}

.tab-button {
  padding: clamp(12px, 3vw, 16px) clamp(20px, 4vw, 30px);
  background: none;
  border: none;
  font-size: clamp(14px, 2.5vw, 16px);
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.2s;
  white-space: nowrap;
  min-height: 44px;
}

.tab-button.active {
  color: #b91c1c;
  border-bottom-color: #b91c1c;
}

.content-section {
  background:white;
  padding: clamp(20px, 4vw, 30px);
}

.section-title {
  font-size: clamp(16px, 3vw, 18px);
  font-weight: 600;
  color: #111827;
  margin-bottom: 20px;
}

.description-box {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: clamp(16px, 3vw, 20px);
  margin-bottom: 30px;
}

.description-box h3 {
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 600;
  color: #374151;
  margin-bottom: 12px;
}

.description-box p {
  color: #6b7280;
  line-height: 1.6;
  font-size: clamp(12px, 2vw, 14px);
}

.location-box {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: clamp(16px, 3vw, 20px);
  margin-bottom: 30px;
}

.location-box p {
  color: #374151;
  line-height: 1.5;
  font-size: clamp(12px, 2vw, 14px);
  margin: 0;
}

.hours-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin-bottom: 30px;
}

.hours-item {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
  text-align: center;
}

.hours-item .day {
  font-weight: 600;
  color: #374151;
  font-size: clamp(11px, 2vw, 13px);
  margin-bottom: 4px;
}

.hours-item .time {
  color: #6b7280;
  font-size: clamp(10px, 1.8vw, 12px);
}

.services-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.services-column {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: clamp(16px, 3vw, 20px);
}

.services-column ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.services-column li {
  color: #374151;
  font-size: clamp(12px, 2vw, 14px);
  padding: 8px 0;
  border-bottom: 1px solid #e5e7eb;
  position: relative;
  padding-left: 16px;
}

.services-column li:last-child {
  border-bottom: none;
}

.services-column li::before {
  content: "•";
  color: #b91c1c;
  font-weight: bold;
  position: absolute;
  left: 0;
}

.post-creation {
  margin-bottom: 20px;
}

.post-input-container {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 15px;
  position: relative;
  display: flex;
  flex-direction: column;
}

.post-input {
  width: 100%;
  border: none;
  background: transparent;
  resize: vertical;
  outline: none;
  font-family: inherit;
  font-size: clamp(12px, 2vw, 14px);
  color: #374151;
  margin-bottom: 10px;
  min-height: 60px;
}

.post-input::placeholder {
  color: #9ca3af;
}

.post-input.error {
  border: 1px solid#ef4444;
  border-radius: 4px;
  padding: 8px;
}

.error-message {
  color: #ef4444;
  font-size: 12px;
  margin-top: 4px;
  display: none;
}

.post-actions-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.post-media-controls {
  display: flex;
  gap: 10px;
}

.media-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.media-btn:hover {
  background: #e5e7eb;
  color:#374151;
}

.media-btn.active {
  color: #b91c1c;
  background: #dbeafe;
}

.post-btn {
  background: #b91c1c;
  color: white;
  border: none;
  padding: 8px 20px;
  border-radius: 6px;
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  min-height: 40px;
}

.post-btn:hover {
  background: #991b1b;
}

.post-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.photo-upload-area {
  display: none;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  margin: 10px 0;
  transition: all 0.3s ease;
  cursor: pointer;
}

.photo-upload-area.active {
  display: block;
}

.photo-upload-area:hover {
  border-color: #b91c1c;
  background: #f8fafc;
}

.photo-upload-area.dragover {
  border-color: #b91c1c;
  background: #dbeafe;
}

.upload-icon {
  font-size: 24px;
  color: #9ca3af;
  margin-bottom: 8px;
}

.upload-text {
  color: #6b7280;
  font-size: 14px;
  margin-bottom: 4px;
}

.upload-subtext {
  color: #9ca3af;
  font-size: 12px;
}

.photo-preview-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 10px 0;
}

.photo-preview {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
}

.photo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.photo-remove:hover {
  background: rgba(239, 68, 68, 0.8);
}

.post-item {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: clamp(16px, 3vw, 20px);
  margin-bottom: 20px;
}

.post-header {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  flex-wrap: wrap;
  gap: 12px;
}

.post-avatar {
  width: clamp(35px, 6vw, 40px);
  height: clamp(35px, 6vw, 40px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 2px solid #b91c1c;
  flex-shrink: 0;
}

.post-avatar img {
  width: clamp(60px, 10vw, 70px);
  height: clamp(60px, 10vw, 70px);
  object-fit: cover;
  margin-top: 5px;
}

.post-info .post-author {
  font-weight: 600;
  color: #111827;
  font-size: clamp(12px, 2vw, 14px);
  margin-bottom: 2px;
}

.post-info .post-date {
  color: #6b7280;
  font-size: clamp(10px, 1.8vw, 12px);
}

.post-content p {
  color: #374151;
  line-height: 1.6;
  font-size: clamp(12px, 2vw, 14px);
  margin: 0 0 15px 0;
}

.post-images {
  display: grid;
  gap: 8px;
  margin: 15px 0;
  border-radius: 8px;
  overflow: hidden;
}

.post-images.single {
  grid-template-columns: 1fr;
}

.post-images.double {
  grid-template-columns: 1fr 1fr;
}

.post-images.triple {
  grid-template-columns: 2fr 1fr;
  grid-template-rows: 1fr 1fr;
}

.post-images.multiple {
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
}

.post-image {
  position: relative;
  cursor: pointer;
  overflow: hidden;
  border-radius: 4px;
}

.post-image img {
  width: 100%;
  height: 200px;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.post-image:hover img {
  transform: scale(1.05);
}

.post-images.triple .post-image:first-child {
  grid-row: 1 / 3;
}

.post-images.triple .post-image img {
  height: 100%;
  min-height: 408px;
}

.post-images.multiple .post-image:last-child {
  position: relative;
}

.more-images-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color:white;
  font-size: 18px;
  font-weight: 600;
}

.post-actions {
  display: flex;
  gap: 20px;
  padding-top: 15px;
  border-top: 1px solid #e5e7eb;
  flex-wrap: wrap;
}

.action-btn {
  background: none;
  border: none;
  color: #6b7280;
  font-size: clamp(12px, 2vw, 14px);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 6px;
  transition: all 0.2s;
  min-height: 40px;
  position: relative;
}

.action-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.action-btn i {
  font-size: 16px;
}

.action-btn.active {
  color: #2563eb;
  font-weight: 500;
}

.action-btn.like-btn.liked-like {
  color: #2563eb;
}
.action-btn.like-btn.liked-love {
  color: #db2777;
}
.action-btn.like-btn.liked-haha {
  color: #eab308;
}
.action-btn.like-btn.liked-wow {
  color: #eab308;
}
.action-btn.like-btn.liked-sad {
  color: #6b7280;
}
.action-btn.like-btn.liked-angry {
  color: #ef4444;
}

.reaction-popup {
  position: absolute;
  bottom: 100%;
  left: 0;
  background:white;
  border-radius: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  display: flex;
  padding: 8px;
  margin-bottom: 8px;
  z-index: 10;
  opacity: 0;
  transform: translateY(10px);
  pointer-events: none;
  transition: all 0.2s ease;
}

.reaction-popup.active {
  opacity: 1;
  transform: translateY(0);
  pointer-events: all;
}

.reaction-btn {
  background: none;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.reaction-btn:hover {
  transform: scale(1.2);
  z-index: 1;
}

.reaction-btn span {
  font-size: 24px;
}

.reaction-btn .reaction-label {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.7);
  color:white;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s;
}

.reaction-btn:hover .reaction-label {
  opacity: 1;
}

.reaction-count {
  display: flex;
  margin-top: 8px;
  padding: 0 12px;
}

.reaction-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  margin-right: -4px;
  border: 1px solid white;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.reaction-icon:first-child {
  z-index: 3;
}
.reaction-icon:nth-child(2) {
  z-index: 2;
}
.reaction-icon:nth-child(3) {
  z-index: 1;
}

.reaction-text {
  font-size: 13px;
  color: #6b7280;
  margin-left: 6px;
}

.comment-section {
  margin-top: 15px;
  border-top: 1px solid #e5e7eb;
  padding-top: 15px;
  display: none;
}

.comment-section.active {
  display: block;
}

.comment-form {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.comment-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.comment-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.comment-input-container {
  flex: 1;
  position: relative;
}

.comment-input {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 20px;
  padding: 8px 40px 8px 16px;
  font-size: 14px;
  outline: none;
  background: #f3f4f6;
}

.comment-input:focus {
  border-color: #b91c1c;
  background: white;
}

.comment-submit {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color:#b91c1c;
  cursor: pointer;
  font-size: 16px;
}

.comment-submit:disabled {
  color: #9ca3af;
  cursor: not-allowed;
}

.comments-list {
  margin-top: 10px;
}

.comment-item {
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
}

.comment-content {
  flex: 1;
}

.comment-bubble {
  background: #f3f4f6;
  border-radius: 18px;
  padding: 8px 12px;
  display: inline-block;
  max-width: 100%;
}

.comment-author {
  font-weight: 600;
  font-size: 13px;
  color: #111827;
  margin-bottom: 2px;
}

.comment-text {
  font-size: 14px;
  color: #374151;
  word-break: break-word;
}

.comment-actions {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  padding-left: 12px;
}

.comment-action {
  background: none;
  border: none;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  padding: 2px 0;
}

.comment-action:hover {
  color: #374151;
  text-decoration: underline;
}

.comment-time {
  font-size: 12px;
  color: #6b7280;
  margin-left: auto;
}

.comments-more {
  text-align: center;
  margin-top: 10px;
}

.comments-more-btn {
  background: none;
  border: none;
  color: #b91c1c;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.comments-more-btn:hover {
  background: #f3f4f6;
  text-decoration: underline;
}

 .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center; /* centers horizontally */
  justify-content: center; /* centers vertically (if parent has height) */
  text-align: center;
  padding: 2rem;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.empty-state i {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state h3 {
  font-size: 18px;
  margin-bottom: 8px;
  color: #374151;
}

.empty-state p {
  font-size: 14px;
}

/* Mobile Menu Button */
.mobile-menu-btn {
  display: none;
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 1001;
  background: #b91c1c;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
}

/* Chat Widget */
.chat-widget {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
}

.chat-button {
  width: 64px;
  height: 64px;
  background: #b91c1c;
  border: none;
  border-radius: 20px;
  color: white;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(185, 28, 28, 0.3);
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.chat-button::after {
  content: "";
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid #b91c1c;
}

.chat-button:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(185, 28, 28, 0.4);
}

.chat-button:hover::after {
  border-top-color: #b91c1c;
}

.chat-dots {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
}

.chat-dot {
  width: 8px;
  height: 8px;
  background: white;
  border-radius: 50%;
}

/* Logout Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 20px;
}

.modal-overlay.active {
  display: flex;
}

.confirmation-modal {
  background: white;
  border-radius: 8px;
  padding: clamp(20px, 4vw, 24px);
  width: 90%;
  max-width: 400px;
  text-align: center;
}

.confirmation-modal h3 {
  font-size: clamp(16px, 3vw, 18px);
  font-weight: 600;
  color: #111827;
  margin-bottom: 12px;
}

.confirmation-modal p {
  font-size: clamp(12px, 2vw, 14px);
  color: #6b7280;
  margin-bottom: 24px;
  line-height: 1.5;
}

.confirmation-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.confirmation-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  font-size: clamp(12px, 2vw, 14px);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 80px;
  min-height: 40px;
}

.confirmation-btn.cancel {
  background: #6b7280;
  color: white;
}

.confirmation-btn.cancel:hover {
  background: #4b5563;
}

.confirmation-btn.confirm {
  background: #ef4444;
  color: white;
}

.confirmation-btn.confirm:hover {
  background: #dc2626;
}

/* Image Modal */
.image-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: none;
  justify-content: center;
  align-items: center;
  z-index: 3000;
  padding: 20px;
}

.image-modal.active {
  display: flex;
}

.image-modal img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  border-radius: 8px;
}

.image-modal-close {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  font-size: 24px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image-modal-close:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Logout Modal Styles (duplicate, keeping for consistency with original HTML) */
.logout-modal {
  background: white;
  border-radius: 12px;
  padding: 32px;
  width: 90%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
}

.logout-modal-icon {
  width: 64px;
  height: 64px;
  background: #fef3c7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.logout-modal-icon i {
  font-size: 28px;
  color: #f59e0b;
}

.logout-modal h3 {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 12px;
}

.logout-modal p {
  font-size: 16px;
  color: #6b7280;
  margin-bottom: 32px;
  line-height: 1.5;
}

.logout-modal-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.logout-modal-btn {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 100px;
  min-height: 44px;
}

.logout-modal-btn.cancel {
  background:#f3f4f6;
  color: #374151;
}

.logout-modal-btn.cancel:hover {
  background: #e5e7eb;
}

.logout-modal-btn.confirm {
  background: #ef4444;
  color:white;
}

.logout-modal-btn.confirm:hover {
  background: #dc2626;
}

/* Tablet */
@media (max-width: 1024px) {
  .hours-grid {
    grid-template-columns: repeat(3, 1fr);
  }
  .services-container {
    grid-template-columns: 1fr;
  }
  .notification-dropdown {
    width: 280px;
  }
}

/* Mobile */
@media (max-width: 768px) {
  .mobile-menu-btn {
    display: block;
  }
  .sidebars {
    transform: translateX(-100%);
    transition: transform 0.3s;
  }
  .sidebars.open {
    transform: translateX(0);
  }
  .main-content {
    margin-left: 0;
    width: 100%;
  }
  .headers {
    margin-left: 60px;
    padding: 12px 16px;
  }
  .search-containers {
    margin-right: 10px;
    min-width: 150px;
  }
  .profile-section {
    flex-direction: column;
    align-items: flex-start;
    text-align: center;
  }
  .profile-details {
    width: 100%;
  }
  .hours-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .services-container {
    grid-template-columns: 1fr;
  }
  .post-actions {
    gap: 10px;
  }
  .chat-widget {
    bottom: 16px;
    right: 16px;
  }
  .chat-button {
    width: 56px;
    height: 56px;
    border-radius: 18px;
  }
  .chat-button::after {
    bottom: -6px;
    border-left-width: 8px;
    border-right-width: 8px;
    border-top-width: 8px;
  }
  .confirmation-buttons {
    flex-direction: column;
  }
  .post-images .post-image img {
    height: 150px;
  }
  .post-images.triple .post-image img {
    min-height: 308px;
  }
  .reaction-popup {
    left: 50%;
    transform: translateX(-50%) translateY(10px);
  }
  .reaction-popup.active {
    transform: translateX(-50%) translateY(0);
  }
}

/* Small Mobile */
@media (max-width: 480px) {
  .headers {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    margin-left: 50px;
  }
  .search-containers {
    margin-right: 0;
    min-width: auto;
  }
  .notification-bell {
    align-self: flex-end;
    margin-right: 0;
  }
  .mobile-menu-btn {
    top: 15px;
    left: 15px;
    padding: 10px;
  }
  .hours-grid {
    grid-template-columns: 1fr;
  }
  .post-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .post-media-controls {
    flex-wrap: wrap;
  }
  .post-actions-bar {
    flex-direction: column;
    gap: 10px;
    align-items: stretch;
  }
  .notification-dropdown {
    width: calc(100vw - 20px);
    right: -10px;
  }
}

/* Touch devices */
@media (hover: none) and (pointer: coarse) {
  .nav-item,
  .logout-btn {
    min-height: 48px;
  }
  .tab-button {
    min-height: 48px;
  }
  .action-btn {
    min-height: 44px;
    padding: 12px 16px;
  }
}

/* Add these styles to your existing CtuAnnouncement.css file */

/* Comment Like Button Styles 
.comment-action {
  background: none;
  border: none;
  color: #65676b;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.comment-action:hover {
  background-color: #f0f2f5;
  color: #1877f2;
}*/

.comment-action.liked {
  color: #1877f2;
}

.comment-action.liked i {
  color: #1877f2;
}

/* Reply Input Container */
.reply-input-container {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 8px;
  padding-left: 12px;
  border-left: 2px solid #e4e6ea;
}

.reply-input-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  background-color: #f0f2f5;
  border-radius: 20px;
  padding: 8px 12px;
  gap: 8px;
}

.reply-input {
  flex: 1;
  border: none;
  background: none;
  outline: none;
  font-size: 14px;
  color: #050505;
  resize: none;
}

.reply-input::placeholder {
  color: #0f1010;
}

.reply-submit {
 
  border: none;
  color: #b91c1c;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  width: 24px;
  height: 24px;
}

.reply-submit:hover {
  background-color: rgba(24, 119, 242, 0.1);
}

.reply-submit:disabled {
  color: #bcc0c4;
  cursor: not-allowed;
}

/* Replies Container */
.replies-container {
  margin-top: 8px;
  padding-left: 20px;
  border-left: 2px solid #e4e6ea;
}

.reply-item {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.reply-item .comment-avatar {
  width: 28px;
  height: 28px;
}

.reply-item .comment-avatar img {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
}

.reply-item .comment-bubble {
  background-color: #f0f2f5;
  border-radius: 16px;
  padding: 8px 12px;
  max-width: calc(100% - 60px);
  word-wrap: break-word;
}

.reply-item .comment-author {
  font-weight: 600;
  font-size: 13px;
  color: #050505;
  margin-bottom: 2px;
}

.reply-item .comment-text {
  font-size: 14px;
  color: #050505;
  line-height: 1.33;
}

.reply-item .comment-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
  padding-left: 12px;
}

.reply-item .comment-action {
  font-size: 12px;
  padding: 2px 6px;
}

.reply-item .comment-time {
  font-size: 12px;
  color: #65676b;
}

/* Enhanced Comment Actions 
.comment-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
  padding-left: 12px;
}

.comment-time {
  font-size: 12px;
  color: #65676b;
  font-weight: normal;
}
*/
/* Like Count Display */
.comment-action i {
  margin-right: 4px;
  font-size: 12px;
}

/* Hover Effects for Better UX */
.comment-item:hover .comment-actions {
  opacity: 1;
}

/*.comment-actions {
  opacity: 0.7;
  transition: opacity 0.2s ease;
}
*/
/* Reply Button Specific Styles */
.comment-action[title="Reply"] {
  position: relative;
}

/* Active Reply State */
.reply-input-container.active {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive Design for Mobile */
@media (max-width: 768px) {
  .reply-input-container {
    padding-left: 8px;
  }

  .replies-container {
    padding-left: 16px;
  }

  .comment-action {
    font-size: 11px;
    padding: 3px 6px;
  }

  .reply-input {
    font-size: 13px;
  }

  .reply-item .comment-author {
    font-size: 12px;
  }

  .reply-item .comment-text {
    font-size: 13px;
  }
}

/* Focus States for Accessibility */


.comment-action:focus {
  outline: 2px solid #b91c1c;
  outline-offset: 2px;
}

.reply-submit:focus {
  outline: 2px solid transparent;
  outline-offset: 2px;
}

/* Loading State for Reply Submit */
.reply-submit.loading {
  pointer-events: none;
  opacity: 0.6;
}

.reply-submit.loading i {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Enhanced Visual Hierarchy */


.comment-item::before {
  content: "";
  position: absolute;
  left: 20px;
  top: 40px;
  bottom: -8px;
  width: 2px;
  background-color: #e4e6ea;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.comment-item:hover::before {
  opacity: 1;
}

/* Reply Threading Visual Indicator */
.replies-container::before {
  content: "";
  position: absolute;
  left: -2px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, #1877f2, transparent);
  opacity: 0.3;
}

/* Improved Button States */
.comment-action:active {
  transform: scale(0.95);
}

.reply-submit:active {
  transform: scale(0.9);
}

/* Dark Mode Support (if needed) */
@media (prefers-color-scheme: dark) {
  .comment-action {
    color: #b0b3b8;
  }

  .comment-action:hover {
    background-color: #e4e6ea;
    color: #58a6ff;
  }

  .comment-action.liked {
    color: #58a6ff;
  }

  .reply-input-wrapper {
    background-color: #e4e6ea;
  }

  .reply-input {
    color: #0a0a0a;
  }

  .reply-input::placeholder {
    color: #141515;
  }

  .reply-submit {
    color: #b91c1c;
  }

  .reply-submit:hover {
    background-color: #e4e6ea(88, 166, 255, 0.1);
  }

  .reply-item .comment-bubble {
    background-color: #e4e6ea;
  }

  .reply-item .comment-author,
  .reply-item .comment-text {
    color: black;
  }

  .comment-time {
    color: #b0b3b8;
  }

  .replies-container {
    border-left-color: #b0b3b8;
  }

  .reply-input-container {
    border-left-color: #b0b3b8;
  }
}

/* Smooth Transitions */
.comment-item,
.reply-item,
.comment-action,
.reply-input-container {
  transition: all 0.2s ease;
}

/* Better Visual Feedback */
.comment-action:hover i {
  transform: scale(1.1);
}

.reply-submit:hover i {
  transform: scale(1.1);
}

/* Nested Reply Limit Indicator */
.replies-container .replies-container {
  margin-left: 20px;
  border-left: 1px solid #e4e6ea;
}

/* Maximum nesting depth styling */
.replies-container .replies-container .replies-container {
  border-left: none;
  margin-left: 10px;
}

      `}</style>

      <button className="mobile-menu-btn" onClick={toggleSidebar}>
        ☰
      </button>

      <div className={`sidebars ${isSidebarExpanded ? "open" : ""}`} id="sidebar">
        <div className="sidebars-logo">
          <img src="/Images/logo1.png" alt="CTU Logo" className="logo" />
        </div>
        <nav className="nav-menu">
          {menuItems.map((item, index) => (
            <Link key={index} to={item.path} className={`nav-item ${item.active ? "active" : ""}`}>
              <item.icon className="nav-icon" size={20} />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="logouts">
          <a href="#" className="logout-btns" id="logoutBtn" onClick={openLogoutModal}>
            <LogOut className="logout-icons" size={20} />
            Log Out
          </a>
        </div>
      </div>

      <div className="main-content">
        <header className="headers">
          <div className="search-containers">
            <Search className="search-icon" size={20} />
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
             <Bell size={20} />
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
                    <BellOff size={48} />
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
                        {React.createElement(getNotificationIcon(notification.type), {
                          className: `notification-icon ${notification.type}`,
                          size: 16,
                        })}
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

        <div className="content-areas">
          <div className="profile-section">
            <div className="profile-logo">
              <img src="/Images/logo1.png" alt="CTU Logo" className="logo" />
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
                    <Upload className="upload-icon" size={24} />
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
                          <img src={photo.url || "/Images/logo1.png"} alt="Preview" />
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
                            <img src="/Images/logo1.png" alt="CTU Logo" />
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
                            {React.createElement(getReactionIcon(userReaction ? userReaction.type : "like"), {
                              size: 16,
                            })}
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
                                <img src="/Images/logo1.png" alt="Your avatar" />
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

      {/* Logout Modal */}
      {isLogoutModalOpen && (
        <div className="modal-overlay active" ref={logoutModalRef}>
          <div className="logout-modal">
            <div className="logout-modal-icon">
              <LogOut size={25} color="#f59e0b" />
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
      )}

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
