import React from 'react';

const FileCrystal = ({ fileName }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-4 text-center">
      <div className="text-4xl mb-2">💎</div>
      <p className="text-sm truncate">{fileName}</p>
    </div>
  );
};

export default FileCrystal;
