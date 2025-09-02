"use client";
import { useState, useEffect } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

const Toast = ({ 
  type = 'info', 
  title, 
  message, 
  isVisible, 
  onClose, 
  duration = 5000,
  position = 'top-right'
}) => {
  const [isShowing, setIsShowing] = useState(false);

  const typeConfig = {
    success: {
      icon: CheckCircleIcon,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      titleColor: 'text-green-800',
      messageColor: 'text-green-700'
    },
    error: {
      icon: XCircleIcon,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      titleColor: 'text-red-800',
      messageColor: 'text-red-700'
    },
    warning: {
      icon: ExclamationTriangleIcon,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-800',
      messageColor: 'text-yellow-700'
    },
    info: {
      icon: InformationCircleIcon,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-800',
      messageColor: 'text-blue-700'
    }
  };

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  useEffect(() => {
    if (isVisible) {
      setIsShowing(true);
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        return () => clearTimeout(timer);
      }
    }
  }, [isVisible, duration]);

  const handleClose = () => {
    setIsShowing(false);
    setTimeout(() => {
      onClose();
    }, 300); // Wait for animation to complete
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed z-50 ${positionClasses[position]}`}>
      <div 
        className={`
          max-w-sm w-full ${config.bgColor} ${config.borderColor} border rounded-lg shadow-lg
          transform transition-all duration-300 ease-in-out
          ${isShowing ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}
        `}
      >
        <div className="p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Icon className={`w-6 h-6 ${config.iconColor}`} />
            </div>
            <div className="ml-3 w-0 flex-1">
              {title && (
                <p className={`text-sm font-medium ${config.titleColor}`}>
                  {title}
                </p>
              )}
              {message && (
                <p className={`text-sm ${config.messageColor} ${title ? 'mt-1' : ''}`}>
                  {message}
                </p>
              )}
            </div>
            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={handleClose}
                className={`inline-flex ${config.iconColor} hover:opacity-75 transition-opacity`}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Toast Provider Component
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showToast = {
    success: (title, message, options = {}) => addToast({ type: 'success', title, message, ...options }),
    error: (title, message, options = {}) => addToast({ type: 'error', title, message, ...options }),
    warning: (title, message, options = {}) => addToast({ type: 'warning', title, message, ...options }),
    info: (title, message, options = {}) => addToast({ type: 'info', title, message, ...options })
  };

  return (
    <>
      {children}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          {...toast}
          isVisible={true}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );
};

export default Toast;