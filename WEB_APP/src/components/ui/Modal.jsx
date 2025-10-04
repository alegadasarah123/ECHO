import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const sizeMap = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl", xl: "max-w-6xl" };

const Modal = ({ open, onClose, title, children, size = "lg" }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative w-full ${sizeMap[size]} max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/90 px-4 py-3 backdrop-blur">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full w-8 h-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
