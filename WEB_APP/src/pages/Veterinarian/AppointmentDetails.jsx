import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import {
  Bell, FileText, Heart, Thermometer, Activity, Calendar, User, Phone, Mail, MapPin, 
  Plus, X, Upload, Image, AlertCircle, Lock, Key, Search, Filter, Eye, ClipboardList, 
  StickyNote, Shield, RefreshCw, CheckCircle, Edit, Minus, Loader, Stethoscope
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
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-1000 p-4">
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

// Medical Record Details Modal Component
const MedicalRecordDetailsModal = ({ isOpen, onClose, record, vetProfile, horseInfo, onRecordFollowUp }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-1000 p-4 overflow-auto">
      <MedicalRecordDetails 
        record={record}
        vetProfile={vetProfile}
        horseInfo={horseInfo}
        onClose={onClose}
        onRecordFollowUp={onRecordFollowUp}
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

// Medical Records Table Component - FIXED NESTED FOLLOW-UP RECORDS
const MedicalRecordsTable = ({ records, onRefresh, vetProfile, horseInfo, onAddRecord, onEditRecord, onViewRecord, hasAccess, onRequestAccess, accessRequested }) => {
  const [filteredRecords, setFilteredRecords] = useState(records || []);
  const [dateFilter, setDateFilter] = useState({ from: "", to: "" });
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRecords, setExpandedRecords] = useState({});
  const [loadingFollowUps, setLoadingFollowUps] = useState({});
  const [followUpRecords, setFollowUpRecords] = useState({});
  const [followUpCounts, setFollowUpCounts] = useState({}); // Track follow-up counts
  const [nestedFollowUps, setNestedFollowUps] = useState({}); // Track nested follow-up chains
  const recordsPerPage = 5;

  useEffect(() => {
    // Only show parent records initially (records without parentMedrecId)
    const parentRecords = (records || []).filter(record => !record.parentMedrecId);
    setFilteredRecords(parentRecords);
    setCurrentPage(1);
    
    // Auto-check for follow-up records for all parent records
    if (parentRecords.length > 0) {
      checkAllFollowUps(parentRecords);
    }
  }, [records]);

  // Recursive function to get ALL follow-ups in a chain (nested follow-ups)
  const getAllFollowUpsInChain = async (parentMedrecId) => {
    let allFollowUps = [];
    
    const getNestedFollowUps = async (medrecId, level = 0) => {
      try {
        const response = await fetch(
          `http://localhost:8000/api/veterinarian/get_followup_records/${medrecId}/`,
          { method: "GET", credentials: "include" }
        );
        
        if (response.ok) {
          const data = await response.json();
          const followUps = data.followup_records || [];
          
          for (const followUp of followUps) {
            // Add the follow-up with its nesting level
            allFollowUps.push({
              ...followUp,
              nestingLevel: level,
              rootParentId: parentMedrecId
            });
            
            // Recursively get follow-ups of this follow-up
            await getNestedFollowUps(followUp.id, level + 1);
          }
        }
      } catch (error) {
        console.error(`Error getting nested follow-ups for ${medrecId}:`, error);
      }
    };
    
    await getNestedFollowUps(parentMedrecId);
    return allFollowUps;
  };

  // Auto-check for follow-up records for all parent records
  const checkAllFollowUps = async (parentRecords) => {
    const countsMap = {};
    const nestedMap = {};
    
    // Check each parent record for follow-ups
    for (const record of parentRecords) {
      try {
        // Get ALL follow-ups in the chain (including nested ones)
        const allFollowUps = await getAllFollowUpsInChain(record.id);
        const count = allFollowUps.length;
        
        countsMap[record.id] = count;
        nestedMap[record.id] = allFollowUps;
        
        console.log(`✅ Auto-checked record ${record.id}: ${count} total follow-up(s) in chain`);
      } catch (error) {
        console.error(`Error checking follow-ups for record ${record.id}:`, error);
        countsMap[record.id] = 0;
        nestedMap[record.id] = [];
      }
    }
    
    setFollowUpCounts(countsMap);
    setNestedFollowUps(nestedMap);
  };

  // Fetch follow-up records for a parent record (including nested ones)
  const fetchFollowUpRecords = async (parentMedrecId) => {
    if (followUpRecords[parentMedrecId]) {
      // Already loaded, just toggle visibility
      toggleFollowUps(parentMedrecId);
      return;
    }

    setLoadingFollowUps(prev => ({ ...prev, [parentMedrecId]: true }));
    
    try {
      // Get ALL follow-ups in the chain
      const allFollowUps = await getAllFollowUpsInChain(parentMedrecId);
      
      console.log("📋 All follow-up records in chain:", allFollowUps);
      setFollowUpRecords(prev => ({
        ...prev,
        [parentMedrecId]: allFollowUps
      }));
      toggleFollowUps(parentMedrecId);
    } catch (error) {
      console.error("Error fetching follow-up records:", error);
    } finally {
      setLoadingFollowUps(prev => ({ ...prev, [parentMedrecId]: false }));
    }
  };

  // Toggle follow-up records visibility
  const toggleFollowUps = (recordId) => {
    setExpandedRecords(prev => ({
      ...prev,
      [recordId]: !prev[recordId]
    }));
  };

  // Check if record has follow-ups (based on parent_medrec_id)
  const hasFollowUps = (record) => {
    // This record can have follow-ups if it doesn't have a parentMedrecId (it's a parent)
    return !record.parentMedrecId;
  };

  // Get follow-up count for a parent record (including nested ones)
  const getFollowUpCount = (recordId) => {
    return followUpCounts[recordId] || 0;
  };

  // ✅ FIXED: Only show follow-up button if there ARE follow-up records for this parent
  const shouldShowFollowUpButton = (record) => {
    return record.isParent && 
           hasFollowUps(record) && 
           getFollowUpCount(record.id) > 0;
  };

  // Flatten records for display (parent + follow-ups when expanded)
  const getDisplayRecords = () => {
    const displayRecords = [];
    
    filteredRecords.forEach(record => {
      // Always add the parent record
      displayRecords.push({ 
        ...record, 
        isParent: true, 
        isFollowUp: false,
        hasFollowUps: hasFollowUps(record),
        followUpCount: getFollowUpCount(record.id),
        nestingLevel: 0
      });
      
      // Add follow-up records if expanded and loaded
      if (expandedRecords[record.id] && followUpRecords[record.id]) {
        console.log("🔄 Adding follow-up records for parent:", record.id, followUpRecords[record.id]);
        
        // Sort follow-ups by date to maintain chronological order
        const sortedFollowUps = [...followUpRecords[record.id]].sort((a, b) => 
          new Date(a.date) - new Date(b.date)
        );
        
        sortedFollowUps.forEach(followUp => {
          // Use the formatted data from backend directly
          displayRecords.push({ 
            ...followUp, 
            isParent: false, 
            isFollowUp: true,
            parentRecordId: record.id, // Always point to the original parent
            hasFollowUps: false,
            followUpCount: 0,
            nestingLevel: followUp.nestingLevel || 0
          });
        });
      }
    });
    
    console.log("📊 Display records:", displayRecords);
    return displayRecords;
  };

  const displayRecords = getDisplayRecords();
  
  // Calculate pagination using filteredRecords (parent records only)
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentParentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  const handleDateFilter = () => {
    const recordsArray = (records || []).filter(record => !record.parentMedrecId);
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
    // Only show parent records when clearing filter
    const parentRecords = (records || []).filter(record => !record.parentMedrecId);
    setFilteredRecords(parentRecords);
    setCurrentPage(1);
  };

  // Check if record belongs to current vet
  const isCurrentVetRecord = (record) => {
    if (!vetProfile || !record.veterinarian) return false;
    const currentVetName = `${vetProfile.first_name} ${vetProfile.last_name}`;
    return record.veterinarian === currentVetName;
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Get indentation style based on nesting level
  const getNestingStyle = (nestingLevel) => {
    const basePadding = 6; // px-6 = 1.5rem = 24px
    const indentPerLevel = 8; // 2rem = 32px per level
    const totalPadding = basePadding + (nestingLevel * indentPerLevel);
    return { paddingLeft: `${totalPadding}px` };
  };

  // Get border color based on nesting level
  const getNestingBorderColor = (nestingLevel) => {
    const colors = [
      'border-l-blue-300',   // Level 0 (first follow-up)
      'border-l-green-300',  // Level 1 
      'border-l-purple-300', // Level 2
      'border-l-orange-300', // Level 3
      'border-l-red-300',    // Level 4
    ];
    return colors[Math.min(nestingLevel, colors.length - 1)];
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
        
        {hasAccess && filteredRecords.length > 0 && (
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
          <p className="mb-6 text-gray-500">
            {dateFilter.from || dateFilter.to 
              ? "No records match your filter criteria. Try adjusting your filters." 
              : "No medical records available for this horse."
            }
          </p>
          
          {!(dateFilter.from || dateFilter.to) && (
            <Button 
              onClick={onAddRecord}
              className="cursor-pointer px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl text-white shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add First Record
            </Button>
          )}
          
          {(dateFilter.from || dateFilter.to) && (
            <Button 
              onClick={clearFilter} 
              variant="outline" 
              className="cursor-pointer px-4 py-2 rounded-xl border-gray-300 hover:bg-gray-50"
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-600">Showing {currentParentRecords.length} of {filteredRecords.length} medical records</p>

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
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Clinical Signs</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Diagnosis</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Veterinarian</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayRecords.map((record, index) => {
                  const isCurrentVet = isCurrentVetRecord(record);
                  const isFollowUpRecord = record.isFollowUp;
                  const isParentRecord = record.isParent;
                  const followUpCount = getFollowUpCount(record.id);
                  const nestingLevel = record.nestingLevel || 0;
                  
                  // ✅ FIXED: Only show button if there ARE follow-up records
                  const showFollowUpButton = shouldShowFollowUpButton(record);
                  
                  return (
                    <React.Fragment key={record.id || `followup-${index}`}>
                      <tr 
                        style={getNestingStyle(nestingLevel)}
                        className={`
                          transition-all duration-200 group
                          ${isCurrentVet 
                            ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-500' 
                            : 'hover:bg-gray-50'
                          }
                          ${isFollowUpRecord ? `bg-gray-50 border-l-4 ${getNestingBorderColor(nestingLevel)}` : ''}
                        `}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-2">
                            {isFollowUpRecord && (
                              <div 
                                className="w-2 h-2 bg-blue-500 rounded-full" 
                                title={`Follow-up level ${nestingLevel}`}
                              ></div>
                            )}
                            <div
                              className={`font-medium ${
                                isCurrentVet ? "text-blue-900" : "text-gray-900"
                              } ${isFollowUpRecord ? "text-gray-600" : ""}`}
                            >
                              {new Date(record.date).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                              {isFollowUpRecord && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                  Follow-up {nestingLevel > 0 ? `(${nestingLevel})` : ''}
                                </span>
                              )}
                              {/* ✅ FIXED: Show exact follow-up count */}
                              {isParentRecord && followUpCount > 0 && (
                                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                  Has {followUpCount} follow-up{followUpCount !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 max-w-xs text-center">
                          <div
                            className={`font-medium line-clamp-2 ${
                              isCurrentVet ? "text-blue-900" : "text-gray-900"
                            } ${isFollowUpRecord ? "text-gray-600" : ""}`}
                          >
                            {record.clinicalSigns || "N/A"}
                          </div>
                        </td>

                        <td className="px-6 py-4 max-w-xs text-center">
                          <div
                            className={`font-medium line-clamp-2 ${
                              isCurrentVet ? "text-blue-900" : "text-gray-900"
                            } ${isFollowUpRecord ? "text-gray-600" : ""}`}
                          >
                            {record.diagnosis || "N/A"}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span
                            className={`font-medium ${
                              isCurrentVet ? "text-blue-900" : "text-gray-900"
                            } ${isFollowUpRecord ? "text-gray-600" : ""}`}
                          >
                            {record.veterinarian || "N/A"}
                            {isCurrentVet && !isFollowUpRecord && (
                              <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                You
                              </span>
                            )}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            {/* ✅ FIXED: Only w-up button if there ARE follow-up records */}
                            {showFollowUpButton && (
                              <Button 
                                onClick={() => fetchFollowUpRecords(record.id)} 
                                variant="outline" 
                                size="sm"
                                disabled={loadingFollowUps[record.id]}
                                className="cursor-pointer flex items-center gap-2 px-3 py-1 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700"
                              >
                                {loadingFollowUps[record.id] ? (
                                  <Loader className="w-3 h-3 animate-spin" />
                                ) : expandedRecords[record.id] ? (
                                  <>
                                    <Minus className="w-3 h-3" />
                                    <span>Hide Follow-ups</span>
                                  </>
                                ) : (
                                  <>
                                    <Stethoscope className="w-3 h-3" />
                                    <span>Show Follow-ups</span>
                                  </>
                                )}
                              </Button>
                            )}
                            
                            <Button 
                              onClick={() => onViewRecord(record)} 
                              variant="outline" 
                              size="sm"
                              className={`
                                cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 shadow-sm hover:shadow-md
                                ${isCurrentVet 
                                  ? 'border-blue-300 bg-white hover:bg-blue-50 hover:border-blue-400 text-blue-700' 
                                  : 'border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 text-gray-700'
                                }
                                ${isFollowUpRecord ? 'border-gray-200 bg-gray-100 hover:bg-gray-200 text-gray-600' : ''}
                              `}
                            >
                              <Eye className="w-4 h-4" />
                              <span>View Details</span>
                            </Button>
                          </div>
                        </td>                  
                      </tr>
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

// Treatment Records Table Component - UPDATED WITH DATE FIELD AND BADGES
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

  // Get outcome badge styling
  const getOutcomeBadge = (outcome) => {
    if (!outcome) {
      return {
        text: "Ongoing Treatment",
        class: "bg-yellow-100 text-yellow-800 border-yellow-200"
      };
    }
    
    const outcomeLower = outcome.toLowerCase();
    
    if (outcomeLower.includes('complete') || outcomeLower.includes('success') || outcomeLower.includes('resolved') || outcomeLower.includes('recovered')) {
      return {
        text: outcome,
        class: "bg-green-100 text-green-800 border-green-200"
      };
    } else if (outcomeLower.includes('improve') || outcomeLower.includes('better') || outcomeLower.includes('progress')) {
      return {
        text: outcome,
        class: "bg-blue-100 text-blue-800 border-blue-200"
      };
    } else if (outcomeLower.includes('fail') || outcomeLower.includes('worse') || outcomeLower.includes('no change') || outcomeLower.includes('ineffective')) {
      return {
        text: outcome,
        class: "bg-red-100 text-red-800 border-red-200"
      };
    } else if (outcomeLower.includes('ongoing') || outcomeLower.includes('continue') || outcomeLower.includes('maintain')) {
      return {
        text: outcome,
        class: "bg-orange-100 text-orange-800 border-orange-200"
      };
    } else {
      return {
        text: outcome,
        class: "bg-gray-100 text-gray-800 border-gray-200"
      };
    }
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
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Diagnosis</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Medication</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Dosage</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Duration</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {currentRecords.map((record, index) => {
                  const isCurrentVet = isCurrentVetRecord(record);
                  const outcomeBadge = getOutcomeBadge(record.outcome);
                  
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
                      {/* Date Column - Added */}
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div
                          className={`font-medium ${
                            isCurrentVet ? "text-green-900" : "text-gray-900"
                          }`}
                        >
                          {new Date(record.followUpDate || record.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 text-center">
                        <div className={`font-medium ${isCurrentVet ? 'text-green-900' : 'text-gray-900'}`}>
                          {record.diagnosis || "N/A"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className={`font-medium ${isCurrentVet ? 'text-green-900' : 'text-gray-900'}`}>
                            {record.medication || "Not specified"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={`font-medium ${isCurrentVet ? 'text-green-900' : 'text-gray-900'}`}>
                          {record.dosage || "Not specified"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={`font-medium ${isCurrentVet ? 'text-green-900' : 'text-gray-900'}`}>
                          {record.duration || "Not specified"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${outcomeBadge.class}`}>
                          {outcomeBadge.text}
                        </span>
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
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [treatmentRecords, setTreatmentRecords] = useState([]);
  const [activeTab, setActiveTab] = useState("medical");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Modal states
  const [medicalModalOpen, setMedicalModalOpen] = useState(false);
  const [treatmentModalOpen, setTreatmentModalOpen] = useState(false);
  const [medicalDetailsModalOpen, setMedicalDetailsModalOpen] = useState(false);
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
        setSuccessMessage("Your access request has been sent.");
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

  // Handlers for medical records
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

  const handleViewRecord = (record) => {
    setSelectedMedicalRecord(record);
    setMedicalDetailsModalOpen(true);
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

  // Handle follow-up success
  const handleFollowUpSuccess = (message) => {
    setSuccessMessage(message);
    fetchAppointmentDetails(); // Refresh to show new follow-up record
    setMedicalDetailsModalOpen(false); // Close the modal
  };

  // Skeleton Loader - Fixed single column
  const renderSkeleton = () => (
    <div className="space-y-6 animate-pulse">
      {/* Single skeleton card for horse info */}
      <div className="h-60 bg-gray-200 rounded-2xl"></div>
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
              {/* Horse Information Card with Chief Complaint on Right Side */}
              <Card className="bg-gradient-to-br from-white via-blue-50/30 shadow-lg rounded-2xl border border-white/50 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Horse Information Section - Takes 2/3 width */}
                    <div className="lg:col-span-2 flex flex-col md:flex-row items-start md:items-start space-x-0 md:space-x-6">
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
                        {/* STATUS BADGE REMOVED */}
                      </div>

                      <div className="flex-1 mt-6 md:mt-0 flex flex-col justify-start text-left">
                        <div className="flex items-center space-x-2 mb-2">
                          <h2 className="text-2xl font-bold text-gray-800">{horseInfo?.name || "Unknown Horse"}</h2>
                          <span className="text-indigo-600 font-semibold">({horseInfo?.breed || "Unknown Breed"})</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-gray-600 text-sm mb-4">
                          <span>Sex: <strong>{horseInfo?.sex || "Unknown"}</strong></span>
                          <span>Color: <strong>{horseInfo?.color || "Unknown"}</strong></span>
                          <span>DOB: <strong>{horseInfo?.dob || "Unknown"}</strong></span>
                          <span>Age: <strong>{horseInfo?.age || "Unknown"}</strong></span>
                          <span>Height: <strong>{horseInfo?.height || "Unknown"}</strong></span>
                          <span>Weight: <strong>{horseInfo?.weight || "Unknown"}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Chief Complaint Section - Takes 1/3 width on right side */}
                    <div className="lg:col-span-1">
                      <div className="flex items-center space-x-2 mb-4">
                        <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-md">
                          <StickyNote className="w-4 h-4 text-white" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-800">Chief Complaint</h2>
                      </div>
                      <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/50">
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
                      onEditRecord={handleEditRecord}
                      onViewRecord={handleViewRecord}
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
      
      {/* Medical Records Modal - FOR ADDING/EDITING */}
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

      {/* Medical Record Details Modal - FOR VIEWING */}
      <MedicalRecordDetailsModal
        isOpen={medicalDetailsModalOpen}
        onClose={() => {
          setMedicalDetailsModalOpen(false);
          setSelectedMedicalRecord(null);
        }}
        record={selectedMedicalRecord}
        vetProfile={vetProfile}
        horseInfo={horseInfo}
        onRecordFollowUp={handleFollowUpSuccess}
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