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
  RefreshCw,
  Reply,
  Send,
  Upload,
} from "lucide-react"
import NotificationModal from "./CtuNotif"

const API_BASE = "http://127.0.0.1:8000/api/ctu_vetmed"

// Skeleton Loader Component
const PostSkeletonLoader = () => (
  <div className="post-skeleton">
    <div className="skeleton-header">
      <div className="skeleton-avatar"></div>
      <div className="skeleton-user-info">
        <div className="skeleton-text short"></div>
        <div className="skeleton-text shorter"></div>
      </div>
    </div>
    <div className="skeleton-content">
      <div className="skeleton-text medium"></div>
      <div className="skeleton-text long"></div>
      <div className="skeleton-text short"></div>
    </div>
    <div className="skeleton-actions">
      <div className="skeleton-action"></div>
    </div>
  </div>
)

const CtuAnnouncement = () => {
  const navigate = useNavigate()

  // State for sidebar and modals
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [modalImageSrc, setModalImageSrc] = useState("")
  const [isImageModalOpen, setIsImageModalOpen] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [currentPostPhotos, setCurrentPostPhotos] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isSidebarsOpen, setIsSidebarsOpen] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)

  // State for tabs
  const [activeTab, setActiveTab] = useState("information")
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)

  // State for post creation
  const [postInputText, setPostInputText] = useState("")
  const [postErrorMessage, setPostErrorMessage] = useState("")
  const [selectedPhotos, setSelectedPhotos] = useState([])

  // State for posts and notifications
  const [posts, setPosts] = useState([])
  const [notifications, setNotifications] = useState([])

  // State for reply functionality
  const [replyingTo, setReplyingTo] = useState(null)

  // State for edit functionality
  const [editingPostId, setEditingPostId] = useState(null)
  const [editPostText, setEditPostText] = useState("")

  // Add state for editing comments and replies
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingReplyId, setEditingReplyId] = useState(null)
  const [editCommentText, setEditCommentText] = useState("")
  const [editReplyText, setEditReplyText] = useState("")

  // Add loading state for refresh functionality
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoadingPosts, setIsLoadingPosts] = useState(true)
  const [isUserLoading, setIsUserLoading] = useState(true)

  // Refs for click outside functionality and file input
  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)
  const logoutModalRef = useRef(null)
  const imageModalRef = useRef(null)
  const photoUploadAreaRef = useRef(null)
  const photoInputRef = useRef(null)
  const postInputRef = useRef(null)

  const [activeCommentMenu, setActiveCommentMenu] = useState(null)
  const [commentInputs, setCommentInputs] = useState({})
  const [replyInputs, setReplyInputs] = useState({})
  const [showDropdown, setShowDropdown] = useState({})
  const [isEditingPost, setIsEditingPost] = useState(null)

  const [expandedPosts, setExpandedPosts] = useState(new Set())
  const [pinnedPosts, setPinnedPosts] = useState(new Set())

  // Add user state with proper initialization
  const [currentUser, setCurrentUser] = useState({
    id: null,
    name: null,
    avatar: "/Images/logo1.png",
    role: null,
  })

  // Add useEffect to fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      setIsUserLoading(true)
      try {
        const response = await fetch("http://localhost:8000/api/ctu_vetmed/get_current_user/", {
          credentials: "include",
        })

        if (response.ok) {
          const userData = await response.json()
          console.log("[v0] Fetched current user data:", userData)
          setCurrentUser({
            id: userData.id || userData.user_id,
            name: userData.name || userData.username,
            avatar: userData.avatar || "/Images/logo1.png",
            role: userData.role || userData.user_type,
          })
        } else {
          console.warn("[v0] Failed to fetch current user, user may not be logged in")
          // Set a default user state to prevent issues
          setCurrentUser({
            id: null,
            name: null,
            avatar: "/Images/logo1.png",
            role: null,
          })
        }
      } catch (error) {
        console.error("[v0] Error fetching current user:", error)
        // Set a default user state on error too
        setCurrentUser({
          id: null,
          name: null,
          avatar: "/Images/logo1.png",
          role: null,
        })
      } finally {
        setIsUserLoading(false)
      }
    }

    fetchCurrentUser()
  }, [])

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
      width: "160px",
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
      backgroundColor: "#f5f5f5",
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
      gap: "12px",
      marginBottom: "20px",
      alignItems: "flex-start",
    },
    commentInputContainer: {
      flex: "1",
      position: "relative",
      display: "flex",
      alignItems: "center",
      backgroundColor: "#f0f2f5",
      borderRadius: "20px",
      padding: "8px 16px",
      border: "1px solid transparent",
      transition: "border-color 0.2s",
    },
    commentInput: {
      flex: "1",
      border: "none",
      backgroundColor: "transparent",
      fontSize: "14px",
      outline: "none",
      padding: "4px 0",
      color: "#050505",
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
      background: "none",
      border: "none",
      color: "#b91c1c",
      cursor: "pointer",
      padding: "6px",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transition: "background-color 0.2s",
    },
    commentItem: {
      display: "flex",
      gap: "12px",
      marginBottom: "16px",
      position: "relative",
    },
    commentsList: {
      spaceY: "16px",
    },
    commentAvatar: {
      width: "32px",
      height: "32px",
      borderRadius: "50%",
      flexShrink: 0,
    },
    commentContent: {
      flex: "1",
      minWidth: 0,
    },
    commentAuthor: {
      fontWeight: "600",
      fontSize: "13px",
      color: "#050505",
    },
    commentBubble: {
      backgroundColor: "#f0f2f5",
      borderRadius: "18px",
      padding: "12px 16px",
      position: "relative",
    },
    commentHeader: {
      display: "flex",
      alignItems: "center",
      gap: "8px",
      marginBottom: "4px",
    },
    commentTime: {
      fontSize: "11px",
      color: "#65676b",
    },
    commentText: {
      fontSize: "14px",
      color: "#050505",
      lineHeight: "1.4",
      wordBreak: "break-word",
    },
    commentDate: {
      fontSize: "12px",
      color: "#65676b",
      marginTop: "5px",
    },
    commentActions: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      marginTop: "8px",
    },
    commentAction: {
      background: "none",
      border: "none",
      color: "#65676b",
      fontSize: "12px",
      fontWeight: "600",
      cursor: "pointer",
      padding: "4px 8px",
      borderRadius: "4px",
      display: "flex",
      alignItems: "center",
      gap: "4px",
      transition: "all 0.2s",
    },
    commentMenu: {
      position: "absolute",
      top: "100%",
      right: "8px",
      backgroundColor: "white",
      border: "1px solid #ddd",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      zIndex: 1000,
      minWidth: "120px",
    },
    commentMenuItem: {
      width: "100%",
      padding: "8px 12px",
      border: "none",
      background: "none",
      textAlign: "left",
      fontSize: "12px",
      color: "#65676b",
      cursor: "pointer",
      transition: "background-color 0.2s",
    },
    replyInputContainer: {
      display: "flex",
      gap: "12px",
      marginTop: "12px",
      alignItems: "flex-start",
    },
    replyInputWrapper: {
      flex: "1",
      position: "relative",
      display: "flex",
      alignItems: "center",
      backgroundColor: "#f0f2f5",
      borderRadius: "20px",
      padding: "8px 16px",
    },
    replyInput: {
      flex: "1",
      border: "none",
      backgroundColor: "transparent",
      fontSize: "13px",
      outline: "none",
      padding: "4px 0",
      color: "#050505",
    },
    replySubmit: {
      background: "none",
      border: "none",
      color: "#b91c1c",
      cursor: "pointer",
      padding: "4px",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    repliesContainer: {
      marginTop: "12px",
      paddingLeft: "12px",
      borderLeft: "2px solid #e4e6ea",
    },
    replyItem: {
      display: "flex",
      gap: "8px",
      marginBottom: "12px",
    },
    replyBubble: {
      backgroundColor: "#f0f2f5",
      borderRadius: "16px",
      padding: "8px 12px",
      flex: 1,
    },
    notificationBtn: {
      position: "relative",
      background: "transparent",
      border: "none",
      cursor: "pointer",
      padding: "8px",
      borderRadius: "50%",
    },
    seeMoreButton: {
      border: "none",
      background: "none",
      color: "#1877f2",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "600",
      padding: "4px 0",
      marginLeft: "4px",
    },
  }

  // Format display time
  const formatDisplayTime = useCallback((timestamp) => {
    if (!timestamp) return ""

    const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
    const datePart = date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    })

    const timePart = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })

    return `${datePart} at ${timePart}`
  }, [])

  // fetch comments
  const fetchComments = useCallback(async (postId) => {
    if (!postId) {
      console.warn("fetchComments: Missing postId")
      return []
    }

    try {
      const response = await fetch(`http://localhost:8000/api/ctu_vetmed/get_comments/?post_id=${postId}`, {
        credentials: "include",
      })

      if (!response.ok) {
        console.error(`fetchComments failed with status ${response.status}`)
        return []
      }

      const result = await response.json()
      if (!result.data || !Array.isArray(result.data)) {
        console.warn("fetchComments: No comment data returned")
        return []
      }

      // Recursive function to transform API response for frontend
      const transformComments = (comments) => {
        return comments.map((c) => ({
          id: c.id,
          author: c.author || "Unknown User",
          text: c.text || "",
          timestamp: c.timestamp ? new Date(c.timestamp) : new Date(),
          repliedBy: c.repliedBy || null,
          replies: c.replies ? transformComments(c.replies) : [],
        }))
      }

      return transformComments(result.data)
    } catch (error) {
      console.error("Error fetching comments:", error)
      return []
    }
  }, [])

  // MARK ALL NOTIFICATIONS AS READ
  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/mark_all_notifications_read/`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to mark all as read")
      }

      const data = await res.json()
      console.log("Mark all as read result:", data)

      // Update frontend state
      setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })))
    } catch (err) {
      console.error("Error marking all as read:", err)
    }
  }

  // HANDLE INDIVIDUAL NOTIFICATION CLICK
  // HANDLE INDIVIDUAL NOTIFICATION CLICK
const handleNotificationClick = async (notification) => {
  // Mark notification as read in frontend immediately for better UX
  setNotifications(prev => 
    prev.map(notif => 
      notif.id === notification.id ? { ...notif, read: true } : notif
    )
  );

  // Mark notification as read in backend
  try {
    const res = await fetch(`${API_BASE}/mark_notification_read/${notification.id}/`, {
      method: "POST",
      credentials: "include",
    });
    const data = await res.json();
    console.log("Mark notification read result:", data);
  } catch (err) {
    console.error("Error marking notification as read:", err);
  }

  // Handle navigation based on notification content
  console.log('Notification clicked:', notification);
  const message = notification.message.toLowerCase();

  if (
    message.includes("new registration") ||
    message.includes("new veterinarian approved") ||
    message.includes("veterinarian approved") ||
    message.includes("veterinarian declined") ||
    message.includes("veterinarian registered")
  ) {
    console.log("Navigating to Account Approval page");
    navigate("/CtuAccountApproval", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
      },
    });
    return;
  }

  if (message.includes("pending medical record access") || message.includes("requested access")) {
    console.log("Navigating to Access Request page");
    navigate("/CtuAccessRequest", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
      },
    });
    return;
  }

  if (message.includes("emergency") || message.includes("sos") || message.includes("comment")) {
    console.log("Navigating to Announcement page");
    navigate("/CtuAnnouncement", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
      },
    });
    return;
  }

  console.warn("No matching route for notification:", notification);
};

  // Handle notifications update from modal
  const handleNotificationsUpdate = (updatedNotifications) => {
    console.log("Notifications updated from modal:", updatedNotifications)
    console.log("New unread count:", updatedNotifications.filter((n) => !n.read).length)
    setNotifications(updatedNotifications)
  }

  const loadNotifications = useCallback(() => {
    console.log("Loading notifications...")

    fetch(`${API_BASE}/get_vetnotifications/`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch notifications")
        return res.json()
      })
      .then((data) => {
        const formatted = data.map((notif) => ({
          id: notif.id,
          message: notif.message,
          date: notif.date || new Date().toISOString(),
          read: notif.read || false,
          type: notif.type || "general",
        }))
        setNotifications(formatted)
      })
      .catch((err) => console.error("Failed to fetch notifications:", err))
  }, [])

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(() => {
      loadNotifications()
    }, 30000)
    return () => clearInterval(interval)
  }, [loadNotifications])

  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([loadAnnouncements(), loadNotifications()])
      // Force a re-render of all components
      setPosts((prev) => [...prev])
    } catch (error) {
      console.error("Failed to refresh data:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  // Auto-refresh every 30s
  useEffect(() => {
    loadNotifications()
    const interval = setInterval(() => {
      loadNotifications()
    }, 30000)
    return () => clearInterval(interval)
  }, [loadNotifications])

  const handleTabChange = (tabName) => {
    setActiveTab(tabName)
  }

  const handlePhotoSelection = useCallback(
    (files) => {
      files.forEach((file) => {
        if (file.size > 10 * 1024 * 1024) {
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

  // Updated loadAnnouncements to include comments
  const loadAnnouncements = useCallback(async () => {
    setIsLoadingPosts(true)
    try {
      const response = await fetch("http://localhost:8000/api/ctu_vetmed/announcements/", {
        credentials: "include",
      })
      const result = await response.json()

      console.log("Raw announcements:", result)

      if (response.ok && result.data) {
        // Fetch comments for each announcement
        const postsWithComments = await Promise.all(
          result.data.map(async (announcement) => {
            let photos = []

            // Handle announcement images
            if (announcement.announce_img) {
              if (typeof announcement.announce_img === "string") {
                try {
                  const parsed = JSON.parse(announcement.announce_img)
                  if (Array.isArray(parsed)) {
                    photos = parsed.map((url, index) => ({
                      id: `photo-${announcement.announce_id}-${index}`,
                      url: url,
                    }))
                  }
                } catch (e) {
                  if (announcement.announce_img.startsWith("http")) {
                    photos = [
                      {
                        id: `photo-${announcement.announce_id}-0`,
                        url: announcement.announce_img,
                      },
                    ]
                  }
                }
              } else if (Array.isArray(announcement.announce_img)) {
                photos = announcement.announce_img.map((url, index) => ({
                  id: `photo-${announcement.announce_id}-${index}`,
                  url: url,
                }))
              }
            }

            // Normalize title to lowercase for checking
            const title = announcement.announce_title?.toLowerCase() || ""

            const isCTUAnnouncement = title === "ctu announcement" || title.includes("ctu") || title === "ctu vetmed"

            const isDVMFAnnouncement =
              title === "dvmf announcement" ||
              title.includes("dvmf") ||
              title === "department of veterinary medicine and fisheries"

            // Default avatar and author
            let avatar = "/Images/logo1.png"
            let author = "CTU Announcement"

            if (isDVMFAnnouncement) {
              avatar = "/Images/dvmf.png"
              author = "DVMF Announcement"
            }

            // Fetch comments for this announcement
            const comments = await fetchComments(announcement.announce_id)

            return {
              id: announcement.announce_id,
              userId: announcement.user_id, // Added to store user ID
              content: announcement.announce_content,
              photos: photos,
              author: author,
              avatar: avatar,
              timestamp: new Date(announcement.announce_date),
              date: new Date(announcement.announce_date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }),
              comments: comments,
              commentCount: comments.length,
              isCommentsOpen: false,
            }
          }),
        )

        setPosts(postsWithComments)
      }
    } catch (error) {
      console.error("[v0] Error loading announcements:", error)
    } finally {
      setIsLoadingPosts(false)
    }
  }, [fetchComments])

  // -------------------- ADD COMMENT -------------------- //
  const addComment = async (postId, commentText) => {
    try {
      const response = await fetch("http://localhost:8000/api/ctu_vetmed/add_comment/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          announcement_id: postId,
          comment_text: commentText,
        }),
      })

      const data = await response.json()
      console.log("✅ Added comment:", data)

      // Refresh comments after adding
      if (response.ok) {
        await loadAnnouncements()
      }

      return data
    } catch (err) {
      console.error("❌ Error adding comment:", err)
    }
  }

  // -------------------- EDIT COMMENT -------------------- //
  const editComment = async (commentId, newText) => {
    try {
      const response = await fetch(`http://localhost:8000/api/ctu_vetmed/edit_comment/${commentId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ send cookies with JWT token
        body: JSON.JSON.stringify({ comment_text: newText }),
      })

      const text = await response.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        console.error("Server did not return JSON:", text)
        throw new Error("Invalid response from server")
      }

      console.log("✅ Edited comment:", data)

      if (response.ok) {
        await loadAnnouncements()
      }

      return data
    } catch (err) {
      console.error("❌ Error editing comment:", err)
      throw err
    }
  }

  // -------------------- EDIT REPLY -------------------- //
  const editReply = async (replyId, newText) => {
    try {
      const response = await fetch(`http://localhost:8000/api/ctu_vetmed/edit_reply/${replyId}/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ comment_text: newText }),
      })

      const text = await response.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        console.error("Server did not return JSON:", text)
        throw new Error("Invalid response from server")
      }

      console.log("✅ Edited reply:", data)

      if (response.ok) {
        await loadAnnouncements()
      }

      return data
    } catch (err) {
      console.error("❌ Error editing reply:", err)
      throw err
    }
  }

  // -------------------- HANDLE COMMENT SUBMIT -------------------- //
  const handleCommentSubmit = useCallback(
    async (postId) => {
      const commentText = commentInputs[postId]?.trim()
      if (!commentText) {
        showError("Please enter a comment.")
        return
      }

      console.log("Submitting comment for post:", postId, "Text:", commentText)

      await addComment(postId, commentText)

      // Clear input and refresh
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }))
    },
    [commentInputs, showError, loadAnnouncements], // Removed addComment from dependencies
  )

  const createPost = useCallback(async () => {
    const postText = postInputText?.trim() || ""

    if (!postText && selectedPhotos.length === 0) {
      showError("Please enter some text or add photos for your announcement")
      return
    }

    try {
      let imagesBase64 = []
      if (selectedPhotos.length > 0) {
        imagesBase64 = await Promise.all(
          selectedPhotos.map(
            (photo) =>
              new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result)
                reader.onerror = reject
                reader.readAsDataURL(photo.file)
              }),
          ),
        )
      }

      const bodyData = {
        announce_title: "CTU Announcement",
        announce_content: postText,
        announce_img: imagesBase64,
      }

      const res = await fetch("http://localhost:8000/api/ctu_vetmed/create-post/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyData),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Failed to create post")

      const postData = result?.post
      const backendBase = "http://127.0.0.1:8000"

      let imageUrls = []
      if (postData?.announce_img) {
        if (typeof postData.announce_img === "string") {
          try {
            const parsed = JSON.parse(postData.announce_img)
            if (Array.isArray(parsed)) imageUrls = parsed
          } catch {
            imageUrls = [postData.announce_img]
          }
        } else if (Array.isArray(postData.announce_img)) {
          imageUrls = postData.announce_img
        }

        imageUrls = imageUrls
          .filter(Boolean)
          .map((url) => (url.startsWith("http") ? url : `${backendBase}/${url.replace(/^\/+/, "")}`))
      }

      const now = new Date()
      const newPost = {
        id: postData?.announce_id || `temp-${now.getTime()}`,
        title: postData?.announce_title || "CTU Announcement",
        content: postData?.announce_content || postText,
        photos: imageUrls.map((url, idx) => ({
          id: `photo-${now.getTime()}-${idx}`,
          url,
        })),
        author: "CTU Announcement",
        timestamp: now,
        comments: [],
        commentCount: 0,
        isCommentsOpen: false,
        userId: postData?.user_id, // Store userId for ownership checks
      }

      setPosts((prev) => [newPost, ...prev])
      setPostInputText("")
      setSelectedPhotos([])
      hideError()

      // Force refresh announcements
      await loadAnnouncements()
    } catch (error) {
      console.error("Error creating post:", error)
      showError(error.message || "Failed to create post. Please try again.")
    }
  }, [postInputText, selectedPhotos, setPosts, showError, hideError, loadAnnouncements])

  // EDIT POST FUNCTIONS
  const toggleEdit = (postId) => {
    const post = posts.find((p) => p.id === postId)
    setEditingPostId(postId)
    setEditPostText(post?.content || "")
  }

  const cancelEdit = () => {
    setEditingPostId(null)
    setEditPostText("")
  }

  const saveEdit = async (postId) => {
    if (!editPostText.trim()) {
      showError("Please enter some text for your post")
      return
    }

    try {
      const response = await fetch(`http://localhost:8000/api/ctu_vetmed/edit_post/${postId}/`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          announce_content: editPostText,
          user_id: currentUser.id, // Ensure userId is sent
        }),
      })

      const result = await response.json()

      if (response.ok) {
        // Update local state
        setPosts((prevPosts) =>
          prevPosts.map((post) => (post.id === postId ? { ...post, content: editPostText } : post)),
        )
        setEditingPostId(null)
        setEditPostText("")

        // Reload announcements to ensure consistency
        await loadAnnouncements()

        console.log("Post updated successfully:", result)
      } else {
        throw new Error(result.error || "Failed to update post")
      }
    } catch (error) {
      console.error("Error updating post:", error)
      showError(error.message || "Failed to update post. Please try again.")
    }
  }

  // EDIT COMMENT FUNCTIONS
  const toggleEditComment = (commentId, currentText) => {
    setEditingCommentId(commentId)
    setEditCommentText(currentText)
    setActiveCommentMenu(null)
  }

  const cancelEditComment = () => {
    setEditingCommentId(null)
    setEditCommentText("")
  }

  const saveEditComment = async (commentId) => {
    if (!editCommentText.trim()) {
      showError("Please enter some text for your comment")
      return
    }

    try {
      await editComment(commentId, editCommentText)
      setEditingCommentId(null)
      setEditCommentText("")
    } catch (error) {
      console.error("Error updating comment:", error)
      showError(error.message || "Failed to update comment. Please try again.")
    }
  }

  // EDIT REPLY FUNCTIONS
  const toggleEditReply = (replyId, currentText) => {
    setEditingReplyId(replyId)
    setEditReplyText(currentText)
    setActiveCommentMenu(null)
  }

  const cancelEditReply = () => {
    setEditingReplyId(null)
    setEditReplyText("")
  }

  const saveEditReply = async (replyId) => {
    if (!editReplyText.trim()) {
      showError("Please enter some text for your reply")
      return
    }

    try {
      await editReply(replyId, editReplyText)
      setEditingReplyId(null)
      setEditReplyText("")
    } catch (error) {
      console.error("Error updating reply:", error)
      showError(error.message || "Failed to update reply. Please try again.")
    }
  }

  // Updated toggleComments to fetch comments when opened
  const toggleComments = useCallback(
    async (postId) => {
      console.log("Toggling comments for post:", postId)

      setPosts((prevPosts) =>
        prevPosts.map((post) => (post.id === postId ? { ...post, isCommentsOpen: !post.isCommentsOpen } : post)),
      )

      const post = posts.find((p) => p.id === postId)
      if (!post.isCommentsOpen && post.comments.length === 0) {
        try {
          console.log("Fetching comments for post:", postId)
          const comments = await fetchComments(postId)
          console.log("Fetched comments:", comments)

          setPosts((prevPosts) =>
            prevPosts.map((p) => (p.id === postId ? { ...p, comments, commentCount: comments.length } : p)),
          )
        } catch (error) {
          console.error("Error loading comments:", error)
        }
      }

      setTimeout(() => {
        const input = document.querySelector(`#comment-input-${postId}`)
        if (input) input.focus()
      }, 0)
    },
    [posts, fetchComments],
  )

  const openImageModal = useCallback((imageSrc, photos = [], index = 0) => {
    setModalImageSrc(imageSrc)
    setCurrentPostPhotos(photos)
    setCurrentImageIndex(index)
    setIsImageModalOpen(true)
  }, [])

  const closeImageModal = useCallback(() => {
    setIsImageModalOpen(false)
    setModalImageSrc("")
    setCurrentPostPhotos([])
    setCurrentImageIndex(0)
  }, [])

  const goToNextImage = useCallback(() => {
    if (currentPostPhotos.length > 1) {
      const nextIndex = (currentImageIndex + 1) % currentPostPhotos.length
      setCurrentImageIndex(nextIndex)
      setModalImageSrc(currentPostPhotos[nextIndex].url)
    }
  }, [currentImageIndex, currentPostPhotos])

  const goToPrevImage = useCallback(() => {
    if (currentPostPhotos.length > 1) {
      const prevIndex = currentImageIndex === 0 ? currentPostPhotos.length - 1 : currentImageIndex - 1
      setCurrentImageIndex(prevIndex)
      setModalImageSrc(currentPostPhotos[prevIndex].url)
    }
  }, [currentImageIndex, currentPostPhotos])

  // ---------------- Add reply function ----------------
  const addReply = async (postId, commentId, replyText) => {
    if (!replyText.trim()) {
      alert("Reply cannot be empty!")
      return
    }

    const payload = {
      announcement_id: postId,
      parent_comment_id: commentId,
      comment_text: replyText,
    }

    try {
      const res = await fetch(`http://localhost:8000/api/ctu_vetmed/add_reply/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        credentials: "include",
      })

      const data = await res.json()

      if (!res.ok) {
        switch (res.status) {
          case 400:
            alert(data.error || "Missing required fields.")
            break
          case 401:
            alert(data.error || "Unauthorized. Please log in.")
            break
          case 403:
            alert(data.error || "Invalid token.")
            break
          case 404:
            alert(data.error || "Parent comment not found.")
            break
          case 500:
            alert(data.error || "Server error. Please try again later.")
            break
          default:
            alert(data.error || "Unknown error occurred.")
        }
        throw new Error(`Failed to add reply: ${res.status}`)
      }

      console.log("✅ Reply added:", data)

      // Refresh the announcements to show the new reply
      await loadAnnouncements()

      // Clear the reply input
      setReplyInputs((prev) => ({ ...prev, [commentId]: "" }))
      setReplyingTo(null)

      return data
    } catch (error) {
      console.error("Error adding reply:", error)
      alert("Failed to add reply. Check console for details.")
    }
  }

  const toggleReply = useCallback(
    (postId, commentId) => {
      setReplyingTo(replyingTo?.commentId === commentId ? null : { postId, commentId })
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

  // Toggle post expansion for "See More" functionality
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

  // Check if post content is too long and needs "See More"
  const isPostLong = useCallback((content, maxLength = 300) => {
    return content && content.length > maxLength
  }, [])

  // Get truncated content for long posts
  const getTruncatedContent = useCallback((content, maxLength = 300) => {
    if (!content || content.length <= maxLength) return content
    return content.substring(0, maxLength) + "..."
  }, [])

  const isOwner = (postAuthor, postUserId = null) => {
    console.log("[v0] === Ownership Check ===")
    console.log("[v0] Post Author:", postAuthor)
    console.log("[v0] Post User ID:", postUserId)
    console.log("[v0] Current User Name:", currentUser.name)
    console.log("[v0] Current User Role:", currentUser.role)
    console.log("[v0] Current User ID:", currentUser.id)

    // Check if user is logged in and has data
    if (!currentUser.id || !currentUser.name) {
      console.log("[v0] ❌ User not logged in or data missing")
      return false
    }

    // First, check if user IDs match (most reliable)
    if (postUserId && currentUser.id && postUserId === currentUser.id) {
      console.log("[v0] ✅ User ID match - user is owner")
      return true
    }

    // Normalize names for comparison
    const normalizedPostAuthor = (postAuthor || "").trim().toLowerCase()
    const normalizedUserName = (currentUser.name || "").trim().toLowerCase()
    const normalizedUserRole = (currentUser.role || "").trim().toLowerCase()

    console.log("[v0] Normalized Post Author:", normalizedPostAuthor)
    console.log("[v0] Normalized User Name:", normalizedUserName)
    console.log("[v0] Normalized User Role:", normalizedUserRole)

    // Check if post author matches user's name or role
    const isAuthorMatch =
      normalizedPostAuthor === normalizedUserName ||
      normalizedPostAuthor === normalizedUserRole ||
      normalizedPostAuthor.includes(normalizedUserName) ||
      normalizedPostAuthor.includes(normalizedUserRole) ||
      normalizedUserName.includes(normalizedPostAuthor) ||
      normalizedUserRole.includes(normalizedPostAuthor)

    console.log("[v0] Is Author Match:", isAuthorMatch ? "✅ YES" : "❌ NO")

    return isAuthorMatch
  }

  // Debug function for dropdown
  const debugDropdown = (post) => {
    console.log("=== DROPDOWN DEBUG ===")
    console.log("Post Author:", post.author)
    console.log("Post UserID:", post.userId)
    console.log("Current User:", currentUser.name)
    console.log("Current User Role:", currentUser.role)
    console.log("Current User ID:", currentUser.id)
    console.log("Is Owner Check:", isOwner(post.author, post.userId))
    console.log("Editing Post ID:", editingPostId)
    console.log("Show Dropdown:", showDropdown[post.id])
    console.log("======================")
  }

  // Effects for initial data loading
  useEffect(() => {
    loadNotifications()
    loadAnnouncements()
  }, [loadAnnouncements])

  // Effects for click outside and resize
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationBellRef.current &&
        !notificationBellRef.current.contains(event.target) &&
        notificationDropdownRef.current &&
        !notificationDropdownRef.current.contains(event.target)
      ) {
        setIsNotificationDropdownOpen(false)
      }

      if (isLogoutModalOpen && logoutModalRef.current && event.target === logoutModalRef.current) {
        closeLogoutModal()
      }

      if (isImageModalOpen && imageModalRef.current && event.target === imageModalRef.current) {
        closeImageModal()
      }

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
        if (editingPostId) {
          cancelEdit()
        } else if (editingCommentId) {
          cancelEditComment()
        } else if (editingReplyId) {
          cancelEditReply()
        } else {
          closeImageModal()
          closeLogoutModal()
          setIsNotificationDropdownOpen(false)
          setReplyingTo(null)
          setPosts((prevPosts) =>
            prevPosts.map((post) => ({
              ...post,
              isReactionPopupOpen: false,
            })),
          )
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [closeImageModal, editingPostId, editingCommentId, editingReplyId])

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
          <div className="post-image" key={photo.id} onClick={() => openImageModal(photo.url, photos, index)}>
            <img src={photo.url || "/Images/logo1.png"} alt={`Post image ${index + 1}`} />
            {index === 3 && remainingCount > 0 && <div className="more-images-overlay">{`+${remainingCount}`}</div>}
          </div>
        ))}
      </div>
    )
  }

  // Render post content with "See More" functionality
  const renderPostContent = (post) => {
    const isLong = isPostLong(post.content)
    const isExpanded = expandedPosts.has(post.id)

    if (editingPostId === post.id) {
      // EDIT MODE
      return (
        <div style={{ position: "relative" }}>
          <textarea
            className="edit-textarea"
            value={editPostText}
            onChange={(e) => setEditPostText(e.target.value)}
            placeholder="Edit your post..."
          />
          <div className="edit-actions">
            <button className="edit-cancel-btn" onClick={cancelEdit}>
              Cancel
            </button>
            <button className="edit-save-btn" onClick={() => saveEdit(post.id)}>
              Save
            </button>
          </div>
        </div>
      )
    } else {
      // VIEW MODE
      return (
        <div style={styles.postContent}>
          <div
            style={{
              lineHeight: "1.5",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              fontSize: "15px",
              color: "#050505",
            }}
          >
            {isLong && !isExpanded ? getTruncatedContent(post.content) : post.content}
          </div>

          {/* See More / See Less Button */}
          {isLong && (
            <button
              style={{
                ...styles.seeMoreButton,
                background: "none",
                border: "none",
                color: "#1877f2",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                padding: "4px 0",
                marginTop: "8px",
                display: "block",
              }}
              onClick={() => togglePostExpansion(post.id)}
            >
              {isExpanded ? "See Less" : "See More"}
            </button>
          )}
        </div>
      )
    }
  }

  // Render comment content with edit functionality
  const renderCommentContent = (comment) => {
    if (editingCommentId === comment.id) {
      return (
        <div style={{ position: "relative", width: "100%" }}>
          <textarea
            className="edit-textarea"
            value={editCommentText}
            onChange={(e) => setEditCommentText(e.target.value)}
            placeholder="Edit your comment..."
            style={{ width: "100%", minHeight: "60px" }}
          />
          <div className="edit-actions">
            <button className="edit-cancel-btn" onClick={cancelEditComment}>
              Cancel
            </button>
            <button className="edit-save-btn" onClick={() => saveEditComment(comment.id)}>
              Save
            </button>
          </div>
        </div>
      )
    } else {
      return <div style={styles.commentText}>{comment.text}</div>
    }
  }

  // Render reply content with edit functionality
  const renderReplyContent = (reply) => {
    if (editingReplyId === reply.id) {
      return (
        <div style={{ position: "relative", width: "100%" }}>
          <textarea
            className="edit-textarea"
            value={editReplyText}
            onChange={(e) => setEditReplyText(e.target.value)}
            placeholder="Edit your reply..."
            style={{ width: "100%", minHeight: "60px" }}
          />
          <div className="edit-actions">
            <button className="edit-cancel-btn" onClick={cancelEditReply}>
              Cancel
            </button>
            <button className="edit-save-btn" onClick={() => saveEditReply(reply.id)}>
              Save
            </button>
          </div>
        </div>
      )
    } else {
      return <div style={styles.commentText}>{reply.text}</div>
    }
  }

  // Render comments
  const renderComments = (post) => {
    if (!post.isCommentsOpen) return null

    const formatCommentTime = (timestamp) => {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp)

      // Format as "September 12 at 12:00PM"
      const month = date.toLocaleDateString("en-US", { month: "long" })
      const day = date.getDate()
      const time = date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })

      return `${month} ${day} at ${time}`
    }

    return (
      <div style={styles.commentsSection}>
        {/* Comment Input */}
        <div style={styles.commentForm}>
          <div style={styles.commentAvatar}></div>
          <div style={styles.commentInputContainer}>
            <input
              id={`comment-input-${post.id}`}
              type="text"
              placeholder="Write a comment..."
              value={commentInputs[post.id] || ""}
              onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
              onKeyDown={async (e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  if (commentInputs[post.id]?.trim()) {
                    await handleCommentSubmit(post.id)
                  }
                }
              }}
              style={styles.commentInput}
            />
            <button
              style={styles.commentSubmit}
              onClick={() => handleCommentSubmit(post.id)}
              disabled={!commentInputs[post.id]?.trim()}
            >
              <Send size={16} />
            </button>
          </div>
        </div>

        {/* Comments List */}
        <div style={styles.commentsList}>
          {post.comments.length === 0 ? (
            <div style={{ textAlign: "center", color: "#65676b", padding: "20px" }}>
              No comments yet. Be the first to comment!
            </div>
          ) : (
            post.comments.map((comment) => (
              <div key={comment.id} style={styles.commentItem}>
                <div style={styles.commentAvatar}>
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      borderRadius: "50%",
                      backgroundColor: "#e0e0e0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#666",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    {comment.author?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                </div>

                <div style={styles.commentContent}>
                  <div style={styles.commentBubble}>
                    <div style={styles.commentHeader}>
                      <span style={styles.commentAuthor}>{comment.author}</span>
                      <span style={styles.commentTime}>{formatCommentTime(comment.timestamp)}</span>
                    </div>

                    {/* Comment Content with Edit Functionality */}
                    {renderCommentContent(comment)}

                    {/* Comment Actions - Only show when not editing */}
                    {editingCommentId !== comment.id && (
                      <div style={styles.commentActions}>
                        <button style={styles.commentAction} onClick={() => toggleReply(post.id, comment.id)}>
                          <Reply size={14} />
                          Reply
                        </button>

                        {/* Edit Button - ONLY SHOW IF CURRENT USER IS THE OWNER */}
                        {isOwner(comment.author) && (
                          <button
                            style={styles.commentAction}
                            onClick={() => toggleEditComment(comment.id, comment.text)}
                          >
                            <Edit size={14} />
                            Edit
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Reply Input */}
                  {replyingTo?.postId === post.id && replyingTo?.commentId === comment.id && (
                    <div style={styles.replyInputContainer}>
                      <div style={styles.commentAvatar}></div>
                      <div style={styles.replyInputWrapper}>
                        <input
                          id={`reply-input-${comment.id}`}
                          type="text"
                          placeholder="Write a reply..."
                          value={replyInputs[comment.id] || ""}
                          onChange={(e) => setReplyInputs((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault()
                              addReply(post.id, comment.id, replyInputs[comment.id] || "")
                            }
                          }}
                          style={styles.replyInput}
                        />
                        <button
                          style={styles.replySubmit}
                          onClick={() => {
                            addReply(post.id, comment.id, replyInputs[comment.id] || "")
                          }}
                          disabled={!replyInputs[comment.id]?.trim()}
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Replies List */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div style={styles.repliesContainer}>
                      {comment.replies.map((reply) => (
                        <div key={reply.id} style={styles.replyItem}>
                          <div style={styles.commentAvatar}>
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                borderRadius: "50%",
                                backgroundColor: "#e0e0e0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#666",
                                fontSize: "10px",
                                fontWeight: "bold",
                              }}
                            >
                              {reply.author?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                          </div>
                          <div style={styles.replyBubble}>
                            <div style={styles.commentHeader}>
                              <span style={styles.commentAuthor}>{reply.author}</span>
                              <span style={styles.commentTime}>{formatCommentTime(reply.timestamp)}</span>
                            </div>

                            {/* Reply Content with Edit Functionality */}
                            {renderReplyContent(reply)}

                            {/* Reply Actions - Only show when not editing */}
                            {editingReplyId !== reply.id && (
                              <div style={styles.commentActions}>
                                {/* Edit Button for Reply - ONLY SHOW IF CURRENT USER IS THE OWNER */}
                                {isOwner(reply.author) && (
                                  <button
                                    style={styles.commentAction}
                                    onClick={() => toggleEditReply(reply.id, reply.text)}
                                  >
                                    <Edit size={12} />
                                    Edit
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  const toggleDropdown = (postId) => {
    setShowDropdown((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }))
  }

  const getSortedPosts = useCallback(() => {
    const pinned = posts.filter((post) => pinnedPosts.has(post.id))
    const unpinned = posts.filter((post) => !pinnedPosts.has(post.id))

    const sortedPinned = pinned.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    const sortedUnpinned = unpinned.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    return [...sortedPinned, ...sortedUnpinned]
  }, [posts, pinnedPosts])

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
  padding: 18px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 
              0 2px 4px -2px rgba(0, 0, 0, 0.1);
  flex-wrap: wrap;
  gap: 16px;
  position: sticky;
  top: 0;
  z-index: 10;
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
          width: clamp(70px, 8vw, 80px);
          height: clamp(70px, 8vw, 80px);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 2px solid #b91c1c;
          flex-shrink: 0;
        }

        .profile-logo img {
          width: 120px;
          height: 120px;
          object-fit: cover;
          margin-top: 18px;
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
          background: white;
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
          border: 1px solid #ef4444;
          border-radius: 4px;
          padding: 8px;
        }

        .error-message {
          color: #ef4444;
          font-size: 12px;
          margin-top: 4px;
          display: block;
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
          color: #374151;
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
          background: rgba(68, 91, 239, 0.8);
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
          color: white;
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
          color: #b91c1c;
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
          align-items: center;
          justify-content: center;
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
          background: #b91c1c;
          color: white;
        }

        .confirmation-btn.confirm:hover {
          background: #991b1b;
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
          justifyContent: "center";
        }

        .image-modal-close:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        /* Navigation buttons for the image modal */
        .image-nav-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.5);
          color: white;
          border: none;
          font-size: 36px;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 3001;
        }

        .image-nav-btn.image-nav-prev {
          left: 20px;
        }

        .image-nav-btn.image-nav-next {
          right: 20px;
        }

        .image-nav-btn:hover {
          background: rgba(0, 0, 0, 0.7);
        }

        /* Image counter */
        .image-counter {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.5);
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          z-index: 3001;
        }

        /* Edit mode styles */
        .edit-textarea {
          width: 100%;
          min-height: 100px;
          padding: 12px;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          font-size: 15px;
          font-family: inherit;
          resize: vertical;
          outline: none;
        }

        .edit-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
          justify-content: flex-end;
        }

        .edit-cancel-btn {
          padding: 8px 16px;
          border: 1px solid #ddd;
          border-radius: 6px;
          background-color: white;
          color: #65676b;
          cursor: pointer;
          font-size: 14px;
        }

        .edit-cancel-btn:hover {
          background-color: #f5f5f5;
        }

        .edit-save-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          background-color: #1877f2;
          color: white;
          cursor: pointer;
          font-size: 14px;
        }

        .edit-save-btn:hover {
          background-color: #166fe5;
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
          color: black;
        }

        /* Refresh button styles */
        .refresh-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .refresh-btn:hover {
          background: #f0f0f0;
        }
        
        .refresh-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .refresh-btn.loading {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 15px;
        }

        /* Skeleton Loader Styles */
        .post-skeleton {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        .skeleton-header {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
        }

        .skeleton-avatar {
          width: 65px;
          height: 60px;
          border-radius: 50%;
          background: #e5e7eb;
          margin-right: 12px;
        }

        .skeleton-user-info {
          flex: 1;
        }

        .skeleton-text {
          background: #e5e7eb;
          border-radius: 4px;
          margin-bottom: 8px;
          height: 12px;
        }

        .skeleton-text.short {
          width: 60%;
        }

        .skeleton-text.shorter {
          width: 40%;
          height: 10px;
        }

        .skeleton-text.medium {
          width: 80%;
        }

        .skeleton-text.long {
          width: 95%;
        }

        .skeleton-content {
          margin-bottom: 15px;
        }

        .skeleton-actions {
          display: flex;
          padding-top: 15px;
          border-top: 1px solid #e5e7eb;
        }

        .skeleton-action {
          width: 100px;
          height: 20px;
          background: #e5e7eb;
          border-radius: 6px;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .skeleton-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        /* See More Button Styles */
        .see-more-btn {
          background: none;
          border: none;
          color: #1877f2;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          padding: 4px 0;
          marginTop: 8px;
          display: block;
          text-align: left;
        }

        .see-more-btn:hover {
          text-decoration: underline;
        }

        .post-content-expandable {
          line-height: 1.5;
          whiteSpace: "pre-wrap";
          wordBreak: "break-word";
          fontSize: "15px";
          color: "#050505";
        }
      `}</style>

      <div className="sidebars" id="sidebar">
        <Sidebar isOpen={isSidebarsOpen} />
      </div>
      <div className="main-content">
        <header className="headers">
          {/* ADDED HEADER SECTION */}
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-[#b91c1c]">Announcement</h2>
            <p className="text-sm text-gray-600 mt-1 font-normal">
              Share updates, news, and important information with the community
            </p>
          </div>

          <div className="header-actions">
            {/* 🔄 Refresh Icon */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="refresh-btn"
              title="Refresh Announcements"
            >
              <RefreshCw size={24} color="#374151" className={isRefreshing ? "loading" : ""} />
            </button>

            {/* 🔔 Notification Bell (without count) */}
            <button style={styles.notificationBtn} onClick={() => setNotifsOpen(!notifsOpen)}>
              <Bell size={24} color="#374151" />
            </button>
          </div>

          {/* 📩 Notification Modal */}
          <NotificationModal
            isOpen={notifsOpen}
            onClose={() => setNotifsOpen(false)}
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
            onMarkAllAsRead={handleMarkAllAsRead}
          />
        </header>

        <div className="content-areas">
          <div className="profile-section">
            <div className="profile-logo">
              <img src="/Images/logo1.png" alt="CTU Logo" className="logo" />
            </div>

            <div className="profile-details">
              <h1>Cebu City CTU-Vetmed</h1>

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
                <span>cebu.city@ctu.edu.ph</span>
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
                  The College of Technological University Veterinary Medical (CTU) is responsible for ensuring the
                  health and welfare of animals within the city limits, including horses used by kutseros for
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
                  <div className="time">Closed</div>
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
                    <li>Livestock disease management & treatment</li>
                    <li>Equine Infectious Anemia surveillance</li>
                    <li>Livestock disease monitoring & surveillance</li>
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

              {isLoadingPosts ? (
                <div className="skeleton-container">
                  <PostSkeletonLoader />
                  <PostSkeletonLoader />
                  <PostSkeletonLoader />
                </div>
              ) : posts.length === 0 ? (
                <div className="empty-state" id="postsEmptyState">
                  <i className="fas fa-bullhorn"></i>
                  <h3>No announcements yet</h3>
                  <p>Create your first announcement to get started</p>
                </div>
              ) : (
                <div id="postsContainer">
                  {getSortedPosts().map((post) => (
                    <div key={post.id} style={styles.postCard}>
                      {/* Post Header */}
                      <div style={styles.postHeader}>
                        <img src={post.avatar || "/Images/logo1.png"} alt={post.author} style={styles.postAvatar} />
                        <div style={{ flex: 1 }}>
                          <div style={styles.postAuthor}>{post.author}</div>
                          <div style={styles.postDate}>{formatDisplayTime(post.timestamp)}</div>
                        </div>

                        {/* Dropdown menu - ALWAYS SHOW FOR PIN POST, EDIT ONLY FOR OWNER */}
                        <div style={{ position: "relative" }}>
                          <button
                            onClick={() => {
                              toggleDropdown(post.id)
                              debugDropdown(post)
                            }}
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
                              {/* Pin Post - ALWAYS SHOW FOR ALL POSTS */}
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
                                    const updated = new Set(prev)
                                    if (updated.has(post.id)) {
                                      updated.delete(post.id)
                                    } else {
                                      updated.add(post.id)
                                    }
                                    return updated
                                  })
                                  setShowDropdown((prev) => ({ ...prev, [post.id]: false }))
                                }}
                                onMouseEnter={(e) => (e.target.style.backgroundColor = "#f2f2f2")}
                                onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                              >
                                <Pin size={18} />
                                {pinnedPosts.has(post.id) ? "Unpin post" : "Pin post"}
                              </div>

                              {/* Edit Post - Only show if user is owner AND not currently editing */}
                              {isOwner(post.author, post.userId) && editingPostId !== post.id && (
                                <div
                                  style={{
                                    padding: "12px 16px",
                                    fontSize: "14px",
                                    color: "#65676b",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    borderTop: "1px solid #f0f0f0",
                                  }}
                                  onClick={() => {
                                    console.log("Edit clicked for post:", post.id)
                                    console.log("Post author:", post.author)
                                    console.log("Post userId:", post.userId)
                                    toggleEdit(post.id)
                                    setShowDropdown((prev) => ({ ...prev, [post.id]: false }))
                                  }}
                                  onMouseEnter={(e) => (e.target.style.backgroundColor = "#f2f2f2")}
                                  onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
                                >
                                  <Edit size={18} />
                                  Edit post
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Post Content with See More functionality */}
                      {renderPostContent(post)}

                      {/* Images */}
                      {renderPostImages(post.photos)}

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

      {isImageModalOpen && (
        <div className="image-modal active" id="imageModal" ref={imageModalRef}>
          <button className="image-modal-close" onClick={closeImageModal}>
            &times;
          </button>

          {currentPostPhotos.length > 1 && (
            <>
              <button className="image-nav-btn image-nav-prev" onClick={goToPrevImage}>
                &#8249;
              </button>
              <button className="image-nav-btn image-nav-next" onClick={goToNextImage}>
                &#8250;
              </button>

              <div className="image-counter">
                {currentImageIndex + 1} / {currentPostPhotos.length}
              </div>
            </>
          )}

          <img id="modalImage" src={modalImageSrc || "/placeholder.svg"} alt="Full size image" />
        </div>
      )}
    </div>
  )
}

export default CtuAnnouncement
