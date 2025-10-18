"use client"

import Sidebar from "@/components/CtuSidebar"
import jsPDF from "jspdf"
import { Bell, Download } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import FloatingMessages from "./CtuMessage"
import NotificationModal from "./CtuNotif"

const API_BASE = "http://127.0.0.1:8000/api/ctu_vetmed"

function CtuHealthReport() {
  const navigate = useNavigate()

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false)
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false)
  const [notifsOpen, setNotifsOpen] = useState(false)

  const [notifications, setNotifications] = useState([])
  const [statistics, setStatistics] = useState({
    totalHorses: 0,
    healthy: 0,
    sick: 0,
    unhealthy: 0,
  })
  const [monthlyData, setMonthlyData] = useState([])
  const [exportLoading, setExportLoading] = useState(false)

  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)
  const logoutModalRef = useRef(null)
  const sidebarRef = useRef(null)
  const chartRef = useRef(null)

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

      // Update frontend state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

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

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(() => {
      loadNotifications()
    }, 30000)
    return () => clearInterval(interval)
  }, [loadNotifications])

  const loadStatistics = useCallback(() => {
    // Fetch statistics based on horse_status
    fetch("http://127.0.0.1:8000/api/ctu_vetmed/get_horse_statistics/")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch statistics")
        return res.json()
      })
      .then((data) => {
        console.log("Monthly data received:", data); // Debug log
        
        // Calculate totals from monthly data
        const totalHorses = data.reduce((sum, month) => sum + month.total, 0)
        const healthy = data.reduce((sum, month) => sum + month.healthy, 0)
        const sick = data.reduce((sum, month) => sum + month.sick, 0)
        const unhealthy = data.reduce((sum, month) => sum + month.unhealthy, 0)
        
        setStatistics({
          totalHorses,
          healthy,
          sick,
          unhealthy,
        })
        
        // Set monthly data for the chart
        setMonthlyData(data)
      })
      .catch((err) => console.error("Failed to fetch statistics:", err))
  }, [])

  const handleExport = async () => {
    setExportLoading(true);
    
    try {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      let yPosition = 20;

      // Add title
      pdf.setFontSize(20);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Horse Health Report", 20, yPosition);
      yPosition += 15;

      // Add date
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, 20, yPosition);
      yPosition += 20;

      // Add statistics section
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Health Statistics", 20, yPosition);
      yPosition += 15;

      // Statistics table
      pdf.setFontSize(12);
      const stats = [
        { label: "Total Horses:", value: statistics.totalHorses },
        { label: "Healthy:", value: statistics.healthy, color: [40, 167, 69] },
        { label: "Sick:", value: statistics.sick, color: [253, 126, 20] },
        { label: "Unhealthy:", value: statistics.unhealthy, color: [220, 53, 69] },
      ];

      stats.forEach((stat, index) => {
        const x = 20;
        const rowY = yPosition + (index * 8);
        
        if (stat.color) {
          pdf.setFillColor(stat.color[0], stat.color[1], stat.color[2]);
          pdf.circle(x, rowY - 1, 1.5, 'F');
        }
        
        pdf.setTextColor(0, 0, 0);
        pdf.text(stat.label, x + 5, rowY);
        
        pdf.setTextColor(100, 100, 100);
        pdf.text(stat.value.toString(), 80, rowY);
      });

      yPosition += 40;

      // Add monthly bar chart section
      pdf.setFontSize(16);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Monthly Health Status", 20, yPosition);
      yPosition += 15;

      // Create bar chart in PDF
      if (monthlyData.length > 0) {
        const chartWidth = 150;
        const chartHeight = 80;
        const chartX = 30;
        const chartY = yPosition;
        const groupWidth = chartWidth / monthlyData.length * 0.8;
        const barWidth = groupWidth / 3 * 0.8;
        const maxValue = Math.max(...monthlyData.map(m => Math.max(m.healthy, m.sick, m.unhealthy)));

        // Draw axes
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.line(chartX, chartY, chartX, chartY + chartHeight); // Y-axis
        pdf.line(chartX, chartY + chartHeight, chartX + chartWidth, chartY + chartHeight); // X-axis

        // Draw Y-axis labels (0, 5, 10, etc.)
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);
        const ySteps = Math.ceil(maxValue / 5) * 5 || 10; // Round up to nearest 5, minimum 10
        for (let i = 0; i <= 4; i++) {
          const value = Math.round((i / 4) * ySteps);
          const y = chartY + chartHeight - (i / 4) * chartHeight;
          pdf.text(value.toString(), chartX - 8, y + 2);
        }

        // Draw bars for each month
        monthlyData.forEach((monthData, index) => {
          const groupX = chartX + (index * (chartWidth / monthlyData.length)) + (groupWidth * 0.1);
          
          // Calculate bar heights
          const healthyHeight = (monthData.healthy / ySteps) * chartHeight;
          const sickHeight = (monthData.sick / ySteps) * chartHeight;
          const unhealthyHeight = (monthData.unhealthy / ySteps) * chartHeight;

          // Draw bars side by side
          pdf.setFillColor(40, 167, 69); // Green for healthy
          pdf.rect(groupX, chartY + chartHeight - healthyHeight, barWidth, healthyHeight, 'F');
          
          pdf.setFillColor(253, 126, 20); // Orange for sick
          pdf.rect(groupX + barWidth, chartY + chartHeight - sickHeight, barWidth, sickHeight, 'F');
          
          pdf.setFillColor(220, 53, 69); // Red for unhealthy
          pdf.rect(groupX + barWidth * 2, chartY + chartHeight - unhealthyHeight, barWidth, unhealthyHeight, 'F');

          // Month labels
          pdf.setFontSize(8);
          pdf.setTextColor(0, 0, 0);
          pdf.text(monthData.month, groupX + groupWidth/2 - 4, chartY + chartHeight + 5);
        });

        yPosition += chartHeight + 30;

        // Add legend
        const legendX = 30;
        let legendY = yPosition;

        pdf.setFontSize(10);
        pdf.setFillColor(40, 167, 69);
        pdf.rect(legendX, legendY, 4, 4, 'F');
        pdf.setTextColor(0, 0, 0);
        pdf.text("Healthy", legendX + 8, legendY + 3);
        
        pdf.setFillColor(253, 126, 20);
        pdf.rect(legendX + 40, legendY, 4, 4, 'F');
        pdf.text("Sick", legendX + 48, legendY + 3);
        
        pdf.setFillColor(220, 53, 69);
        pdf.rect(legendX + 70, legendY, 4, 4, 'F');
        pdf.text("Unhealthy", legendX + 78, legendY + 3);

      } else {
        pdf.setTextColor(100, 100, 100);
        pdf.text("No monthly data available", 20, yPosition + 20);
        yPosition += 30;
      }

      // Add summary section
      yPosition += 20;
      pdf.setFontSize(14);
      pdf.setTextColor(0, 0, 0);
      pdf.text("Summary", 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);
      
      if (statistics.totalHorses > 0) {
        const healthyPercent = ((statistics.healthy / statistics.totalHorses) * 100).toFixed(1);
        const sickPercent = ((statistics.sick / statistics.totalHorses) * 100).toFixed(1);
        const unhealthyPercent = ((statistics.unhealthy / statistics.totalHorses) * 100).toFixed(1);
        
        const summaryText = [
          `Total horses monitored: ${statistics.totalHorses}`,
          `• ${statistics.healthy} horses (${healthyPercent}%) are in healthy condition`,
          `• ${statistics.sick} horses (${sickPercent}%) require medical attention`,
          `• ${statistics.unhealthy} horses (${unhealthyPercent}%) need immediate care`
        ];

        summaryText.forEach((line, index) => {
          pdf.text(line, 25, yPosition + (index * 6));
        });
      } else {
        pdf.text("No health data available for analysis.", 25, yPosition);
      }

      // Add footer
      // Add footer (right side)
