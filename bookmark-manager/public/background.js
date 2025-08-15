// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log('Bookmark Manager Extension installed.');
});

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});
