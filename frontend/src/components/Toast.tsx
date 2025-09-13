"use client";

import { useState, useEffect } from "react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  duration?: number;
  onClose: () => void;
}

export default function Toast({
  message,
  type,
  duration = 3000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getToastStyles = () => {
    switch (type) {
      case "success":
        return "bg-green-500 text-white";
      case "error":
        return "bg-red-500 text-white";
      case "info":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={`px-6 py-3 rounded-lg shadow-lg ${getToastStyles()} animate-in slide-in-from-right-5 duration-300`}
      >
        <div className="flex items-center space-x-2">
          <span>{message}</span>
          <button
            onClick={onClose}
            className="ml-2 text-white hover:text-gray-200 focus:outline-none"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
