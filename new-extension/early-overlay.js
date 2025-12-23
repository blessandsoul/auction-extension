// Early overlay injection - runs before page loads
// This script runs at document_start to show overlay immediately

(function () {
  // SKIP overlay on dashboard pages - we only need it on login page
  if (window.location.href.includes('member-payments') || 
      window.location.href.includes('dashboard') ||
      window.location.href.includes('Payment') ||
      window.location.href.includes('tobepickedup')) {
    return; // Exit early, don't inject anything
  }

  // Immediately inject CSS to hide page content
  const hideStyle = document.createElement('style');
  hideStyle.id = 'usalogistics-hide-style';
  hideStyle.textContent = `
    html, body { 
      visibility: hidden !important; 
      background: #f8fafc !important; 
    }
  `;
  (document.head || document.documentElement).appendChild(hideStyle);

  // Check for autologin flag
  const shouldShowOverlay = sessionStorage.getItem('usalogistics_autologin') === 'true';

  if (shouldShowOverlay) {
    sessionStorage.removeItem('usalogistics_autologin');
  }

  // Lucide lock icon as inline SVG
  const lockIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;

  // Create overlay as soon as possible
  const injectOverlay = () => {
    const existingHideStyle = document.getElementById('usalogistics-hide-style');
    if (existingHideStyle) existingHideStyle.remove();

    if (!document.getElementById('usalogistics-overlay') && shouldShowOverlay) {
      const overlay = document.createElement('div');
      overlay.id = 'usalogistics-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;
      overlay.innerHTML = `
        <div style="background: white; padding: 48px 64px; border-radius: 24px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1); display: flex; flex-direction: column; align-items: center; gap: 24px;">
          <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); border-radius: 20px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4);">
            ${lockIcon}
          </div>
          <div style="text-align: center;">
            <div style="color: #1e293b; font-size: 22px; font-weight: 700; margin-bottom: 8px;">
              AAS
            </div>
            <div style="color: #64748b; font-size: 15px; font-weight: 500;">
              Authenticating...
            </div>
          </div>
          <div style="width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top: 3px solid #3b82f6; border-radius: 50%; animation: usaspin 0.8s linear infinite;"></div>
        </div>
        <style>
          @keyframes usaspin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          body { overflow: hidden !important; visibility: visible !important; }
          html { visibility: visible !important; }
        </style>
      `;

      if (document.body) {
        document.body.insertBefore(overlay, document.body.firstChild);
      } else if (document.documentElement) {
        document.documentElement.appendChild(overlay);
      }
    } else if (!shouldShowOverlay) {
      document.documentElement.style.visibility = 'visible';
      if (document.body) document.body.style.visibility = 'visible';
    }
  };

  if (document.body) {
    injectOverlay();
  } else {
    document.addEventListener('DOMContentLoaded', injectOverlay);
  }

  // Failsafe
  setTimeout(() => {
    const existingHideStyle = document.getElementById('usalogistics-hide-style');
    if (existingHideStyle) existingHideStyle.remove();
    document.documentElement.style.visibility = 'visible';
    if (document.body) document.body.style.visibility = 'visible';
  }, 3000);
})();
