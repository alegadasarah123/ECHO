"use client"
import Sidebar from "@/components/CtuSidebar"
import { jsPDF } from "jspdf"

import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  Search,
  Stethoscope,
  Syringe,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import FloatingMessages from "./CtuMessage"
import NotificationModal from "./CtuNotif"

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
      pdf.text("CTU Veterinary Medicine System", 200, 290, { align: "right" });
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

      <div className="flex items-center mb-5 flex-wrap gap-4">
        <div className="w-12 h-12 rounded-full bg-gray-300 mr-4 flex items-center justify-center font-semibold text-gray-500 flex-shrink-0">
          {horse?.horse_name?.charAt(0) || "H"}
        </div>
        <div className="profile-info">
          <h4 className="text-base font-semibold text-gray-900 mb-1">{horse?.horse_name || "Horse"}</h4>
          <span className={`inline-block py-0.5 px-2 rounded-xl text-xs font-medium ${
            medicalRecord.medrec_horsestatus?.toLowerCase() === "healthy" 
              ? "bg-green-100 text-green-800"
              : medicalRecord.medrec_horsestatus?.toLowerCase() === "sick"
                ? "bg-red-100 text-red-600"
                : medicalRecord.medrec_horsestatus?.toLowerCase() === "unhealthy"
                  ? "bg-yellow-100 text-yellow-600"
                  : "bg-gray-100 text-gray-600"
          }`}>
            {medicalRecord.medrec_horsestatus || "No Status"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 mb-0.5">Breed</span>
          <div className="text-sm text-gray-900 font-medium">{horse?.horse_breed || "N/A"}</div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 mb-0.5">Age</span>
          <div className="text-sm text-gray-900 font-medium">{horse?.horse_age || "N/A"}</div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 mb-0.5">Sex</span>
          <div className="text-sm text-gray-900 font-medium">{horse?.horse_sex || "N/A"}</div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 mb-0.5">Owner</span>
          <div className="text-sm text-gray-900 font-medium">{horse?.owner_fullname || "N/A"}</div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 mb-0.5">Contact</span>
          <div className="text-sm text-gray-900 font-medium">{horse?.owner_phone || "N/A"}</div>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 mb-0.5">Location</span>
          <div className="text-sm text-gray-900 font-medium">{horse?.location || "N/A"}</div>
        </div>
      </div>

      <div className="mb-6">
        <h5 className="text-base font-semibold text-red-700 mb-4 border-b-2 border-gray-200 pb-1.5">
          Medical Record Details
        </h5>

        {/* Information Section */}
        <div className="bg-blue-50 rounded-lg p-4 mb-5">
          <div className="text-sm font-semibold text-red-700 mb-3">Information</div>
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
            <div className="text-sm mb-2">
              <strong>Recommendation:</strong> {medicalRecord.medrec_recommendation || "N/A"}
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
          <div className="text-sm font-semibold text-red-700 mb-3">Treatment Record</div>
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
            <div className="text-sm mb-2">
              <strong>Recommendation:</strong> {treatmentHistory.medrec_recommendation || "N/A"}
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
          <div className="text-sm font-semibold text-red-700 mb-3">Treatment Details</div>
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

      <div className="bg-gray-50 rounded-lg p-5 mb-5">
        <div className="flex items-center mb-5 flex-wrap gap-4">
          <div className="w-15 h-15 rounded-full bg-gray-300 mr-5 flex-shrink-0 flex items-center justify-center text-2xl font-semibold text-gray-500">
            {horse.horse_name ? horse.horse_name.charAt(0) : "?"}
          </div>
          <div className="horse-basic-info">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{horse.horse_name}</h3>
            <div className="text-sm text-gray-500">
              <span>Age: {horse.horse_age || "N/A"}</span> • <span>Breed: {horse.horse_breed || "N/A"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1 font-medium">Owner</span>
            <span className="text-sm text-gray-900 font-medium">{horse.owner_fullname || "N/A"}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1 font-medium">Location</span>
            <span className="text-sm text-gray-900 font-medium">{horse.location || "N/A"}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1 font-medium">Sex</span>
            <span className="text-sm text-gray-900 font-medium">{horse.horse_sex || "N/A"}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1 font-medium">Color</span>
            <span className="text-sm text-gray-900 font-medium">{horse.horse_color || "N/A"}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1 font-medium">Weight</span>
            <span className="text-sm text-gray-900 font-medium">{displayWeight()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500 mb-1 font-medium">Height</span>
            <span className="text-sm text-gray-900 font-medium">{displayHeight()}</span>
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

      {/* UPDATED TREATMENT HISTORY SECTION */}
      <div className="text-base font-semibold text-gray-900 mb-4">Treatment History</div>
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Updated header with 5 columns - Color removed and Remark/Administered By swapped */}
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
              {/* Remark column (now before Administered By) - No color for "Completed" */}
              <div className="flex items-center">
                <span className="text-sm text-gray-900">{treatment.treatment_remark || "N/A"}</span>
              </div>
              {/* Administered By column (now after Remark) */}
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

// Main component
function CtuHorseRecord() {
  const navigate = useNavigate()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [currentView, setCurrentView] = useState('list')
  const [loading, setLoading] = useState(false)
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

  const notificationBellRef = useRef(null)
  const notificationDropdownRef = useRef(null)
  const sidebarRef = useRef(null)

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

  useEffect(() => {
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
      // UPDATED: Use horse.horse_status directly instead of checking medical records
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

  const viewHorseDetails = (horse) => {
    setSelectedHorse(horse)
    setCurrentView('horse')
  }

  const viewMedicalRecord = (horse, record) => {
    setSelectedHorse(horse)
    setSelectedMedicalRecord(record)
    setCurrentView('medical')
  }

  const viewTreatmentHistory = (record) => {
    setSelectedTreatmentHistory(record)
    setCurrentView('treatment')
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
    loadNotifications()
  }, [loadNotifications])

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

  useEffect(() => {
    const fetchHorses = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("http://127.0.0.1:8000/api/ctu_vetmed/get_horses/")
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
    fetchHorses()
  }, [])

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
                  // UPDATED: Use horse.horse_status directly from the horse object
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

  return (
    <div className="font-sans bg-gray-100 flex h-screen overflow-x-hidden w-full">
      <div className="sidebars" id="sidebars">
        <Sidebar isOpen={isSidebarOpen} ref={sidebarRef} />
      </div>

      <div className="flex-1 flex flex-col w-full md:w-[calc(100%-250px)]">
        <header className="bg-white px-6 py-4 flex items-center justify-between shadow-sm flex-wrap gap-4">
          <div className="dashboard-container">
            <h2 className="text-xl font-bold text-black">
              {currentView === 'list' && 'Horse Records'}
              {currentView === 'horse' && 'Horse Details'}
              {currentView === 'medical' && 'Medical Record Details'}
              {currentView === 'treatment' && 'Treatment History Details'}
            </h2>
          </div>

          <button
            className="relative bg-transparent border-none cursor-pointer p-2 rounded-full"
            onClick={() => setNotifsOpen(!notifsOpen)}
          >
            <Bell size={24} color="#374151" />
            {notifications.length > 0 && (
              <span className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full px-1.5 py-0.5 text-xs font-bold min-w-[15px] h-[15px] flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>

          <NotificationModal
            isOpen={notifsOpen}
            onClose={() => setNotifsOpen(false)}
            notifications={notifications.map((n) => ({
              message: n.message,
              date: n.date,
            }))}
          />
        </header>

        <div className="flex-1 p-6 bg-gray-100 overflow-y-auto">
          {currentView === 'list' && renderListView()}
          {currentView === 'horse' && (
            <HorseDetailView
              horse={selectedHorse}
              onBack={backToList}
              onViewMedicalRecord={viewMedicalRecord}
              onViewTreatmentHistory={viewTreatmentHistory}
            />
          )}
          {currentView === 'medical' && (
            <MedicalRecordDetailView
              horse={selectedHorse}
              medicalRecord={selectedMedicalRecord}
              onBack={backToHorse}
              onExportPDF={handleExportPDF}
            />
          )}
          {currentView === 'treatment' && (
            <TreatmentHistoryDetailView
              treatmentHistory={selectedTreatmentHistory}
              horse={selectedHorse}
              onBack={backToHorse}
              onExportPDF={handleExportPDF}
            />
          )}
        </div>
      </div>

      <FloatingMessages />
    </div>
  )
}

export default CtuHorseRecord