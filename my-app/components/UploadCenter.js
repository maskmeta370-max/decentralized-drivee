"use client";
import { useState, useRef, useCallback } from 'react';
import { 
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  LockClosedIcon,
  TagIcon,
  InformationCircleIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { encryptFile } from '../utils/autoEncryption';
import { useErrorHandler, safeAsync, ERROR_TYPES } from '../utils/errorHandler';

const UploadCenter = ({ onUpload, isUploading = false, account }) => {
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const [encryptionPassword, setEncryptionPassword] = useState('');
  const [globalMetadata, setGlobalMetadata] = useState({
    description: '',
    tags: [],
    category: 'general',
    isPublic: false
  });
  const [currentTag, setCurrentTag] = useState('');
  const [errorMessages, setErrorMessages] = useState({});
  const fileInputRef = useRef(null);
  const { error, isLoading, handleAsync, clearError } = useErrorHandler();

  const categories = [
    { value: 'general', label: 'General' },
    { value: 'documents', label: 'Documents' },
    { value: 'images', label: 'Images' },
    { value: 'videos', label: 'Videos' },
    { value: 'audio', label: 'Audio' },
    { value: 'code', label: 'Code' },
    { value: 'archives', label: 'Archives' }
  ];

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFiles = (newFiles) => {
    const processedFiles = newFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      status: 'pending', // pending, uploading, completed, error
      progress: 0,
      metadata: {
        description: '',
        tags: [...globalMetadata.tags],
        category: globalMetadata.category,
        isPublic: globalMetadata.isPublic
      }
    }));
    
    setFiles(prev => [...prev, ...processedFiles]);
  };

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  };

  const updateFileMetadata = (fileId, metadata) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, metadata: { ...f.metadata, ...metadata } } : f
    ));
  };

  const addTag = () => {
    if (currentTag.trim() && !globalMetadata.tags.includes(currentTag.trim())) {
      setGlobalMetadata(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag.trim()]
      }));
      setCurrentTag('');
    }
  };

  const removeTag = (tagToRemove) => {
    setGlobalMetadata(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setErrorMessages({ general: 'Please select files to upload.' });
      return;
    }
    
    if (!account) {
      setErrorMessages({ general: 'Please connect your wallet to upload files.' });
      return;
    }
    
    clearError();
    setErrorMessages({});
    
    await handleAsync(async () => {
      // Update all files to use global metadata
      const updatedFiles = files.map(f => ({
        ...f,
        metadata: {
          ...f.metadata,
          description: f.metadata.description || globalMetadata.description,
          tags: [...new Set([...f.metadata.tags, ...globalMetadata.tags])],
          category: f.metadata.category || globalMetadata.category,
          isPublic: f.metadata.isPublic
        }
      }));
      
      setFiles(updatedFiles);
      
      // Process files with auto-encryption
      const processedFiles = [];
      const failedFiles = [];
      
      for (const file of updatedFiles) {
        setFiles(prev => prev.map(f => 
          f.id === file.id ? { ...f, status: 'uploading' } : f
        ));
        
        try {
          // Validate file size (100MB limit)
          if (file.size > 100 * 1024 * 1024) {
            throw new Error(`File ${file.name} exceeds 100MB size limit`);
          }
          
          // Read file content with timeout
          const fileContent = await safeAsync(async () => {
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              const timeout = setTimeout(() => {
                reject(new Error('File reading timeout'));
              }, 30000); // 30 second timeout
              
              reader.onload = (e) => {
                clearTimeout(timeout);
                resolve(e.target.result);
              };
              reader.onerror = (e) => {
                clearTimeout(timeout);
                reject(new Error('Failed to read file'));
              };
              reader.readAsText(file.file);
            });
          }, {
            context: { operation: 'file_reading', fileName: file.name },
            operationId: `read_${file.id}`,
            retry: true,
            retryOptions: { maxRetries: 2, delay: 1000 }
          });
          
          // Generate unique file ID
          const fileId = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          
          // Auto-encrypt the file if encryption is enabled
          let finalContent = fileContent;
          let encryptionResult = null;
          
          if (encryptionEnabled) {
            setUploadProgress(prev => ({ ...prev, [file.id]: 25 }));
            setFiles(prev => prev.map(f => 
              f.id === file.id ? { ...f, progress: 25 } : f
            ));
            
            encryptionResult = await safeAsync(async () => {
              return await encryptFile(fileContent, fileId, account);
            }, {
              context: { operation: 'encryption', fileName: file.name },
              operationId: `encrypt_${file.id}`,
              retry: true,
              retryOptions: { maxRetries: 2, delay: 500 }
            });
            
            if (encryptionResult.success) {
              finalContent = encryptionResult.encryptedContent;
            } else {
              throw new Error(`Encryption failed: ${encryptionResult.error}`);
            }
          }
          
          // Simulate upload progress with error handling
          for (let progress = 50; progress <= 100; progress += 10) {
            await new Promise(resolve => setTimeout(resolve, 100));
            setUploadProgress(prev => ({ ...prev, [file.id]: progress }));
            setFiles(prev => prev.map(f => 
              f.id === file.id ? { ...f, progress } : f
            ));
          }
          
          // Add encryption metadata to file
          const processedFile = {
            ...file,
            fileId,
            content: finalContent,
            isEncrypted: encryptionEnabled,
            encryptionMetadata: encryptionResult?.metadata || null,
            status: 'completed'
          };
          
          processedFiles.push(processedFile);
          
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, status: 'completed' } : f
          ));
          
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          failedFiles.push({ file, error: error.message });
          
          setFiles(prev => prev.map(f => 
            f.id === file.id ? { ...f, status: 'error' } : f
          ));
          
          setErrorMessages(prev => ({
            ...prev,
            [file.id]: error.userMessage || error.message
          }));
        }
      }
      
      // Show summary of results
      if (failedFiles.length > 0) {
        const failedNames = failedFiles.map(f => f.file.name).join(', ');
        setErrorMessages(prev => ({
          ...prev,
          general: `Failed to process ${failedFiles.length} file(s): ${failedNames}`
        }));
      }
      
      // Call parent upload handler with processed files
      if (onUpload && processedFiles.length > 0) {
        await safeAsync(async () => {
          await onUpload(processedFiles, { 
            encryptionEnabled, 
            encryptionPassword,
            autoEncryption: true,
            account 
          });
        }, {
          context: { operation: 'upload_to_blockchain', fileCount: processedFiles.length },
          operationId: 'blockchain_upload',
          retry: true,
          retryOptions: { maxRetries: 3, delay: 2000 }
        });
      }
      
      return { processed: processedFiles.length, failed: failedFiles.length };
    }, {
      context: { operation: 'file_upload', fileCount: files.length },
      onError: (error) => {
        setErrorMessages(prev => ({
          ...prev,
          general: error.userMessage || 'Upload failed. Please try again.'
        }));
      }
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'error':
        return <ExclamationCircleIcon className="w-5 h-5 text-red-500" />;
      case 'uploading':
        return (
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        );
      default:
        return <DocumentIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload Center</h2>
        <p className="text-gray-600">Drag and drop files or click to browse. Files will be encrypted and stored securely.</p>
      </div>

      {/* Drag & Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(Array.from(e.target.files || []))}
        />
        
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {dragActive ? 'Drop files here' : 'Choose files or drag and drop'}
        </h3>
        <p className="text-gray-500">
          Support for multiple files. Maximum file size: 100MB per file.
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Files to Upload ({files.length})</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 flex-1">
                  {getStatusIcon(file.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    {file.status === 'uploading' && (
                      <div className="mt-1">
                        <div className="bg-gray-200 rounded-full h-1.5">
                          <div 
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{file.progress}% uploaded</p>
                      </div>
                    )}
                  </div>
                </div>
                {file.status === 'pending' && (
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Configuration */}
      {files.length > 0 && (
        <div className="mt-6 space-y-6">
          {/* Encryption Settings */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <LockClosedIcon className="w-5 h-5 text-gray-600" />
                <h4 className="font-medium text-gray-900">Encryption Settings</h4>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={encryptionEnabled}
                  onChange={(e) => setEncryptionEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            {encryptionEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Encryption Password (optional)
                </label>
                <input
                  type="password"
                  value={encryptionPassword}
                  onChange={(e) => setEncryptionPassword(e.target.value)}
                  placeholder="Leave empty for auto-generated password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  If left empty, a secure password will be generated automatically.
                </p>
              </div>
            )}
          </div>

          {/* Metadata Settings */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <TagIcon className="w-5 h-5 text-gray-600" />
              <h4 className="font-medium text-gray-900">File Metadata</h4>
            </div>
            
            <div className="space-y-4">
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={globalMetadata.description}
                  onChange={(e) => setGlobalMetadata(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Add a description for your files..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                <div className="flex space-x-2 mb-2">
                  <input
                    type="text"
                    value={currentTag}
                    onChange={(e) => setCurrentTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    placeholder="Add a tag..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={addTag}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </button>
                </div>
                {globalMetadata.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {globalMetadata.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={globalMetadata.category}
                  onChange={(e) => setGlobalMetadata(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              {/* Public/Private */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <InformationCircleIcon className="w-5 h-5 text-gray-400" />
                  <span className="text-sm font-medium text-gray-700">Make files public</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={globalMetadata.isPublic}
                    onChange={(e) => setGlobalMetadata(prev => ({ ...prev, isPublic: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Error Messages */}
          {Object.keys(errorMessages).length > 0 && (
            <div className="space-y-2">
              {errorMessages.general && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  <div className="flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    {errorMessages.general}
                  </div>
                </div>
              )}
              {Object.entries(errorMessages).filter(([key]) => key !== 'general').map(([fileId, message]) => {
                const file = files.find(f => f.id === fileId);
                return (
                  <div key={fileId} className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
                    <strong>{file?.name || 'Unknown file'}:</strong> {message}
                  </div>
                );
              })}
            </div>
          )}

          {/* Upload Button */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setFiles([])}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isUploading}
            >
              Clear All
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading || files.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isUploading ? 'Uploading...' : `Upload ${files.length} File${files.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadCenter;