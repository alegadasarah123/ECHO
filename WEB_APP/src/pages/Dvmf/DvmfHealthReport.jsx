"use client"

import Sidebar from "@/components/DvmfSidebar";
import jsPDF from "jspdf";
import { Bell, Calendar, Download, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import FloatingMessages from './DvmfMessage';
import NotificationModal from "./DvmfNotif";

const API_BASE = "http://localhost:8000/api/dvmf";

function DvmfHealthReport() {
  const navigate = useNavigate()

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)

  const [notifications, setNotifications] = useState([])
  const [statistics, setStatistics] = useState({
    healthy: 0,
    sick: 0,
    deceased: 0,
  })
  const [monthlyData, setMonthlyData] = useState([])
  const [exportLoading, setExportLoading] = useState(false)
  
  // Date filter states with validation
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [dateError, setDateError] = useState("")
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)
  const [chartLoading, setChartLoading] = useState(true)

  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)
  const logoutModalRef = useRef(null)
  const sidebarRef = useRef(null)
  const chartRef = useRef(null)

  // Skeleton Loader Components
  const StatSkeleton = () => (
    <div className="bg-white p-5 rounded-lg shadow-sm text-center animate-pulse">
      <div className="h-10 w-20 bg-gray-300 rounded mx-auto mb-2"></div>
      <div className="h-4 w-24 bg-gray-300 rounded mx-auto"></div>
    </div>
  )

  const ChartSkeleton = () => (
    <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
      <div className="flex justify-between items-center mb-5">
        <div className="h-6 w-40 bg-gray-300 rounded"></div>
        <div className="h-10 w-32 bg-gray-300 rounded"></div>
      </div>
      
      {/* Legend Skeleton */}
      <div className="flex gap-5 mb-5 justify-center">
        {[1, 2, 3].map((item) => (
          <div key={item} className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-300 rounded-sm"></div>
            <div className="h-3 w-12 bg-gray-300 rounded"></div>
          </div>
        ))}
      </div>
      
      {/* Chart Lines Skeleton */}
      <div className="w-full overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="relative h-64 mt-8">
            {/* Y-axis labels skeleton */}
            <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="h-3 w-8 bg-gray-300 rounded ml-auto mr-2"></div>
              ))}
            </div>
            
            {/* Lines skeleton */}
            <div className="ml-10 pl-5 h-full flex items-end justify-start gap-6 px-0 border-b border-l border-gray-300">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="flex flex-col items-center w-12">
                  <div className="h-3 w-8 bg-gray-300 rounded mt-2"></div>
                  <div className="h-3 w-10 bg-gray-300 rounded mt-1"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // Date validation
  const validateDates = () => {
    if (dateFrom && dateTo) {
      const fromDate = new Date(dateFrom)
      const toDate = new Date(dateTo)
      
      if (fromDate > toDate) {
        setDateError("'Date From' cannot be after 'Date To'")
        return false
      }
    }
    setDateError("")
    return true
  }

  const formatTimeAgo = useCallback((timestamp) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - timestamp.getTime()) / (1000 * 60))
    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }, [])

  // MARK ALL NOTIFICATIONS AS READ
  const handleMarkAllAsRead = async () => {
    try {
      const res = await fetch(`${API_BASE}/mark_all_notifications_read/`, {
        method: "POST",
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to mark all as read");
      }
      
      const data = await res.json();
      console.log("Mark all as read result:", data);

      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  // HANDLE INDIVIDUAL NOTIFICATION CLICK
  const handleNotificationClick = async (notification) => {
    const notifId = notification?.notif_id || notification?.id;

    if (!notifId) {
      console.warn("Notification ID is missing:", notification);
    }

    setNotifications((prev) =>
      prev.map((notif) =>
        notif.notif_id === notifId || notif.id === notifId
          ? { ...notif, read: true }
          : notif
      )
    );

    if (notifId) {
      try {
        await fetch(`${API_BASE}/mark_notification_read/${notifId}/`, {
          method: "POST",
          credentials: "include",
        });
      } catch (err) {
        console.error("Error marking notification as read:", err);
      }
    }

    const message = (notification.message || "").toLowerCase();

    if (
      message.includes("new registration") ||
      message.includes("new veterinarian approved") ||
      message.includes("veterinarian approved") ||
      message.includes("veterinarian declined") ||
      message.includes("veterinarian registered") ||
      message.includes("veterinarian pending")
    ) {
      navigate("/DvmfAccountApproval", {
        state: {
          highlightedNotification: notification,
          shouldHighlight: true,
        },
      });
      return;
    }

    if (
      message.includes("pending medical record access") ||
      message.includes("requested access")
    ) {
      navigate("/DvmfAccessRequest", {
        state: {
          highlightedNotification: notification,
          shouldHighlight: true,
        },
      });
      return;
    }

    if (message.includes("comment")) {
      navigate("/DvmfAnnouncement", {
        state: {
          highlightedNotification: notification,
          shouldHighlight: true,
        },
      });
      return;
    }
  };

  // Handle notifications update from modal
  const handleNotificationsUpdate = (updatedNotifications) => {
    console.log("Notifications updated from modal:", updatedNotifications);
    console.log("New unread count:", updatedNotifications.filter(n => !n.read).length);
    setNotifications(updatedNotifications);
  };

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
          type: notif.type || "general"
        }))
        setNotifications(formatted)
      })
      .catch((err) => console.error("Failed to fetch notifications:", err))
  }, [])

  // Load statistics with date validation
  const loadStatistics = useCallback(() => {
    if (!validateDates()) return;

    setStatsLoading(true);
    setChartLoading(true);
    
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);

    fetch(`http://localhost:8000/api/dvmf/get_horse_statistics/?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch statistics")
        return res.json()
      })
      .then((data) => {
        console.log("Monthly data received:", data);
        
        const healthy = data.reduce((sum, month) => sum + month.healthy, 0)
        const sick = data.reduce((sum, month) => sum + month.sick, 0)
        const deceased = data.reduce((sum, month) => sum + month.deceased, 0)
        
        setStatistics({
          healthy,
          sick,
          deceased,
        })
        
        setMonthlyData(data)
        
        setStatsLoading(false);
        setChartLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch statistics:", err)
        setStatsLoading(false);
        setChartLoading(false);
      })
  }, [dateFrom, dateTo])

  // Handle date filter changes with validation
  const handleDateFilterChange = () => {
    if (!validateDates()) return;
    console.log("Date filters changed, reloading data...")
    loadStatistics()
  }

  // Clear date filters with validation reset
  const handleClearFilters = () => {
    setDateFrom("")
    setDateTo("")
    setDateError("")
  }

  // Quick date range presets - FIXED: No loading when choosing dates
  const handleQuickDateRange = (range) => {
    const today = new Date();
    const fromDate = new Date();
    
    switch (range) {
      case 'week':
        fromDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        fromDate.setMonth(today.getMonth() - 1);
        break;
      case 'quarter':
        fromDate.setMonth(today.getMonth() - 3);
        break;
      case 'year':
        fromDate.setFullYear(today.getFullYear() - 1);
        break;
      default:
        return;
    }
    
    // Just set the dates without triggering loading
    setDateFrom(fromDate.toISOString().split('T')[0]);
    setDateTo(today.toISOString().split('T')[0]);
    
    // Clear any existing date error
    setDateError("");
    
    console.log(`Quick date range selected: ${range}`, fromDate.toISOString().split('T')[0], today.toISOString().split('T')[0]);
  }

  const handleRefresh = useCallback(() => {
    console.log("Manual refresh triggered")
    setIsRefreshing(true)
    
    setStatsLoading(true)
    setChartLoading(true)

    Promise.all([loadStatistics(), loadNotifications()])
      .then(() => {
        setIsRefreshing(false)
        console.log("Manual refresh completed")
      })
      .catch((error) => {
        console.error("Error during manual refresh:", error)
        setIsRefreshing(false)
        setStatsLoading(false)
        setChartLoading(false)
      })
  }, [loadStatistics, loadNotifications])

  // PDF export with monthly health status table
  const handleExport = async () => {
    setExportLoading(true);

    // helper: load image path to dataURL (returns null on failure)
    const imageToDataURL = async (url) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch (e) {
        return null;
      }
    };

    try {
      const detailedData = await fetch(
        `http://localhost:8000/api/dvmf/get_horse_statistics/?export_details=true&date_from=${dateFrom || ''}&date_to=${dateTo || ''}`
      ).then((res) => {
        if (!res.ok) throw new Error("Failed to fetch detailed data");
        return res.json();
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // ✅ Load CTU Logo
      const logoLeft = "/Images/dvmf.png";
      const ctuLogo = await imageToDataURL(logoLeft);

      // -------------------- LOGO + TEXT HEADER --------------------
      if (ctuLogo) {
        pdf.addImage(ctuLogo, "PNG", 15, 8, 50, 45); 
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.text("Republic of the Philippines", 105, 15, { align: "center" });

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("DEPARTMENT OF VETERINARY MEDICINE", 105, 23, { align: "center" });
      pdf.text("AND FISHERIES (DVMF)", 105, 28, { align: "center" });

      pdf.setFontSize(12);
      pdf.text("Cebu City", 105, 32, { align: "center" });

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.text(
        "Xiamen Street, Cebu City, Philippines",
        105,
        36,
        { align: "center" }
      );
      pdf.text(
        "Website: https://www.cebucity.gov.ph/dvmf/",
        105,
        41,
        { align: "center" }
      );
      pdf.text("Phone: (032) 401 0418", 105, 46, { align: "center" });

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("Department of Veterinary Medicine and Fisheries Directory", 105, 55, { align: "center" });

      pdf.setLineWidth(0.5);
      pdf.line(15, 60, 195, 60);

      pdf.setFontSize(13);
      pdf.text("Horse Health Reports", 105, 70, { align: "center" });

      // LEFT aligned generated-on
      const headerDateStr = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`Generated on: ${headerDateStr}`, 20, 78);

      let yPosition = 90;

      // -------------------- HEALTH STATISTICS --------------------
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Health Statistics", 20, yPosition);
      yPosition += 15;

      pdf.setFontSize(12);
      const stats = [
        { label: "Healthy:", value: statistics?.healthy ?? 0, color: [40, 167, 69] },
        { label: "Sick:", value: statistics?.sick ?? 0, color: [253, 126, 20] },
        { label: "Deceased:", value: statistics?.deceased ?? 0, color: [220, 53, 69] },
      ];

      stats.forEach((stat, index) => {
        const rowY = yPosition + index * 8;
        if (stat.color) {
          pdf.setFillColor(...stat.color);
          pdf.circle(20, rowY - 1, 1.5, "F");
        }
        pdf.setTextColor(0, 0, 0);
        pdf.text(stat.label, 25, rowY);
        pdf.setTextColor(100, 100, 100);
        pdf.text(String(stat.value), 80, rowY);
      });

      yPosition += 40;

      // -------------------- SICK HORSES DIAGNOSIS --------------------
      if (detailedData?.sick_horses && detailedData.sick_horses.length > 0) {
        pdf.setFontSize(16);
        pdf.text("Sick Horses Diagnosis", 20, yPosition);
        yPosition += 15;

        pdf.setFontSize(11);
        pdf.setTextColor(80, 80, 80);

        for (let i = 0; i < detailedData.sick_horses.length; i++) {
          const horse = detailedData.sick_horses[i];
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 20;
          }
          const diagnosisText = `${horse.horse_name} is sick. Diagnosis: ${horse.diagnosis || 'No diagnosis available'}.`;
          pdf.text(diagnosisText, 25, yPosition);
          yPosition += 8;
        }

        yPosition += 8;
      }

      // -------------------- MONTHLY TREND CHART --------------------
      pdf.setFontSize(16);
      pdf.text("Monthly Health Trend Chart", 20, yPosition);
      yPosition += 12;

      if (monthlyData && monthlyData.length > 0) {
        if (yPosition + 110 > 280) {
          pdf.addPage();
          yPosition = 20;
        }

        const chartX = 30;
        const chartY = yPosition;
        const chartWidth = 150;
        const chartHeight = 75;
        const step = chartWidth / Math.max(1, monthlyData.length - 1);
        const maxVal = Math.max(
          5,
          ...monthlyData.map(m => Math.max(m.healthy ?? 0, m.sick ?? 0, m.deceased ?? 0))
        );

        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.line(chartX, chartY, chartX, chartY + chartHeight);
        pdf.line(chartX, chartY + chartHeight, chartX + chartWidth, chartY + chartHeight);

        pdf.setFontSize(8);
        for (let i = 0; i <= 5; i++) {
          const v = Math.round((maxVal / 5) * i);
          const ty = chartY + chartHeight - (i * (chartHeight / 5));
          pdf.text(String(v), chartX - 6, ty + 2, { align: "right" });
        }

        const series = [
          { key: "healthy", color: [40, 167, 69] },
          { key: "sick", color: [253, 126, 20] },
          { key: "deceased", color: [220, 53, 69] },
        ];

        series.forEach(s => {
          pdf.setDrawColor(...s.color);
          pdf.setLineWidth(1.2);

          let prev = null;
          monthlyData.forEach((m, i) => {
            const x = chartX + step * i;
            const value = m[s.key] ?? 0;
            const yPoint = chartY + chartHeight - (value / maxVal) * chartHeight;

            if (prev) {
              pdf.line(prev.x, prev.y, x, yPoint);
            }
            pdf.setFillColor(...s.color);
            pdf.circle(x, yPoint, 1.8, "F");
            prev = { x, y: yPoint };
          });
        });

        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);
        monthlyData.forEach((m, i) => {
          const x = chartX + step * i;
          pdf.text(String(m.month).substring(0, 3), x - 6, chartY + chartHeight + 6);
        });

        yPosition = chartY + chartHeight + 20;

        let lgX = 30, lgY = yPosition;
        pdf.setFontSize(10);
        pdf.setFillColor(40, 167, 69);
        pdf.rect(lgX, lgY, 4, 4, "F");
        pdf.text("Healthy", lgX + 8, lgY + 3);

        pdf.setFillColor(253, 126, 20);
        pdf.rect(lgX + 40, lgY, 4, 4, "F");
        pdf.text("Sick", lgX + 48, lgY + 3);

        pdf.setFillColor(220, 53, 69);
        pdf.rect(lgX + 80, lgY, 4, 4, "F");
        pdf.text("Deceased", lgX + 88, lgY + 3);

        yPosition += 16;
      }

      // ✅ FORCE SUMMARY TO START ON PAGE 2
      pdf.addPage();
      yPosition = 20;

      // -------------------- SUMMARY --------------------
      pdf.setFontSize(14);
      pdf.text("Summary", 20, yPosition);
      yPosition += 8;

      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);

      const healthy = statistics?.healthy ?? 0;
      const sick = statistics?.sick ?? 0;
      const deceased = statistics?.deceased ?? 0;
      const total = healthy + sick + deceased;

      const hp = total ? ((healthy / total) * 100).toFixed(1) : "0.0";
      const sp = total ? ((sick / total) * 100).toFixed(1) : "0.0";
      const dp = total ? ((deceased / total) * 100).toFixed(1) : "0.0";

      pdf.text(`Total horses monitored: ${total}`, 25, yPosition);
      yPosition += 6;
      pdf.text(`• ${healthy} horses (${hp}%) are in healthy condition`, 25, yPosition);
      yPosition += 6;
      pdf.text(`• ${sick} horses (${sp}%) require medical attention`, 25, yPosition);
      yPosition += 6;
      pdf.text(`• ${deceased} horses (${dp}%) are deceased`, 25, yPosition);
      yPosition += 10;

      // -------------------- MONTHLY SUMMARY TABLE --------------------
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Monthly Health Status Summary", 20, yPosition);
      yPosition += 12;

      if (monthlyData && monthlyData.length > 0) {
        pdf.setFontSize(10);
        pdf.setFillColor(240, 240, 240);
        pdf.rect(20, yPosition, 160, 8, "F");

        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, "bold");
        pdf.text("Month", 22, yPosition + 5);
        pdf.text("Total", 60, yPosition + 5);
        pdf.text("Healthy", 85, yPosition + 5);
        pdf.text("Sick", 110, yPosition + 5);
        pdf.text("Deceased", 135, yPosition + 5);
        pdf.text("Healthy %", 160, yPosition + 5);

        yPosition += 8;
        pdf.setFont(undefined, "normal");

        monthlyData.forEach((m, idx) => {
          if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;

            pdf.setFillColor(240, 240, 240);
            pdf.rect(20, yPosition, 160, 8, "F");
            pdf.setFont(undefined, "bold");
            pdf.text("Month", 22, yPosition + 5);
            pdf.text("Total", 60, yPosition + 5);
            pdf.text("Healthy", 85, yPosition + 5);
            pdf.text("Sick", 110, yPosition + 5);
            pdf.text("Deceased", 135, yPosition + 5);
            pdf.text("Healthy %", 160, yPosition + 5);
            yPosition += 8;
            pdf.setFont(undefined, "normal");
          }

          if (idx % 2 === 0) {
            pdf.setFillColor(250, 250, 250);
            pdf.rect(20, yPosition, 160, 8, "F");
          }

          const healthyPct = m.total ? ((m.healthy / m.total) * 100).toFixed(1) : "0.0";

          pdf.setTextColor(0, 0, 0);
          pdf.text(String(m.month), 22, yPosition + 5);
          pdf.text(String(m.total), 60, yPosition + 5);

          pdf.setTextColor(40, 167, 69);
          pdf.text(String(m.healthy), 85, yPosition + 5);

          pdf.setTextColor(253, 126, 20);
          pdf.text(String(m.sick), 110, yPosition + 5);

          pdf.setTextColor(220, 53, 69);
          pdf.text(String(m.deceased), 135, yPosition + 5);

          pdf.setTextColor(0, 0, 0);
          pdf.text(`${healthyPct}%`, 160, yPosition + 5);

          yPosition += 8;
        });

        yPosition += 12;
      }

      // ✅ FOOTER + PAGE NUMBERS
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setTextColor(130, 130, 130);
        pdf.text(`Page ${i} of ${totalPages}`, 105, 290, { align: "center" });
      }

      const date = new Date().toISOString().split("T")[0];
      const filename = dateFrom || dateTo
        ? `health-report-${dateFrom || 'start'}-to-${dateTo || 'end'}-${date}.pdf`
        : `health-report-${date}.pdf`;

      pdf.save(filename);

    } catch (err) {
      console.error("Error exporting PDF:", err);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  const handleStatCardClick = (statType, count) => {
    console.log(`Clicked on ${statType}: ${count}`)
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
    localStorage.removeItem("currentUser")
    localStorage.removeItem("loginTime")
    closeLogoutModal()
    navigate("/")
    window.location.reload()
  }

  const loadAllData = useCallback(() => {
    setIsLoading(true);
    Promise.all([loadStatistics(), loadNotifications()])
      .then(() => {
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Error loading data:", error);
        setIsLoading(false);
      });
  }, [loadStatistics, loadNotifications]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isNotificationDropdownOpen && !event.target.closest(".notification-dropdown")) {
        setIsNotificationDropdownOpen(false)
      }
      if (isLogoutModalOpen && !event.target.closest(".logout-modal")) {
        closeLogoutModal()
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isNotificationDropdownOpen, isLogoutModalOpen])

  // Calculate Y-axis scale - FIXED: Ensure 0 is always included
  const getYAxisScale = () => {
    if (monthlyData.length === 0) return { maxValue: 10, steps: [0, 2, 4, 6, 8, 10] };
    
    const maxValue = Math.max(...monthlyData.map(month => Math.max(month.healthy, month.sick, month.deceased)));
    const roundedMax = Math.max(5, Math.ceil(maxValue / 5) * 5);
    
    const steps = [];
    const stepSize = Math.ceil(roundedMax / 5);
    for (let i = 0; i <= roundedMax; i += stepSize) {
      steps.push(i);
    }
    
    // Ensure 0 is always included
    if (steps[0] !== 0) {
      steps.unshift(0);
    }
    
    return { maxValue: roundedMax, steps };
  };

  const { maxValue: yAxisMax, steps: yAxisSteps } = getYAxisScale();

  const unreadNotificationsCount = notifications.filter(notif => !notif.read).length

  return (
    <div className="font-sans bg-gray-100 flex h-screen overflow-x-hidden w-full m-0 p-0 box-border">
      {isLoading && (
        <div className="fixed top-0 left-0 w-full h-full bg-white/90 flex flex-col items-center justify-center z-[9999]">
          <div className="text-6xl animate-pulse"></div>
          <div className="mt-4 text-lg font-bold text-black">Loading Health Report...</div>
        </div>
      )}

      <div className="sidebars" id="sidebars">
        <Sidebar isOpen={isSidebarOpen} ref={sidebarRef} />
      </div>

      <div className="flex-1 flex flex-col w-full lg:w-[calc(100%-250px)]">
        <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 px-6 py-4 flex items-center justify-between">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Health Reports</h2>
          
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="cursor-pointer p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Refresh Health Report"
            >
              <RefreshCw 
                className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} 
              />
            </button>

            <button
              ref={notificationBellRef}
              className="relative bg-transparent border-none cursor-pointer p-2 rounded-full hover:bg-gray-100 transition-colors"
              onClick={() => setNotifsOpen(!notifsOpen)}
            >
              <Bell size={24} color="#374151" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold min-w-[20px]">
                  {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                </span>
              )}
            </button>
          </div>

          <NotificationModal
            isOpen={notifsOpen}
            onClose={() => setNotifsOpen(false)}
            notifications={notifications}
            onNotificationClick={handleNotificationClick}
            onMarkAllAsRead={handleMarkAllAsRead}
            onNotificationsUpdate={handleNotificationsUpdate}
          />
        </header>

        <div className="flex-1 p-6 bg-gray-100 overflow-y-auto">
          <div className="mb-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-[30px]">
              {statsLoading ? (
                <>
                  <StatSkeleton />
                  <StatSkeleton />
                  <StatSkeleton />
                </>
              ) : (
                <>
                  <div
                    className="bg-white p-5 rounded-lg shadow-sm text-center transition-transform hover:-translate-y-0.5 cursor-pointer border-l-4 border-l-green-500"
                    onClick={() => handleStatCardClick("Healthy", statistics.healthy)}
                  >
                    <div className="text-4xl lg:text-[36px] font-bold text-gray-900 mb-2">
                      {statistics.healthy}
                    </div>
                    <div className="text-sm lg:text-[14px] text-gray-500 font-medium">Healthy</div>
                  </div>

                  <div
                    className="bg-white p-5 rounded-lg shadow-sm text-center transition-transform hover:-translate-y-0.5 cursor-pointer border-l-4 border-l-orange-500"
                    onClick={() => handleStatCardClick("Sick", statistics.sick)}
                  >
                    <div className="text-4xl lg:text-[36px] font-bold text-gray-900 mb-2">
                      {statistics.sick}
                    </div>
                    <div className="text-sm lg:text-[14px] text-gray-500 font-medium">Sick</div>
                  </div>

                  <div
                    className="bg-white p-5 rounded-lg shadow-sm text-center transition-transform hover:-translate-y-0.5 cursor-pointer border-l-4 border-l-red-500"
                    onClick={() => handleStatCardClick("Deceased", statistics.deceased)}
                  >
                    <div className="text-4xl lg:text-[36px] font-bold text-gray-900 mb-2">
                      {statistics.deceased}
                    </div>
                    <div className="text-sm lg:text-[14px] text-gray-500 font-medium">Deceased</div>
                  </div>
                </>
              )}
            </div>

            {/* Line Chart Section */}
            <div 
              ref={chartRef}
              className="bg-white rounded-lg shadow-sm p-4 lg:p-6 border border-gray-200"
            >
              <div className="flex justify-between items-center mb-5 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg lg:text-[18px] font-semibold text-gray-900">
                    Monthly Health Status
                  </h2>
                </div>
                <button
                 className="bg-[#0F3D5A] text-white border-none py-2 px-4 rounded-md text-sm lg:text-[14px] font-medium cursor-pointer transition-colors hover:bg-[#0C3148] min-h-[40px] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  onClick={handleExport}
                  disabled={exportLoading || (statistics.healthy + statistics.sick + statistics.deceased) === 0}
                >
                  {exportLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Download size={16} />
                  )}
                  {exportLoading ? 'Exporting...' : 'Export PDF'}
                </button>
              </div>

              {/* Date Filters with Quick Presets - ALWAYS VISIBLE */}
              <div className="bg-gray-50 p-4 rounded-lg mb-5 border border-gray-200">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-gray-600" />
                    <h3 className="text-sm font-medium text-gray-700">Date Range Filter</h3>
                  </div>
                  
                  <div className="flex gap-4 flex-wrap items-end">
                    <div className="flex flex-col flex-1 min-w-[150px]">
                      <label className="text-sm text-gray-600 mb-1 font-medium">Date From</label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex flex-col flex-1 min-w-[150px]">
                      <label className="text-sm text-gray-600 mb-1 font-medium">Date To</label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleDateFilterChange}
                       className="bg-[#0F3D5A] text-white border-none py-2 px-4 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-[#0C3148] h-[42px] whitespace-nowrap"

                      >
                        Apply Filters
                      </button>
                      <button
                        onClick={handleClearFilters}
                        className="bg-gray-500 text-white border-none py-2 px-4 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-gray-600 h-[42px] whitespace-nowrap"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Date Error Message */}
                  {dateError && (
                    <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200">
                      {dateError}
                    </div>
                  )}

                  {/* Quick Date Range Presets */}
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-sm text-gray-600 font-medium mr-2">Quick ranges:</span>
                    {['week', 'month', 'quarter', 'year'].map((range) => (
                      <button
                        key={range}
                        onClick={() => handleQuickDateRange(range)}
                        className="text-xs bg-white border border-gray-300 text-gray-700 py-1 px-3 rounded hover:bg-gray-50 transition-colors capitalize"
                      >
                        Last {range}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Chart Content with Loading State */}
              {chartLoading ? (
                <ChartSkeleton />
              ) : (
                <>
                  {/* Legend */}
                  <div className="flex gap-5 mb-5 justify-center flex-wrap">
                    <div className="flex items-center gap-2 text-xs lg:text-[12px] text-gray-500 bg-green-50 px-3 py-1 rounded-full">
                      <div className="w-3 h-3 rounded-sm bg-green-500"></div>
                      <span className="font-medium">Healthy</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs lg:text-[12px] text-gray-500 bg-orange-50 px-3 py-1 rounded-full">
                      <div className="w-3 h-3 rounded-sm bg-orange-500"></div>
                      <span className="font-medium">Sick</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs lg:text-[12px] text-gray-500 bg-red-50 px-3 py-1 rounded-full">
                      <div className="w-3 h-3 rounded-sm bg-red-500"></div>
                      <span className="font-medium">Deceased</span>
                    </div>
                  </div>

                  {/* Line Chart */}
                  <div className="w-full overflow-x-auto">
                    <div className="min-w-[600px]">
                      <div className="relative h-64 mt-8">
                        {/* Y-axis labels */}
                        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-500">
                          {yAxisSteps.map((value) => (
                            <div 
                              key={value} 
                              className="text-right pr-2"
                              style={{ 
                                position: 'absolute',
                                right: '0',
                                bottom: `${(value / yAxisMax) * 95}%`,
                                transform: 'translateY(50%)'
                              }}
                            >
                              {value}
                            </div>
                          ))}
                        </div>

                        {/* Chart area */}
                        <div className="ml-10 pl-5 h-full flex items-end justify-start gap-6 px-0 border-b border-l border-gray-300">
                          {monthlyData.length > 0 && (
                            <svg width="100%" height="100%" className="absolute top-0 left-0" style={{ marginLeft: '40px', width: '500px', height: '250px' }}>
                              {/* Healthy line (Green) */}
                              <polyline
                                fill="none"
                                stroke="#28a745"
                                strokeWidth="2"
                                points={monthlyData.map((month, index) => {
                                  const x = index * (500 / Math.max(1, monthlyData.length - 1));
                                  const y = 250 - (month.healthy / yAxisMax) * 230;
                                  return `${x},${y}`;
                                }).join(' ')}
                              />
                              {/* Sick line (Orange) */}
                              <polyline
                                fill="none"
                                stroke="#fd7e14"
                                strokeWidth="2"
                                points={monthlyData.map((month, index) => {
                                  const x = index * (500 / Math.max(1, monthlyData.length - 1));
                                  const y = 250 - (month.sick / yAxisMax) * 230;
                                  return `${x},${y}`;
                                }).join(' ')}
                              />
                              {/* Deceased line (Red) */}
                              <polyline
                                fill="none"
                                stroke="#dc3545"
                                strokeWidth="2"
                                points={monthlyData.map((month, index) => {
                                  const x = index * (500 / Math.max(1, monthlyData.length - 1));
                                  const y = 250 - (month.deceased / yAxisMax) * 230;
                                  return `${x},${y}`;
                                }).join(' ')}
                              />
                              
                              {/* Data points */}
                              {monthlyData.map((month, index) => {
                                const x = index * (500 / Math.max(1, monthlyData.length - 1));
                                return (
                                  <g key={index}>
                                    {/* Healthy point */}
                                    <circle
                                      cx={x}
                                      cy={250 - (month.healthy / yAxisMax) * 230}
                                      r="3"
                                      fill="#28a745"
                                      className="cursor-pointer hover:r-4 transition-all"
                                    />
                                    {/* Sick point */}
                                    <circle
                                      cx={x}
                                      cy={250 - (month.sick / yAxisMax) * 230}
                                      r="3"
                                      fill="#fd7e14"
                                      className="cursor-pointer hover:r-4 transition-all"
                                    />
                                    {/* Deceased point */}
                                    <circle
                                      cx={x}
                                      cy={250 - (month.deceased / yAxisMax) * 230}
                                      r="3"
                                      fill="#dc3545"
                                      className="cursor-pointer hover:r-4 transition-all"
                                    />
                                  </g>
                                );
                              })}

                              {/* Zero baseline */}
                              <line
                                x1="0"
                                y1="250"
                                x2="500"
                                y2="250"
                                stroke="#6b7280"
                                strokeWidth="1"
                                strokeDasharray="2,2"
                                opacity="0.5"
                              />
                            </svg>
                          )}
                          
                          {/* Month labels */}
                          <div className="absolute bottom-0 left-0 right-0 flex justify-start" style={{ marginLeft: '40px', width: '500px' }}>
                            {monthlyData.map((monthData, index) => (
                              <div 
                                key={index} 
                                className="flex flex-col items-center absolute transform -translate-x-1/2"
                                style={{ 
                                  left: `${(index * (500 / Math.max(1, monthlyData.length - 1)))}px`
                                }}
                              >
                                <div className="text-xs text-gray-600 mt-2 font-medium text-center whitespace-nowrap">
                                  {String(monthData.month).substring(0, 3)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {monthlyData.length === 0 && !chartLoading && (
                        <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg">
                          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                          <p className="text-lg font-medium text-gray-600 mb-2">No Data Available</p>
                          <p className="text-sm text-gray-500">
                            {dateFrom || dateTo 
                              ? "No data found for the selected date range. Try adjusting your filters." 
                              : "No health data available in the system."
                            }
                          </p>
                          {(dateFrom || dateTo) && (
                            <button
                              onClick={handleClearFilters}
                              className="mt-3 bg-[#0F3D5A] text-white px-4 py-2 rounded-md text-sm hover:bg-[#0C3148] transition-colors"
                            >
                              Clear Date Filters
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <FloatingMessages />
    </div>
  )
}

export default DvmfHealthReport