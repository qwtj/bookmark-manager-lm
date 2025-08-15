import React from 'react';
import './App.css';
import BookmarkApp from './components/BookmarkApp.jsx';

function App() {
  const openExtensionTab = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
      window.open(chrome.runtime.getURL('index.html'), '_blank');
    } else {
      alert('This action only works in the Chrome extension context.');
    }
  };

  return (
    <div>
      <BookmarkApp />
    </div>
  );
}

export default App;
