// Google OAuth Authentication for Forge Browser
// Handles Google sign-in, token management, and session persistence

const { BrowserWindow, session } = require('electron');
const https = require('https');
const http = require('http');
const url = require('url');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class GoogleAuth {
  constructor(app) {
    this.app = app;
    
    // OAuth Configuration - Replace with your credentials
    this.config = {
      clientId: '', // Set via setCredentials()
      clientSecret: '', // Set via setCredentials()
      scopes: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
      redirectUri: 'http://127.0.0.1:8234/callback'
    };
    
    this.tokens = null;
    this.userInfo = null;
    this.authWindow = null;
    this.localServer = null;
    
    // Load saved tokens
    this.loadTokens();
  }
  
  setCredentials(clientId, clientSecret) {
    this.config.clientId = clientId;
    this.config.clientSecret = clientSecret;
  }
  
  getTokensPath() {
    const userDataPath = this.app.getPath('userData');
    return path.join(userDataPath, 'google-tokens.json');
  }
  
  loadTokens() {
    try {
      const tokensPath = this.getTokensPath();
      if (fs.existsSync(tokensPath)) {
        const data = fs.readFileSync(tokensPath, 'utf8');
        const saved = JSON.parse(data);
        this.tokens = saved.tokens;
        this.userInfo = saved.userInfo;
        console.log('Loaded Google tokens for:', this.userInfo?.email);
        return true;
      }
    } catch (e) {
      console.error('Failed to load Google tokens:', e);
    }
    return false;
  }
  
  saveTokens() {
    try {
      const tokensPath = this.getTokensPath();
      fs.writeFileSync(tokensPath, JSON.stringify({
        tokens: this.tokens,
        userInfo: this.userInfo
      }, null, 2));
      console.log('Saved Google tokens');
    } catch (e) {
      console.error('Failed to save Google tokens:', e);
    }
  }
  
  clearTokens() {
    this.tokens = null;
    this.userInfo = null;
    try {
      const tokensPath = this.getTokensPath();
      if (fs.existsSync(tokensPath)) {
        fs.unlinkSync(tokensPath);
      }
    } catch (e) {
      console.error('Failed to clear Google tokens:', e);
    }
  }
  
  isSignedIn() {
    return this.tokens !== null && this.userInfo !== null;
  }
  
  getUserInfo() {
    return this.userInfo;
  }
  
  generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
  }
  
  generateCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }
  
  async signIn() {
    return new Promise((resolve, reject) => {
      if (!this.config.clientId) {
        reject(new Error('Google OAuth credentials not configured'));
        return;
      }
      
      // Generate PKCE codes for security
      const codeVerifier = this.generateCodeVerifier();
      const codeChallenge = this.generateCodeChallenge(codeVerifier);
      const state = crypto.randomBytes(16).toString('hex');
      
      // Build authorization URL
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', this.config.clientId);
      authUrl.searchParams.set('redirect_uri', this.config.redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', this.config.scopes.join(' '));
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      
      // Start local server to receive callback
      this.startCallbackServer(codeVerifier, state, resolve, reject);
      
      // Open auth window
      this.authWindow = new BrowserWindow({
        width: 500,
        height: 700,
        show: true,
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      
      this.authWindow.loadURL(authUrl.toString());
      
      this.authWindow.on('closed', () => {
        this.authWindow = null;
        this.stopCallbackServer();
      });
    });
  }
  
  startCallbackServer(codeVerifier, expectedState, resolve, reject) {
    this.localServer = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url, true);
      
      if (parsedUrl.pathname === '/callback') {
        const { code, state, error } = parsedUrl.query;
        
        if (error) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>Authentication Failed</h1><p>You can close this window.</p></body></html>');
          this.stopCallbackServer();
          if (this.authWindow) this.authWindow.close();
          reject(new Error(error));
          return;
        }
        
        if (state !== expectedState) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>Security Error</h1><p>State mismatch. You can close this window.</p></body></html>');
          this.stopCallbackServer();
          if (this.authWindow) this.authWindow.close();
          reject(new Error('State mismatch'));
          return;
        }
        
        try {
          // Exchange code for tokens
          await this.exchangeCodeForTokens(code, codeVerifier);
          
          // Get user info
          await this.fetchUserInfo();
          
          // Save tokens
          this.saveTokens();
          
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <head>
                <style>
                  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                         background: #161616; color: #fff; display: flex; justify-content: center; 
                         align-items: center; height: 100vh; margin: 0; }
                  .container { text-align: center; }
                  h1 { color: #ff6b35; }
                </style>
              </head>
              <body>
                <div class="container">
                  <h1>✓ Signed in to Forge</h1>
                  <p>Welcome, ${this.userInfo?.name || 'User'}!</p>
                  <p>You can close this window.</p>
                </div>
              </body>
            </html>
          `);
          
          this.stopCallbackServer();
          if (this.authWindow) this.authWindow.close();
          resolve(this.userInfo);
        } catch (e) {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>Authentication Error</h1><p>' + e.message + '</p></body></html>');
          this.stopCallbackServer();
          if (this.authWindow) this.authWindow.close();
          reject(e);
        }
      }
    });
    
    this.localServer.listen(8234, '127.0.0.1');
  }
  
  stopCallbackServer() {
    if (this.localServer) {
      this.localServer.close();
      this.localServer = null;
    }
  }
  
  exchangeCodeForTokens(code, codeVerifier) {
    return new Promise((resolve, reject) => {
      const postData = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri
      }).toString();
      
      const options = {
        hostname: 'oauth2.googleapis.com',
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const tokens = JSON.parse(data);
            if (tokens.error) {
              reject(new Error(tokens.error_description || tokens.error));
            } else {
              this.tokens = {
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiresAt: Date.now() + (tokens.expires_in * 1000)
              };
              resolve(this.tokens);
            }
          } catch (e) {
            reject(e);
          }
        });
      });
      
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }
  
  fetchUserInfo() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'www.googleapis.com',
        path: '/oauth2/v2/userinfo',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.tokens.accessToken}`
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            this.userInfo = JSON.parse(data);
            resolve(this.userInfo);
          } catch (e) {
            reject(e);
          }
        });
      });
      
      req.on('error', reject);
      req.end();
    });
  }
  
  async refreshAccessToken() {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }
    
    return new Promise((resolve, reject) => {
      const postData = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: this.tokens.refreshToken,
        grant_type: 'refresh_token'
      }).toString();
      
      const options = {
        hostname: 'oauth2.googleapis.com',
        path: '/token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const tokens = JSON.parse(data);
            if (tokens.error) {
              reject(new Error(tokens.error_description || tokens.error));
            } else {
              this.tokens.accessToken = tokens.access_token;
              this.tokens.expiresAt = Date.now() + (tokens.expires_in * 1000);
              this.saveTokens();
              resolve(this.tokens);
            }
          } catch (e) {
            reject(e);
          }
        });
      });
      
      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }
  
  async getValidAccessToken() {
    if (!this.tokens) {
      throw new Error('Not signed in');
    }
    
    // Refresh if token expires in less than 5 minutes
    if (this.tokens.expiresAt - Date.now() < 5 * 60 * 1000) {
      await this.refreshAccessToken();
    }
    
    return this.tokens.accessToken;
  }
  
  async signOut() {
    // Revoke token
    if (this.tokens?.accessToken) {
      try {
        await this.revokeToken(this.tokens.accessToken);
      } catch (e) {
        console.error('Failed to revoke token:', e);
      }
    }
    
    // Clear local data
    this.clearTokens();
    
    // Clear Google cookies from session
    const ses = session.defaultSession;
    const cookies = await ses.cookies.get({ domain: '.google.com' });
    for (const cookie of cookies) {
      const cookieUrl = `https://${cookie.domain.replace(/^\./, '')}${cookie.path}`;
      await ses.cookies.remove(cookieUrl, cookie.name);
    }
    
    return true;
  }
  
  revokeToken(token) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'oauth2.googleapis.com',
        path: `/revoke?token=${token}`,
        method: 'POST'
      };
      
      const req = https.request(options, (res) => {
        resolve(res.statusCode === 200);
      });
      
      req.on('error', reject);
      req.end();
    });
  }
}

module.exports = GoogleAuth;
