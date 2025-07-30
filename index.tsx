import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app'; // Correct import
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth'; // Correct import
import { getFirestore, collection, doc, onSnapshot, addDoc, setDoc, deleteDoc, writeBatch, query, getDocs } from 'firebase/firestore'; // Correct import

// --- Firebase Configuration ---
// These global variables are provided by the environment.
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// HelpModal Component: Explains application functionality
const HelpModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full m-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-start">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Help & Features</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="space-y-6 text-gray-700">
            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Natural Language Search</h3>
              <p>The main search bar is powered by an AI agent. You can type commands in plain English to find, sort, and manage your bookmarks. The agent can even chain commands together.</p>
              <p className="mt-2 text-sm text-gray-600"><strong>Examples:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-sm">
                <li><code className="bg-gray-100 p-1 rounded">find bookmarks about python</code></li>
                <li><code className="bg-gray-100 p-1 rounded">show my 5 star bookmarks</code></li>
                <li><code className="bg-gray-100 p-1 rounded">sort by title ascending</code></li>
                <li><code className="bg-gray-100 p-1 rounded">github in title and sort by rating</code> (the order doesn't matter!)</li>
                <li><code className="bg-gray-100 p-1 rounded">show top 3 javascript bookmarks</code></li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Keyboard Shortcuts</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Click</strong> on a bookmark to select it and view details.</li>
                <li><strong>Double-click</strong> or press <kbd className="font-sans px-1.5 py-0.5 border border-gray-300 bg-gray-100 rounded">E</kbd> on a selected bookmark to edit it.</li>
                <li><kbd className="font-sans px-1.5 py-0.5 border border-gray-300 bg-gray-100 rounded">Shift</kbd> + <strong>Click</strong> to open a bookmark in a new tab.</li>
                <li><kbd className="font-sans px-1.5 py-0.5 border border-gray-300 bg-gray-100 rounded">Ctrl/Cmd</kbd> + <strong>Click</strong> to select multiple bookmarks.</li>
                <li><kbd className="font-sans px-1.5 py-0.5 border border-gray-300 bg-gray-100 rounded">Ctrl/Cmd</kbd> + <kbd className="font-sans px-1.5 py-0.5 border border-gray-300 bg-gray-100 rounded">A</kbd> to select all bookmarks in the current view.</li>
                <li><kbd className="font-sans px-1.5 py-0.5 border border-gray-300 bg-gray-100 rounded">Ctrl/Cmd</kbd> + <kbd className="font-sans px-1.5 py-0.5 border border-gray-300 bg-gray-100 rounded">D</kbd> to delete selected bookmarks.</li>
                <li><kbd className="font-sans px-1.5 py-0.5 border border-gray-300 bg-gray-100 rounded">Esc</kbd> to clear all selections.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Bookmark Form Features</h3>
              <p>When adding or editing a bookmark:</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>URL Validation:</strong> The app automatically checks if a URL is reachable. You can choose to ignore this for private or local links.</li>
                <li><strong>AI Suggestions:</strong> Click the "Suggest" buttons to let the AI generate a relevant description and tags for your bookmark based on its title and URL.</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 text-gray-900">Main Buttons</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Add New:</strong> Opens the form to add a new bookmark.</li>
                <li><strong>Import/Export:</strong> Allows you to import bookmarks from JSON or HTML files, and export your collection to the same formats.</li>
                <li><strong>Remove Duplicates:</strong> Scans the current view for bookmarks with the same title and URL and prompts you to delete them.</li>
                <li><strong>Clear Search:</strong> Appears after a search to let you return to the full bookmark list.</li>
              </ul>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button onClick={onClose} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200">
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// MessageModal Component: A generic modal for displaying messages
const MessageModal = ({ message, type, onClose }) => {
  const bgColor = type === 'success' ? 'bg-green-100' : type === 'error' ? 'bg-red-100' : 'bg-blue-100';
  const textColor = type === 'success' ? 'text-green-800' : type === 'error' ? 'text-red-800' : 'text-blue-800';
  const borderColor = type === 'success' ? 'border-green-300' : type === 'error' ? 'border-red-300' : 'border-blue-300';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && onClose()} role="dialog" aria-modal="true">
      <div className={`rounded-lg shadow-xl max-w-sm w-full m-4 p-6 border ${bgColor} ${borderColor}`}>
        <h3 className={`text-xl font-semibold mb-4 ${textColor}`}>
          {type === 'success' ? 'Success!' : type === 'error' ? 'Error!' : 'Information'}
        </h3>
        <p className={`${textColor} mb-6`}>{message}</p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// BookmarkForm Component: Handles editing and adding bookmarks
const BookmarkForm = ({ bookmark, onClose, onSave, onDelete, fetchUrlStatus}) => {
  const [formData, setFormData] = useState({
    title: bookmark?.title || '',
    url: bookmark?.url || '',
    description: bookmark?.description || '',
    tags: bookmark?.tags ? bookmark.tags.join(', ') : '',
    rating: bookmark?.rating || 0,
    folderId: bookmark?.folderId || '',
    faviconUrl: bookmark?.faviconUrl || '',
  });
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [ignoreUrlValidation, setIgnoreUrlValidation] = useState(bookmark?.urlStatus === 'ignored');
  const [currentUrlValidity, setCurrentUrlValidity] = useState('checking'); // 'checking', 'valid', 'invalid'

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates on unmounted component
    const checkUrl = async () => {
        if (!formData.url) {
            setCurrentUrlValidity('valid'); // Treat empty URL as valid in form
            return;
        }
        setCurrentUrlValidity('checking');
        const status = await fetchUrlStatus(formData.url);
        if (isMounted) {
            setCurrentUrlValidity(status);
        }
    };

    if (fetchUrlStatus) {
        checkUrl();
    }

    return () => {
        isMounted = false; // Cleanup: prevent state updates if component unmounts
    };
  }, [fetchUrlStatus]); // FIX: Re-run when URL changes

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRatingChange = (newRating) => {
    setFormData(prev => ({ ...prev, rating: newRating }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const tagsArray = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
    onSave({
    ...bookmark, // Preserve existing ID if editing
    ...formData,
    tags: tagsArray,
    urlStatus: ignoreUrlValidation ? 'ignored' : currentUrlValidity,
    ignoreUrlValidation: ignoreUrlValidation
    });
  };

  const generateDescriptionWithGemini = async () => {
    setIsGeneratingDescription(true);
    const prompt = `Generate a concise description (1-2 sentences) for the following bookmark. Only return the description, no other text.
    Title: ${formData.title}
    URL: ${formData.url}`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    const apiKey = ""; // Leave empty, will be handled by the environment
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API response not OK:", errorText);
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
        const suggestedDescription = result.candidates[0].content.parts[0].text;
        setFormData(prev => ({
          ...prev,
          description: suggestedDescription.trim()
        }));
      } else {
        console.error("No valid response from Gemini API for description.");
      }
    } catch (error) {
      console.error("Error generating description:", error);
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const generateTagsWithGemini = async () => {
    setIsGeneratingTags(true);
    const prompt = `Given the following bookmark details, suggest relevant tags (comma-separated). Only return the tags, no other text.
    Title: ${formData.title}
    URL: ${formData.url}
    Description: ${formData.description}`;

    const payload = {
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    };

    const apiKey = ""; // Leave empty, will be handled by the environment
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API response not OK:", errorText);
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0 && result.candidates[0].content && result.candidates[0].content.parts && result.candidates[0].content.parts.length > 0) {
        const suggestedTags = result.candidates[0].content.parts[0].text;
        setFormData(prev => ({
          ...prev,
          tags: prev.tags ? `${prev.tags}, ${suggestedTags}` : suggestedTags
        }));
      } else {
        console.error("No valid response from Gemini API for tags.");
      }
    } catch (error) {
      console.error("Error generating tags:", error);
    } finally {
      setIsGeneratingTags(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">{bookmark ? 'Edit Bookmark' : 'Add New Bookmark'}</h2>
      <div className="grid grid-cols-1 gap-4 mb-6">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">URL</label>
            <input
                type="url"
                id="url"
                name="url"
                value={formData.url}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:ring-blue-500 focus:border-blue-500 ${
                    currentUrlValidity === 'invalid' && !ignoreUrlValidation ? 'border-red-500' : 'border-gray-300'
                }`}
                required
            />
            {currentUrlValidity === 'checking' && (
                <p className="text-sm text-gray-500 mt-1">Checking URL...</p>
            )}
            {currentUrlValidity === 'invalid' && !ignoreUrlValidation && (
                <p className="text-sm text-red-500 mt-1">URL appears to be invalid.</p>
            )}
            {(currentUrlValidity === 'invalid' || bookmark?.urlStatus === 'invalid') && !ignoreUrlValidation && (
                <button
                    type="button"
                    onClick={() => setIgnoreUrlValidation(true)}
                    className="mt-2 px-3 py-1 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600 transition-colors duration-200"
                >
                    Ignore URL Check
                </button>
            )}
            {ignoreUrlValidation && (
                <p className="mt-2 text-sm text-yellow-700">URL validation ignored for this bookmark.</p>
            )}
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <div className="flex space-x-2">
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            ></textarea>
            <button
              type="button"
              onClick={generateDescriptionWithGemini}
              disabled={isGeneratingDescription || !formData.url || !formData.title}
              className="px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingDescription ? 'Generating...' : 'Suggest'}
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
          <div className="flex space-x-2">
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., development, web, reference"
            />
            <button
              type="button"
              onClick={generateTagsWithGemini}
              disabled={isGeneratingTags || !formData.url || !formData.title}
              className="px-3 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingTags ? 'Generating...' : 'Suggest'}
            </button>
          </div>
        </div>
        <div>
          <label htmlFor="folderId" className="block text-sm font-medium text-gray-700 mb-1">Folder</label>
          <input
            type="text"
            id="folderId"
            name="folderId"
            value={formData.folderId}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., work, personal"
          />
        </div>
        <div>
          <label htmlFor="faviconUrl" className="block text-sm font-medium text-gray-700 mb-1">Favicon URL</label>
          <input
            type="url"
            id="faviconUrl"
            name="faviconUrl"
            value={formData.faviconUrl}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., https://example.com/favicon.ico"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className={`h-6 w-6 cursor-pointer ${star <= formData.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
                onClick={() => handleRatingChange(star)}
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.683-1.539 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.783.565-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
        </div>
      </div>
      <div className="flex justify-end space-x-3">
        {bookmark && bookmark.id && (
          <button
            type="button"
            onClick={() => onDelete(bookmark.id)}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
          >
            Delete
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
        >
          Save Bookmark
        </button>
      </div>
    </form>
  );
};

// ImportExportContent Component: Handles importing and exporting bookmarks
const ImportExportContent = ({ bookmarks, onClose, onImportJson, onImportHtml, showMessage }) => {
  const [activeTab, setActiveTab] = useState('export');
  const [importJsonText, setImportJsonText] = useState('');
  const [importHtmlText, setImportHtmlText] = useState('');

  const handleJsonImport = () => {
    try {
      const parsed = JSON.parse(importJsonText);
      if (Array.isArray(parsed)) {
        onImportJson(parsed);
        showMessage('Bookmarks imported successfully from JSON!', 'success');
      } else {
        showMessage('Invalid JSON format. Expected an array of bookmarks.', 'error');
      }
    } catch (error) {
      console.error('JSON parsing error:', error);
      showMessage('Error parsing JSON. Please ensure it is valid JSON.', 'error');
    }
  };

  const handleHtmlImport = () => {
    onImportHtml(importHtmlText);
    showMessage('Bookmarks imported successfully from HTML!', 'success');
  };

  const generateHtmlExport = () => {
    let html = '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n';
    html += '<!-- This is an automatically generated file. -->\n';
    html += '<!-- DO NOT EDIT! -->\n';
    html += '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n';
    html += '<TITLE>Bookmarks</TITLE>\n';
    html += '<H1>Bookmarks</H1>\n';
    html += '<DL><p>\n';

    bookmarks.forEach(b => {
      const addDate = b.createdAt ? Math.floor(new Date(b.createdAt).getTime() / 1000) : '';
      const lastModified = b.updatedAt ? Math.floor(new Date(b.updatedAt).getTime() / 1000) : '';
      const icon = b.faviconUrl ? ` ICON="${b.faviconUrl}"` : '';
      const description = b.description ? ` DESCRIPTION="${b.description}"` : '';
      html += `    <DT><A HREF="${b.url}" ADD_DATE="${addDate}" LAST_MODIFIED="${lastModified}"${icon}${description}>${b.title}</A>\n`;
    });

    html += '</DL><p>\n';
    return html;
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Import / Export Bookmarks</h2>

      <div className="flex border-b border-gray-200 mb-4">
        <button
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'export' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('export')}
        >
          Export
        </button>
        <button
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'import-json' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('import-json')}
        >
          Import JSON
        </button>
        <button
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'import-html' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('import-html')}
        >
          Import HTML
        </button>
      </div>

      {activeTab === 'export' && (
        <div className="space-y-4">
          <p className="text-gray-700">Export your bookmarks as JSON or Netscape HTML format.</p>
          <div>
            <label htmlFor="export-json" className="block text-sm font-medium text-gray-700 mb-1">JSON Export</label>
            <textarea
              id="export-json"
              readOnly
              value={JSON.stringify(bookmarks, null, 2)}
              className="w-full h-48 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm resize-y"
            ></textarea>
            <a
              href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(bookmarks, null, 2))}`}
              download="bookmarks.json"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download JSON
            </a>
          </div>
          <div>
            <label htmlFor="export-html" className="block text-sm font-medium text-gray-700 mb-1">HTML Export (Netscape Bookmark File)</label>
            <textarea
              id="export-html"
              readOnly
              value={generateHtmlExport()}
              className="w-full h-48 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-mono text-sm resize-y"
            ></textarea>
            <a
              href={`data:text/html;charset=utf-8,${encodeURIComponent(generateHtmlExport())}`}
              download="bookmarks.html"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download HTML
            </a>
          </div>
        </div>
      )}

      {activeTab === 'import-json' && (
        <div className="space-y-4">
          <p className="text-gray-700">Paste your JSON bookmarks here or upload a file.</p>
          <label htmlFor="upload-json-file" className="block text-sm font-medium text-gray-700 mb-2">
            Upload JSON File
          </label>
          <input
            id="upload-json-file"
            type="file"
            accept=".json"
            onChange={async (e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                  try {
                    const importedData = JSON.parse(event.target.result);
                    if (Array.isArray(importedData)) {
                      onImportJson(importedData);
                    } else {
                      showMessage('Invalid JSON format in file. Expected an array of bookmarks.', 'error');
                    }
                  } catch (error) {
                    console.error('File JSON parsing error:', error);
                    showMessage('Error parsing JSON file. Please ensure it is valid JSON.', 'error');
                  }
                };
                reader.readAsText(file);
              }
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          />
          <div className="my-4 text-center text-sm text-gray-500">— OR —</div>
          <label htmlFor="import-json-text" className="block text-sm font-medium text-gray-700 mb-2">
            Paste JSON Data
          </label>
          <textarea
            id="import-json-text"
            value={importJsonText}
            onChange={(e) => setImportJsonText(e.target.value)}
            className="w-full h-48 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-y"
            placeholder='[{"title": "Example", "url": "https://example.com", "tags": ["test"]}]'
          ></textarea>
          <button
            onClick={handleJsonImport}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
          >
            Import JSON Data
          </button>
        </div>
      )}

      {activeTab === 'import-html' && (
        <div className="space-y-4">
          <p className="text-gray-700">Upload an HTML bookmark file or paste its content.</p>
          <label htmlFor="upload-html-file" className="block text-sm font-medium text-gray-700 mb-2">
            Upload HTML File (Browser Export)
          </label>
          <input
            id="upload-html-file"
            type="file"
            accept=".html,.htm"
            onChange={async (e) => {
              const file = e.target.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                  onImportHtml(event.target.result);
                };
                reader.readAsText(file);
              }
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          />
          <div className="my-4 text-center text-sm text-gray-500">— OR —</div>
          <label htmlFor="import-html-text" className="block text-sm font-medium text-gray-700 mb-2">
            Paste HTML Data
          </label>
          <textarea
            id="import-html-text"
            value={importHtmlText}
            onChange={(e) => setImportHtmlText(e.target.value)}
            className="w-full h-48 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-y"
            placeholder="<!DOCTYPE NETSCAPE-Bookmark-file-1>..."
          ></textarea>
          <button
            onClick={handleHtmlImport}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
          >
            Import HTML Data
          </button>
        </div>
      )}

      <div className="flex justify-end mt-6">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
        >
          Close
        </button>
      </div>
    </div>
  );
};

// DeleteConfirmModal Component: Handles confirmation before deleting
const DeleteConfirmModal = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="p-6 text-center">
      <h3 className="text-xl font-semibold mb-4 text-gray-900">Confirm Deletion</h3>
      <p className="text-gray-700 mb-6">{message}</p>
      <div className="flex justify-center space-x-4">
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
        >
          Delete
        </button>
      </div>
    </div>
  );
};


const BookmarkApp = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [editingBookmark, setEditingBookmark] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [selectedBookmarkId, setSelectedBookmarkId] = useState(null);
  const [bookmarksToDelete, setBookmarksToDelete] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [multiSelectedBookmarkIds, setMultiSelectedBookmarkIds] = useState([]);
  const bookmarksRef = useRef(bookmarks);
  const selectedBookmarkIdRef = useRef(selectedBookmarkId);
  const multiSelectedBookmarkIdsRef = useRef(multiSelectedBookmarkIds);

  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageModalContent, setMessageModalContent] = useState({ message: '', type: 'info' });

  const [auth, setAuth] = useState(null);
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  
  useEffect(() => {
    bookmarksRef.current = bookmarks;
    selectedBookmarkIdRef.current = selectedBookmarkId;
    multiSelectedBookmarkIdsRef.current = multiSelectedBookmarkIds;
  }, [bookmarks, selectedBookmarkId, multiSelectedBookmarkIds]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const isMac = navigator.userAgentData
        ? navigator.userAgentData.platform.toUpperCase().includes('MAC')
        : navigator.userAgent.toUpperCase().includes('MAC');

      if (event.key === 'Escape') {
        setSelectedBookmarkId(null);
        setMultiSelectedBookmarkIds([]);
      } else if ((isMac && event.metaKey && event.key === 'd') || (!isMac && event.ctrlKey && event.key === 'd')) {
        event.preventDefault();
        let idsToProcessForDeletion = [];

        if (selectedBookmarkIdRef.current) {
            idsToProcessForDeletion.push(selectedBookmarkIdRef.current);
        } else if (multiSelectedBookmarkIdsRef.current.length > 0) {
            idsToProcessForDeletion = [...multiSelectedBookmarkIdsRef.current];
        }

      if (idsToProcessForDeletion.length > 0) {
        setBookmarksToDelete(idsToProcessForDeletion);
        setIsDeleteConfirmModalOpen(true);
        setSelectedBookmarkId(null);
        setMultiSelectedBookmarkIds([]);
      } else {
        showCustomMessage("Please select bookmark(s) to delete.", "info");
      }
    } else if ((isMac && event.metaKey && event.key === 'a') || (!isMac && event.ctrlKey && event.key === 'a')) {
        event.preventDefault();
        const allIds = bookmarksRef.current.map(bm => bm.id);
        setMultiSelectedBookmarkIds(allIds);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);


  // --- Firebase Initialization and Auth ---
  useEffect(() => {
    if (Object.keys(firebaseConfig).length === 0) {
      console.error("Firebase config is not defined. Cannot initialize Firebase.");
      setIsLoading(false);
      showCustomMessage("Firebase configuration missing. Data persistence and authentication will not work.", "error");
      return;
    }

    const app = initializeApp(firebaseConfig);
    const authInstance = getAuth(app);
    const dbInstance = getFirestore(app);

    setAuth(authInstance);
    setDb(dbInstance);

    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        try {
          const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
          if (token) {
            await signInWithCustomToken(authInstance, token);
          } else {
            await signInAnonymously(authInstance);
          }
        } catch (error) {
          console.error("Authentication error:", error);
          showCustomMessage(`Authentication failed: ${error.message}`, "error");
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // --- Firestore Data Loading ---
  useEffect(() => {
    if (db && userId) {
      const bookmarksCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'bookmarks');
      
      const unsubscribe = onSnapshot(bookmarksCollectionRef, (snapshot) => {
        const bookmarksFromDB = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setBookmarks(bookmarksFromDB);
        if (isLoading) setIsLoading(false);
      }, (error) => {
        console.error("Error listening to bookmarks:", error);
        showCustomMessage(`Error loading bookmarks from database: ${error.message}`, "error");
        setIsLoading(false);
      });

      return () => unsubscribe();
    } else if (!db || !userId) {
      if (isLoading && Object.keys(firebaseConfig).length === 0) {
        setIsLoading(false);
      }
    }
  }, [db, userId]);

    const saveBookmark = async (bookmarkToSave) => {
        if (!db || !userId) {
            showCustomMessage("Database not ready. Please wait for initialization.", "error");
            return;
        }

        let urlStatus = bookmarkToSave.urlStatus || 'unknown';
        if (!bookmarkToSave.ignoreUrlValidation) {
            urlStatus = await fetchUrlStatus(bookmarkToSave.url);
            if (urlStatus === 'invalid') {
            showCustomMessage(`URL "${bookmarkToSave.url}" appears to be invalid. Bookmark saved with warning.`, "info");
            }
        } else {
            urlStatus = 'ignored';
        }

        try {
            const bookmarksCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'bookmarks');
            const updatedBookmark = {
            ...bookmarkToSave,
            urlStatus: urlStatus,
            updatedAt: new Date().toISOString(),
            };
            delete updatedBookmark.ignoreUrlValidation;

            if (bookmarkToSave.id) {
                const bookmarkDocRef = doc(bookmarksCollectionRef, bookmarkToSave.id);
                await setDoc(bookmarkDocRef, updatedBookmark, { merge: true });
            } else {
                const docRef = await addDoc(bookmarksCollectionRef, {
                    ...updatedBookmark,
                    createdAt: new Date().toISOString(),
                });
                await setDoc(docRef, { id: docRef.id }, { merge: true });
            }
            showCustomMessage(`Bookmark "${bookmarkToSave.title}" saved successfully.`, "success");
        } catch (error) {
          console.error('Error saving bookmark:', error);
          showCustomMessage(`Failed to save bookmark "${bookmarkToSave.title}".`, "error");
        }
    };

  const saveAllBookmarks = async (bookmarksArray) => {
    if (!db || !userId) {
      showCustomMessage("Database not ready. Please wait for initialization.", "error");
      return;
    }
    try {
      const batch = writeBatch(db);
      const bookmarksCollectionRef = collection(db, 'artifacts', appId, 'users', userId, 'bookmarks');
      const existingDocs = await getDocs(query(bookmarksCollectionRef));
      existingDocs.forEach(doc => batch.delete(doc.ref));

      bookmarksArray.forEach(bookmark => {
        const docRef = doc(collection(db, 'artifacts', appId, 'users', userId, 'bookmarks'));
        batch.set(docRef, {
          ...bookmark,
          id: docRef.id,
          createdAt: bookmark.createdAt || new Date().toISOString(),
          updatedAt: bookmark.updatedAt || new Date().toISOString()
        });
      });
      await batch.commit();
      showCustomMessage(`Successfully imported ${bookmarksArray.length} bookmarks.`, "success");
    } catch (error) {
      console.error('Error saving all bookmarks:', error);
      showCustomMessage("Failed to import bookmarks.", "error");
    }
  };

  const deleteBookmark = async (bookmarkId) => {
    if (!db || !userId) {
      showCustomMessage("Database not ready. Please wait for initialization.", "error");
      return;
    }
    try {
      const bookmarkDocRef = doc(db, 'artifacts', appId, 'users', userId, 'bookmarks', bookmarkId);
      await deleteDoc(bookmarkDocRef);
      if (selectedBookmarkId === bookmarkId) {
        setSelectedBookmarkId(null);
      }
      showCustomMessage("Bookmark deleted successfully.", "success");
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      showCustomMessage("Failed to delete bookmark.", "error");
    }
  };

  const fetchUrlStatus = async (url) => {
    if (!url || url.trim() === '') return 'valid';
    try {
        const corsUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const response = await fetch(corsUrl, { method: 'HEAD', mode: 'cors' });
        return response.ok ? 'valid' : 'invalid';
    } catch (error) {
        console.warn(`URL check failed for ${url}:`, error);
        return 'invalid';
    }
  };

  // --- Data Transformation Functions (operate on a list, return a new list) ---
  const searchBookmarks = (searchTerm, list) => {
    return list.filter(bookmark =>
      (bookmark.title?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (bookmark.url?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (bookmark.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (bookmark.tags && bookmark.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
    );
  };

  const findWithTags = (includeTags = [], excludeTags = [], list) => {
    const lowerInclude = includeTags.map(t => t.toLowerCase());
    const lowerExclude = excludeTags.map(t => t.toLowerCase());
    return list.filter(b => {
      const bookmarkTags = b.tags ? b.tags.map(bt => bt.toLowerCase()) : [];
      return (
        lowerInclude.every(tag => bookmarkTags.includes(tag)) &&
        !lowerExclude.some(tag => bookmarkTags.includes(tag))
      );
    });
  };

  const findIncludes = (field, value, list) => {
    const lowerValue = value.toLowerCase();
    return list.filter(b => (b[field] || '').toLowerCase().includes(lowerValue));
  };
  
  const sortBookmarks = (sortBy, order, list) => {
    return [...list].sort((a, b) => {
        let valA = a[sortBy] || '';
        let valB = b[sortBy] || '';
        if (typeof valA === 'string') valA = valA.toLowerCase();
        if (typeof valB === 'string') valB = valB.toLowerCase();
        if (sortBy === 'rating') {
            valA = a.rating || 0;
            valB = b.rating || 0;
        }
        if (order === 'asc') {
            if (valA < valB) return -1;
            if (valA > valB) return 1;
        } else { // desc
            if (valA > valB) return -1;
            if (valA < valB) return 1;
        }
        return 0;
    });
  };

  const limitResults = (count, list) => {
    return list.slice(0, count);
  };
  
  const showAllBookmarks = () => {
    setLastAction(null);
    setSelectedBookmarkId(null);
    setBookmarksToDelete([]);
    return bookmarks;
  };

  const importBookmarks = () => setIsImportExportModalOpen(true);
  const exportBookmarks = () => setIsImportExportModalOpen(true);

  const removeDuplicates = (list) => {
    const seen = new Map();
    const duplicates = [];
    for (const bookmark of list) {
      const key = `${(bookmark.title || '').toLowerCase().trim()}|${(bookmark.url || '').toLowerCase().trim()}`;
      if (seen.has(key)) {
        duplicates.push(bookmark.id);
      } else {
        seen.set(key, bookmark.id);
      }
    }
    if (duplicates.length > 0) {
      setBookmarksToDelete(duplicates);
      setIsDeleteConfirmModalOpen(true);
    } else {
      showCustomMessage("No duplicate bookmarks found in the current view.", "info");
    }
  };

  const confirmDeletions = async () => {
    if (!db || !userId) {
      showCustomMessage("Database not ready.", "error");
      return;
    }
    try {
      const batch = writeBatch(db);
      bookmarksToDelete.forEach(bookmarkId => {
        const docRef = doc(db, 'artifacts', appId, 'users', userId, 'bookmarks', bookmarkId);
        batch.delete(docRef);
      });
      await batch.commit();
      
      setLastAction(null);
      setSelectedBookmarkId(null);
      setBookmarksToDelete([]);
      setIsDeleteConfirmModalOpen(false);
      showCustomMessage(`Successfully deleted ${bookmarksToDelete.length} bookmark(s).`, "success");
    }
    catch (error) {
      console.error('Error deleting bookmarks:', error);
      showCustomMessage("Failed to delete bookmarks.", "error");
    }
  };

  const cancelDeleteDuplicates = () => {
    setBookmarksToDelete([]);
    setIsDeleteConfirmModalOpen(false);
    showCustomMessage("Deletion cancelled.", "info");
  };

  const resetSearch = () => {
    setLastAction(null);
    setSelectedBookmarkId(null);
    setBookmarksToDelete([]);
    showCustomMessage("Search filters cleared.", "info");
  };
  
  // --- Agent and Filtering Logic ---
  const applyAgentPlan = (plan, list) => {
    if (!plan) return list;

    const actions = Array.isArray(plan) ? plan : [plan];
    let currentResults = [...list];

    for (const step of actions) {
      const { action, parameters } = step;

      if (['importBookmarks', 'exportBookmarks', 'resetSearch', 'showAllBookmarks', 'removeDuplicates'].includes(action)) {
        continue;
      }

      switch (action) {
        case 'searchBookmarks':
          currentResults = searchBookmarks(parameters.searchTerm, currentResults);
          break;
        case 'findIncludes':
          currentResults = findIncludes(parameters.field, parameters.value, currentResults);
          break;
        case 'findWithTags':
          currentResults = findWithTags(parameters.includeTags, parameters.excludeTags, currentResults);
          break;
        case 'sortBookmarks':
          currentResults = sortBookmarks(parameters.sortBy, parameters.order, currentResults);
          break;
        case 'limitResults':
          currentResults = limitResults(parameters.count, currentResults);
          break;
        default:
          console.warn(`Unknown list-transforming action in plan: ${action}`);
      }
    }
    return currentResults;
  };

  const agentEngine = async (userQuery) => {
    if (!userQuery.trim()) return;

    setIsProcessing(true);
    setBookmarksToDelete([]);
    
    const prompt = `You are an agent for a bookmark application. Based on the user's input, determine which application action(s) to take. For simple queries, return a single JSON object. For combined or sequential queries, return an array of action objects to be executed in order.

User Query: "${userQuery}"

Available Actions:
- searchBookmarks: General search by term (parameters: {searchTerm: string})
- showAllBookmarks: Display all bookmarks (no parameters)
- resetSearch: Clear all filters and show all bookmarks (no parameters)
- importBookmarks: Open import/export modal (no parameters)
- exportBookmarks: Open import/export modal (no parameters)
- removeDuplicates: Remove duplicate bookmarks by title and URL (no parameters)
- findIncludes: Find by field containing value (parameters: {field: "title"|"url"|"description"|"tags", value: string})
- findWithTags: Find bookmarks with specific tags (parameters: {includeTags: string[], excludeTags?: string[]})
- sortBookmarks: Sort bookmarks by a specific field and order (parameters: {sortBy: "title"|"rating"|"url"|"folder", order: "asc"|"desc"})
- limitResults: Limit the number of results shown (parameters: {count: number})

Examples:
- "find github" -> \`\`\`json
{ "action": "searchBookmarks", "parameters": {"searchTerm": "github"}, "reasoning": "User asked to find github." }
\`\`\`
- "sort by title ascending" -> \`\`\`json
{ "action": "sortBookmarks", "parameters": {"sortBy": "title", "order": "asc"}, "reasoning": "User wants to sort bookmarks by title, ascending." }
\`\`\`
- "ascending sort & github in title" -> \`\`\`json
[
  { "action": "sortBookmarks", "parameters": { "sortBy": "title", "order": "asc" }, "reasoning": "First, sort all bookmarks by title in ascending order." },
  { "action": "findIncludes", "parameters": { "field": "title", "value": "github" }, "reasoning": "Then, filter the sorted results to find those with 'github' in the title." }
]
\`\`\`
- "show top 5 rated bookmarks" -> \`\`\`json
[
  { "action": "sortBookmarks", "parameters": { "sortBy": "rating", "order": "desc" }, "reasoning": "First, sort all bookmarks by rating in descending order." },
  { "action": "limitResults", "parameters": { "count": 5 }, "reasoning": "Then, limit the results to the top 5." }
]
\`\`\`

Respond with ONLY a JSON object or an array of JSON objects, wrapped in a markdown code block. Do not include any other text or formatting.`;

    const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }] };
    const apiKey = "";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    try {
      const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
      
      const result = await response.json();
      if (result.candidates?.[0]?.content?.parts?.[0]?.text) {
        let responseText = result.candidates[0].content.parts[0].text;
        const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/);
        const agentPlan = JSON.parse(jsonMatch ? jsonMatch[1] : responseText);

        setLastAction(agentPlan);

        const actions = Array.isArray(agentPlan) ? agentPlan : [agentPlan];
        for (const step of actions) {
            if (step.action === 'importBookmarks') importBookmarks();
            if (step.action === 'exportBookmarks') exportBookmarks();
            if (step.action === 'removeDuplicates') {
                const listToScan = applyAgentPlan(agentPlan, bookmarks);
                removeDuplicates(listToScan);
            }
        }

      } else {
        throw new Error("No valid response from Gemini API.");
      }
    } catch (error) {
      console.error("Agent engine error:", error);
      setLastAction({ action: "error", parameters: {}, reasoning: `Failed to process request: ${error.message}` });
      showCustomMessage(`Failed to process request via Gemini: ${error.message}. Performing a general search instead.`, "error");
      // Fallback to simple search
      setLastAction({ action: "searchBookmarks", parameters: { searchTerm: userQuery }, reasoning: "Fell back to simple search due to an agent error." });
    } finally {
      setIsProcessing(false);
    }
  };

  const showCustomMessage = (message, type = 'info') => {
    setMessageModalContent({ message, type });
    setIsMessageModalOpen(true);
  };

  const closeMessageModal = () => setIsMessageModalOpen(false);

  const handleSearchInputKeyDown = (e) => {
    if (e.key === 'Enter') agentEngine(searchQuery);
  };

  const handleBookmarkClick = (bookmark, e) => {
    if (e.shiftKey) {
      window.open(bookmark.url, '_blank', 'noopener,noreferrer');
      setSelectedBookmarkId(null);
      setMultiSelectedBookmarkIds([]);
    } else if (e.metaKey || e.ctrlKey) {
      e.preventDefault();
      setMultiSelectedBookmarkIds(prev => prev.includes(bookmark.id) ? prev.filter(id => id !== bookmark.id) : [...prev, bookmark.id]);
      setSelectedBookmarkId(null);
    } else {
      setSelectedBookmarkId(bookmark.id);
      setMultiSelectedBookmarkIds([]);
    }
  };

  const handleBookmarkDoubleClick = (bookmark) => {
    setEditingBookmark(bookmark);
    setIsModalOpen(true);
  };
  
  const handleBookmarkKeyDown = (e, bookmark) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.shiftKey ? window.open(bookmark.url, '_blank', 'noopener,noreferrer') : setSelectedBookmarkId(bookmark.id);
    } else if (e.key === ' ') {
      e.preventDefault();
      window.open(bookmark.url, '_blank', 'noopener,noreferrer');
    } else if (e.key === 'e' || e.key === 'E') {
      e.preventDefault();
      setEditingBookmark(bookmark);
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingBookmark(null);
  };

  const handleImportExportModalClose = () => setIsImportExportModalOpen(false);

  const handleImportBookmarks = async (importedBookmarks) => {
    await saveAllBookmarks(importedBookmarks);
    resetSearch();
    handleImportExportModalClose();
  };
  
  const handleImportHTML = async (htmlContent) => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const bookmarkLinks = doc.querySelectorAll('a[href]');
      
      const importedBookmarks = Array.from(bookmarkLinks).map(link => {
        let folderId = 'imported';
        let parentH3 = link.closest('dl')?.previousElementSibling;
        if (parentH3?.tagName === 'H3') {
          folderId = parentH3.textContent.trim().toLowerCase().replace(/\s+/g, '-');
        }
        return {
          title: link.textContent.trim() || link.href,
          url: link.href,
          description: link.getAttribute('description') || '',
          tags: [],
          rating: null,
          folderId: folderId,
          faviconUrl: link.getAttribute('icon') || '',
          createdAt: link.getAttribute('add_date') ? new Date(parseInt(link.getAttribute('add_date')) * 1000).toISOString() : new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      });

      if (importedBookmarks.length > 0) {
        await handleImportBookmarks(importedBookmarks);
      } else {
        showCustomMessage("No bookmarks found in the imported HTML.", "info");
      }
    } catch (error) {
      console.error('Error parsing HTML bookmarks:', error);
      showCustomMessage("Failed to parse HTML bookmarks.", "error");
    }
  };

  const handleSaveBookmark = async (editedBookmark) => {
    await saveBookmark(editedBookmark);
    handleModalClose();
  };

  const handleAddNewBookmark = () => {
    setEditingBookmark({ id: null, title: '', url: '', description: '', tags: [], rating: 0, folderId: '', faviconUrl: '' });
    setIsModalOpen(true);
  };

  const displayedBookmarks = useMemo(() => applyAgentPlan(lastAction, bookmarks), [bookmarks, lastAction]);
  const selectedBookmarkDetails = selectedBookmarkId ? bookmarks.find(b => b.id === selectedBookmarkId) : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bookmarks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="fixed top-0 left-0 right-0 bg-white shadow-sm border-b border-gray-200 z-10" role="banner">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="sr-only">Bookmark Manager</h1>
          <div className="flex justify-center items-center space-x-2">
            <div className="relative w-full max-w-md">
              <input
                id="search-input"
                type="text"
                placeholder="Type natural language queries (e.g., 'find github')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchInputKeyDown}
                disabled={isProcessing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {isProcessing && <div className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>}
            </div>
            <button onClick={() => setIsHelpModalOpen(true)} className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" aria-label="Help">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 115.82 1c-.44.86-1.26 1.3-1.91 1.63-.51.26-.75.52-.75.87v.5"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </button>
          </div>
          <div className="flex justify-center items-center mt-2 space-x-2">
            <button onClick={handleAddNewBookmark} className="px-3 py-1 bg-green-500 text-white text-sm rounded-md hover:bg-green-600">Add New</button>
            <button onClick={importBookmarks} className="px-3 py-1 bg-indigo-500 text-white text-sm rounded-md hover:bg-indigo-600">Import/Export</button>
            <button onClick={() => removeDuplicates(displayedBookmarks)} className="px-3 py-1 bg-yellow-500 text-white text-sm rounded-md hover:bg-yellow-600">Remove Duplicates</button>
            {lastAction && <button onClick={resetSearch} className="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600">Clear Search</button>}
          </div>
          <div className="text-center text-xs text-gray-500 mt-2">
            Click to select, <kbd className="font-sans px-1.5 py-0.5 border border-gray-300 bg-gray-100 rounded">Shift</kbd>+click to open, double-click or <kbd className="font-sans px-1.5 py-0.5 border border-gray-300 bg-gray-100 rounded">E</kbd> to edit.
          </div>
        </div>
      </header>

      <main className="pt-48 pb-8" role="main">
        <div className="max-w-4xl mx-auto px-4">
          {lastAction && (
            <div className={`mb-4 p-3 rounded-lg ${lastAction.action === 'error' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`} role="status">
              {Array.isArray(lastAction) ? (
                <>
                  <p className="text-sm text-green-800 font-bold">Agent Plan:</p>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    {lastAction.map((step, index) => (
                      <li key={index} className="text-sm text-green-800">
                        <strong>{step.action}:</strong> {step.reasoning}
                        {step.parameters && Object.keys(step.parameters).length > 0 && (
                          <span className="ml-2 font-mono text-xs text-green-600">
                            ({Object.entries(step.parameters).map(([k, v]) => `${k}: "${v}"`).join(', ')})
                          </span>
                        )}
                      </li>
                    ))}
                  </ol>
                </>
              ) : (
                <>
                  <p className={`text-sm ${lastAction.action === 'error' ? 'text-red-800' : 'text-green-800'}`}>
                    <strong>Agent Action:</strong> {lastAction.action}
                    {lastAction.parameters && Object.keys(lastAction.parameters).length > 0 && (
                      <span className={`ml-2 font-mono text-xs ${lastAction.action === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                        ({Object.entries(lastAction.parameters).map(([k, v]) => `${k}: "${v}"`).join(', ')})
                      </span>
                    )}
                  </p>
                  <p className={`text-xs mt-1 ${lastAction.action === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                    <strong>Reasoning:</strong> {lastAction.reasoning}
                  </p>
                </>
              )}
            </div>
          )}

          {selectedBookmarkDetails && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">Selected Bookmark Details</h3>
              <p><strong>Title:</strong> {selectedBookmarkDetails.title}</p>
              <p><strong>URL:</strong> <a href={selectedBookmarkDetails.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{selectedBookmarkDetails.url}</a></p>
              {selectedBookmarkDetails.description && <p><strong>Description:</strong> {selectedBookmarkDetails.description}</p>}
              {selectedBookmarkDetails.tags?.length > 0 && <p><strong>Tags:</strong> {selectedBookmarkDetails.tags.join(', ')}</p>}
              {selectedBookmarkDetails.rating > 0 && <p><strong>Rating:</strong> {'★'.repeat(selectedBookmarkDetails.rating)}{'☆'.repeat(5 - selectedBookmarkDetails.rating)}</p>}
              {selectedBookmarkDetails.folderId && <p><strong>Folder:</strong> {selectedBookmarkDetails.folderId}</p>}
              <div className="mt-3 flex space-x-2">
                <button onClick={() => handleBookmarkDoubleClick(selectedBookmarkDetails)} className="px-3 py-1 bg-yellow-500 text-white text-sm rounded-md">Edit</button>
                <button onClick={() => deleteBookmark(selectedBookmarkDetails.id)} className="px-3 py-1 bg-red-500 text-white text-sm rounded-md">Delete</button>
              </div>
            </div>
          )}

          <div className="text-right text-sm text-gray-600 mb-4">
            {multiSelectedBookmarkIds.length > 0 ? `${multiSelectedBookmarkIds.length} selected` : selectedBookmarkId ? '1 selected' : ''}
            {multiSelectedBookmarkIds.length > 0 || selectedBookmarkId ? ` | ${displayedBookmarks.length} total` : `${displayedBookmarks.length} total bookmarks`}
          </div>

          <div className="space-y-2" role="list" aria-label="Bookmarks">
            {displayedBookmarks.length > 0 ? (
              displayedBookmarks.map((bookmark) => (
                <div
                    key={bookmark.id}
                    role="listitem"
                    tabIndex={0}
                    className={`relative rounded-lg border p-4 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 cursor-pointer ${
                        bookmarksToDelete.includes(bookmark.id) ? 'bg-red-50 border-red-300' :
                        multiSelectedBookmarkIds.includes(bookmark.id) ? 'bg-blue-100 border-blue-400' :
                        selectedBookmarkId === bookmark.id ? 'bg-blue-50 border-blue-400' :
                        bookmark.urlStatus === 'invalid' ? 'bg-yellow-100 border-yellow-300' :
                        'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={(e) => handleBookmarkClick(bookmark, e)}
                    onDoubleClick={() => handleBookmarkDoubleClick(bookmark)}
                    onKeyDown={(e) => handleBookmarkKeyDown(e, bookmark)}
                    aria-label={`Bookmark: ${bookmark.title}`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded">
                        <img src={bookmark.faviconUrl || `https://www.google.com/s2/favicons?domain=${bookmark.url}&sz=32`} alt="" className="w-full h-full object-contain rounded" onError={(e) => { e.currentTarget.src = 'https://placehold.co/32x32/f0f0f0/999999?text=?'; }}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-medium text-gray-900 truncate">{bookmark.title}</h3>
                        <p className="text-sm text-blue-600 hover:text-blue-800 truncate">{bookmark.url}</p>
                        {bookmark.description && <p className="text-sm text-gray-600 mt-1">{bookmark.description}</p>}
                        {bookmark.rating > 0 && <div className="text-xs text-yellow-400 mt-1">{'★'.repeat(bookmark.rating)}{'☆'.repeat(5 - bookmark.rating)}</div>}
                        {bookmark.tags?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{bookmark.tags.map(tag => <span key={tag} className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{tag}</span>)}</div>}
                      </div>
                    </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">{lastAction ? 'No bookmarks found matching your criteria.' : 'No bookmarks yet. Add some or import them!'}</p>
                {lastAction && <button onClick={resetSearch} className="mt-2 text-blue-600 hover:underline text-sm">Clear search</button>}
              </div>
            )}
          </div>
        </div>
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && handleModalClose()}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4 max-h-[90vh] overflow-y-auto">
            <BookmarkForm bookmark={editingBookmark} onClose={handleModalClose} onSave={handleSaveBookmark} onDelete={deleteBookmark} fetchUrlStatus={fetchUrlStatus} />
          </div>
        </div>
      )}

      {isImportExportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && handleImportExportModalClose()}>
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full m-4 max-h-[90vh] overflow-y-auto">
            <ImportExportContent bookmarks={bookmarks} onClose={handleImportExportModalClose} onImportJson={handleImportBookmarks} onImportHtml={handleImportHTML} showMessage={showCustomMessage} />
          </div>
        </div>
      )}

      {isDeleteConfirmModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && cancelDeleteDuplicates()}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full m-4">
            <DeleteConfirmModal message={`Are you sure you want to delete ${bookmarksToDelete.length} bookmark(s)? This action cannot be undone.`} onConfirm={confirmDeletions} onCancel={cancelDeleteDuplicates} />
          </div>
        </div>
      )}
      
      {isHelpModalOpen && <HelpModal onClose={() => setIsHelpModalOpen(false)} />}

      {isMessageModalOpen && <MessageModal message={messageModalContent.message} type={messageModalContent.type} onClose={closeMessageModal} />}
    </div>
  );
};

export default BookmarkApp;
