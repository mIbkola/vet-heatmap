const { app, BrowserWindow } = require('electron');
const path = require('path');

// Preload script for security — exposes minimal API to renderer
window.addEventListener('DOMContentLoaded', () => {
  // Replace Chrome-specific user agent to avoid detection issues
  const replaceText = (selector, text) => {
    const el = document.getElementById(selector);
    if (el) el.innerText = text;
  };

  for (const type of ['chrome', 'node', 'electron']) {
    replaceText(`${type}-version`, '');
  }
});
