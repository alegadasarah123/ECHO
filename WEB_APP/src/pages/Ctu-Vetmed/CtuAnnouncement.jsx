"use client"
import Sidebar from "@/components/CtuSidebar"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import FloatingMessages from "./CtuMessage"

import {
  Bell,
  Edit,
  Mail,
  MapPin,
  MessageCircle,
  MoreVertical,
  Phone,
  Pin,
  Send, Trash,

  Upload,
} from "lucide-react"
import NotificationModal from "./CtuNotif"

const API_BASE = "http://127.0.0.1:8000/api/ctu_vetmed"

const CTUAnnouncement = () => {
  const navigate = useNavigate()

  // State for sidebar and modals

  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [isImageModalOpen, setIsImageModalOpen] = useState("")
  const [modalImageSrc, setModalImageSrc] = useState("")
  const [searchTerm, setSearchTerm] = useState("") // Declare setSearchTerm variable
  const [isSidebarsOpen, setIsSidebarsOpen] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)
  // State for tabs
  const [activeTab, setActiveTab] = useState("information")
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)

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

  const [commentInputs, setCommentInputs] = useState({}) // { [postId]: text }
  const [replyInputs, setReplyInputs] = useState({}) // { [commentId]: text }
  const [showDropdown, setShowDropdown] = useState({})
  const [isEditingPost, setIsEditingPost] = useState(null)

  const [expandedPosts, setExpandedPosts] = useState(new Set())

  const styles = {
    container: {
      display: "flex",
      height: "100vh",
      backgroundColor: "#f5f5f5",
    },
    sidebar: {
      width: "250px",
      backgroundColor: "#fff",
      borderRight: "1px solid #e0e0e0",
      display: "flex",
      flexDirection: "column",
    },
    logo: {
      padding: "20px",
      borderBottom: "1px solid #e0e0e0",
      textAlign: "center",
    },
    logoImg: {
      width: "120px",
      height: "auto",
    },
    nav: {
      flex: "1",
      padding: "20px 0",
    },
    navItem: {
      display: "flex",
      alignItems: "center",
      padding: "12px 20px",
      color: "#333",
      textDecoration: "none",
      transition: "background-color 0.2s",
      cursor: "pointer",
    },
    navItemActive: {
      backgroundColor: "#e3f2fd",
      color: "#1976d2",
      borderRight: "3px solid #1976d2",
    },
    navIcon: {
      marginRight: "12px",
      fontSize: "18px",
    },
    mainContent: {
      flex: "1",
      display: "flex",
      flexDirection: "column",
    },
    header: {
      backgroundColor: "#fff",
      padding: "12px 28px",
      borderBottom: "1px solid #e0e0e0",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    headerTitle: {
      fontSize: "24px",
      fontWeight: "bold",
      color: "#333",
    },
    headerActions: {
      display: "flex",
      alignItems: "center",
      gap: "15px",
    },
    content: {
      flex: "1",
      padding: "30px",
      overflowY: "auto",
    },
    postCard: {
      backgroundColor: "#fff",
      borderRadius: "8px",
      padding: "20px",
      marginBottom: "20px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    },
    postHeader: {
      display: "flex",
      alignItems: "center",
      marginBottom: "15px",
    },
    postAvatar: {
      width: "65px",
      height: "60px",
      borderRadius: "50%",
      marginRight: "12px",
    },
    postAuthor: {
      fontWeight: "bold",
      fontSize: "16px",
      color: "#333",
    },
    postDate: {
      fontSize: "14px",
      color: "#666",
      marginTop: "2px",
    },
    postContent: {
      fontSize: "16px",
      lineHeight: "1.5",
      color: "#333",
      marginBottom: "15px",
    },
    postImage: {
      width: "100%",
      borderRadius: "8px",
      marginBottom: "15px",
    },
    postActions: {
      display: "flex",
      justifyContent: "space-around",
      padding: "8px 16px",
      borderTop: "1px solid #e4e6ea",
      borderBottom: "1px solid #e4e6ea",
    },
    actionButton: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      background: "none",
      border: "none",
      padding: "8px 16px",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "15px",
      fontWeight: "600",
      color: "#65676b",
      transition: "background-color 0.2s",
      flex: 1,
      justifyContent: "center",
    },
    actionBtn: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 16px",
      backgroundColor: "transparent",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      color: "#65676b",
      transition: "background-color 0.2s",
    },
    commentBtn: {
      ":hover": {
        backgroundColor: "#f0f2f5",
      },
    },
    commentsSection: {
      marginTop: "15px",
      paddingTop: "15px",
      borderTop: "1px solid #e4e6ea",
    },
    commentForm: {
      display: "flex",
      gap: "10px",
      marginBottom: "15px",
      alignItems: "center",
    },
    commentInputContainer: {
      flex: "1",
      position: "relative",
      display: "flex",
      alignItems: "center",
      backgroundColor: "#f0f2f5",
      borderRadius: "20px",
      padding: "8px 12px",
      border: "1px solid #e4e6ea",
    },
    commentInput: {
      flex: "1",
      border: "none",
      backgroundColor: "transparent",
      fontSize: "14px",
      outline: "none",
      padding: "4px 8px",
    },
    commentIcons: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginRight: "8px",
    },
    commentIcon: {
      color: "#65676b",
      cursor: "pointer",
      fontSize: "16px",
      padding: "4px",
      borderRadius: "50%",
      transition: "background-color 0.2s",
    },
    commentSubmit: {
      padding: "8px 16px",
      backgroundColor: "#4267B2",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
    },
    commentItem: {
      display: "flex",
      gap: "10px",
      marginBottom: "10px",
    },
    commentAvatar: {
      width: "55px",
      height: "50px",
      borderRadius: "50%",
    },
    commentContent: {
      flex: "1",
      backgroundColor: "#f0f2f5",
      padding: "8px 12px",
      borderRadius: "16px",
    },
    commentAuthor: {
      fontWeight: "bold",
      fontSize: "13px",
      marginBottom: "2px",
    },
    commentText: {
      fontSize: "14px",
      color: "#1c1e21",
    },
    commentDate: {
      fontSize: "12px",
      color: "#65676b",
      marginTop: "5px",
    },
    notificationBtn: {
      position: "relative",
      background: "transparent",
      border: "none",
      cursor: "pointer",
      padding: "8px",
      borderRadius: "50%",
    },
    badge: {
      position: "absolute",
      top: "2px",
      right: "2px",
      backgroundColor: "#ef4444",
      color: "#fff",
      borderRadius: "50%",
      padding: "2px 6px",
      fontSize: "12px",
      fontWeight: "bold",
    },
  }

  // Helper to format time for notifications and comments
  const formatTimeAgo = useCallback((timestamp) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))
    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }, [])

  // ✅ Fetch notifications from backend
  const loadNotifications = useCallback(() => {
    console.log("Loading notifications...")

    fetch("http://127.0.0.1:8000/api/ctu_vetmed/get_vetnotifications/")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch notifications")
        return res.json()
      })
      .then((data) => {
        const formatted = data.map((notif) => ({
          id: notif.id,
          message: notif.message,
          date: notif.date || new Date().toISOString(),
        }))
        setNotifications(formatted)
      })
      .catch((err) => console.error("Failed to fetch notifications:", err))
  }, [])

  // ✅ Auto-refresh every 30s
  useEffect(() => {
    loadNotifications() // load once

    const interval = setInterval(() => {
      loadNotifications()
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [loadNotifications])

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

  const [pinnedPosts, setPinnedPosts] = useState(new Set());

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

  const createPost = useCallback(async () => {
    const postText = postInputText?.trim() || ""

    if (!postText && selectedPhotos.length === 0) {
      showError("Please enter some text or add photos for your announcement")
      return
    }

    try {
      // Only include the image if selected
      const bodyData = {
        announce_title: "CTU Announcement",
        announce_content: postText,
      }
      if (selectedPhotos.length > 0) {
        bodyData.announce_img = selectedPhotos[0].url
      }

      const res = await fetch("http://localhost:8000/api/ctu_vetmed/create-post/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyData),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to create post")

      // ✅ Add new post locally
      const now = new Date()
      const newPost = {
        id: result?.post?.announce_id || `temp-${now.getTime()}`,
        title: result?.post?.announce_title || "CTU Announcement",
        content: result?.post?.announce_content || "",
        photos: result?.post?.announce_img ? [{ id: `photo-${now.getTime()}`, url: result.post.announce_img }] : [],
        author: "CTU VET-MED",
        date: now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        timestamp: now,
        comments: [],
        commentCount: 0,
      }

      setPosts((prev) => [newPost, ...prev])
      setPostInputText("")
      setSelectedPhotos([])
      hideError()
    } catch (error) {
      console.error("Error creating post:", error)
      showError(error.message || "Failed to create post. Please try again.")
    }
  }, [postInputText, selectedPhotos, setPosts, showError, hideError])

  const loadAnnouncements = useCallback(async () => {
    try {
      const response = await fetch("http://localhost:8000/api/ctu_vetmed/announcements/", {
        credentials: "include",
      })
      const result = await response.json()

      console.log("Raw announcements:", result)

      if (response.ok && result.data) {
        const formattedPosts = result.data.map((announcement) => ({
          id: announcement.announce_id,
          content: announcement.announce_content,
          photos: announcement.announce_img ? [{ id: 1, url: announcement.announce_img }] : [],
          author: "CTU VET-MED",
          timestamp: new Date(announcement.announce_date),
          date: new Date(announcement.announce_date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }),
          comments: [],
          commentCount: 0,
        }))

        setPosts(formattedPosts)
      }
    } catch (error) {
      console.error("[v0] Error loading announcements:", error)
    }
  }, [])

  const openImageModal = useCallback((imageSrc) => {
    setModalImageSrc(imageSrc)
    setIsImageModalOpen(true)
  }, [])

  const closeImageModal = useCallback(() => {
    setIsImageModalOpen(false)
    setModalImageSrc("")
  }, [])

  //===== Toggle comments with auto-focus =====
  const toggleComments = useCallback((postId) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === postId ? { ...post, isCommentsOpen: !post.isCommentsOpen } : post)),
    )

    // Auto-focus comment input after rendering
    setTimeout(() => {
      const input = document.querySelector(`#comment-input-${postId}`)
      if (input) input.focus()
    }, 0)
  }, [])

  const addComment = useCallback((postId, commentText) => {
    if (!commentText.trim()) return
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          const newComment = {
            id: Date.now(),
            author: "You", // Placeholder
            text: commentText,
            timestamp: new Date(),
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

  // ===== Toggle reply input with auto-focus =====
  const toggleReply = useCallback(
    (postId, commentId) => {
      setReplyingTo(replyingTo?.commentId === commentId ? null : { postId, commentId })

      // Auto-focus reply input
      setTimeout(() => {
        const input = document.querySelector(`#reply-input-${commentId}`)
        if (input) input.focus()
      }, 0)
    },
    [replyingTo],
  )

  const showMoreComments = useCallback((postId) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => (post.id === postId ? { ...post, commentsDisplayLimit: post.comments.length } : post)),
    )
  }, [])

  const closeLogoutModal = () => {
    setIsLogoutModalOpen(false)
  }

  const confirmLogout = () => {
    console.log("User logged out")
    localStorage.removeItem("currentUser")
    localStorage.removeItem("loginTime")
    closeLogoutModal()
    navigate("/")
    window.location.reload()
  }

  const toggleSidebar = () => {
    setIsSidebarExpanded((prev) => !prev)
  }

  // Effects for initial data loading
  useEffect(() => {
    loadNotifications()
    loadAnnouncements()
  }, [loadAnnouncements])

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

      const postDropdowns = document.querySelectorAll("[data-post-dropdown]")
      let clickedInsideDropdown = false

      postDropdowns.forEach((dropdown) => {
        if (dropdown.contains(event.target)) {
          clickedInsideDropdown = true
        }
      })

      if (!clickedInsideDropdown) {
        setPosts((prevPosts) => prevPosts.map((post) => ({ ...post, showDropdown: false })))
      }

      // Close reaction popups
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isNotificationDropdownOpen, isLogoutModalOpen, isImageModalOpen, isSidebarExpanded, closeImageModal])

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
  const renderComments = (post) => {
    if (!post.isCommentsOpen) return null

    return (
      <div style={styles.commentsSection}>
        {/* Comment Input */}
        <div style={styles.commentForm}>
          <div style={styles.commentAvatar}>
            <img
              src="/Images/logo1.png"
              alt="Your avatar"
              style={{ width: "100%", height: "100%", borderRadius: "50%" }}
            />
          </div>
<div style={{ ...styles.commentInputContainer, position: "relative" }}>
  <input
    id={`comment-input-${post.id}`}
    type="text"
    value={commentInputs[post.id] || ""}
    onChange={(e) =>
      setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
    }
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        addComment(post.id, commentInputs[post.id] || "");
        setCommentInputs((prev) => ({ ...prev, [post.id]: "" }));
      }
    }}
    style={{
      width: "calc(100% - 44px)", // leaves space for the Send button
      padding: "8px 12px",
      borderRadius: "18px",
      border: "1px solid #ddd",
      fontSize: "14px",
      boxSizing: "border-box",
    }}
  />

  <button
    style={{
      position: "absolute",
      right: "4px",
      top: "50%",
      transform: "translateY(-50%)",
      background: "none",
      border: "none",
      cursor: "pointer",
      color: "#1877f2",
      width: "36px",
      height: "36px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
    onClick={() => {
      addComment(post.id, commentInputs[post.id] || "");
      setCommentInputs((prev) => ({ ...prev, [post.id]: "" }));
    }}
  >
    <Send size={20} /> {/* increase icon size for better visibility */}
  </button>
</div>


        </div>

        {/* Comments List */}
        {post.comments.map((comment) => (
          <div key={comment.id} style={styles.commentItem}>
            <div style={styles.commentAvatar}>
              <img
                src={`/ceholder-svg-key-xcfob-key-is66r-height-32-width-3.png?key=xcfob&key=is66r&height=32&width=32&text=${comment.author.charAt(0)}`}
                alt={`${comment.author} avatar`}
                style={{ width: "100%", height: "100%", borderRadius: "50%" }}
              />
            </div>
            <div style={styles.commentContent}>
              <div style={styles.commentAuthor}>{comment.author}</div>
              <div style={styles.commentText}>{comment.text}</div>
              <div style={styles.commentDate}>{formatTimeAgo(comment.timestamp)}</div>

              {/* Reply Button */}
              <button
                style={{
                  marginTop: "8px",
                  background: "none",
                  border: "none",
                  color: "#65676b",
                  fontSize: "12px",
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  fontWeight: "600",
                }}
                onClick={() => toggleReply(post.id, comment.id)}
              >
                Reply
              </button>

              {/* Reply Input */}
              {replyingTo?.postId === post.id && replyingTo?.commentId === comment.id && (
                <div
                  style={{
                    display: "flex",
                    marginTop: "10px",
                    gap: "8px",
                    alignItems: "center",
                    paddingLeft: "12px",
                  }}
                >
                  <div style={styles.commentInputContainer}>
                    <input
                      id={`reply-input-${comment.id}`}
                      type="text"
                      placeholder="Write a reply..."
                      style={styles.commentInput}
                      value={replyInputs[comment.id] || ""}
                      onChange={(e) => setReplyInputs((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          const text = e.target.value
                          addComment(post.id, text)
                          setCommentInputs((prev) => ({ ...prev, [post.id]: "" }))
                        }
                      }}
                    />
                    <button
                      style={{
                        position: "absolute",
                        right: "8px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "#4267B2",
                        cursor: "pointer",
                        padding: "4px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      onClick={() => {
                        addReply(post.id, comment.id, replyInputs[comment.id] || "")
                        setReplyInputs((prev) => ({ ...prev, [comment.id]: "" }))
                      }}
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              )}

              {comment.replies?.map((reply) => (
                <div
                  key={reply.id}
                  style={{
                    marginLeft: "40px",
                    marginTop: "8px",
                    borderLeft: "2px solid #e4e6ea",
                    paddingLeft: "12px",
                  }}
                >
                  <div style={styles.commentAuthor}>{reply.author}</div>
                  <div style={styles.commentText}>{reply.text}</div>
                  <div style={styles.commentDate}>{formatTimeAgo(reply.timestamp)}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const toggleDropdown = (postId) => {
    setShowDropdown((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }))
  }

  const toggleEdit = (postId) => {
    setIsEditingPost(postId)
  }

  const togglePostExpansion = useCallback((postId) => {
    setExpandedPosts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })
  }, [])

  const toggleLike = (postId) => {
    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id === postId) {
          return { ...post, isLiked: !post.isLiked, likes: post.isLiked ? post.likes - 1 : post.likes + 1 }
        }
        return post
      }),
    )
  }

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

.main-content {

  flex: 1;
  display: flex;
  flex-direction: column;
  width: calc(100% - 250px);
}

.headers {
  background: white;
  padding: 10px 24px;
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
          padding: 24px;
          background: #f5f5f5;
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
  background: #f5f5f5;
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
  .detail-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
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
 
  .main-content {
    margin-left: 0;
    width: 100%;
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

/*.reply-submit:hover {
  background-color: rgba(24, 119, 242, 0.1);
}*/

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
.dashboard-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          background: transparent;
          
        }
.announcement-title {
          font-size: 22px;
          font-weight: bold;
          color: #da2424ff;
        }

      `}</style>

      <div className="sidebars" id="sidebar">
        <Sidebar isOpen={isSidebarsOpen} />
      </div>
      <div className="main-content">
        <header className="headers">
          <div className="dashboard-container">
            <h2 className="announcement-title">Announcement</h2>
          </div>
          {/* 🔔 Notification Bell */}
          <button style={styles.notificationBtn} onClick={() => setNotifsOpen(!notifsOpen)}>
            <Bell size={24} color="#374151" />
            {notifications.length > 0 && <span style={styles.badge}>{notifications.length}</span>}
          </button>

          {/* 📩 Notification Modal */}
          <NotificationModal
            isOpen={notifsOpen}
            onClose={() => setNotifsOpen(false)}
            notifications={notifications.map((n) => ({
              message: n.message,
              date: n.date,
            }))}
          />
        </header>

        <div className="content-areas">
          <div className="profile-section">
            <div className="profile-logo">
              <img src="/Images/logo1.png" alt="CTU Logo" className="logo" />
            </div>

            <div className="profile-details">
              <h1>Cebu City CTU</h1>

              <div className="detail-item">
                <MapPin size={18} style={{ marginRight: "8px" }} />
                <span>M. J. Cuenco Ave, Cebu City</span>
              </div>

              <div className="detail-item">
                <Phone size={18} style={{ marginRight: "8px" }} />
                <span>(032) 256-1234</span>
              </div>

              <div className="detail-item">
                <Mail size={18} style={{ marginRight: "8px" }} />
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
                    rows={3}
                    value={postInputText}
                    onChange={(e) => setPostInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        createPost()
                      }
                    }}
                    ref={postInputRef}
                  />
                  {postErrorMessage && <div className="error-message">{postErrorMessage}</div>}

                  <div
                    className="photo-upload-area"
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
                      handlePhotoSelection(Array.from(e.dataTransfer.files))
                    }}
                  >
                    <Upload size={24} className="upload-icon" />
                    <div className="upload-text">Click to upload photos or drag and drop</div>
                    <div className="upload-subtext">PNG, JPG, GIF up to 10MB each</div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => handlePhotoSelection(Array.from(e.target.files))}
                      ref={photoInputRef}
                    />
                  </div>

                  {selectedPhotos.length > 0 && (
                    <div className="photo-preview-container">
                      {selectedPhotos.map((photo) => (
                        <div className="photo-preview" key={photo.id}>
                          <img src={photo.url || "/Images/logo1.png"} alt="Preview" />
                          <button
                            className="photo-remove"
                            onClick={() => removePhoto(photo.id)}
                            aria-label="Remove photo"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="post-actions-bar">
                    <div className="post-media-controls">
                      <button className="media-btn" onClick={() => photoInputRef.current?.click()}>
                        <Upload size={16} /> Photo
                      </button>
                    </div>
                    <button className="post-btn" onClick={createPost}>
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
                  {posts.map((post) => (
                    <div key={post.id} style={styles.postCard}>
                      {/* Post Header */}
                      <div style={styles.postHeader}>
                        <img src={post.avatar || "/Images/logo1.png"} alt={post.author} style={styles.postAvatar} />
                        <div style={{ flex: 1 }}>
                          <div style={styles.postAuthor}>{post.author}</div>
                          <div style={styles.postDate}>{formatTimeAgo(post.timestamp)}</div>
                        </div>

                        {/* Dropdown menu */}
                        <div style={{ position: "relative" }}>
                          <button
                            onClick={() => toggleDropdown(post.id)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: "6px",
                              borderRadius: "50%",
                              color: "#65676b",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: "36px",
                              height: "36px",
                            }}
                          >
                            <MoreVertical size={20} />
                          </button>

                          {showDropdown[post.id] && (
  <div
    style={{
      position: "absolute",
      top: "100%",
      right: "0",
      backgroundColor: "white",
      border: "1px solid #ddd",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      zIndex: 1000,
      minWidth: "220px",
      padding: "8px 0",
    }}
  >
    {/* Pin Post */}
    <div
  style={{
    padding: "12px 16px",
    fontSize: "14px",
    color: pinnedPosts.has(post.id) ? "#1877f2" : "#65676b",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  }}
  onClick={() => {
    setPinnedPosts((prev) => {
      const updated = new Set(prev);
      if (updated.has(post.id)) {
        updated.delete(post.id);
      } else {
        updated.add(post.id);
      }
      return updated;
    });
    setShowDropdown((prev) => ({ ...prev, [post.id]: false })); // close dropdown
  }}
  onMouseEnter={(e) => (e.target.style.backgroundColor = "#f2f2f2")}
  onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
>
  <Pin size={18} />
  {pinnedPosts.has(post.id) ? "Unpin post" : "Pin post"}
</div>

    {/* Edit Post */}
    <div
      style={{
        padding: "12px 16px",
        fontSize: "14px",
        color: "#65676b",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
      onClick={() => {
        toggleEdit(post.id)
        setShowDropdown((prev) => ({ ...prev, [post.id]: false }))
      }}
      onMouseEnter={(e) => (e.target.style.backgroundColor = "#f2f2f2")}
      onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
    >
      <Edit size={18} />
      Edit post
    </div>

    {/* Delete Post */}
    <div
      style={{
        padding: "12px 16px",
        fontSize: "14px",
        color: "#e53935",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
      onClick={async () => {
        if (window.confirm("Are you sure you want to delete this post?")) {
          try {
            const res = await fetch(
              `http://localhost:8000/api/ctu_vetmed/delete-post/${post.id}/`,
              {
                method: "DELETE",
                credentials: "include",
              }
            );
            if (!res.ok) throw new Error("Failed to delete post");
            setPosts((prev) => prev.filter((p) => p.id !== post.id));
          } catch (err) {
            console.error(err);
            alert("Failed to delete post. Try again.");
          }
        }
      }}
      onMouseEnter={(e) => (e.target.style.backgroundColor = "#fceaea")}
      onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
    >
      <Trash size={18} />
      Delete post
    </div>
  </div>
)}

                        </div>
                      </div>

                      {/* Content */}
                        <div style={styles.postContent}>
                        {isEditingPost === post.id ? (
                          <div>
                            <textarea
                              value={post.content}
                              onChange={(e) => {
                                const updatedPosts = posts.map((p) =>
                                  p.id === post.id ? { ...p, content: e.target.value } : p,
                                )
                                setPosts(updatedPosts)
                              }}
                              style={{
                                width: "100%",
                                minHeight: "80px",
                                padding: "12px",
                                border: "1px solid #ddd",
                                borderRadius: "8px",
                                fontSize: "14px",
                                fontFamily: "inherit",
                                resize: "vertical",
                              }}
                            />
                            <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                              <button
                                style={{
                                  ...styles.actionBtn,
                                  backgroundColor: "#1877f2",
                                  color: "white",
                                  fontWeight: "600",
                                }}
                                onClick={async () => {
                                  try {
                                    const res = await fetch(
                                      `http://localhost:8000/api/ctu_vetmed/edit-post/${post.id}/`,
                                      {
                                        method: "PATCH",
                                        credentials: "include",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ announce_content: post.content }),
                                      },
                                    )
                                    if (!res.ok) throw new Error("Failed to save post")
                                    const updatedPosts = posts.map((p) =>
                                      p.id === post.id ? { ...p, isEditing: false } : p,
                                    )
                                    setPosts(updatedPosts)
                                    setIsEditingPost(null)
                                  } catch (err) {
                                    console.error(err)
                                    alert("Failed to save post. Try again.")
                                  }
                                }}
                              >
                                Save
                              </button>
                              <button
                                style={{
                                  ...styles.actionBtn,
                                  backgroundColor: "#f0f2f5",
                                  color: "#65676b",
                                }}
                                onClick={() => setIsEditingPost(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div
                              style={{
                                lineHeight: "1.5",
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                                fontSize: "15px",
                                color: "#050505",
                              }}
                            >
                              {(() => {
                                const isExpanded = expandedPosts.has(post.id)
                                const shouldTruncate = post.content.length > 300

                                if (!shouldTruncate || isExpanded) {
                                  return post.content
                                }

                                return post.content.substring(0, 300) + "..."
                              })()}
                            </div>

                            {post.content.length > 300 && (
                              <button
                                onClick={() => togglePostExpansion(post.id)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#1877f2",
                                  cursor: "pointer",
                                  fontSize: "14px",
                                  fontWeight: "600",
                                  marginTop: "8px",
                                  padding: "4px 0",
                                }}
                              >
                                {expandedPosts.has(post.id) ? "See less" : "See more"}
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Post Actions */}
                        <div style={styles.postActions}>
                        

                        <button
                          style={{
                            ...styles.actionButton,
                            color: post.isCommentsOpen ? "#1877f2" : "#65676b",
                          }}
                          onClick={() => toggleComments(post.id)}
                        >
                          <MessageCircle size={16} />
                          <span>Comment</span>
                          {post.comments && post.comments.length > 0 && <span>({post.comments.length})</span>}
                        </button>

                      </div>

                      {/* Images */}
                      {renderPostImages(post.photos)}

                      {/* Comments */}
                      {renderComments(post)}
                    </div>
                    ))}
                   </div>
                  )}
                </div>
              )}
        </div>
    </div>

      <FloatingMessages />

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

export default CTUAnnouncement
