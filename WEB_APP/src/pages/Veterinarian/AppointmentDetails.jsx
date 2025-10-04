import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import {
  Bell, FileText, Heart, Thermometer, Activity, Calendar, User, Phone, Mail, MapPin, 
  Plus, X, Upload, Image, AlertCircle, Lock, Key, Search, Filter, Eye, ClipboardList, 
  StickyNote, Shield, RefreshCw, CheckCircle, Edit
} from "lucide-react";
import MedicalRecords from "./MedicalRecord";
import TreatmentRecords from "./TreatmentRecord";
import MedicalRecordDetails from "./MedicalRecordDetails";

// Success Message Component
const SuccessMessage = ({ message, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-2000 animate-fade-in-down">
      <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-xl shadow-lg flex items-center">
        <CheckCircle className="w-5 h-5 mr-2" />
        <span>{message}</span>
        <button 
          onClick={onDismiss}
          className="ml-4 text-green-700 hover:text-green-900"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Error Message Component with Retry
const ErrorMessage = ({ error, onRetry, onDismiss }) => {
  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl relative mb-4">
      <div className="flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span>{error}</span>
      </div>
      <div className="flex gap-2 mt-2">
        <Button 
          onClick={onRetry}
          size="sm"
          className="cursor-pointer bg-red-600 hover:bg-red-700 text-white"
        >
          <RefreshCw className="w-4 h-4 mr-1" />
          Retry
        </Button>
        <Button 
          onClick={onDismiss}
          variant="outline"
          size="sm"
          className="cursor-pointer border-red-300 text-red-700 hover:bg-red-50"
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
};

// Add Record Button Component
const AddRecordButton = ({ onClick, hasAccess, accessRequested, onRequestAccess, className = "" }) => {
  const [isHovered, setIsHovered] = useState(false);
  if (accessRequested) {
    return null; 
  }

  if (!hasAccess) {
    return (
      <div className={`relative inline-flex ${className}`}>
        <Button 
          onClick={onRequestAccess}
          className="cursor-pointer px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl text-white shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Shield className="w-4 h-4 mr-2" />
          Request Access
        </Button>
      </div>
    );
  }

  return (
    <div 
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Button 
        onClick={onClick}
        className="cursor-pointer px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl text-white shadow-sm hover:shadow-md transition-all duration-200 group"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Record
      </Button>
      
      {/* Hover Tooltip */}
      {isHovered && (
        <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-md whitespace-nowrap z-10">
          Add Medical Record
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-2 h-2 bg-gray-800 rotate-45"></div>
        </div>
      )}
    </div>
  );
};

// Access Request Modal Component
const AccessRequestModal = ({ isOpen, onClose, onRequestAccess, horseInfo }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-1000 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">Access Required</h3>
        </div>
        
        <p className="text-gray-600 mb-4">
          You need permission to access {horseInfo?.name || "this horse"}'s medical records.
          An access request will be sent to the administrator.
        </p>
        
        <p className="text-sm text-gray-500 mb-6">
          You'll be able to view records once your request is approved.
        </p>
        
        <div className="flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="cursor-pointer px-4 py-2 border-gray-300 hover:bg-gray-100 rounded-xl"
          >
            Cancel
          </Button>
          <Button 
            onClick={onRequestAccess}
            className="cursor-pointer px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white"
          >
            Request Access
          </Button>
        </div>
      </div>
    </div>
  );
};

// Medical Records Modal Component - ONLY FOR ADDING/EDITING
const MedicalRecordsModal = ({ isOpen, onClose, record, vetProfile, horseInfo, onRefresh, isNew, appointmentId, hasAccess, isViewMode }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-1000 p-4 overflow-auto">
      <MedicalRecords 
        medicalRecords={[]} 
        vetProfile={vetProfile} 
        horseInfo={horseInfo} 
        onRefresh={onRefresh}
        recordData={isNew ? null : record}
        isModal={true}
        onCloseModal={onClose}
        appointmentId={appointmentId}
        hasAccess={hasAccess}
        isViewMode={isViewMode}
      />
    </div>
  );
};

// Treatment Records Modal Component
const TreatmentRecordsModal = ({ isOpen, onClose, record, vetProfile, horseInfo, onRefresh, isNew, hasAccess }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-1000 p-4 overflow-auto">
      <div className="p-6">
        <TreatmentRecords 
          treatmentRecords={[]} 
          vetProfile={vetProfile} 
          horseInfo={horseInfo} 
          onRefresh={onRefresh}
          recordData={isNew ? null : record}
          isModal={true}
          onCloseModal={onClose}
          hasAccess={hasAccess}
        />
      </div>
    </div>
  );
};

// Pagination Component
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  const pages = [];
  const maxVisiblePages = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  
  return (
    <div className="flex items-center justify-center mt-6">
      <nav className="flex items-center gap-2">
        <Button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          variant="outline"
          size="sm"
          className="cursor-pointer"
        >
          Previous
        </Button>
        
        {startPage > 1 && (
          <>
            <Button
              onClick={() => onPageChange(1)}
              variant="outline"
              size="sm"
              className="cursor-pointer"
            >
              1
            </Button>
            {startPage > 2 && <span className="px-2">...</span>}
          </>
        )}
        
        {pages.map(page => (
          <Button
            key={page}
            onClick={() => onPageChange(page)}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            className="cursor-pointer"
          >
            {page}
          </Button>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-2">...</span>}
            <Button
              onClick={() => onPageChange(totalPages)}
              variant="outline"
              size="sm"
              className="cursor-pointer"
            >
              {totalPages}
            </Button>
          </>
        )}
        
        <Button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          variant="outline"
          size="sm"
          className="cursor-pointer"
        >
          Next
        </Button>
      </nav>
    </div>
  );
};

