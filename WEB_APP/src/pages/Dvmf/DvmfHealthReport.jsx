"use client"

import Sidebar from "@/components/DvmfSidebar";
import jsPDF from "jspdf";
import { Bell, Calendar, Download, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [dataError, setDataError] = useState(null)
  
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
      <div className="w-full">
        <div className="min-w-[600px]">
          <div className="relative h-80 mt-8">
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

  // Data validation and fixing function
  const validateAndFixData = useCallback((data) => {
    if (!data || !Array.isArray(data)) return data;
    
    return data.map(item => {
      // Ensure all required fields exist and are numbers
      const healthy = Number(item.healthy) || 0;
      const sick = Number(item.sick) || 0;
      const deceased = Number(item.deceased) || 0;
      
      // Calculate total (should match healthy + sick + deceased)
      const calculatedTotal = healthy + sick + deceased;
      
      // Use the provided total if it exists and is reasonable
      const total = (item.total && Math.abs(item.total - calculatedTotal) <= 5) 
        ? item.total 
        : calculatedTotal;
      
      return {
        ...item,
        healthy,
        sick,
        deceased,
        total
      };
    });
  }, [])

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

  // Data consistency verification
  const verifyDataConsistency = useCallback((monthlyData, statistics) => {
    if (!monthlyData || monthlyData.length === 0) return;
    
    const calculatedHealthy = monthlyData.reduce((sum, month) => sum + (month.healthy || 0), 0);
    const calculatedSick = monthlyData.reduce((sum, month) => sum + (month.sick || 0), 0);
    const calculatedDeceased = monthlyData.reduce((sum, month) => sum + (month.deceased || 0), 0);
    
    console.log("Data Consistency Check:");
    console.log("From monthly data - Healthy:", calculatedHealthy, "Sick:", calculatedSick, "Deceased:", calculatedDeceased);
    console.log("From statistics - Healthy:", statistics.healthy, "Sick:", statistics.sick, "Deceased:", statistics.deceased);
    
    // Check for discrepancies
    const discrepancies = [];
    if (Math.abs(calculatedHealthy - statistics.healthy) > 1) {
      discrepancies.push(`Healthy count mismatch: monthly sum=${calculatedHealthy}, stats=${statistics.healthy}`);
    }
    if (Math.abs(calculatedSick - statistics.sick) > 1) {
      discrepancies.push(`Sick count mismatch: monthly sum=${calculatedSick}, stats=${statistics.sick}`);
    }
    if (Math.abs(calculatedDeceased - statistics.deceased) > 1) {
      discrepancies.push(`Deceased count mismatch: monthly sum=${calculatedDeceased}, stats=${statistics.deceased}`);
    }
    
    if (discrepancies.length > 0) {
      console.warn("Data inconsistencies found:", discrepancies);
      return false;
    }
    
    return true;
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

 // HANDLE INDIVIDUAL NOTIFICATION CLICK - UPDATED WITH HORSE OPERATOR & KUTSERO
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
  const type = (notification.type || "").toLowerCase();

  // SOS & Emergency Notifications
  if (
    type === "sos_emergency" ||
    message.includes("sos") ||
    message.includes("emergency") ||
    message.includes("reported") ||
    message.includes("urgent") ||
    (message.includes("horse") && 
     (message.includes("colic") || 
      message.includes("injured") || 
      message.includes("trauma")))
  ) {
    let sosId = null;
    if (notification.related_id && notification.related_id.startsWith("sos_")) {
      sosId = notification.related_id.replace("sos_", "");
    }

    navigate("/DvmfDashboard", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        sosId: sosId,
      },
    });
    return;
  }

  // VETERINARIAN Account Approvals
  if (
    message.includes("veterinarian") && 
    (message.includes("registration") ||
     message.includes("approved") ||
     message.includes("declined") ||
     message.includes("pending") ||
     message.includes("needs approval"))
  ) {
    navigate("/DvmfAccountApproval", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        tab: "veterinarian", // ADDED: Specify veterinarian tab
      },
    });
    return;
  }

  // HORSE OPERATOR Account Approvals - NEW
  if (
    message.includes("horse-operator") ||
    message.includes("horse operator") ||
    (message.includes("horse") && message.includes("operator") && 
     (message.includes("registration") || 
      message.includes("approved") || 
      message.includes("declined") || 
      message.includes("pending")))
  ) {
    navigate("/DvmfAccountApproval", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        tab: "horse-operator", // ADDED: Specify horse-operator tab
      },
    });
    return;
  }

  // KUTSERO Account Approvals - NEW
  if (
    message.includes("kutsero") ||
    (message.includes("registration") && message.includes("kutsero")) ||
    (message.includes("kutsero") && 
     (message.includes("approved") || 
      message.includes("declined") || 
      message.includes("pending")))
  ) {
    navigate("/DvmfAccountApproval", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        tab: "kutsero", // ADDED: Specify kutsero tab
      },
    });
    return;
  }

  // GENERAL REGISTRATION (catch-all for any registration type)
  if (
    message.includes("new registration") ||
    message.includes("needs approval") ||
    (message.includes("registration") && 
     (message.includes("approved") || 
      message.includes("declined") || 
      message.includes("pending")))
  ) {
    navigate("/DvmfAccountApproval", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
      },
    });
    return;
  }

  // MEDICAL RECORD ACCESS REQUESTS
  if (
    message.includes("medical record") ||
    message.includes("medical access") ||
    message.includes("requested access") ||
    message.includes("medrec") ||
    (message.includes("record") && message.includes("access"))
  ) {
    navigate("/DvmfDashboard", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        section: "medical-records", // Optional: specify section
      },
    });
    return;
  }

  // COMMENT NOTIFICATIONS
  if (message.includes("comment") || type === "comment") {
    navigate("/DvmfAnnouncement", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
      },
    });
    return;
  }

  // APPOINTMENT NOTIFICATIONS (if you have them)
  if (
    message.includes("appointment") ||
    message.includes("schedule") ||
    type.includes("appointment")
  ) {
    navigate("/DvmfDashboard", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
        section: "appointments",
      },
    });
    return;
  }

  // DEFAULT: Go to dashboard for other notifications
  console.log("Notification clicked - navigating to dashboard:", notification);
  navigate("/DvmfDashboard", {
    state: {
      highlightedNotification: notification,
      shouldHighlight: true,
    },
  });
};

  // Handle notifications update from modal
  const handleNotificationsUpdate = (updatedNotifications) => {
    console.log("Notifications updated from modal:", updatedNotifications);
    console.log("New unread count:", updatedNotifications.filter(n => !n.read).length);
    setNotifications(updatedNotifications);
  };

  const loadNotifications = useCallback(() => {
    console.log("Loading notifications...")

    return fetch(`${API_BASE}/get_vetnotifications/`)
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
        return formatted
      })
      .catch((err) => {
        console.error("Failed to fetch notifications:", err)
        throw err
      })
  }, [])

  // Load statistics with date validation - UPDATED
  const loadStatistics = useCallback(() => {
    if (!validateDates()) return;

    setStatsLoading(true);
    setChartLoading(true);
    
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);

    console.log("Loading statistics with params:", params.toString())

    return Promise.all([
      fetch(`http://localhost:8000/api/dvmf/get_horse_statistics/?${params}`)
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch monthly statistics");
          return res.json();
        }),
      fetch(`http://localhost:8000/api/dvmf/get_statistics_summary/?${params}`)
        .then(res => {
          if (!res.ok) {
            console.warn("Failed to fetch summary, will calculate from monthly data");
            return null;
          }
          return res.json();
        })
    ])
      .then(([monthlyData, summaryData]) => {
        console.log("Monthly data received:", monthlyData);
        console.log("Summary data received:", summaryData);
        
        // Validate and fix monthly data
        const validatedMonthlyData = validateAndFixData(monthlyData);
        
        // Use summary data if available, otherwise calculate from monthly data
        let healthy, sick, deceased;
        
        if (summaryData) {
          healthy = summaryData.healthy || 0;
          sick = summaryData.sick || 0;
          deceased = summaryData.deceased || 0;
        } else {
          // Calculate from monthly data
          healthy = validatedMonthlyData.reduce((sum, month) => sum + (month.healthy || 0), 0);
          sick = validatedMonthlyData.reduce((sum, month) => sum + (month.sick || 0), 0);
          deceased = validatedMonthlyData.reduce((sum, month) => sum + (month.deceased || 0), 0);
        }
        
        setStatistics({
          healthy,
          sick,
          deceased,
        });
        
        setMonthlyData(validatedMonthlyData);
        
        // Verify data consistency
        verifyDataConsistency(validatedMonthlyData, { healthy, sick, deceased });
        
        setStatsLoading(false);
        setChartLoading(false);
        
        return { validatedMonthlyData, statistics: { healthy, sick, deceased } };
      })
      .catch((err) => {
        console.error("Failed to fetch statistics:", err);
        setDataError("Failed to load statistics data. Please try again.");
        setStatsLoading(false);
        setChartLoading(false);
        throw err;
      });
  }, [dateFrom, dateTo, validateAndFixData, verifyDataConsistency])

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
    setDataError(null)

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
        setDataError("Refresh failed. Please try again.")
      })
  }, [loadStatistics, loadNotifications])

  // Helper: load image to data URL
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

  // PDF export with monthly health status table - UPDATED
  const handleExport = async () => {
    setExportLoading(true);

    try {
      // Fetch fresh data to ensure accuracy
      const [detailedData, freshStatistics] = await Promise.all([
        fetch(
          `http://localhost:8000/api/dvmf/get_horse_statistics/?export_details=true&date_from=${dateFrom || ''}&date_to=${dateTo || ''}`
        ).then(res => {
          if (!res.ok) throw new Error("Failed to fetch detailed data");
          return res.json();
        }),
        fetch(
          `http://localhost:8000/api/dvmf/get_statistics_summary/?date_from=${dateFrom || ''}&date_to=${dateTo || ''}`
        ).then(res => {
          if (!res.ok) {
            console.warn("Using current statistics for PDF");
            return statistics;
          }
          return res.json();
        }).catch(() => statistics) // Fallback to current state
      ]);

      // Get current user data
      let userName = "Veterinarian"
      try {
        const userResponse = await fetch(`${API_BASE}/get_current_user/`, {
          credentials: "include",
        })
        if (userResponse.ok) {
          const userData = await userResponse.json()
          userName = userData.name || "Veterinarian"
        }
      } catch (userError) {
        console.error("Error fetching user data:", userError)
      }

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // ✅ Load DVMF Logo
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
      pdf.text("Department of Veterinary Medicine and Fisheries", 105, 55, { align: "center" });

      pdf.setLineWidth(0.5);
      pdf.line(15, 60, 195, 60);

      pdf.setFontSize(13);
      pdf.text("Horse Health Reports", 105, 70, { align: "center" });

      // Date range in header if filters are applied
      let dateRangeText = "All Time";
      if (dateFrom || dateTo) {
        dateRangeText = `${dateFrom || "Start"} to ${dateTo || "End"}`;
      }
      pdf.setFontSize(10);
      pdf.text(`Date Range: ${dateRangeText}`, 20, 78);

      const headerDateStr = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      pdf.text(`Generated on: ${headerDateStr}`, 20, 84);

      let yPosition = 95;

      // -------------------- HEALTH STATISTICS --------------------
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Health Statistics", 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      
      // Use fresh statistics for accuracy
      const pdfHealthy = freshStatistics.healthy || statistics.healthy;
      const pdfSick = freshStatistics.sick || statistics.sick;
      const pdfDeceased = freshStatistics.deceased || statistics.deceased;
      
      const stats = [
        { label: "Healthy:", value: pdfHealthy, color: [40, 167, 69] },
        { label: "Sick:", value: pdfSick, color: [253, 126, 20] },
        { label: "Deceased:", value: pdfDeceased, color: [220, 53, 69] },
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

      yPosition += 25;

      // Add total count
      const totalHorses = pdfHealthy + pdfSick + pdfDeceased;
      pdf.setFontSize(11);
      pdf.text(`Total Horses: ${totalHorses}`, 20, yPosition);
      yPosition += 10;

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

      // Use accurate statistics
      const summaryHealthy = freshStatistics.healthy || statistics.healthy;
      const summarySick = freshStatistics.sick || statistics.sick;
      const summaryDeceased = freshStatistics.deceased || statistics.deceased;
      const summaryTotal = summaryHealthy + summarySick + summaryDeceased;

      const hp = summaryTotal ? ((summaryHealthy / summaryTotal) * 100).toFixed(1) : "0.0";
      const sp = summaryTotal ? ((summarySick / summaryTotal) * 100).toFixed(1) : "0.0";
      const dp = summaryTotal ? ((summaryDeceased / summaryTotal) * 100).toFixed(1) : "0.0";

      pdf.text(`Total horses monitored: ${summaryTotal}`, 25, yPosition);
      yPosition += 6;
      pdf.text(`• ${summaryHealthy} horses (${hp}%) are in healthy condition`, 25, yPosition);
      yPosition += 6;
      pdf.text(`• ${summarySick} horses (${sp}%) require medical attention`, 25, yPosition);
      yPosition += 6;
      pdf.text(`• ${summaryDeceased} horses (${dp}%) are deceased`, 25, yPosition);
      yPosition += 15;

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

        yPosition += 20;
      }

     // -------------------- APPROVED BY SECTION --------------------
    // Add space before the approved by section
    yPosition += 10

    // Approved by label - left aligned
    pdf.setFontSize(12)
    pdf.setFont("helvetica", "bold")
    pdf.text("APPROVED BY:", 20, yPosition)
    yPosition += 8

    // User's name - centered above the line
    pdf.setFontSize(11)
    pdf.setFont("helvetica", "bold")
    pdf.setTextColor(0, 0, 0)
    pdf.text(userName, 45, yPosition, { align: "center" })
    yPosition += 4

    // Line for signature - left aligned
    pdf.setDrawColor(0, 0, 0)
    pdf.setLineWidth(0.5)
    pdf.line(20, yPosition, 80, yPosition)

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
    setDataError(null);
    
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

  // Call data consistency check after data loads
  useEffect(() => {
    if (!statsLoading && !chartLoading && monthlyData.length > 0) {
      verifyDataConsistency(monthlyData, statistics);
    }
  }, [statsLoading, chartLoading, monthlyData, statistics, verifyDataConsistency]);

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

  // UPDATED: Dynamic Y-axis scale calculation that handles values up to 100
  const getYAxisScale = useMemo(() => {
    if (monthlyData.length === 0) return { maxValue: 10, steps: [0, 2, 4, 6, 8, 10] }

    // Find the maximum value across all data points
    const maxValue = Math.max(
      ...monthlyData.flatMap((month) => [month.healthy || 0, month.sick || 0, month.deceased || 0])
    )
    
    // Dynamic scaling based on the max value
    let roundedMax
    if (maxValue <= 10) {
      roundedMax = 10
    } else if (maxValue <= 50) {
      roundedMax = Math.ceil(maxValue / 10) * 10
    } else if (maxValue <= 100) {
      roundedMax = Math.ceil(maxValue / 20) * 20
    } else {
      roundedMax = Math.ceil(maxValue / 50) * 50
    }

    // Ensure roundedMax is at least 10 and handle the 100 case specifically
    roundedMax = Math.max(10, roundedMax)
    if (maxValue > 90 && maxValue <= 100) {
      roundedMax = 100
    }

    // Generate steps dynamically
    const steps = []
    const stepCount = 5 // Number of steps on Y-axis
    const stepSize = Math.ceil(roundedMax / stepCount)
    
    for (let i = 0; i <= roundedMax; i += stepSize) {
      steps.push(i)
    }

    // Ensure we don't exceed the roundedMax and include 0
    if (steps[steps.length - 1] > roundedMax) {
      steps.pop()
    }
    if (steps[steps.length - 1] < roundedMax) {
      steps.push(roundedMax)
    }
    if (steps[0] !== 0) {
      steps.unshift(0)
    }

    return { maxValue: roundedMax, steps }
  }, [monthlyData])

  const { maxValue: yAxisMax, steps: yAxisSteps } = getYAxisScale

  const unreadNotificationsCount = notifications.filter(notif => !notif.read).length

  // Calculate percentages for pie chart
  const totalHorses = statistics.healthy + statistics.sick + statistics.deceased;
  const aliveHorses = statistics.healthy + statistics.sick;
  const deceasedPercentage = totalHorses ? ((statistics.deceased / totalHorses) * 100).toFixed(1) : 0;
  const alivePercentage = totalHorses ? ((aliveHorses / totalHorses) * 100).toFixed(1) : 0;

  

  return (
    <div className="font-sans bg-gray-100 flex h-screen overflow-x-hidden w-full m-0 p-0 box-border">
      

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
          {/* Stat Cards Section */}
          <div className="mb-6">
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
          </div>

          {/* Date Range Filter Section */}
          <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6 border border-gray-200 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg lg:text-[18px] font-semibold text-gray-950">
                Date Range Filter
              </h2>
            </div>
            
            <div className="flex gap-4 flex-wrap items-end">
              <div className="flex flex-col flex-1 min-w-[150px]">
                <label className="text-sm text-gray-600 mb-1 font-medium">Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F3D5A] focus:border-transparent"
                />
              </div>
              <div className="flex flex-col flex-1 min-w-[150px]">
                <label className="text-sm text-gray-600 mb-1 font-medium">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0F3D5A] focus:border-transparent"
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
              <div className="text-red-600 text-sm bg-red-50 p-2 rounded border border-red-200 mt-3">
                {dateError}
              </div>
            )}

            {/* Quick Date Range Presets */}
            <div className="flex gap-2 flex-wrap mt-4">
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

          {/* Line Chart and Pie Chart Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            {/* Line Chart - Takes 2/3 of the width */}
            <div 
              ref={chartRef}
              className="bg-white rounded-lg shadow-sm p-4 lg:p-6 border border-gray-200 lg:col-span-2 min-h-[570px] flex flex-col"
            >
              <div className="flex justify-between items-center mb-5 flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <h2 className="text-lg lg:text-[18px] font-semibold text-gray-950">
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

              {/* Line Chart Content with Loading State */}
              {chartLoading ? (
                <ChartSkeleton />
              ) : (
                <>
                  {/* Legend */}
                  <div className="flex gap-5 mb-10 justify-center flex-wrap">
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

                  {/* ✅ FIXED: Horizontal scrollable chart container */}
                  <div className="flex-1 overflow-hidden flex flex-col">
                    {/* Chart wrapper with horizontal scroll */}
                    <div className=" pb-3 flex-1">
                      <div className="min-w-[700px] h-full mt-20">
                        <div className="relative h-full">
                          {/* Y-axis title */}
                          <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-15 -rotate-90 text-xs font-medium text-gray-600 whitespace-nowrap z-10">
                            Total Number of Health Status
                          </div>

                          {/* Y-axis labels */}
                          <div className="absolute left-8 top-0 bottom-0 w-8 z-10">
                            {yAxisSteps.map((value) => {
                              const positionFromTop = 300 - (value / yAxisMax) * 300
                              return (
                                <div
                                  key={value}
                                  className="text-right pr-1 text-xs text-gray-500 absolute bg-white"
                                  style={{
                                    top: `${positionFromTop}px`,
                                    transform: 'translateY(-50%)',
                                    width: '100%'
                                  }}
                                >
                                  {value}
                                </div>
                              )
                            })}
                          </div>

                          {/* Chart area */}
                          <div className="ml-16 pl-2 h-[300px] flex items-end justify-start px-0 border-b border-l border-gray-300 relative min-w-[500px]">
                            {monthlyData.length > 0 && (
                              <>
                                <svg
                                  width={`${Math.max(500, monthlyData.length * 70)}px`}
                                  height="300px"
                                  className="absolute top-0 left-0"
                                  style={{ marginLeft: "20px" }}
                                >
                                  {/* Grid lines */}
                                  {yAxisSteps.map((value) => {
                                    const y = 300 - (value / yAxisMax) * 300
                                    return (
                                      <line
                                        key={value}
                                        x1="0"
                                        y1={y}
                                        x2={monthlyData.length > 1 ? (monthlyData.length - 1) * 70 : 500}
                                        y2={y}
                                        stroke="#e5e7eb"
                                        strokeWidth="1"
                                        strokeDasharray="2,2"
                                      />
                                    )
                                  })}

                                  {/* Calculate dynamic spacing */}
                                  {(() => {
                                    const totalWidth = Math.max(500, monthlyData.length * 70)
                                    const spacing = monthlyData.length > 1 ? totalWidth / (monthlyData.length - 1) : 500
                                    
                                    return (
                                      <>
                                        {/* Chart lines */}
                                        <polyline
                                          fill="none"
                                          stroke="#28a745"
                                          strokeWidth="2"
                                          points={monthlyData
                                            .map((month, index) => {
                                              const x = index * spacing
                                              const y = 300 - ((month.healthy || 0) / yAxisMax) * 300
                                              return `${x},${y}`
                                            })
                                            .join(" ")}
                                        />
                                        
                                        <polyline
                                          fill="none"
                                          stroke="#fd7e14"
                                          strokeWidth="2"
                                          points={monthlyData
                                            .map((month, index) => {
                                              const x = index * spacing
                                              const y = 300 - ((month.sick || 0) / yAxisMax) * 300
                                              return `${x},${y}`
                                            })
                                            .join(" ")}
                                        />
                                        
                                        <polyline
                                          fill="none"
                                          stroke="#dc3545"
                                          strokeWidth="2"
                                          points={monthlyData
                                            .map((month, index) => {
                                              const x = index * spacing
                                              const y = 300 - ((month.deceased || 0) / yAxisMax) * 300
                                              return `${x},${y}`
                                            })
                                            .join(" ")}
                                        />

                                        {/* Data points */}
                                        {monthlyData.map((month, index) => {
                                          const x = index * spacing
                                          return (
                                            <g key={index}>
                                              <circle
                                                cx={x}
                                                cy={300 - ((month.healthy || 0) / yAxisMax) * 300}
                                                r="4"
                                                fill="#28a745"
                                                stroke="#ffffff"
                                                strokeWidth="1.5"
                                              />
                                              <circle
                                                cx={x}
                                                cy={300 - ((month.sick || 0) / yAxisMax) * 300}
                                                r="4"
                                                fill="#fd7e14"
                                                stroke="#ffffff"
                                                strokeWidth="1.5"
                                              />
                                              <circle
                                                cx={x}
                                                cy={300 - ((month.deceased || 0) / yAxisMax) * 300}
                                                r="4"
                                                fill="#dc3545"
                                                stroke="#ffffff"
                                                strokeWidth="1.5"
                                              />
                                            </g>
                                          )
                                        })}

                                        {/* Zero baseline */}
                                        <line
                                          x1="0"
                                          y1="300"
                                          x2={totalWidth}
                                          y2="300"
                                          stroke="#6b7280"
                                          strokeWidth="2"
                                          opacity="0.8"
                                        />
                                      </>
                                    )
                                  })()}
                                </svg>

                                {/* Month labels */}
                                <div 
                                  className="absolute -bottom-8 left-0 flex" 
                                  style={{ 
                                    marginLeft: "20px",
                                    width: `${Math.max(500, monthlyData.length * 70)}px`
                                  }}
                                >
                                  {monthlyData.map((monthData, index) => {
                                    const totalWidth = Math.max(500, monthlyData.length * 70)
                                    const spacing = monthlyData.length > 1 ? totalWidth / (monthlyData.length - 1) : 0
                                    const xPosition = index * spacing
                                    
                                    return (
                                      <div 
                                        key={index} 
                                        className="absolute flex flex-col items-center"
                                        style={{ 
                                          left: `${xPosition}px`,
                                          transform: monthlyData.length > 1 && index === monthlyData.length - 1 
                                            ? "translateX(-100%)" 
                                            : index === 0 
                                              ? "translateX(0)" 
                                              : "translateX(-50%)"
                                        }}
                                      >
                                        <div className="text-xs text-gray-600 font-medium text-center whitespace-nowrap">
                                          {String(monthData.month).substring(0, 3)}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </>
                            )}
                            
                            {/* X-axis title */}
                            <div className="absolute -bottom-25 left-1/2 transform -translate-x-1/2 text-xs font-medium text-gray-600 whitespace-nowrap">
                              Months
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Scroll indicator (only shows when needed) */}
                    {monthlyData.length > 10 && (
                      <div className="text-xs text-gray-400 text-center mt-2 pt-2 border-t border-gray-200">
                        Scroll horizontally to view all months →
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Radial Percentage Chart - Takes 1/3 of the width (Deceased Horses Only) */}
            <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6 border border-gray-200">
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-lg lg:text-[18px] font-semibold text-gray-950">
                  Deceased Horses Overview
                </h2>
              </div>

              {chartLoading ? (
                <div className="animate-pulse">
                  <div className="h-64 w-64 rounded-full bg-gray-300 mx-auto mb-6"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto"></div>
                    <div className="h-4 bg-gray-300 rounded w-1/2 mx-auto"></div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Radial Percentage Chart Visualization - Deceased vs Alive */}
                  <div className="flex flex-col items-center">
                    <div className="relative w-64 h-64 mt-6">
                      {/* Radial Percentage Chart */}
                      <svg width="256" height="256" viewBox="0 0 256 256" className="transform -rotate-90">
                        {/* Background Circle */}
                        <circle
                          cx="128"
                          cy="128"
                          r="100"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="15"
                          opacity="0.3"
                        />
                        
                        {/* Percentage Ring - Deceased */}
                        {deceasedPercentage > 0 && (
                          <circle
                            cx="128"
                            cy="128"
                            r="100"
                            fill="none"
                            stroke="#dc3545"
                            strokeWidth="15"
                            strokeLinecap="round"
                            strokeDasharray={`${deceasedPercentage * 3.6} 360`}
                            strokeDashoffset="0"
                            className="animate-dash"
                          />
                        )}
                        
                        {/* Inner Circle for Stats */}
                        <circle
                          cx="128"
                          cy="128"
                          r="70"
                          fill="#f8f9fa"
                        />
                        
                        {/* Percentage text inside the circle */}
                        <text
                          x="128"
                          y="115"
                          textAnchor="middle"
                          className="text-2xl font-bold fill-gray-900"
                          style={{ transform: 'rotate(90deg)', transformOrigin: '128px 128px' }}
                        >
                          {deceasedPercentage}%
                        </text>
                        
                        <text
                          x="128"
                          y="140"
                          textAnchor="middle"
                          className="text-sm fill-gray-600"
                          style={{ transform: 'rotate(90deg)', transformOrigin: '128px 128px' }}
                        >
                          Deceased
                        </text>
                      </svg>
                      
                      {/* Legend Indicators around the circle */}
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        <div className="flex flex-col items-center">
                          <div className="w-4 h-4 bg-red-500 rounded-full mb-1"></div>
                          <div className="text-xs font-medium text-gray-700 whitespace-nowrap">
                            Deceased
                          </div>
                          <div className="text-xs text-gray-600">{statistics.deceased}</div>
                        </div>
                      </div>
                      
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2">
                        <div className="flex flex-col items-center">
                          <div className="w-4 h-4 bg-gray-300 rounded-full mb-1"></div>
                          <div className="text-xs font-medium text-gray-700 whitespace-nowrap">
                            Alive
                          </div>
                          <div className="text-xs text-gray-600">{aliveHorses}</div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Statistics */}
                    <div className="w-full space-y-4">
                      {/* Deceased Horses Detail */}
                      <div className="p-4 bg-red-50 rounded-lg border border-red-100 mt-10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="12" cy="12" r="10" stroke="#dc3545" strokeWidth="2"/>
                                  <path d="M8 8L16 16M16 8L8 16" stroke="#dc3545" strokeWidth="2" strokeLinecap="round"/>
                                </svg>
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-700">Deceased Horses</div>
                              <div className="text-xs text-gray-500">{deceasedPercentage}% of total</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-red-600">{statistics.deceased}</div>
                          </div>
                        </div>
                        
                        {/* Progress bar for percentage visualization */}
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-gray-600 mb-1">
                            <span>0%</span>
                            <span>Deceased: {deceasedPercentage}%</span>
                            <span>100%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-red-500 rounded-full transition-all duration-500"
                              style={{ width: `${deceasedPercentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Alive Horses Detail */}
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="12" cy="12" r="10" stroke="#28a745" strokeWidth="2"/>
                                  <path d="M16 8L10 14L8 12" stroke="#28a745" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-700">Alive Horses</div>
                              <div className="text-xs text-gray-500">{alivePercentage}% of total</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">{aliveHorses}</div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Total Horses */}
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="12" cy="12" r="10" stroke="#0F3D5A" strokeWidth="2"/>
                                  <text x="12" y="16" textAnchor="middle" fontSize="10" fill="#0F3D5A" fontWeight="bold">Σ</text>
                                </svg>
                              </div>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-700">Total Horses</div>
                              <div className="text-xs text-gray-500">All horses in the system</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-[#0F3D5A]">{totalHorses}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Data Table Section */}
          {monthlyData.length > 0 && !chartLoading && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Monthly Health Status Data</h3>
                <p className="text-sm text-gray-500 mt-1">Detailed breakdown of health status by month</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Month
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Total
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Healthy
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Sick
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Deceased
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Healthy %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {monthlyData.map((month, index) => {
                      const healthyPercentage = month.total ? ((month.healthy / month.total) * 100).toFixed(1) : "0.0";
                      return (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {month.month}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-semibold">
                            {month.total}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {month.healthy}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              {month.sick}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              {month.deceased}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                            {healthyPercentage}%
                          </td>
                        </tr>
                      );
                    })}
                    
                    {/* Summary row - Fixed calculations */}
                    {monthlyData.length > 1 && (
                      <tr className="bg-gray-100 border-t border-gray-300">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          Total
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          {(() => {
                            // Calculate from monthly data for accuracy
                            const totalHealthy = monthlyData.reduce((sum, month) => sum + month.healthy, 0);
                            const totalSick = monthlyData.reduce((sum, month) => sum + month.sick, 0);
                            const totalDeceased = monthlyData.reduce((sum, month) => sum + month.deceased, 0);
                            return totalHealthy + totalSick + totalDeceased;
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-700">
                          {monthlyData.reduce((sum, month) => sum + month.healthy, 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-orange-700">
                          {monthlyData.reduce((sum, month) => sum + month.sick, 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-700">
                          {monthlyData.reduce((sum, month) => sum + month.deceased, 0)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                          {(() => {
                            const totalHealthy = monthlyData.reduce((sum, month) => sum + month.healthy, 0);
                            const totalSick = monthlyData.reduce((sum, month) => sum + month.sick, 0);
                            const totalDeceased = monthlyData.reduce((sum, month) => sum + month.deceased, 0);
                            const totalHorses = totalHealthy + totalSick + totalDeceased;
                            return totalHorses ? ((totalHealthy / totalHorses) * 100).toFixed(1) : "0.0";
                          })()}%
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
                <div className="flex justify-between items-center">
                  <div>
                    Showing {monthlyData.length} month{monthlyData.length !== 1 ? 's' : ''} of data
                    {dateFrom && dateTo && (
                      <span className="ml-2">(Filtered: {dateFrom} to {dateTo})</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400">
                    Data verified: {verifyDataConsistency(monthlyData, statistics) ? "✓ Consistent" : "⚠ Check required"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {monthlyData.length === 0 && !isLoading && !chartLoading && (
            <div className="text-center text-gray-500 py-12 bg-gray-50 rounded-lg mt-8">
              <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-600 mb-2">No Data Available</p>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                {dateFrom || dateTo
                  ? "No data found for the selected date range. Try adjusting your filters."
                  : "No health data available in the system."}
              </p>
              {(dateFrom || dateTo) && (
                <button
                  onClick={handleClearFilters}
                  className="mt-4 bg-[#0F3D5A] text-white px-4 py-2 rounded-md text-sm hover:bg-[#0C3148] transition-colors"
                >
                  Clear Date Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <FloatingMessages />
    </div>
  )
}

export default DvmfHealthReport