// main.js
import { createApp } from 'vue';
import App from './App.vue';

let app = null; // Initialize app variable

// Function to mount the Vue app
const mountApp = () => {
  // Create a new Vue app instance
  app = createApp(App);

  // Mount the Vue app instance to the DOM element with ID 'app'
  app.mount('#app');
};

// Unmount the previous Vue app instance (if exists) before mounting a new one
const unmountApp = () => {
  if (app) {
    app.unmount(); // Unmount the previous Vue app
  }
};

// Initial mount of the Vue app
mountApp();

// Optionally, you can expose functions to mount/unmount the app globally
window.mountApp = mountApp;
window.unmountApp = unmountApp;