// Window Controls Module
// Handles window minimize, maximize, close buttons

export const WindowControlsMixin = {
  setupWindowControls() {
    console.log('[Forge] Setting up window controls...');
    
    if (this.btnMinimize) {
      this.btnMinimize.addEventListener('click', () => {
        console.log('[Forge] Minimize clicked');
        window.forgeAPI.minimize();
      });
    }
    if (this.btnMaximize) {
      this.btnMaximize.addEventListener('click', () => {
        console.log('[Forge] Maximize clicked');
        window.forgeAPI.maximize();
      });
    }
    if (this.btnClose) {
      this.btnClose.addEventListener('click', () => {
        console.log('[Forge] Close clicked');
        window.forgeAPI.close();
      });
    }
  }
};
