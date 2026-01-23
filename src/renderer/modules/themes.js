// Forge Browser - Themes Module
// Manages browser themes and color schemes

/**
 * Themes Mixin
 * Provides theme management and customization
 */
export const ThemesMixin = {
  /**
   * Initialize themes system
   */
  initThemes() {
    // Theme modal elements
    this.themesModal = document.getElementById('themes-modal');
    this.btnCloseThemesModal = document.getElementById('btn-close-themes-modal');
    
    // Load saved theme
    this.currentTheme = localStorage.getItem('forge-theme') || 'forge-dark';
    this.applyTheme(this.currentTheme);
    
    // Bind events
    if (this.btnCloseThemesModal) {
      this.btnCloseThemesModal.addEventListener('click', () => this.hideThemesModal());
    }
    
    // Close on click outside
    if (this.themesModal) {
      this.themesModal.addEventListener('click', (e) => {
        if (e.target === this.themesModal) {
          this.hideThemesModal();
        }
      });
    }
    
    // Theme selection handlers
    document.querySelectorAll('.theme-option').forEach(option => {
      option.addEventListener('click', () => {
        const theme = option.dataset.theme;
        this.selectTheme(theme);
      });
    });
    
    console.log('[Themes] Initialized with theme:', this.currentTheme);
  },

  /**
   * Show themes modal
   */
  showThemesModal() {
    if (this.themesModal) {
      this.themesModal.classList.remove('hidden');
      this.updateThemeSelection();
    }
  },

  /**
   * Hide themes modal
   */
  hideThemesModal() {
    if (this.themesModal) {
      this.themesModal.classList.add('hidden');
    }
  },

  /**
   * Update theme selection UI
   */
  updateThemeSelection() {
    document.querySelectorAll('.theme-option').forEach(option => {
      if (option.dataset.theme === this.currentTheme) {
        option.classList.add('selected');
      } else {
        option.classList.remove('selected');
      }
    });
  },

  /**
   * Select and apply a theme
   */
  selectTheme(themeName) {
    this.currentTheme = themeName;
    this.applyTheme(themeName);
    localStorage.setItem('forge-theme', themeName);
    this.updateThemeSelection();
  },

  /**
   * Apply theme to the browser
   */
  applyTheme(themeName) {
    const root = document.documentElement;
    
    switch (themeName) {
      case 'forge-dark':
        // Forge Dark theme (original dark theme)
        root.style.setProperty('--bg-primary', '#161616');
        root.style.setProperty('--bg-secondary', '#1e1e1e');
        root.style.setProperty('--bg-tertiary', '#2a2a2a');
        root.style.setProperty('--accent', '#ff961E');
        root.style.setProperty('--accent-hover', '#ff961E');
        root.style.setProperty('--text-primary', '#eaeaea');
        root.style.setProperty('--text-secondary', '#888888');
        root.style.setProperty('--border', '#333333');
        root.style.setProperty('--success', '#4ade80');
        root.style.setProperty('--warning', '#fbbf24');
        // Icon filters for dark theme (cream/orange colors)
        root.style.setProperty('--icon-filter-primary', 'brightness(0) saturate(100%) invert(95%) sepia(10%) saturate(800%) hue-rotate(333deg) brightness(103%) contrast(101%)');
        root.style.setProperty('--icon-filter-secondary', 'brightness(0) saturate(100%) invert(55%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(85%)');
        root.style.setProperty('--icon-filter-disabled', 'brightness(0) saturate(100%) invert(35%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(85%)');
        root.style.setProperty('--icon-filter-accent', 'brightness(0) saturate(100%) invert(64%) sepia(53%) saturate(3098%) hue-rotate(335deg) brightness(102%) contrast(101%)');
        root.style.setProperty('--icon-filter-accent-hover', 'brightness(0) saturate(100%) invert(78%) sepia(53%) saturate(1057%) hue-rotate(344deg) brightness(103%) contrast(97%)');
        root.style.setProperty('--icon-filter-success', 'brightness(0) saturate(100%) invert(60%) sepia(80%) saturate(500%) hue-rotate(85deg) brightness(95%) contrast(90%)');
        root.style.setProperty('--logo-filter-accent', 'brightness(0) saturate(100%) invert(64%) sepia(53%) saturate(3098%) hue-rotate(335deg) brightness(102%) contrast(101%)');
        // Glow colors for text effects
        root.style.setProperty('--glow-color-base', 'rgba(255, 150, 30, 0.3)');
        root.style.setProperty('--glow-color-mid', 'rgba(255, 150, 30, 0.2)');
        root.style.setProperty('--glow-color-far', 'rgba(255, 150, 30, 0.1)');
        root.style.setProperty('--glow-color-hover-base', 'rgba(255, 179, 71, 0.4)');
        root.style.setProperty('--glow-color-hover-mid', 'rgba(255, 179, 71, 0.25)');
        root.style.setProperty('--glow-color-hover-far', 'rgba(255, 179, 71, 0.15)');
        // Particle colors - orange embers
        root.style.setProperty('--particle-r', '255');
        root.style.setProperty('--particle-g-min', '150');
        root.style.setProperty('--particle-g-max', '200');
        root.style.setProperty('--particle-b-min', '30');
        root.style.setProperty('--particle-b-max', '100');
        break;
      
      case 'forge-light':
        // Forge Light theme
        root.style.setProperty('--bg-primary', '#f5f5f5');
        root.style.setProperty('--bg-secondary', '#e0e0e0');
        root.style.setProperty('--bg-tertiary', '#d0d0d0');
        root.style.setProperty('--accent', '#ff961E');
        root.style.setProperty('--accent-hover', '#ff961E');
        root.style.setProperty('--text-primary', '#1a1a1a');
        root.style.setProperty('--text-secondary', '#666666');
        root.style.setProperty('--border', '#c0c0c0');
        root.style.setProperty('--success', '#22c55e');
        root.style.setProperty('--warning', '#f59e0b');
        // Icon filters for light theme (dark/orange colors)
        root.style.setProperty('--icon-filter-primary', 'brightness(0) saturate(100%) invert(8%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(95%)');
        root.style.setProperty('--icon-filter-secondary', 'brightness(0) saturate(100%) invert(40%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(85%)');
        root.style.setProperty('--icon-filter-disabled', 'brightness(0) saturate(100%) invert(70%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(85%)');
        root.style.setProperty('--icon-filter-accent', 'brightness(0) saturate(100%) invert(64%) sepia(53%) saturate(3098%) hue-rotate(335deg) brightness(102%) contrast(101%)');
        root.style.setProperty('--icon-filter-accent-hover', 'brightness(0) saturate(100%) invert(78%) sepia(53%) saturate(1057%) hue-rotate(344deg) brightness(103%) contrast(97%)');
        root.style.setProperty('--icon-filter-success', 'brightness(0) saturate(100%) invert(60%) sepia(80%) saturate(500%) hue-rotate(85deg) brightness(95%) contrast(90%)');
        root.style.setProperty('--logo-filter-accent', 'brightness(0) saturate(100%) invert(64%) sepia(53%) saturate(3098%) hue-rotate(335deg) brightness(102%) contrast(101%)');
        // Glow colors for text effects
        root.style.setProperty('--glow-color-base', 'rgba(255, 150, 30, 0.3)');
        root.style.setProperty('--glow-color-mid', 'rgba(255, 150, 30, 0.2)');
        root.style.setProperty('--glow-color-far', 'rgba(255, 150, 30, 0.1)');
        root.style.setProperty('--glow-color-hover-base', 'rgba(255, 179, 71, 0.4)');
        root.style.setProperty('--glow-color-hover-mid', 'rgba(255, 179, 71, 0.25)');
        root.style.setProperty('--glow-color-hover-far', 'rgba(255, 179, 71, 0.15)');
        // Particle colors - orange embers
        root.style.setProperty('--particle-r', '255');
        root.style.setProperty('--particle-g-min', '150');
        root.style.setProperty('--particle-g-max', '200');
        root.style.setProperty('--particle-b-min', '30');
        root.style.setProperty('--particle-b-max', '100');
        // Focus glow color
        root.style.setProperty('--focus-glow', 'rgba(255, 150, 30, 0.2)');
        break;
      
      case 'abyssal-red':
        // Abyssal Red theme - darker than Forge Dark with deep red accent
        root.style.setProperty('--bg-primary', '#0f0f0f');
        root.style.setProperty('--bg-secondary', '#151515');
        root.style.setProperty('--bg-tertiary', '#1f1f1f');
        root.style.setProperty('--accent', '#CC0000');
        root.style.setProperty('--accent-hover', '#CC0000');
        root.style.setProperty('--text-primary', '#eaeaea');
        root.style.setProperty('--text-secondary', '#888888');
        root.style.setProperty('--border', '#2a2a2a');
        root.style.setProperty('--success', '#4ade80');
        root.style.setProperty('--warning', '#fbbf24');
        // Icon filters for Abyssal Red theme (cream text, deep red accent)
        root.style.setProperty('--icon-filter-primary', 'brightness(0) saturate(100%) invert(95%) sepia(10%) saturate(800%) hue-rotate(333deg) brightness(103%) contrast(101%)');
        root.style.setProperty('--icon-filter-secondary', 'brightness(0) saturate(100%) invert(55%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(85%)');
        root.style.setProperty('--icon-filter-disabled', 'brightness(0) saturate(100%) invert(35%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(85%)');
        root.style.setProperty('--icon-filter-accent', 'brightness(0) saturate(100%) invert(14%) sepia(97%) saturate(7471%) hue-rotate(0deg) brightness(94%) contrast(117%)');
        root.style.setProperty('--icon-filter-accent-hover', 'brightness(0) saturate(100%) invert(23%) sepia(95%) saturate(6589%) hue-rotate(358deg) brightness(91%) contrast(119%)');
        root.style.setProperty('--icon-filter-success', 'brightness(0) saturate(100%) invert(60%) sepia(80%) saturate(500%) hue-rotate(85deg) brightness(95%) contrast(90%)');
        root.style.setProperty('--logo-filter-accent', 'brightness(0) saturate(100%) invert(14%) sepia(97%) saturate(7471%) hue-rotate(0deg) brightness(94%) contrast(117%)');
        // Glow colors for text effects - deep red
        root.style.setProperty('--glow-color-base', 'rgba(204, 0, 0, 0.3)');
        root.style.setProperty('--glow-color-mid', 'rgba(204, 0, 0, 0.2)');
        root.style.setProperty('--glow-color-far', 'rgba(204, 0, 0, 0.1)');
        root.style.setProperty('--glow-color-hover-base', 'rgba(255, 50, 50, 0.4)');
        root.style.setProperty('--glow-color-hover-mid', 'rgba(255, 50, 50, 0.25)');
        root.style.setProperty('--glow-color-hover-far', 'rgba(255, 50, 50, 0.15)');
        // Particle colors - red embers
        root.style.setProperty('--particle-r', '204');
        root.style.setProperty('--particle-g-min', '0');
        root.style.setProperty('--particle-g-max', '30');
        root.style.setProperty('--particle-b-min', '0');
        root.style.setProperty('--particle-b-max', '20');
        // Focus glow color
        root.style.setProperty('--focus-glow', 'rgba(204, 0, 0, 0.2)');
        break;
      
      case 'steelheart':
        // Steelheart theme - black/dark grey with blue steel accent
        root.style.setProperty('--bg-primary', '#0a0a0a');
        root.style.setProperty('--bg-secondary', '#141414');
        root.style.setProperty('--bg-tertiary', '#1a1a1a');
        root.style.setProperty('--accent', '#4A7C9D');
        root.style.setProperty('--accent-hover', '#4A7C9D');
        root.style.setProperty('--text-primary', '#c0c0c0');
        root.style.setProperty('--text-secondary', '#808080');
        root.style.setProperty('--border', '#2a2a2a');
        root.style.setProperty('--success', '#4ade80');
        root.style.setProperty('--warning', '#fbbf24');
        // Icon filters for Steelheart theme (silver text, blue steel accent)
        root.style.setProperty('--icon-filter-primary', 'brightness(0) saturate(100%) invert(75%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(90%)');
        root.style.setProperty('--icon-filter-secondary', 'brightness(0) saturate(100%) invert(50%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(100%) contrast(90%)');
        root.style.setProperty('--icon-filter-disabled', 'brightness(0) saturate(100%) invert(35%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(95%) contrast(85%)');
        root.style.setProperty('--icon-filter-accent', 'brightness(0) saturate(100%) invert(49%) sepia(18%) saturate(1028%) hue-rotate(161deg) brightness(92%) contrast(91%)');
        root.style.setProperty('--icon-filter-accent-hover', 'brightness(0) saturate(100%) invert(59%) sepia(28%) saturate(858%) hue-rotate(161deg) brightness(95%) contrast(93%)');
        root.style.setProperty('--icon-filter-success', 'brightness(0) saturate(100%) invert(60%) sepia(80%) saturate(500%) hue-rotate(85deg) brightness(95%) contrast(90%)');
        root.style.setProperty('--logo-filter-accent', 'brightness(0) saturate(100%) invert(49%) sepia(18%) saturate(1028%) hue-rotate(161deg) brightness(92%) contrast(91%)');
        // Glow colors for text effects - blue steel
        root.style.setProperty('--glow-color-base', 'rgba(74, 124, 157, 0.3)');
        root.style.setProperty('--glow-color-mid', 'rgba(74, 124, 157, 0.2)');
        root.style.setProperty('--glow-color-far', 'rgba(74, 124, 157, 0.1)');
        root.style.setProperty('--glow-color-hover-base', 'rgba(100, 160, 200, 0.4)');
        root.style.setProperty('--glow-color-hover-mid', 'rgba(100, 160, 200, 0.25)');
        root.style.setProperty('--glow-color-hover-far', 'rgba(100, 160, 200, 0.15)');
        // Particle colors - blue steel embers
        root.style.setProperty('--particle-r', '74');
        root.style.setProperty('--particle-g-min', '124');
        root.style.setProperty('--particle-g-max', '160');
        root.style.setProperty('--particle-b-min', '157');
        root.style.setProperty('--particle-b-max', '200');
        // Focus glow color
        root.style.setProperty('--focus-glow', 'rgba(74, 124, 157, 0.2)');
        break;
      
      case 'rustveil':
        // Rustveil theme - black/deep rust with muted copper accent
        root.style.setProperty('--bg-primary', '#0a0a0a');
        root.style.setProperty('--bg-secondary', '#1a0f0d');
        root.style.setProperty('--bg-tertiary', '#2a1915');
        root.style.setProperty('--accent', '#A67C52');
        root.style.setProperty('--accent-hover', '#A67C52');
        root.style.setProperty('--text-primary', '#D4BFA8');
        root.style.setProperty('--text-secondary', '#8a7866');
        root.style.setProperty('--border', '#2d1f1a');
        root.style.setProperty('--success', '#4ade80');
        root.style.setProperty('--warning', '#fbbf24');
        // Icon filters for Rustveil theme (warm beige text, muted copper accent)
        root.style.setProperty('--icon-filter-primary', 'brightness(0) saturate(100%) invert(82%) sepia(12%) saturate(507%) hue-rotate(343deg) brightness(95%) contrast(90%)');
        root.style.setProperty('--icon-filter-secondary', 'brightness(0) saturate(100%) invert(52%) sepia(10%) saturate(507%) hue-rotate(343deg) brightness(92%) contrast(88%)');
        root.style.setProperty('--icon-filter-disabled', 'brightness(0) saturate(100%) invert(35%) sepia(10%) saturate(400%) hue-rotate(343deg) brightness(90%) contrast(85%)');
        root.style.setProperty('--icon-filter-accent', 'brightness(0) saturate(100%) invert(56%) sepia(27%) saturate(569%) hue-rotate(350deg) brightness(92%) contrast(88%)');
        root.style.setProperty('--icon-filter-accent-hover', 'brightness(0) saturate(100%) invert(66%) sepia(37%) saturate(669%) hue-rotate(350deg) brightness(95%) contrast(90%)');
        root.style.setProperty('--icon-filter-success', 'brightness(0) saturate(100%) invert(60%) sepia(80%) saturate(500%) hue-rotate(85deg) brightness(95%) contrast(90%)');
        root.style.setProperty('--logo-filter-accent', 'brightness(0) saturate(100%) invert(56%) sepia(27%) saturate(569%) hue-rotate(350deg) brightness(92%) contrast(88%)');
        // Glow colors for text effects - muted copper
        root.style.setProperty('--glow-color-base', 'rgba(166, 124, 82, 0.3)');
        root.style.setProperty('--glow-color-mid', 'rgba(166, 124, 82, 0.2)');
        root.style.setProperty('--glow-color-far', 'rgba(166, 124, 82, 0.1)');
        root.style.setProperty('--glow-color-hover-base', 'rgba(200, 150, 100, 0.4)');
        root.style.setProperty('--glow-color-hover-mid', 'rgba(200, 150, 100, 0.25)');
        root.style.setProperty('--glow-color-hover-far', 'rgba(200, 150, 100, 0.15)');
        // Particle colors - rust/copper embers
        root.style.setProperty('--particle-r', '166');
        root.style.setProperty('--particle-g-min', '100');
        root.style.setProperty('--particle-g-max', '140');
        root.style.setProperty('--particle-b-min', '70');
        root.style.setProperty('--particle-b-max', '100');
        // Focus glow color
        root.style.setProperty('--focus-glow', 'rgba(166, 124, 82, 0.2)');
        break;
      
      case 'sakura-shadow':
        // Sakura Shadow theme - slightly lighter than Forge Dark with cotton candy pink accent
        root.style.setProperty('--bg-primary', '#1a1a1a');
        root.style.setProperty('--bg-secondary', '#222222');
        root.style.setProperty('--bg-tertiary', '#2c2c2c');
        root.style.setProperty('--accent', '#FF87F4');
        root.style.setProperty('--accent-hover', '#FF87F4');
        root.style.setProperty('--text-primary', '#eaeaea');
        root.style.setProperty('--text-secondary', '#888888');
        root.style.setProperty('--border', '#333333');
        root.style.setProperty('--success', '#4ade80');
        root.style.setProperty('--warning', '#fbbf24');
        // Icon filters for Sakura Shadow theme (darker pink icons)
        root.style.setProperty('--icon-filter-primary', 'brightness(0) saturate(100%) invert(56%) sepia(99%) saturate(6456%) hue-rotate(286deg) brightness(101%) contrast(100%)');
        root.style.setProperty('--icon-filter-secondary', 'brightness(0) saturate(100%) invert(46%) sepia(89%) saturate(5456%) hue-rotate(286deg) brightness(99%) contrast(98%)');
        root.style.setProperty('--icon-filter-disabled', 'brightness(0) saturate(100%) invert(36%) sepia(79%) saturate(4456%) hue-rotate(286deg) brightness(97%) contrast(96%)');
        root.style.setProperty('--icon-filter-accent', 'brightness(0) saturate(100%) invert(56%) sepia(99%) saturate(6456%) hue-rotate(286deg) brightness(101%) contrast(100%)');
        root.style.setProperty('--icon-filter-accent-hover', 'brightness(0) saturate(100%) invert(66%) sepia(99%) saturate(5456%) hue-rotate(286deg) brightness(103%) contrast(102%)');
        root.style.setProperty('--icon-filter-success', 'brightness(0) saturate(100%) invert(60%) sepia(80%) saturate(500%) hue-rotate(85deg) brightness(95%) contrast(90%)');
        root.style.setProperty('--logo-filter-accent', 'brightness(0) saturate(100%) invert(80%) sepia(74%) saturate(5806%) hue-rotate(280deg) brightness(103%) contrast(100%)');
        // Glow colors for text effects - cotton candy pink
        root.style.setProperty('--glow-color-base', 'rgba(255, 135, 244, 0.3)');
        root.style.setProperty('--glow-color-mid', 'rgba(255, 135, 244, 0.2)');
        root.style.setProperty('--glow-color-far', 'rgba(255, 135, 244, 0.1)');
        root.style.setProperty('--glow-color-hover-base', 'rgba(255, 160, 248, 0.4)');
        root.style.setProperty('--glow-color-hover-mid', 'rgba(255, 160, 248, 0.25)');
        root.style.setProperty('--glow-color-hover-far', 'rgba(255, 160, 248, 0.15)');
        // Particle colors - pink embers
        root.style.setProperty('--particle-r', '255');
        root.style.setProperty('--particle-g-min', '100');
        root.style.setProperty('--particle-g-max', '160');
        root.style.setProperty('--particle-b-min', '220');
        root.style.setProperty('--particle-b-max', '250');
        // Focus glow color
        root.style.setProperty('--focus-glow', 'rgba(255, 135, 244, 0.2)');
        break;
      
      // Future themes will be added here
      
      default:
        console.warn('[Themes] Unknown theme:', themeName);
    }
  }
};

export default ThemesMixin;
