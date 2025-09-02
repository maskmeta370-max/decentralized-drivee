"use client";
import { forwardRef, useState } from 'react';
import { EyeIcon, EyeSlashIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

const Input = forwardRef(({ 
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  required = false,
  error,
  helperText,
  leftIcon,
  rightIcon,
  size = 'md',
  variant = 'default',
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const baseClasses = `
    block border rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
  `;

  const variants = {
    default: `
      border-gray-300 bg-white text-gray-900
      focus:border-blue-500 focus:ring-blue-500
      placeholder:text-gray-400
    `,
    filled: `
      border-transparent bg-gray-100 text-gray-900
      focus:border-blue-500 focus:ring-blue-500 focus:bg-white
      placeholder:text-gray-400
    `,
    flushed: `
      border-0 border-b-2 border-gray-300 bg-transparent text-gray-900 rounded-none
      focus:border-blue-500 focus:ring-0
      placeholder:text-gray-400
    `
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const errorClasses = error ? `
    border-red-300 focus:border-red-500 focus:ring-red-500
    ${variant === 'flushed' ? 'border-b-red-300 focus:border-b-red-500' : ''}
  ` : '';

  const inputType = type === 'password' && showPassword ? 'text' : type;

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const inputElement = (
    <div className="relative">
      {leftIcon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-400">{leftIcon}</span>
        </div>
      )}
      
      <input
        ref={ref}
        type={inputType}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        className={`
          ${baseClasses}
          ${variants[variant]}
          ${sizes[size]}
          ${errorClasses}
          ${leftIcon ? 'pl-10' : ''}
          ${rightIcon || type === 'password' ? 'pr-10' : ''}
          ${className}
        `}
        {...props}
      />
      
      {(rightIcon || type === 'password') && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          {type === 'password' ? (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              {showPassword ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
            </button>
          ) : (
            <span className="text-gray-400">{rightIcon}</span>
          )}
        </div>
      )}
    </div>
  );

  if (!label && !error && !helperText) {
    return inputElement;
  }

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {inputElement}
      
      {(error || helperText) && (
        <div className="mt-1">
          {error && (
            <div className="flex items-center text-sm text-red-600">
              <ExclamationCircleIcon className="w-4 h-4 mr-1" />
              {error}
            </div>
          )}
          {helperText && !error && (
            <p className="text-sm text-gray-500">{helperText}</p>
          )}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// Textarea Component
export const Textarea = forwardRef(({ 
  label,
  placeholder,
  value,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  required = false,
  error,
  helperText,
  rows = 3,
  resize = 'vertical',
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  const [isFocused, setIsFocused] = useState(false);

  const baseClasses = `
    block w-full border border-gray-300 rounded-lg
    bg-white text-gray-900 placeholder:text-gray-400
    px-3 py-2 text-sm transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const resizeClasses = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize'
  };

  const errorClasses = error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '';

  const handleFocus = (e) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const textareaElement = (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      disabled={disabled}
      required={required}
      placeholder={placeholder}
      rows={rows}
      className={`
        ${baseClasses}
        ${resizeClasses[resize]}
        ${errorClasses}
        ${className}
      `}
      {...props}
    />
  );

  if (!label && !error && !helperText) {
    return textareaElement;
  }

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {textareaElement}
      
      {(error || helperText) && (
        <div className="mt-1">
          {error && (
            <div className="flex items-center text-sm text-red-600">
              <ExclamationCircleIcon className="w-4 h-4 mr-1" />
              {error}
            </div>
          )}
          {helperText && !error && (
            <p className="text-sm text-gray-500">{helperText}</p>
          )}
        </div>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

// Select Component
export const Select = forwardRef(({ 
  label,
  options = [],
  value,
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  required = false,
  error,
  helperText,
  placeholder = 'Select an option',
  fullWidth = false,
  className = '',
  ...props
}, ref) => {
  const baseClasses = `
    block border border-gray-300 rounded-lg
    bg-white text-gray-900
    px-3 py-2 text-sm transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
  `;

  const errorClasses = error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '';

  const selectElement = (
    <select
      ref={ref}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={disabled}
      required={required}
      className={`
        ${baseClasses}
        ${errorClasses}
        ${className}
      `}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option, index) => (
        <option key={index} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  if (!label && !error && !helperText) {
    return selectElement;
  }

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {selectElement}
      
      {(error || helperText) && (
        <div className="mt-1">
          {error && (
            <div className="flex items-center text-sm text-red-600">
              <ExclamationCircleIcon className="w-4 h-4 mr-1" />
              {error}
            </div>
          )}
          {helperText && !error && (
            <p className="text-sm text-gray-500">{helperText}</p>
          )}
        </div>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Input;