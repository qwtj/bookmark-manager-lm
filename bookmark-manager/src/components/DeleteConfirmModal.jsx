import React from 'react';

const DeleteConfirmModal = ({ message, onConfirm, onCancel }) => (
  <div className="p-6 text-center">
    <h3 className="text-xl font-semibold mb-4 text-gray-900">Confirm Deletion</h3>
    <p className="text-gray-700 mb-6">{message}</p>
    <div className="flex justify-center space-x-4">
      <button onClick={onCancel} className="px-6 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200">Cancel</button>
      <button onClick={onConfirm} className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200">Delete</button>
    </div>
  </div>
);

export default DeleteConfirmModal;