const pageWidth = pdf.internal.pageSize.getWidth();
pdf.setFontSize(10);
pdf.setTextColor(150, 150, 150);

// Align text to the right by subtracting its width
const footerText = "CTU Veterinary Medicine System";
const textWidth = pdf.getTextWidth(footerText);
pdf.text(footerText, pageWidth - textWidth - 20, 290);


      // Generate filename with current date
      const date = new Date().toISOString().split('T')[0];
      pdf.save(`health-report-${date}.pdf`);
      
      console.log("PDF export completed successfully");
      
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

  useEffect(() => {
    loadNotifications()
    loadStatistics()
  }, [loadNotifications, loadStatistics])

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

  // Calculate Y-axis scale with proper increments (0, 5, 10, etc.)
  const getYAxisScale = () => {
    if (monthlyData.length === 0) return { maxValue: 10, steps: [0, 5, 10] };
    
    const maxValue = Math.max(...monthlyData.map(month => Math.max(month.healthy, month.sick, month.unhealthy)));
    
    // Round up to nearest 5, with minimum of 5
    const roundedMax = Math.max(5, Math.ceil(maxValue / 5) * 5);
    
    // Generate steps: 0, 5, 10, etc. up to roundedMax
    const steps = [];
    for (let i = 0; i <= roundedMax; i += 5) {
      steps.push(i);
    }
    
    return { maxValue: roundedMax, steps };
  };

  const { maxValue: yAxisMax, steps: yAxisSteps } = getYAxisScale();

  // Calculate unread notifications count
  const unreadNotificationsCount = notifications.filter(notif => !notif.read).length

  return (
    <div className="font-sans bg-gray-100 flex h-screen overflow-x-hidden w-full m-0 p-0 box-border">
      <div className="sidebars" id="sidebars">
        <Sidebar isOpen={isSidebarOpen} ref={sidebarRef} />
      </div>

      <div className="flex-1 flex flex-col w-full lg:w-[calc(100%-250px)]">
        <header className="flex items-center bg-white p-5 border-b border-gray-200 shadow-md sticky top-0 z-10 justify-between">
          <div className="flex flex-col w-full sm:w-2/3 md:w-1/2 lg:w-1/3">
  <h2 className="text-2xl font-bold text-[#b91c1c]">Health Report</h2>
  <p className="text-sm text-gray-500 mt-1 font-normal">
  Track overall horse health and monitor monthly status
</p>

</div>

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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-[30px]">
              <div
                className="bg-white p-5 rounded-lg shadow-sm text-center transition-transform hover:-translate-y-0.5 cursor-pointer"
                onClick={() => handleStatCardClick("Total Horses", statistics.totalHorses)}
              >
                <div className="text-4xl lg:text-[36px] font-bold text-gray-900 mb-2">
                  {statistics.totalHorses}
                </div>
                <div className="text-sm lg:text-[14px] text-gray-500 font-medium">Total Horses</div>
              </div>

              <div
                className="bg-white p-5 rounded-lg shadow-sm text-center transition-transform hover:-translate-y-0.5 cursor-pointer"
                onClick={() => handleStatCardClick("Healthy", statistics.healthy)}
              >
                <div className="text-4xl lg:text-[36px] font-bold text-gray-900 mb-2">
                  {statistics.healthy}
                </div>
                <div className="text-sm lg:text-[14px] text-gray-500 font-medium">Healthy</div>
              </div>

              <div
                className="bg-white p-5 rounded-lg shadow-sm text-center transition-transform hover:-translate-y-0.5 cursor-pointer"
                onClick={() => handleStatCardClick("Sick", statistics.sick)}
              >
                <div className="text-4xl lg:text-[36px] font-bold text-gray-900 mb-2">
                  {statistics.sick}
                </div>
                <div className="text-sm lg:text-[14px] text-gray-500 font-medium">Sick</div>
              </div>

              <div
                className="bg-white p-5 rounded-lg shadow-sm text-center transition-transform hover:-translate-y-0.5 cursor-pointer"
                onClick={() => handleStatCardClick("Unhealthy", statistics.unhealthy)}
              >
                <div className="text-4xl lg:text-[36px] font-bold text-gray-900 mb-2">
                  {statistics.unhealthy}
                </div>
                <div className="text-sm lg:text-[14px] text-gray-500 font-medium">Unhealthy</div>
              </div>
            </div>

            {/* Bar Chart Section */}
            <div 
              ref={chartRef}
              className="bg-white rounded-lg shadow-sm p-4 lg:p-6"
            >
              <div className="flex justify-between items-center mb-5 flex-wrap gap-4">
                <h2 className="text-lg lg:text-[18px] font-semibold text-gray-900">
                  Monthly Health Status
                </h2>
                <button
                  className="bg-red-700 text-white border-none py-2 px-4 rounded-md text-sm lg:text-[14px] font-medium cursor-pointer transition-colors hover:bg-red-800 min-h-[40px] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleExport}
                  disabled={exportLoading || statistics.totalHorses === 0}
                >
                  {exportLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Download size={16} />
                  )}
                  {exportLoading ? 'Exporting...' : 'Export PDF'}
                </button>
              </div>

              {/* Legend */}
              <div className="flex gap-5 mb-5 justify-center flex-wrap">
                <div className="flex items-center gap-2 text-xs lg:text-[12px] text-gray-500">
                  <div className="w-3 h-3 rounded-sm bg-green-500"></div>
                  <span>Healthy</span>
                </div>
                <div className="flex items-center gap-2 text-xs lg:text-[12px] text-gray-500">
                  <div className="w-3 h-3 rounded-sm bg-orange-500"></div>
                  <span>Sick</span>
                </div>
                <div className="flex items-center gap-2 text-xs lg:text-[12px] text-gray-500">
                  <div className="w-3 h-3 rounded-sm bg-red-500"></div>
                  <span>Unhealthy</span>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="w-full overflow-x-auto">
                <div className="min-w-[600px]">
                  {/* Chart Container */}
                  <div className="relative h-64 mt-8">
                    {/* Y-axis labels */}
                    <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-500">
                      {yAxisSteps.map((value, index) => (
                        <div 
                          key={value} 
                          className="text-right pr-2"
                          style={{ 
                            position: 'absolute',
                            right: '0',
                            top: `${(1 - (value / yAxisMax)) * 100}%`,
                            transform: 'translateY(-50%)'
                          }}
                        >
                          {value}
                        </div>
                      ))}
                    </div>

                    {/* Chart area */}
                  <div className="ml-10 pl-5 h-full flex items-end justify-start gap-6 px-0 border-b border-l border-gray-300">


                      {monthlyData.map((monthData, index) => {
                        // Calculate bar heights based on Y-axis scale
                        const healthyHeight = (monthData.healthy / yAxisMax) * 80;
                        const sickHeight = (monthData.sick / yAxisMax) * 80;
                        const unhealthyHeight = (monthData.unhealthy / yAxisMax) * 80;

                        return (
                         <div key={index} className="flex flex-col items-center w-12">

                            {/* Three separate bars side by side */}
                            <div className="flex items-end justify-center space-x-1 h-48 relative">
                              {/* Healthy bar */}
                              <div 
                                className="w-3 bg-green-500 relative cursor-pointer group transition-all hover:w-4 rounded-t border border-green-600"
                                style={{ height: `${healthyHeight}%`, minHeight: monthData.healthy > 0 ? '2px' : '0' }}
                                title={`Healthy: ${monthData.healthy}`}
                              >
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                                  Healthy: {monthData.healthy}
                                </div>
                              </div>
                              
                              {/* Sick bar */}
                              <div 
                                className="w-3 bg-orange-500 relative cursor-pointer group transition-all hover:w-4 rounded-t border border-orange-600"
                                style={{ height: `${sickHeight}%`, minHeight: monthData.sick > 0 ? '2px' : '0' }}
                                title={`Sick: ${monthData.sick}`}
                              >
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                                  Sick: {monthData.sick}
                                </div>
                              </div>
                              
                              {/* Unhealthy bar */}
                              <div 
                                className="w-3 bg-red-500 relative cursor-pointer group transition-all hover:w-4 rounded-t border border-red-600"
                                style={{ height: `${unhealthyHeight}%`, minHeight: monthData.unhealthy > 0 ? '2px' : '0' }}
                                title={`Unhealthy: ${monthData.unhealthy}`}
                              >
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                                  Unhealthy: {monthData.unhealthy}
                                </div>
                              </div>
                            </div>
                            
                            {/* Month label */}
                            <div className="text-xs text-gray-600 mt-2 font-medium text-center">
                              {monthData.month}
                            </div>
                            
                            {/* Total count */}
                            <div className="text-xs text-gray-500 mt-1">
                              Total: {monthData.total}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {monthlyData.length === 0 && (
                    <div className="text-center text-gray-500 py-8">
                      No monthly data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FloatingMessages />
    </div>
  )
}

export default CtuHealthReport