// Medical Records Table Component - UPDATED WITH INLINE VIEW
const MedicalRecordsTable = ({ records, onRefresh, vetProfile, horseInfo, onAddRecord, onEditRecord, hasAccess, onRequestAccess, accessRequested }) => {
  const [filteredRecords, setFilteredRecords] = useState(records || []);
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRecordId, setExpandedRecordId] = useState(null); // Track which record is expanded
  const recordsPerPage = 5;

  useEffect(() => {
    setFilteredRecords(records || []);
    setCurrentPage(1);
  }, [records]);

  const handleDateFilter = () => {
    const recordsArray = records || [];
    if (!dateFilter.from && !dateFilter.to) {
      setFilteredRecords(recordsArray);
      return;
    }

    const filtered = recordsArray.filter(record => {
      const recordDate = new Date(record.date);
      const fromDate = dateFilter.from ? new Date(dateFilter.from) : null;
      const toDate = dateFilter.to ? new Date(dateFilter.to) : null;
      
      if (fromDate && toDate) {
        return recordDate >= fromDate && recordDate <= toDate;
      } else if (fromDate) {
        return recordDate >= fromDate;
      } else if (toDate) {
        return recordDate <= toDate;
      }
      return true;
    });

    setFilteredRecords(filtered);
    setCurrentPage(1);
  };

  const clearFilter = () => {
    setDateFilter({ from: "", to: "" });
    setFilteredRecords(records || []);
    setCurrentPage(1);
  };

  // Check if record belongs to current vet
  const isCurrentVetRecord = (record) => {
    if (!vetProfile || !record.veterinarian) return false;
    const currentVetName = `${vetProfile.first_name} ${vetProfile.last_name}`;
    return record.veterinarian === currentVetName;
  };

  // Handle view details click
  const handleViewDetails = (recordId) => {
    if (expandedRecordId === recordId) {
      setExpandedRecordId(null); // Collapse if already expanded
    } else {
      setExpandedRecordId(recordId); // Expand the clicked record
    }
  };

  // Calculate pagination
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    setExpandedRecordId(null); // Collapse details when changing page
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-xl">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Medical Records</h3>
            <p className="text-sm text-gray-500">
              {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
        
        {hasAccess && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={dateFilter.from}
                  onChange={(e) => setDateFilter({...dateFilter, from: e.target.value})}
                  className="bg-transparent text-sm outline-none min-w-[120px]"
                  placeholder="From"
                />
              </div>
              
              <span className="text-gray-400">to</span>
              
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={dateFilter.to}
                  onChange={(e) => setDateFilter({...dateFilter, to: e.target.value})}
                  className="bg-transparent text-sm outline-none min-w-[120px]"
                  placeholder="To"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleDateFilter} 
                className="cursor-pointer text-white px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              
              {(dateFilter.from || dateFilter.to) && (
                <Button 
                  onClick={clearFilter} 
                  variant="outline" 
                  className="cursor-pointer px-4 py-2 rounded-xl border-gray-300 hover:bg-gray-50"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {!hasAccess ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
          <p className="mb-3 text-lg font-medium">
            {accessRequested 
              ? "Access Request Pending" 
              : "Access Required"
            }
          </p>
          <p className="mb-6 max-w-md mx-auto text-gray-600">
            {accessRequested 
              ? "Your request to view medical records is pending administrator approval."
              : "You need permission to view this horse's medical records."
            }
          </p>
          <AddRecordButton 
            onClick={onAddRecord}
            hasAccess={hasAccess}
            accessRequested={accessRequested}
            onRequestAccess={onRequestAccess}
          />   
     </div>
      ) : (filteredRecords.length === 0) ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <FileText className="w-8 h-8 text-blue-400" />
          </div>
          <p className="mb-3 text-lg font-medium text-gray-600">No medical records found</p>
          <p className="mb-6 text-gray-500">Get started by adding the first medical record</p>
          <AddRecordButton 
            onClick={onAddRecord}
            hasAccess={hasAccess}
            accessRequested={accessRequested}
            onRequestAccess={onRequestAccess}
          />        
      </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-600">Showing {currentRecords.length} of {filteredRecords.length} records</p>

            <AddRecordButton 
              onClick={onAddRecord}
              hasAccess={hasAccess}
              accessRequested={accessRequested}
              onRequestAccess={onRequestAccess}
            />
          </div>
          
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Clinical Signs</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Diagnosis</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Veterinarian</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentRecords.map((record, index) => {
                  const isCurrentVet = isCurrentVetRecord(record);
                  const isExpanded = expandedRecordId === record.id;
                  
                  return (
                    <React.Fragment key={index}>
                      <tr 
                        className={`
                          transition-all duration-200 group
                          ${isCurrentVet 
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500' 
                            : 'hover:bg-gray-50'
                          }
                          ${isExpanded ? 'bg-blue-25' : ''}
                        `}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors duration-200 ${
                              isCurrentVet ? 'bg-blue-100' : 'bg-gray-50'
                            }`}>
                              <Calendar className={`w-4 h-4 ${isCurrentVet ? 'text-blue-600' : 'text-gray-600'}`} />
                            </div>
                            <div>
                              <div className={`font-medium ${isCurrentVet ? 'text-blue-900' : 'text-gray-900'}`}>
                                {new Date(record.date).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'short', 
                                  day: 'numeric' 
                                })}
                              </div>
                              <div className={`text-sm ${isCurrentVet ? 'text-blue-700' : 'text-gray-500'}`}>
                                {new Date(record.date).toLocaleDateString('en-US', { 
                                  weekday: 'short' 
                                })}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <div className={`font-medium line-clamp-2 ${isCurrentVet ? 'text-blue-900' : 'text-gray-900'}`}>
                            {record.clinicalSigns || "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-xs">
                          <div className={`font-medium line-clamp-2 ${isCurrentVet ? 'text-blue-900' : 'text-gray-900'}`}>
                            {record.diagnosis || "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isCurrentVet ? 'bg-blue-200' : 'bg-green-100'
                            }`}>
                              <User className={`w-3 h-3 ${isCurrentVet ? 'text-blue-700' : 'text-green-600'}`} />
                            </div>
                            <span className={`font-medium ${isCurrentVet ? 'text-blue-900' : 'text-gray-900'}`}>
                              {record.veterinarian || "N/A"}
                              {isCurrentVet && (
                                <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                  You
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <Button 
                              onClick={() => handleViewDetails(record.id)}
                              variant="outline" 
                              size="sm"
                              className={`
                                cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 shadow-sm hover:shadow-md
                                ${isCurrentVet 
                                  ? 'border-blue-300 bg-white hover:bg-blue-50 hover:border-blue-400 text-blue-700' 
                                  : 'border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 text-gray-700'
                                }
                                ${isExpanded ? 'bg-blue-100 border-blue-400' : ''}
                              `}
                            >
                              <Eye className="w-4 h-4" />
                              <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                            </Button>
                          </div>
                        </td>                  
                      </tr>
                      
                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan="5" className="p-0">
                            <MedicalRecordDetails 
                              record={record}
                              onClose={() => setExpandedRecordId(null)}
                              onEdit={onEditRecord}
                              vetProfile={vetProfile}
                              horseInfo={horseInfo}
                              hasAccess={hasAccess}
                              medicalRecords={records} // Add this line to pass all records for follow-up checking
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
};

// Treatment Records Table Component
const TreatmentRecordsTable = ({ records, onRefresh, vetProfile, horseInfo, onViewRecord, hasAccess }) => {
  const [filteredRecords, setFilteredRecords] = useState(records || []);
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 5;

  useEffect(() => {
    setFilteredRecords(records || []);
    setCurrentPage(1);
  }, [records]);

  const handleDateFilter = () => {
    const recordsArray = records || [];
    if (!dateFilter.from && !dateFilter.to) {
      setFilteredRecords(recordsArray);
      return;
    }

    const filtered = recordsArray.filter(record => {
      const recordDate = new Date(record.followUpDate || record.date);
      const fromDate = dateFilter.from ? new Date(dateFilter.from) : null;
      const toDate = dateFilter.to ? new Date(dateFilter.to) : null;
      
      if (fromDate && toDate) {
        return recordDate >= fromDate && recordDate <= toDate;
      } else if (fromDate) {
        return recordDate >= fromDate;
      } else if (toDate) {
        return recordDate <= toDate;
      }
      return true;
    });

    setFilteredRecords(filtered);
    setCurrentPage(1);
  };

  const clearFilter = () => {
    setDateFilter({ from: "", to: "" });
    setFilteredRecords(records || []);
    setCurrentPage(1);
  };

  // Check if record belongs to current vet
  const isCurrentVetRecord = (record) => {
    if (!vetProfile || !record.veterinarian) return false;
    const currentVetName = `${vetProfile.first_name} ${vetProfile.last_name}`;
    return record.veterinarian === currentVetName;
  };

  // Calculate pagination
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-300">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-xl">
            <Activity className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">Treatment Records</h3>
            <p className="text-sm text-gray-500">
              {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
        
        {hasAccess && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={dateFilter.from}
                  onChange={(e) => setDateFilter({...dateFilter, from: e.target.value})}
                  className="bg-transparent text-sm outline-none min-w-[120px]"
                  placeholder="From"
                />
              </div>
              
              <span className="text-gray-400">to</span>
              
              <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input
                  type="date"
                  value={dateFilter.to}
                  onChange={(e) => setDateFilter({...dateFilter, to: e.target.value})}
                  className="bg-transparent text-sm outline-none min-w-[120px]"
                  placeholder="To"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleDateFilter} 
                className="cursor-pointer text-white px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
              
              {(dateFilter.from || dateFilter.to) && (
                <Button 
                  onClick={clearFilter} 
                  variant="outline" 
                  className="cursor-pointer px-4 py-2 rounded-xl border-gray-300 hover:bg-gray-50"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {!hasAccess ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
          <p className="mb-3 text-lg font-medium">Access Required</p>
          <p className="mb-3 text-gray-600">You don't have access to view treatment records</p>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Treatment records become available once medical record access is approved by the administrator.
          </p>
        </div>
      ) : (filteredRecords.length === 0) ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-100">
            <Activity className="w-8 h-8 text-green-400" />
          </div>
          <p className="mb-3 text-lg font-medium text-gray-600">No treatment records found</p>
          <p className="text-gray-500">Treatment records will appear here once they are added to medical records.</p>
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-600">Showing {currentRecords.length} of {filteredRecords.length} records</p>
          </div>
          
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Follow-up Date</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Diagnosis</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Medication</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Dosage</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Duration</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentRecords.map((record, index) => {
                  const isCurrentVet = isCurrentVetRecord(record);
                  return (
                    <tr 
                      key={index} 
                      className={`
                        transition-all duration-200 group
                        ${isCurrentVet 
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-l-green-500' 
                          : 'hover:bg-gray-50'
                        }
                      `}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:bg-green-100 transition-colors duration-200 ${
                            isCurrentVet ? 'bg-green-100' : 'bg-gray-50'
                          }`}>
                            <Calendar className={`w-4 h-4 ${isCurrentVet ? 'text-green-600' : 'text-gray-600'}`} />
                          </div>
                          <div>
                            <div className={`font-medium ${isCurrentVet ? 'text-green-900' : 'text-gray-900'}`}>
                              {record.followUpDate ? new Date(record.followUpDate).toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              }) : "No Follow-up"}
                            </div>
                            <div className={`text-sm ${isCurrentVet ? 'text-green-700' : 'text-gray-500'}`}>
                              {record.followUpDate ? new Date(record.followUpDate).toLocaleDateString('en-US', { 
                                weekday: 'short' 
                              }) : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`font-medium max-w-xs line-clamp-2 ${isCurrentVet ? 'text-green-900' : 'text-gray-900'}`}>
                          {record.diagnosis || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isCurrentVet ? 'bg-green-200' : 'bg-blue-100'
                          }`}>
                            <Activity className={`w-3 h-3 ${isCurrentVet ? 'text-green-700' : 'text-blue-600'}`} />
                          </div>
                          <span className={`font-medium ${isCurrentVet ? 'text-green-900' : 'text-gray-900'}`}>
                            {record.name || "N/A"}
                            {isCurrentVet && (
                              <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                                You
                              </span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`font-medium ${isCurrentVet ? 'text-green-900' : 'text-gray-900'}`}>
                          {record.dosage || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`font-medium ${isCurrentVet ? 'text-green-900' : 'text-gray-900'}`}>
                          {record.duration || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <Button 
                            onClick={() => onViewRecord(record)}
                            variant="outline" 
                            size="sm"
                            className={`
                              cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 shadow-sm hover:shadow-md
                              ${isCurrentVet 
                                ? 'border-green-300 bg-white hover:bg-green-50 hover:border-green-400 text-green-700' 
                                : 'border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 text-gray-700'
                              }
                            `}
                          >
                            <Eye className="w-4 h-4" />
                            <span>View Details</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </>
      )}
    </div>
  );
};

const AppointmentDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams(); 

  const [vetProfile, setVetProfile] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [horseInfo, setHorseInfo] = useState(null);
  const [ownerInfo, setOwnerInfo] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [treatmentRecords, setTreatmentRecords] = useState([]);
  const [activeTab, setActiveTab] = useState("medical");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Modal states - NOW ONLY FOR ADDING/EDITING
  const [medicalModalOpen, setMedicalModalOpen] = useState(false);
  const [treatmentModalOpen, setTreatmentModalOpen] = useState(false);
  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState(null);
  const [selectedTreatmentRecord, setSelectedTreatmentRecord] = useState(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  // Access control states
  const [hasAccess, setHasAccess] = useState(false);
  const [accessRequested, setAccessRequested] = useState(false);
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    fetchVetProfile();
    fetchAppointmentDetails();
  }, [id]);

  const fetchVetProfile = async () => {
    try {
      const response = await fetch(
        "http://localhost:8000/api/veterinarian/vet_profile/",
        { method: "GET", credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch profile");
      const data = await response.json();
      setVetProfile(data.profile);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAppointmentDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(
        `http://localhost:8000/api/veterinarian/get_appointment_details/${id}/`,
        { method: "GET", credentials: "include" }
      );
      if (!response.ok) throw new Error("Failed to fetch appointment");
      const data = await response.json();

      setAppointment(data.appointment || {});
      setHorseInfo(data.horseInfo || {});
      setOwnerInfo(data.ownerInfo || {});
      setMedicalRecords(data.medical_records || []);
      setTreatmentRecords(data.treatment_records || []);  

      // Check access status for this horse
      await checkAccessStatus(data.horseInfo?.id);

    } catch (err) {
      console.error(err);
      setError("Failed to load appointment details");
    } finally {
      setLoading(false);
      setCheckingAccess(false);
    }
  };

  const checkAccessStatus = async (horseId) => {
    if (!horseId) {
      setHasAccess(false);
      return;
    }
    
    try {
      const response = await fetch(
        `http://localhost:8000/api/veterinarian/check_horse_access/${horseId}/`,
        { method: "GET", credentials: "include" }
      );
      
      if (response.ok) {
        const data = await response.json();
        const accessGranted = data.has_access || false;
        setHasAccess(accessGranted);
        setAccessRequested(data.access_requested || false);
        
        // Automatically fetch both medical and treatment records if access is granted
        if (accessGranted && horseId) {
          await fetchMedicalRecords(horseId);
          await fetchTreatmentRecords(horseId);
        }
      } else {
        setHasAccess(false);
      }
    } catch (err) {
      console.error("Error checking access status:", err);
      setHasAccess(false);
    }
  };

  const requestAccess = async () => {
    if (!horseInfo?.id) return;
    
    try {
      const response = await fetch(
        `http://localhost:8000/api/veterinarian/request_horse_access/${horseInfo.id}/`,
        { 
          method: "POST", 
          credentials: "include",
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.ok) {
        setAccessRequested(true);
        setAccessModalOpen(false);
        setSuccessMessage("Access request sent successfully!");
      } else {
        setError("Failed to request access");
      }
    } catch (err) {
      console.error("Error requesting access:", err);
      setError("Failed to request access");
    }
  };

  const fetchMedicalRecords = async (horseId) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/veterinarian/get_horse_medical_records/${horseId}/`,
        { method: "GET", credentials: "include" }
      );
      
      if (!response.ok) throw new Error("Failed to fetch medical records");
      
      const data = await response.json();
      setMedicalRecords(data.medicalRecords || data.medical_records || []);
    } catch (err) {
      console.error("Error fetching medical records:", err);
      setMedicalRecords([]);
    }
  };

  const fetchTreatmentRecords = async (horseId) => {
    try {
      const response = await fetch(
        `http://localhost:8000/api/veterinarian/get_horse_treatment_records/${horseId}/`,
        { method: "GET", credentials: "include" }
      );
      
      if (!response.ok) throw new Error("Failed to fetch treatment records");
      
      const data = await response.json();
      setTreatmentRecords(data.treatmentRecords || data.treatment_records || []);
    } catch (err) {
      console.error("Error fetching treatment records:", err);
      setTreatmentRecords([]);
    }
  };

  // FIXED: Updated handlers for new functionality
  const handleAddRecord = () => {
    if (!hasAccess) {
      setAccessModalOpen(true);
      return;
    }
    
    setSelectedMedicalRecord(null);
    setIsNewRecord(true);
    setIsViewMode(false);
    setMedicalModalOpen(true);
  };

  const handleEditRecord = (record) => {
    setSelectedMedicalRecord(record);
    setIsNewRecord(false);
    setIsViewMode(false);
    setMedicalModalOpen(true);
  };

  // Handle treatment record view/add
  const handleTreatmentRecordAction = (record = null, isNew = false) => {
    if (!hasAccess) {
      setAccessModalOpen(true);
      return;
    }
    
    setSelectedTreatmentRecord(record);
    setIsNewRecord(isNew);
    setTreatmentModalOpen(true);
  };

  // Handle retry for failed operations
  const handleRetry = () => {
    setError(null);
    fetchAppointmentDetails();
  };

  // Handle dismiss error
  const handleDismissError = () => {
    setError(null);
  };

  // Handle dismiss success message
  const handleDismissSuccess = () => {
    setSuccessMessage(null);
  };

  // Format phone number for display
  const formatPhoneNumber = (phone) => {
    if (!phone) return "N/A";
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return phone;
  };

  // Skeleton Loader
  const renderSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-60 bg-gray-200 rounded-2xl"></div>
        <div className="h-60 bg-gray-200 rounded-2xl"></div>
      </div>
      <div className="h-80 bg-gray-200 rounded-2xl"></div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="flex-1 flex flex-col">
        {/* Back Button (top-left, no header container) */}
        <div className="px-6 pt-4">
          <Button
            onClick={() => navigate(-1)}
            className="cursor-pointer bg-gradient-to-r from-white to-gray-50 text-gray-700 px-6 py-3 rounded-2xl shadow-lg hover:shadow-xl border border-gray-200/50 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-300 hover:-translate-y-0.5"
          >
            ← Back to Appointments
          </Button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <SuccessMessage 
            message={successMessage} 
            onDismiss={handleDismissSuccess} 
          />
        )}

        {/* Main Content */}
        <main className="p-6 space-y-6 overflow-y-auto">
          {error && (
            <ErrorMessage 
              error={error} 
              onRetry={handleRetry} 
              onDismiss={handleDismissError} 
            />
          )}

          {/* Show Skeleton while loading */}
          {loading || checkingAccess ? (
            renderSkeleton()
          ) : (
            <>
              {/* Combined Horse + Owner Info + Appointment Details */}
              <Card className="bg-gradient-to-br from-white via-blue-50/30 shadow-lg rounded-2xl border border-white/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* Horse Information Section */}
                    <div className="flex flex-col md:flex-row items-start md:items-start space-x-0 md:space-x-6">
                      <div className="relative flex-shrink-0">
                        <img
                          src={horseInfo?.image || "/horse-placeholder.jpg"}
                          alt={horseInfo?.name || "Horse"}
                          className="w-32 h-32 md:w-40 md:h-40 rounded-xl object-cover shadow-md border-2 border-white"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/horse-placeholder.jpg";
                          }}
                        />
                        
                        {/* Status Badge */}
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                          <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full border border-green-200 shadow-sm">
                            {appointment?.status || "Active"}
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 mt-6 md:mt-0 flex flex-col justify-start text-left">
                        <h2 className="text-2xl font-bold text-gray-800">{horseInfo?.name || "Unknown Horse"}</h2>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-indigo-600 font-semibold">{horseInfo?.breed || "Unknown Breed"}</span>
                          <span className="text-gray-600">({horseInfo?.sex || "Unknown"})</span>
                        </div>
                        <span className="mt-1 block text-gray-700">{horseInfo?.color || "Unknown"} Coat</span>

                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-gray-600 text-sm mt-4">
                          <span>DOB: <strong>{horseInfo?.dob || "Unknown"}</strong></span>
                          <span>Age: <strong>{horseInfo?.age || "Unknown"}</strong></span>
                          <span>Height: <strong>{horseInfo?.height || "Unknown"}</strong></span>
                          <span>Weight: <strong>{horseInfo?.weight || "Unknown"}</strong></span>
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
                          {ownerInfo?.firstName || "Unknown"} {ownerInfo?.middleName || ""} {ownerInfo?.lastName || ""}
                        </p>

                        <div className="space-y-2">
                          <div className="flex items-center space-x-2 text-sm">
                            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Phone className="w-3 h-3 text-blue-600" />
                            </div>
                            <span className="text-gray-700">{formatPhoneNumber(ownerInfo?.phone)}</span>
                          </div>

                          <div className="flex items-center space-x-2 text-sm">
                            <div className="w-6 h-6 bg-green-100 rounded-lg flex items-center justify-center">
                              <MapPin className="w-3 h-3 text-green-600" />
                            </div>
                            <span className="text-gray-700">{ownerInfo?.address || "Address not available"}</span>
                          </div>

                          <div className="flex items-center space-x-2 text-sm">
                            <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Mail className="w-3 h-3 text-purple-600" />
                            </div>
                            <span className="text-gray-700">{ownerInfo?.email || "Email not available"}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              
                    {/* Chief Complaint */}
                    <div>
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                          <StickyNote className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">Chief Complaint</h2>
                      </div>
                      <div className="bg-amber-50/50 p-4 rounded-xl">
                        <p className="text-gray-800">
                          {appointment?.app_complain || "No chief complaint available for this appointment"}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabs for Medical and Treatment Records */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-200/50">
                <div className="flex border-b border-gray-200">
                  <button
                    className={`cursor-pointer px-6 py-3 font-medium text-sm rounded-t-lg transition-all ${
                      activeTab === "medical"
                        ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setActiveTab("medical")}
                  >
                    Medical Records
                  </button>
                  <button
                    className={`cursor-pointer px-6 py-3 font-medium text-sm rounded-t-lg transition-all ${
                      activeTab === "treatment"
                        ? "text-green-600 border-b-2 border-green-600 bg-green-50/50"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                    onClick={() => setActiveTab("treatment")}
                  >
                    Treatment Records
                  </button>
                </div>

                <div className="mt-4">
                  {activeTab === "medical" ? (
                    <MedicalRecordsTable
                      records={medicalRecords}
                      vetProfile={vetProfile}
                      horseInfo={horseInfo}
                      onRefresh={fetchAppointmentDetails}
                      onAddRecord={handleAddRecord}
                      onEditRecord={handleEditRecord} // Updated prop
                      hasAccess={hasAccess}
                      accessRequested={accessRequested}
                      onRequestAccess={() => setAccessModalOpen(true)}
                    />                  
                    ) : (
                    <TreatmentRecordsTable
                      records={treatmentRecords}
                      vetProfile={vetProfile}
                      horseInfo={horseInfo}
                      onRefresh={fetchAppointmentDetails}
                      onViewRecord={handleTreatmentRecordAction}
                      hasAccess={hasAccess}
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      <AccessRequestModal
        isOpen={accessModalOpen}
        onClose={() => setAccessModalOpen(false)}
        onRequestAccess={requestAccess}
        horseInfo={horseInfo}
      />
      
      {/* Medical Records Modal - NOW ONLY FOR ADDING/EDITING */}
      <MedicalRecordsModal
        isOpen={medicalModalOpen}
        onClose={() => {
          setMedicalModalOpen(false);
          setSelectedMedicalRecord(null);
          setIsViewMode(false);
        }}
        record={selectedMedicalRecord}
        vetProfile={vetProfile}
        horseInfo={horseInfo}
        onRefresh={() => {
          fetchAppointmentDetails();
          setMedicalModalOpen(false);
          setSelectedMedicalRecord(null);
          setIsViewMode(false);
        }}
        isNew={isNewRecord}
        isViewMode={isViewMode}
        appointmentId={id}
        hasAccess={hasAccess}
      />
      
      <TreatmentRecordsModal
        isOpen={treatmentModalOpen}
        onClose={() => {
          setTreatmentModalOpen(false);
          setSelectedTreatmentRecord(null);
        }}
        record={selectedTreatmentRecord}
        vetProfile={vetProfile}
        horseInfo={horseInfo}
        onRefresh={() => {
          fetchAppointmentDetails();
          setTreatmentModalOpen(false);
          setSelectedTreatmentRecord(null);
        }}
        isNew={isNewRecord}
        hasAccess={hasAccess}
      />
    </div>
  );
};

export default AppointmentDetails;