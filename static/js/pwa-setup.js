// Register Service Worker for offline functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/static/js/service-worker.js')
      .then((registration) => {
        console.log('✓ Service Worker registered successfully:', registration);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

// Handle install prompt (Add to Home Screen)
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event for later use.
  deferredPrompt = e;
  
  // Show install button if it exists
  const installButton = document.getElementById('installAppBtn');
  if (installButton) {
    installButton.style.display = 'block';
    
    installButton.addEventListener('click', async () => {
      // Hide the app provided install promotion
      installButton.style.display = 'none';
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      // Optionally, send analytics event with outcome of user choice
      console.log(`User response to the install prompt: ${outcome}`);
      // We've used the prompt, and can't use it again, throw it away
      deferredPrompt = null;
    });
  }
});

window.addEventListener('appinstalled', () => {
  console.log('✓ Healthcare AI App installed successfully!');
  // Hide the install button
  const installButton = document.getElementById('installAppBtn');
  if (installButton) {
    installButton.style.display = 'none';
  }
});

// Detect if running as PWA (standalone mode)
const isStandalone = window.navigator.standalone === true;
console.log('Running as PWA:', isStandalone);

// Handle app updates
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('✓ App updated! Refresh to see changes.');
  });
}

// Request notification permissions for future use
function requestNotificationPermission() {
  if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      console.log('Notifications already enabled');
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('✓ Notifications enabled');
        }
      });
    }
  }
}

// Request permission when app loads
window.addEventListener('load', () => {
  requestNotificationPermission();
});
