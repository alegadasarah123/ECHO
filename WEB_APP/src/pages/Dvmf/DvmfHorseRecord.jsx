"use client"
import Sidebar from "@/components/DvmfSidebar"
import { jsPDF } from "jspdf"

import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Image as ImageIcon,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Stethoscope,
  Syringe,
  User
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import FloatingMessages from "./DvmfMessage"
import NotificationModal from "./DvmfNotif"

const API_BASE = "https://echo-ebl8.onrender.com/api/dvmf"
const TableSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="bg-gray-50 grid grid-cols-[1.2fr_1.2fr_1.2fr_1.5fr_1fr_1fr] py-4 px-5 font-semibold text-gray-600 text-sm border-b border-gray-200">
        <div>Horse Name</div>
        <div>Horse Color</div>
        <div>Owner</div>
        <div>Location</div>
        <div>Status</div>
        <div className="text-center">Action</div>
      </div>
      {[...Array(10)].map((_, index) => (
        <div
          key={index}
          className="grid grid-cols-[1.2fr_1.2fr_1.2fr_1.5fr_1fr_1fr] py-4 px-5 border-b border-gray-100 items-center min-h-[40px] animate-pulse"
        >
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-4/5"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-6 bg-gray-200 rounded-full w-16"></div>
          <div className="flex justify-center">
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Horse Detail Skeleton Loader
const HorseDetailSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
      <div className="flex items-center gap-2 mb-6">
        <div className="h-5 w-5 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </div>

      <div className="bg-gray-50 rounded-lg p-5 mb-5">
        <div className="flex items-center mb-5 flex-wrap gap-4">
          <div className="w-20 h-20 rounded bg-gray-200 mr-5 flex-shrink-0"></div>
          <div className="horse-basic-info">
            <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="flex flex-col">
              <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-5 bg-gray-200 rounded w-48 mb-4"></div>
      
      {/* Medical Record History Skeleton */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-5">
        <div className="bg-gray-50 grid grid-cols-5 gap-4 py-3 px-4 border-b border-gray-200">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
        {[...Array(3)].map((_, index) => (
          <div key={index} className="grid grid-cols-5 gap-4 py-3 px-4 border-b border-gray-100 items-center min-h-[50px]">
            {[...Array(5)].map((_, colIndex) => (
              <div key={colIndex} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        ))}
      </div>

      {/* Treatment History Skeleton */}
      <div className="h-5 bg-gray-200 rounded w-48 mb-4"></div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 grid grid-cols-5 gap-4 py-3 px-4 border-b border-gray-200">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
        {[...Array(3)].map((_, index) => (
          <div key={index} className="grid grid-cols-5 gap-4 py-3 px-4 border-b border-gray-100 items-center min-h-[50px]">
            {[...Array(5)].map((_, colIndex) => (
              <div key={colIndex} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// Medical Record Detail Skeleton
const MedicalRecordDetailSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
      <div className="flex items-center gap-2 mb-6">
        <div className="h-5 w-5 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </div>

      <div className="flex items-center mb-5 flex-wrap gap-4">
        <div className="w-12 h-12 rounded bg-gray-200 mr-4 flex-shrink-0"></div>
        <div className="profile-info">
          <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded-full w-20"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="flex flex-col">
            <div className="h-3 bg-gray-200 rounded w-16 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        ))}
      </div>

      <div className="mb-6">
        <div className="h-5 bg-gray-200 rounded w-48 mb-4"></div>

        <div className="bg-blue-50 rounded-lg p-4 mb-5">
          <div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>

        <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="bg-white border border-gray-200 rounded-md p-3 text-center">
              <div className="h-6 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-20 mx-auto"></div>
            </div>
          ))}
        </div>

        {[...Array(7)].map((_, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4 mb-5">
            <div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <div className="h-10 bg-gray-200 rounded w-40"></div>
      </div>
    </div>
  )
}

// Treatment History Detail Skeleton
const TreatmentHistoryDetailSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
      <div className="flex items-center gap-2 mb-6">
        <div className="h-5 w-5 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-32"></div>
      </div>

      <div>
        <div className="h-5 bg-gray-200 rounded w-48 mb-5"></div>

        <div className="bg-blue-50 rounded-lg p-4 mb-5">
          <div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-md p-3 text-center">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-20 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>

        {[...Array(4)].map((_, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4 mb-5">
            <div className="h-4 bg-gray-200 rounded w-32 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        ))}

        <div className="flex justify-center">
          <div className="h-10 bg-gray-200 rounded w-40"></div>
        </div>
      </div>
    </div>
  )
}

const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage, onItemsPerPageChange }) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1
  const endItem = Math.min(currentPage * itemsPerPage, totalItems)

  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 3

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 2) {
        for (let i = 1; i <= 3; i++) {
          pages.push(i)
        }
      } else if (currentPage >= totalPages - 1) {
        for (let i = totalPages - 2; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
      }
    }

    return pages
  }

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-gray-200">
      <div className="text-sm text-gray-700">
        Showing {startItem} to {endItem} of {totalItems} results
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-700">Show:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="inline-flex items-center px-2 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>

          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => onPageChange(page)}
              className={`px-3 py-1 text-sm font-medium rounded ${
                page === currentPage
                  ? "bg-red-600 text-white"
                  : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="inline-flex items-center px-2 py-1 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

// Enhanced PDF Export Function with Tables & Spacing
const exportToPDF = async (data, filename = "document.pdf", type = "medical") => {
  try {
    const pdf = new jsPDF();
    const { horse, medicalRecord, treatmentHistory } = data;

    // Helper function to parse lab images for PDF
    const parseLabImages = (labImgData) => {
      if (!labImgData) return [];
      
      try {
        if (typeof labImgData === 'string' && labImgData.startsWith('[')) {
          return JSON.parse(labImgData);
        }
        if (Array.isArray(labImgData)) {
          return labImgData;
        }
        if (typeof labImgData === 'string') {
          return [labImgData];
        }
      } catch (error) {
        console.error('Error parsing lab images:', error);
      }
      
      return [];
    };

    // Colors
    const primaryColor = [220, 53, 69]; // Red headers
    const darkColor = [51, 51, 51]; // Text

    pdf.setFont("helvetica");

    // Header background
    pdf.setFillColor(...primaryColor);
    pdf.rect(0, 0, 210, 25, "F");

    // Header text
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text(
      type === "medical" ? "MEDICAL RECORD" : "TREATMENT RECORD",
      105,
      16,
      { align: "center" }
    );

    // Date
    pdf.setFontSize(9);
    pdf.text(`Exported on: ${new Date().toLocaleDateString()}`, 200, 22, {
      align: "right",
    });

    let yPosition = 35;

    // --- Section helper ---
    const addSection = (title, content) => {
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }

      // consistent top spacing
      yPosition += 4;

      pdf.setTextColor(...primaryColor);
      pdf.setFontSize(13);
      pdf.setFont("helvetica", "bold");
      pdf.text(title, 15, yPosition);
      yPosition += 6;

      if (content) {
        pdf.setTextColor(...darkColor);
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");

        const lines = pdf.splitTextToSize(content, 180);
        lines.forEach((line) => {
          if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(line, 20, yPosition);
          yPosition += 5;
        });
      }

      yPosition += 2; // tighter bottom spacing
    };

    // --- Key-value helper ---
    const addKeyValue = (key, value) => {
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setTextColor(...darkColor);
      pdf.setFontSize(10);

      pdf.setFont("helvetica", "bold");
      pdf.text(`${key}:`, 20, yPosition);

      pdf.setFont("helvetica", "normal");
      const valueLines = pdf.splitTextToSize(value || "N/A", 120);

      if (valueLines.length === 1) {
        pdf.text(valueLines[0], 70, yPosition);
        yPosition += 5;
      } else {
        pdf.text(valueLines[0], 70, yPosition);
        yPosition += 5;
        for (let i = 1; i < valueLines.length; i++) {
          if (yPosition > 270) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(valueLines[i], 70, yPosition);
          yPosition += 5;
        }
      }
    };

    // --- Table row helper ---
    const addTableRow = (data) => {
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(10);
      pdf.setTextColor(...darkColor);
      pdf.setFont("helvetica", "bold");
      pdf.text(data[0], 20, yPosition);
      pdf.setFont("helvetica", "normal");
      pdf.text(data[1], 60, yPosition);

      if (data[2]) {
        pdf.setFont("helvetica", "bold");
        pdf.text(data[2], 110, yPosition);
        pdf.setFont("helvetica", "normal");
        pdf.text(data[3], 150, yPosition);
      }

      yPosition += 5;
    };

    // --- Medical Record ---
    if (type === "medical") {
      addSection("Horse Information", "");
      addKeyValue("Name", horse?.horse_name || "N/A");
      addKeyValue("Breed", horse?.horse_breed || "N/A");
      addKeyValue("Age", horse?.horse_age || "N/A");
      addKeyValue("Sex", horse?.horse_sex || "N/A");
      addKeyValue("Owner", horse?.owner_fullname || "N/A");
      addKeyValue("Contact", horse?.owner_phone || "N/A");
      addKeyValue("Location", horse?.location || "N/A");

      addSection("Record Information", "");
      addKeyValue("Record Date", medicalRecord.medrec_date || "N/A");
      addKeyValue(
        "Follow-up Date",
        medicalRecord.medrec_followup_date || "No follow-up scheduled"
      );
      addKeyValue("Horse Status", medicalRecord.medrec_horsestatus || "N/A");
      addKeyValue("Veterinarian", medicalRecord.vet_name || "N/A");

      addSection("Vital Signs", "");
      addTableRow([
        "Temperature",
        `${medicalRecord.medrec_body_temp || "N/A"} °C`,
        "Heart Rate",
        `${medicalRecord.medrec_heart_rate || "N/A"} bpm`,
      ]);
      addTableRow([
        "Resp. Rate",
        `${medicalRecord.medrec_resp_rate || "N/A"} breaths/min`,
        "",
        "",
      ]);

      addSection("Diagnosis", medicalRecord.medrec_diagnosis || "No diagnosis");
      addSection(
        "Clinical Signs",
        medicalRecord.medrec_clinical_signs || "No signs recorded"
      );
      addSection(
        "Prognosis",
        medicalRecord.medrec_prognosis || "No prognosis recorded"
      );
      addSection(
        "Recommendations",
        medicalRecord.medrec_recommendation || "No recommendations"
      );
      addSection(
        "Diagnostic Protocol",
        medicalRecord.medrec_diagnostic_protocol || "No protocol recorded"
      );

      // Laboratory Results Section in PDF
      addSection("Laboratory Results", "");
      addKeyValue("Lab Results", medicalRecord.medrec_lab_results || "No lab results available");
      
      const labImages = parseLabImages(medicalRecord.medrec_lab_img);
      if (labImages.length > 0) {
        addKeyValue("Lab Images", `${labImages.length} image(s) available - See system for details`);
      } else {
        addKeyValue("Lab Images", "No lab images available");
      }
    } else {
      // --- Treatment Record ---
      addSection("Horse Information", "");
      addKeyValue("Name", horse?.horse_name || "N/A");
      addKeyValue("Breed", horse?.horse_breed || "N/A");
      addKeyValue("Age", horse?.horse_age || "N/A");
      addKeyValue("Owner", horse?.owner_fullname || "N/A");

      addSection("Treatment Record", "");
      addKeyValue(
        "Treatment Date",
        treatmentHistory.treatment_date || "N/A"
      );
      addKeyValue(
        "Follow-up Date",
        treatmentHistory.followup_date ||
          treatmentHistory.parent_record?.medrec_followup_date ||
          "N/A"
      );
      addKeyValue("Administered By", treatmentHistory.vet_name || "N/A");
      addKeyValue(
        "Veterinarian",
        medicalRecord?.vet_name || treatmentHistory.vet_name || "N/A"
      );
      addKeyValue(
        "Horse Status",
        treatmentHistory.parent_record?.medrec_horsestatus || "N/A"
      );
      addKeyValue(
        "Recommendation",
        treatmentHistory.medrec_recommendation || "N/A"
      );

      addSection("Medical Data at Time of Treatment", "");
      addTableRow([
        "Temperature",
        `${treatmentHistory.medrec_bodytemp || "N/A"} °C`,
        "Heart Rate",
        `${treatmentHistory.medrec_heart_rate || "N/A"} bpm`,
      ]);
      addTableRow([
        "Resp. Rate",
        `${treatmentHistory.medrec_resp_rate || "N/A"} breaths/min`,
        "",
        "",
      ]);

      addSection(
        "Clinical Signs",
        treatmentHistory.medrec_clinical_sign || "No information available"
      );
      addSection(
        "Diagnosis",
        treatmentHistory.medrec_diagnosis || "No information available"
      );

      addSection("Treatment Details", "");
      addKeyValue(
        "Treatment Name",
        treatmentHistory.treatment_name || "No information available"
      );
      addKeyValue("Dosage", treatmentHistory.treatment_dosage || "N/A");
      addKeyValue("Duration", treatmentHistory.treatment_duration || "N/A");
      addKeyValue("Outcome", treatmentHistory.treatment_outcome || "N/A");
    }

    // --- Footer ---
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
      pdf.text("DVMF Veterinary Medicine System", 200, 290, { align: "right" });
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error("Error generating PDF:", error);
    return false;
  }
};

// Medical Record Detail Component
const MedicalRecordDetailView = ({ horse, medicalRecord, onBack, onExportPDF }) => {
  if (!medicalRecord) return null;

  // State to track image loading errors
  const [imageErrors, setImageErrors] = useState({});

  // Helper function to parse lab images and detect file types
  const parseLabImages = (labImgData) => {
    if (!labImgData) return [];
    
    try {
      let files = [];
      
      // If it's a string that looks like JSON array, parse it
      if (typeof labImgData === 'string' && labImgData.startsWith('[')) {
        files = JSON.parse(labImgData);
      }
      // If it's already an array, use it
      else if (Array.isArray(labImgData)) {
        files = labImgData;
      }
      // If it's a single string URL, wrap it in array
      else if (typeof labImgData === 'string') {
        files = [labImgData];
      }
      
      // Add file type information
      const filesWithType = files.map(url => {
        const lowerUrl = url.toLowerCase();
        if (lowerUrl.match(/\.pdf$/)) {
          return { url, type: 'pdf' };
        } else {
          return { url, type: 'image' };
        }
      });
      
      return filesWithType;
      
    } catch (error) {
      console.error('Error parsing lab images:', error);
    }
    
    return [];
  };

  const handleImageError = (index) => {
    setImageErrors(prev => ({ ...prev, [index]: true }));
  };

  const labFiles = parseLabImages(medicalRecord.medrec_lab_img);

  const handleExportPDF = async () => {
    const success = await exportToPDF(
      { horse, medicalRecord }, 
      `medical-record-${horse?.horse_name || 'unknown'}.pdf`,
      'medical'
    );
    if (success) {
      onExportPDF();
    } else {
      alert('Failed to export PDF. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ChevronLeft size={20} />
        Back to Horse Details
      </button>

      <div className="mb-6">
        <h5 className="text-base font-semibold text-red-700 mb-4 border-b-2 border-gray-200 pb-1.5">
          Medical Record Details
        </h5>

        {/* Information Section */}
        <div className="bg-blue-50 rounded-lg p-4 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="text-sm mb-2">
              <strong>Follow-up Date:</strong> {medicalRecord.medrec_followup_date || "No follow-up scheduled"}
            </div>
            <div className="text-sm mb-2">
              <strong>Date:</strong> {medicalRecord.medrec_date || "N/A"}
            </div>
            <div className="text-sm mb-2">
              <strong>Administered By:</strong> {medicalRecord.vet_name || "N/A"}
            </div>
            <div className="text-sm mb-2">
              <strong>Horse Status:</strong> 
              <span className={`inline-block py-0.5 px-2 rounded-xl text-xs font-medium ml-2 ${
                medicalRecord.medrec_horsestatus?.toLowerCase() === "healthy" 
                  ? "bg-green-100 text-green-800"
                  : medicalRecord.medrec_horsestatus?.toLowerCase() === "sick"
                    ? "bg-red-100 text-red-600"
                    : medicalRecord.medrec_horsestatus?.toLowerCase() === "unhealthy"
                      ? "bg-yellow-100 text-yellow-600"
                      : "bg-gray-100 text-gray-600"
              }`}>
                {medicalRecord.medrec_horsestatus || "N/A"}
              </span>
            </div>
          </div>
        </div>

        <div className="text-sm font-semibold text-gray-900 mb-4">Vital Signs</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
          <div className="bg-white border border-gray-200 rounded-md p-3 text-center">
            <div className="text-lg font-semibold text-gray-900 mb-1">
              {medicalRecord.medrec_body_temp || "N/A"}°C
            </div>
            <div className="text-xs text-gray-500">Temperature</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-md p-3 text-center">
            <div className="text-lg font-semibold text-gray-900 mb-1">
              {medicalRecord.medrec_heart_rate || "N/A"} bpm
            </div>
            <div className="text-xs text-gray-500">Heart Rate</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-md p-3 text-center">
            <div className="text-lg font-semibold text-gray-900 mb-1">
              {medicalRecord.medrec_resp_rate || "N/A"} breaths/min
            </div>
            <div className="text-xs text-gray-500">Respiratory Rate</div>
          </div>
        </div>

        {/* Laboratory Results Section */}
        <div className="bg-gray-50 rounded-lg p-4 mb-5">
          <div className="text-sm font-semibold text-gray-900 mb-2">Laboratory Results</div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText size={16} className="text-blue-600" />
                <span className="text-sm font-medium text-gray-700">Lab Results:</span>
              </div>
              <p className="text-sm text-gray-700 leading-6 ml-6">
                {medicalRecord.medrec_lab_results || "No lab results available"}
              </p>
            </div>
            
            {/* Lab Files Section - Only show if there are files */}
            {labFiles.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon size={16} className="text-green-600" />
                  <span className="text-sm font-medium text-gray-700">Lab Files:</span>
                </div>
                <div className="ml-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {labFiles.map((file, index) => (
                      <div key={index} className="flex flex-col space-y-2">
                        {file.type === 'image' ? (
                          // Display image files with error handling
                          !imageErrors[index] ? (
                            <>
                              <img 
                                src={file.url} 
                                alt={`Laboratory test result ${index + 1}`}
                                className="max-w-full h-auto max-h-64 rounded-lg border border-gray-200"
                                onError={() => handleImageError(index)}
                              />
                              <a 
                                href={file.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 underline text-center"
                              >
                                View full size image
                              </a>
                            </>
                          ) : (
                            <div className="text-sm text-gray-500 italic text-center p-4 bg-gray-100 rounded-lg border border-gray-200">
                              Lab image failed to load or is unavailable
                            </div>
                          )
                        ) : (
                          // Display PDF files - always show the link without trying to render as image
                          <>
                            <div className="bg-gray-100 rounded-lg border border-gray-200 p-8 text-center">
                              <FileText size={48} className="text-red-500 mx-auto mb-2" />
                              <p className="text-sm text-gray-600 mb-3">PDF Document</p>
                            </div>
                            <a 
                              href={file.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 underline text-center"
                            >
                              View PDF document
                            </a>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-5">
          <div className="text-sm font-semibold text-gray-900 mb-2">Diagnosis</div>
          <p className="text-sm leading-6 text-gray-700 mb-2">
            {medicalRecord.medrec_diagnosis || "No diagnosis available"}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-5">
          <div className="text-sm font-semibold text-gray-900 mb-2">Clinical Signs</div>
          <p className="text-sm text-gray-700 leading-6">
            {medicalRecord.medrec_clinical_signs || "No signs recorded"}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-5">
          <div className="text-sm font-semibold text-gray-900 mb-2">Prognosis</div>
          <p className="text-sm text-gray-700 leading-6">
            {medicalRecord.medrec_prognosis || "No prognosis recorded"}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-5">
          <div className="text-sm font-semibold text-gray-900 mb-2">Recommendations</div>
          <p className="text-sm text-gray-700 leading-6">
            {medicalRecord.medrec_recommendation || "No recommendations available"}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-5">
          <div className="text-sm font-semibold text-gray-900 mb-2">Diagnostic Protocol</div>
          <p className="text-sm text-gray-700 leading-6">
            {medicalRecord.medrec_diagnostic_protocol || "No diagnostic protocol recorded"}
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          className="inline-flex items-center justify-center gap-1 bg-green-500 text-white border-none py-3 px-6 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-green-600 min-h-[44px] max-w-[200px] w-full"
          onClick={handleExportPDF}
        >
          <Download size={16} />
          Export PDF
        </button>
      </div>
    </div>
  );
};

// Treatment History Detail Component
const TreatmentHistoryDetailView = ({ treatmentHistory, horse, onBack, onExportPDF }) => {
  if (!treatmentHistory) return null;

  const handleExportPDF = async () => {
    const success = await exportToPDF(
      { horse, treatmentHistory }, 
      `treatment-history-${horse?.horse_name || 'unknown'}.pdf`,
      'treatment'
    );
    if (success) {
      onExportPDF();
    } else {
      alert('Failed to export PDF. Please try again.');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ChevronLeft size={20} />
        Back to Horse Details
      </button>

      <div>
        <h4 className="text-lg font-semibold text-red-700 mb-5">Treatment History Details</h4>

        <div className="bg-blue-50 rounded-lg p-4 mb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="text-sm mb-2">
              <strong>Follow-up Date:</strong> {treatmentHistory.followup_date || treatmentHistory.parent_record?.medrec_followup_date || "N/A"}
            </div>
            <div className="text-sm mb-2">
              <strong>Date:</strong> {treatmentHistory.treatment_date || "N/A"}
            </div>
            <div className="text-sm mb-2">
              <strong>Administered By:</strong> {treatmentHistory.vet_name || "N/A"}
            </div>
            <div className="text-sm mb-2">
              <strong>Horse Status:</strong> 
              <span className={`inline-block py-0.5 px-2 rounded-xl text-xs font-medium ml-2 ${
                treatmentHistory.parent_record?.medrec_horsestatus?.toLowerCase() === "healthy" 
                  ? "bg-green-100 text-green-800"
                  : treatmentHistory.parent_record?.medrec_horsestatus?.toLowerCase() === "sick"
                    ? "bg-red-100 text-red-600"
                    : treatmentHistory.parent_record?.medrec_horsestatus?.toLowerCase() === "unhealthy"
                      ? "bg-yellow-100 text-yellow-600"
                      : "bg-gray-100 text-gray-600"
              }`}>
                {treatmentHistory.parent_record?.medrec_horsestatus || "N/A"}
              </span>
            </div>
          
          </div>
        </div>

        <div className="mb-5">
          <div className="text-sm font-semibold text-red-700 mb-3">Medical Data at Time of Treatment</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
            <div className="bg-white border border-gray-200 rounded-md p-3 text-center">
              <div className="text-lg font-semibold text-gray-900 mb-1">
                {treatmentHistory.medrec_bodytemp || "N/A"} °C
              </div>
              <div className="text-xs text-gray-500">Temperature</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-md p-3 text-center">
              <div className="text-lg font-semibold text-gray-900 mb-1">
                {treatmentHistory.medrec_heart_rate || "N/A"} bpm
              </div>
              <div className="text-xs text-gray-500">Heart Rate</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-md p-3 text-center">
              <div className="text-lg font-semibold text-gray-900 mb-1">
                {treatmentHistory.medrec_resp_rate || "N/A"} breaths/min
              </div>
              <div className="text-xs text-gray-500">Respiratory Rate</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-5">
          <div className="text-sm font-semibold text-gray-900 mb-3">Recommendations</div>
          <p className="text-sm text-gray-700 leading-6">
            {treatmentHistory.medrec_recommendation  || "No information available"}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-5">
          <div className="text-sm font-semibold text-gray-900 mb-3">Clinical Signs</div>
          <p className="text-sm text-gray-700 leading-6">
            {treatmentHistory.medrec_clinical_sign || "No information available"}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-5">
          <div className="text-sm font-semibold text-gray-900 mb-3">Diagnosis</div>
          <p className="text-sm text-gray-700 leading-6">
            {treatmentHistory.medrec_diagnosis || "No information available"}
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-5">
          <div className="text-sm font-semibold text-gray-900 mb-3">Treatment Details</div>
          <p className="text-sm text-gray-700 leading-6 mb-2">
            <span className="font-semibold">Treatment Name: </span>
            {treatmentHistory.treatment_name || "No information available"}
          </p>
          <p className="text-sm text-gray-700 leading-6 mb-2">
            <span className="font-semibold">Dosage: </span>
            {treatmentHistory.treatment_dosage || "N/A"}
          </p>
          <p className="text-sm text-gray-700 leading-6 mb-2">
            <span className="font-semibold">Duration: </span>
            {treatmentHistory.treatment_duration || "N/A"}
          </p>
          <p className="text-sm text-gray-700 leading-6 mb-2">
            <span className="font-semibold">Outcome: </span>
            {treatmentHistory.treatment_outcome || "N/A"}
          </p>
        </div>

        <div className="flex justify-center">
          <button
            className="inline-flex items-center justify-center gap-1 bg-green-500 text-white border-none py-3 px-6 rounded-md text-sm font-medium cursor-pointer transition-colors hover:bg-green-600 min-h-[44px] max-w-[200px] w-full"
            onClick={handleExportPDF}
          >
            <Download size={16} />
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
};

// Horse Detail Component
const HorseDetailView = ({ horse, onBack, onViewMedicalRecord, onViewTreatmentHistory }) => {
  if (!horse) return null;

  const displayWeight = () => {
    const weight = horse.horse_weight;
    if (!weight || weight === "" || weight === "0") return "N/A";
    return `${weight} kg`;
  };

  const displayHeight = () => {
    const height = horse.horse_height;
    if (!height || height === "" || height === "0") return "N/A";
    return `${height} hands`;
  };

  const transformMedicalRecords = () => {
    if (!horse.horse_medical_record || horse.horse_medical_record.length === 0) {
      return {
        medrec_history: [],
        treatment_history: []
      };
    }

    const medrecHistory = horse.horse_medical_record.map((record, index) => ({
      history_id: record.medrec_id || index,
      change_date: record.medrec_date,
      prev_diagnosis: record.medrec_diagnosis,
      vet_name: record.vet_name || "Veterinarian",
      horse_status: record.medrec_horsestatus,
      followup_date: record.medrec_followup_date,
      full_record: record
    }));

    const treatmentHistory = horse.horse_medical_record.flatMap(record => 
      record.horse_treatment && record.horse_treatment.length > 0 
        ? record.horse_treatment.map((treatment, idx) => ({
            treatment_id: treatment.treatment_id || `${record.medrec_id}-${idx}`,
            treatment_date: record.medrec_date,
            treatment_info: treatment.treatment_name,
            vet_name: record.vet_name || "Veterinarian",
            treatment_remark: treatment.treatment_outcome || "Completed",
            treatment_dosage: treatment.treatment_dosage,
            treatment_duration: treatment.treatment_duration,
            treatment_name: treatment.treatment_name,
            followup_date: treatment.followup_date,
            medrec_bodytemp: record.medrec_body_temp,
            medrec_heart_rate: record.medrec_heart_rate,
            medrec_resp_rate: record.medrec_resp_rate,
            medrec_clinical_sign: record.medrec_clinical_signs,
            medrec_diagnosis: record.medrec_diagnosis,
            medrec_recommendation: record.medrec_recommendation,
            full_treatment: treatment,
            parent_record: record
          }))
        : []
    );

    return {
      medrec_history: medrecHistory,
      treatment_history: treatmentHistory
    };
  };

  const medicalData = transformMedicalRecords();

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ChevronLeft size={20} />
        Back to Horse Records
      </button>

      {/* Square Profile and Info Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Horse Information Section */}
        <div className="flex flex-col md:flex-row items-start md:items-start space-x-0 md:space-x-6">
          <div className="relative flex-shrink-0">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-xl bg-gray-300 flex items-center justify-center overflow-hidden border-2 border-white shadow-md">
              {horse.horse_image ? (
                <img 
                  src={horse.horse_image} 
                  alt={horse.horse_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-full h-full flex items-center justify-center text-3xl font-semibold text-gray-500 ${horse.horse_image ? 'hidden' : 'flex'}`}>
                {horse.horse_name ? horse.horse_name.charAt(0) : "H"}
              </div>
            </div>
            
            {/* Status Badge */}
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
              <span className={`inline-block py-1 px-3 rounded-full border shadow-sm text-xs font-semibold ${
                horse.horse_status?.toLowerCase() === "healthy" 
                  ? "bg-green-100 text-green-800 border-green-200"
                  : horse.horse_status?.toLowerCase() === "sick"
                    ? "bg-red-100 text-red-800 border-red-200"
                    : horse.horse_status?.toLowerCase() === "unhealthy"
                      ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                      : "bg-gray-100 text-gray-800 border-gray-200"
              }`}>
                {horse.horse_status || "No Status"}
              </span>
            </div>
          </div>

          <div className="flex-1 mt-6 md:mt-0 flex flex-col justify-start text-left">
            <h2 className="text-2xl font-bold text-gray-800">{horse.horse_name || "Unknown Horse"}</h2>
            <div className="flex items-center space-x-4 mt-1">
              <span className="text-indigo-600 font-semibold">{horse.horse_breed || "Unknown Breed"}</span>
              <span className="text-gray-600">({horse.horse_sex || "Unknown"})</span>
            </div>
            <span className="mt-1 block text-gray-700">{horse.horse_color || "Unknown"} Coat</span>

            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-gray-600 text-sm mt-4">
              <span>DOB: <strong className="text-gray-800">{horse.horse_dob || "Unknown"}</strong></span>
              <span>Age: <strong className="text-gray-800">{horse.horse_age || "Unknown"}</strong></span>
              <span>Height: <strong className="text-gray-800">{displayHeight()}</strong></span>
              <span>Weight: <strong className="text-gray-800">{displayWeight()}</strong></span>
            </div>
          </div>
        </div>

        {/* Owner Information Section */}
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center shadow-md">
              <User className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Owner Information</h2>
          </div>

          <div className="space-y-3">
            <p className="font-bold text-gray-800 text-lg">
              {horse.owner_fullname || "Unknown Owner"}
            </p>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Phone className="w-3 h-3 text-blue-600" />
                </div>
                <span className="text-gray-700">{horse.owner_phone || "Phone not available"}</span>
              </div>

              <div className="flex items-center space-x-2 text-sm">
                <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-3 h-3 text-green-600" />
                </div>
                <span className="text-gray-700">{horse.location || "Address not available"}</span>
              </div>

              <div className="flex items-center space-x-2 text-sm">
                <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-3 h-3 text-purple-600" />
                </div>
                <span className="text-gray-700">{horse.owner_email || "Email not available"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="text-base font-semibold text-gray-900 mb-4">Medical Record History</div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-5">
        <div className="bg-gray-50 grid grid-cols-5 gap-4 py-3 px-4 font-semibold text-gray-700 text-xs border-b border-gray-200">
          <div>Date</div>
          <div>Diagnosis</div>
          <div>Status</div>
          <div>Veterinarian</div>
          <div className="text-center">Action</div>
        </div>

        {medicalData.medrec_history.length > 0 ? (
          medicalData.medrec_history.map((history) => (
            <div
              className="grid grid-cols-5 gap-4 py-3 px-4 border-b border-gray-100 items-center text-sm min-h-[50px]"
              key={history.history_id}
            >
              <div className="flex items-center">{history.change_date || "N/A"}</div>
              <div className="flex items-center">{history.prev_diagnosis || "No diagnosis"}</div>
              <div className="flex items-center">
                <span className={`inline-block py-1 px-2 rounded-xl text-xs font-medium ${
                  history.horse_status?.toLowerCase() === "healthy" 
                    ? "bg-green-100 text-green-800"
                    : history.horse_status?.toLowerCase() === "sick"
                      ? "bg-red-100 text-red-600"
                      : history.horse_status?.toLowerCase() === "unhealthy"
                        ? "bg-yellow-100 text-yellow-600"
                        : "bg-gray-100 text-gray-600"
                }`}>
                  {history.horse_status || "N/A"}
                </span>
              </div>
              <div className="flex items-center">{history.vet_name || "N/A"}</div>
              <div className="flex items-center justify-center">
                <button
                  className="inline-flex items-center justify-center gap-1 bg-transparent text-blue-700 border border-blue-700 py-1.5 px-3 rounded text-xs font-medium cursor-pointer transition-all hover:bg-blue-100 min-h-[32px] w-full max-w-[60px]"
                  onClick={() => onViewMedicalRecord(horse, history.full_record)}
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8">
            <Stethoscope size={48} className="opacity-50 mb-4" />
            <h3 className="text-lg mb-2 text-gray-700">No medical record history</h3>
            <p className="text-sm text-gray-500">Previous records will appear here when available</p>
          </div>
        )}
      </div>

      <div className="text-base font-semibold text-gray-900 mb-4">Treatment History</div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 grid grid-cols-5 gap-4 py-3 px-4 font-semibold text-gray-700 text-xs border-b border-gray-200">
          <div>Date</div>
          <div>Treatment</div>
          <div>Remark</div>
          <div>Administered By</div>
          <div className="text-center">Action</div>
        </div>

        {medicalData.treatment_history.length > 0 ? (
          medicalData.treatment_history.map((treatment) => (
            <div
              className="grid grid-cols-5 gap-4 py-3 px-4 border-b border-gray-100 items-center text-sm min-h-[50px]"
              key={treatment.treatment_id}
            >
              <div className="flex items-center">{treatment.treatment_date || "N/A"}</div>
              <div className="flex items-center">{treatment.treatment_info || "N/A"}</div>
              <div className="flex items-center">
                <span className={`inline-block py-1 px-2 rounded text-xs font-medium ${
                  treatment.treatment_remark?.toLowerCase() === "completed" 
                    ? "bg-green-100 text-green-800"
                    : treatment.treatment_remark?.toLowerCase() === "in progress"
                      ? "bg-blue-100 text-blue-800"
                      : treatment.treatment_remark?.toLowerCase() === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-gray-100 text-gray-600"
                }`}>
                  {treatment.treatment_remark || "N/A"}
                </span>
              </div>
              <div className="flex items-center">{treatment.vet_name || "N/A"}</div>
              <div className="flex items-center justify-center">
                <button
                  className="inline-flex items-center justify-center gap-1 bg-transparent text-blue-700 border border-blue-700 py-1.5 px-3 rounded text-xs font-medium cursor-pointer transition-all hover:bg-blue-100 min-h-[32px] w-full max-w-[60px]"
                  onClick={() => onViewTreatmentHistory(treatment)}
                >
                  <Eye size={16} />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-8">
            <Syringe size={48} className="opacity-50 mb-4" />
            <h3 className="text-lg mb-2 text-gray-700">No treatment history</h3>
            <p className="text-sm text-gray-500">Treatment records will appear here when available</p>
          </div>
        )}
      </div>
    </div>
  );
};


function DvmfHorseRecord() {
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [currentView, setCurrentView] = useState('list')
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState(null)
  const [notifsOpen, setNotifsOpen] = useState(false)
  const [areaFilter, setAreaFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [notifications, setNotifications] = useState([])
  const [horseRecords, setHorseRecords] = useState([])
  const [selectedHorse, setSelectedHorse] = useState(null)
  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState(null)
  const [selectedTreatmentHistory, setSelectedTreatmentHistory] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)
  const sidebarRef = useRef(null)

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
 const handleNotificationClick = async (notification) => {
  // Mark notification as read in frontend immediately for better UX
  setNotifications(prev =>
    prev.map(notif =>
      notif.id === notification.id ? { ...notif, read: true } : notif
    )
  );

  // Mark notification as read in backend
  try {
    await fetch(`${API_BASE}/mark_notification_read/${notification.id}/`, {
      method: "POST",
      credentials: "include",
    });
  } catch (err) {
    console.error("Error marking notification as read:", err);
  }

  // Handle navigation based on notification content
  const message = notification.message.toLowerCase();

  if (
    message.includes("new registration") ||
    message.includes("new veterinarian approved") ||
    message.includes("veterinarian approved") ||
    message.includes("veterinarian declined") ||
    message.includes("veterinarian registered")
  ) {
    navigate("/DvmfAccountApproval", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
      },
    });
    return;
  }

  if (message.includes("pending medical record access") || message.includes("requested access")) {
    navigate("/DvmfAccessRequest", {
      state: {
        highlightedNotification: notification,
        shouldHighlight: true,
      },
    });
    return;
  }

  // Only navigate to CtuAnnouncement for comment-related notifications
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

  // Manual refresh function
  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([
        fetchHorses(),
        loadNotifications()
      ])
    } catch (error) {
      console.error("Failed to refresh data:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const fetchHorses = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("https://echo-ebl8.onrender.com/api/dvmf/get_horses/")
      if (!res.ok) throw new Error("Failed to fetch horses")
      const data = await res.json()
      setHorseRecords(data)
    } catch (err) {
      console.error("Error fetching horses:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHorses()
    loadNotifications()
    const interval = setInterval(() => {
      loadNotifications()
    }, 30000)
    return () => clearInterval(interval)
  }, [loadNotifications])

  // Filter only approved horses
  const filteredHorseRecords = useCallback(() => {
    let filtered = horseRecords.filter(horse => horse.status === "approved")
    
    if (areaFilter !== "all") {
      filtered = filtered.filter((horse) => horse.location.toLowerCase().includes(areaFilter.toLowerCase()))
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((horse) => 
        horse.horse_status?.toLowerCase() === statusFilter.toLowerCase()
      )
    }
    if (searchTerm) {
      filtered = filtered.filter(
        (horse) =>
          horse.horse_name?.toLowerCase().includes(searchTerm) ||
          horse.owner_fullname?.toLowerCase().includes(searchTerm) ||
          horse.location?.toLowerCase().includes(searchTerm) ||
          horse.horse_color?.toLowerCase().includes(searchTerm),
      )
    }
    return filtered
  }, [horseRecords, areaFilter, statusFilter, searchTerm])

  const paginatedHorseRecords = useCallback(() => {
    const filtered = filteredHorseRecords()
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filtered.slice(startIndex, endIndex)
  }, [filteredHorseRecords, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredHorseRecords().length / itemsPerPage)

  const handlePageChange = (page) => {
    setCurrentPage(page)
  }

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage)
    setCurrentPage(1)
  }

  useEffect(() => {
    setCurrentPage(1)
  }, [areaFilter, statusFilter, searchTerm])

  const viewHorseDetails = async (horse) => {
    setDetailLoading(true)
    setSelectedHorse(horse)
    // Simulate loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500))
    setCurrentView('horse')
    setDetailLoading(false)
  }

  const viewMedicalRecord = async (horse, record) => {
    setDetailLoading(true)
    setSelectedHorse(horse)
    setSelectedMedicalRecord(record)
    // Simulate loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500))
    setCurrentView('medical')
    setDetailLoading(false)
  }

  const viewTreatmentHistory = async (record) => {
    setDetailLoading(true)
    setSelectedTreatmentHistory(record)
    // Simulate loading delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500))
    setCurrentView('treatment')
    setDetailLoading(false)
  }

  const backToList = () => {
    setCurrentView('list')
    setSelectedHorse(null)
    setSelectedMedicalRecord(null)
    setSelectedTreatmentHistory(null)
  }

  const backToHorse = () => {
    setCurrentView('horse')
    setSelectedMedicalRecord(null)
    setSelectedTreatmentHistory(null)
  }

  const handleExportPDF = () => {
    console.log('PDF exported successfully');
  }

  const handleSearchInput = (e) => {
    setSearchTerm(e.target.value.toLowerCase())
  }

  const handleAreaFilterChange = (e) => {
    setAreaFilter(e.target.value)
  }

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value)
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      const sidebar = document.getElementById("sidebar")
      const mobileMenuBtn = document.querySelector(".mobile-menu-btn")
      if (
        window.innerWidth <= 768 &&
        isSidebarOpen &&
        sidebar &&
        !sidebar.contains(event.target) &&
        mobileMenuBtn &&
        !mobileMenuBtn.contains(event.target)
      ) {
        setIsSidebarOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isSidebarOpen])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsSidebarOpen(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const currentFilteredHorseRecords = paginatedHorseRecords()

  // Calculate unread notifications count
  const unreadNotificationsCount = notifications.filter(notif => !notif.read).length

  const renderListView = () => (
    <>
      <div className="mb-6">
        <div className="flex-1 max-w-md mr-5 relative min-w-[200px] mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            className="w-full py-2 px-4 pl-10 border-2 border-white rounded-lg text-sm outline-none min-h-[50px] bg-white mb-2.5"
            placeholder="Search......"
            onChange={handleSearchInput}
          />
        </div>

        <div className="flex justify-between items-center mb-5 flex-wrap gap-4">
          <div className="flex gap-3 items-center flex-wrap">
            <select
              className="py-2 px-3 border border-gray-300 rounded-md text-sm bg-white min-w-[140px] min-h-[40px]"
              id="areaFilter"
              value={areaFilter}
              onChange={handleAreaFilterChange}
            >
              <option value="all">Filter by Area</option>
              <option value="cebu">Cebu City</option>
              <option value="manila">Manila</option>
              <option value="davao">Davao</option>
            </select>

            <select
              className="py-2 px-3 border border-gray-300 rounded-md text-sm bg-white min-w-[140px] min-h-[40px]"
              id="statusFilter"
              value={statusFilter}
              onChange={handleStatusFilterChange}
            >
              <option value="all">All Statuses</option>
              <option value="healthy">Healthy</option>
              <option value="sick">Sick</option>
              <option value="unhealthy">Unhealthy</option>
            </select>
          </div>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gray-50 grid grid-cols-[1.2fr_1.2fr_1.2fr_1.5fr_1fr_1fr] py-4 px-5 font-semibold text-gray-600 text-sm border-b border-gray-200 ">
                <div>Horse Name</div>
                <div>Horse Color</div>
                <div>Owner</div>
                <div>Location</div>
                <div>Status</div>
                <div className="text-center">Action</div>
              </div>

              {currentFilteredHorseRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center p-8">
                  <div className="flex items-center justify-center mb-4">
                    <ClipboardList size={48} className="opacity-50" />
                  </div>
                  <h3 className="text-lg mb-2 text-gray-700">No horse records</h3>
                  <p className="text-sm text-gray-500">Horse records will appear here when available</p>
                </div>
              ) : (
                currentFilteredHorseRecords.map((horse, index) => {
                  const horseStatus = horse.horse_status || "No Status"

                  return (
                    <div
                      className="grid grid-cols-[1.2fr_1.2fr_1.2fr_1.5fr_1fr_1fr] py-4 px-5 border-b border-gray-100 hover:bg-gray-50 transition-colors items-center min-h-[40px]"
                      key={horse.horse_id || index}
                    >
                      <div className="text-sm flex items-center">{horse.horse_name}</div>
                      <div className="text-sm flex items-center">{horse.horse_color}</div>
                      <div className="text-sm flex items-center">{horse.owner_fullname}</div>
                      <div className="text-sm flex items-center">{horse.location || "N/A"}</div>
                      <div className="flex items-center">
                        <span className={`inline-block py-1 px-2 rounded-xl text-xs font-medium ${
                          horseStatus.toLowerCase() === "healthy" 
                            ? "bg-green-100 text-green-800"
                            : horseStatus.toLowerCase() === "sick"
                              ? "bg-red-100 text-red-600"
                              : horseStatus.toLowerCase() === "unhealthy"
                                ? "bg-yellow-100 text-yellow-600"
                                : "bg-gray-100 text-gray-600"
                        }`}>
                          {horseStatus}
                        </span>
                      </div>
                      <div className="flex items-center justify-center">
                        <button
                          className="inline-flex items-center justify-center gap-1 bg-transparent text-blue-700 border border-blue-700 py-1.5 px-3 rounded text-xs font-medium cursor-pointer transition-all hover:bg-blue-100 min-h-[32px] w-full max-w-[80px]"
                          onClick={() => viewHorseDetails(horse)}
                        >
                          <Eye size={16} />
                          View
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {!loading && filteredHorseRecords().length > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                totalItems={filteredHorseRecords().length}
                itemsPerPage={itemsPerPage}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            )}
          </>
        )}
      </div>
    </>
  );

  const renderCurrentView = () => {
    if (detailLoading) {
      switch (currentView) {
        case 'horse':
          return <HorseDetailSkeleton />;
        case 'medical':
          return <MedicalRecordDetailSkeleton />;
        case 'treatment':
          return <TreatmentHistoryDetailSkeleton />;
        default:
          return renderListView();
      }
    }

    switch (currentView) {
      case 'list':
        return renderListView();
      case 'horse':
        return (
          <HorseDetailView
            horse={selectedHorse}
            onBack={backToList}
            onViewMedicalRecord={viewMedicalRecord}
            onViewTreatmentHistory={viewTreatmentHistory}
          />
        );
      case 'medical':
        return (
          <MedicalRecordDetailView
            horse={selectedHorse}
            medicalRecord={selectedMedicalRecord}
            onBack={backToHorse}
            onExportPDF={handleExportPDF}
          />
        );
      case 'treatment':
        return (
          <TreatmentHistoryDetailView
            treatmentHistory={selectedTreatmentHistory}
            horse={selectedHorse}
            onBack={backToHorse}
            onExportPDF={handleExportPDF}
          />
        );
      default:
        return renderListView();
    }
  };

  return (
    <div className="font-sans bg-gray-100 flex h-screen overflow-x-hidden w-full">
      <div className="sidebars" id="sidebars">
        <Sidebar isOpen={isSidebarOpen} ref={sidebarRef} />
      </div>

      <div className="flex-1 flex flex-col w-full md:w-[calc(100%-250px)]">
        <header className="flex items-center bg-white p-5 border-b border-gray-200 shadow-md sticky top-0 z-10 justify-between">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-[#0F3D5A]">
              {currentView === 'list' && 'Horse Records'}
              {currentView === 'horse' && 'Horse Details'}
              {currentView === 'medical' && 'Medical Record Details'}
              {currentView === 'treatment' && 'Treatment History Details'}
            </h2>
            <p className="text-sm text-gray-600 mt-1 font-normal">
              {currentView === 'list' && 'Manage and view all horse medical records and treatment histories'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="relative bg-transparent border-none cursor-pointer p-2 rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh Data"
            >
              <RefreshCw 
                size={24} 
                color="#374151" 
                className={isRefreshing ? "animate-spin" : ""}
              />
            </button>

            {/* Notification Bell */}
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
          {renderCurrentView()}
        </div>
      </div>

      <FloatingMessages />
    </div>
  )
}

export default DvmfHorseRecord