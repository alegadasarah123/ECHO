import React from 'react';
import ReactDOM from 'react-dom';
import { Button } from "@/components/ui/button";
import { Loader, Stethoscope, Calendar } from "lucide-react";

// Confirmation Modal Component - COMPLETELY INDEPENDENT
const ConfirmationModal = ({ onConfirm, onCancel, isLoading = false, formData }) => {
  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-auto shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              Confirm Medical Record
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Ready to save this record?
            </p>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Calendar className="w-4 h-4" />
            <span className="font-medium">Record Date:</span>
            <span>{new Date().toLocaleDateString()}</span>
          </div>
          <p className="text-xs text-blue-600 mt-2">
            This record will be permanently saved and cannot be edited later.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Vital Signs</span>
            <span className="font-medium text-green-600">✓ Complete</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Clinical Information</span>
            <span className="font-medium text-green-600">✓ Complete</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Treatment Plan</span>
            <span className="font-medium text-gray-500">
              {formData?.treatments?.length > 0 ? '✓ Added' : '○ Optional'}
            </span>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button 
            onClick={onCancel} 
            variant="outline" 
            disabled={isLoading}
            className="min-w-[80px] border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={isLoading}
            className="min-w-[80px] bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              'Confirm Save'
            )}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmationModal;