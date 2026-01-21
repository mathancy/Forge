const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

class PasswordService {
    constructor() {
        this.db = null;
        this.encryptionKey = null;
    }

    initialize() {
        const dbPath = path.join(app.getPath('userData'), 'passwords.db');
        this.db = new Database(dbPath);
        
        // Generate or load encryption key
        this.initializeEncryption();
        
        // Create passwords table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS passwords (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                username TEXT NOT NULL,
                password TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
            
            CREATE INDEX IF NOT EXISTS idx_passwords_url ON passwords(url);
        `);
    }

    initializeEncryption() {
        const keyPath = path.join(app.getPath('userData'), 'password.key');
        const fs = require('fs');
        
        if (fs.existsSync(keyPath)) {
            this.encryptionKey = fs.readFileSync(keyPath);
        } else {
            // Generate a new key
            this.encryptionKey = crypto.randomBytes(32);
            fs.writeFileSync(keyPath, this.encryptionKey, { mode: 0o600 });
        }
    }

    encrypt(text) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    decrypt(text) {
        const parts = text.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }

    addPassword(url, username, password) {
        const encryptedPassword = this.encrypt(password);
        const now = Date.now();
        
        const stmt = this.db.prepare(`
            INSERT INTO passwords (url, username, password, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        `);
        
        const result = stmt.run(url, username, encryptedPassword, now, now);
        return result.lastInsertRowid;
    }

    updatePassword(id, url, username, password) {
        const encryptedPassword = this.encrypt(password);
        const now = Date.now();
        
        const stmt = this.db.prepare(`
            UPDATE passwords
            SET url = ?, username = ?, password = ?, updated_at = ?
            WHERE id = ?
        `);
        
        stmt.run(url, username, encryptedPassword, now, id);
    }

    deletePassword(id) {
        const stmt = this.db.prepare('DELETE FROM passwords WHERE id = ?');
        stmt.run(id);
    }

    /**
     * Extract the base domain from a hostname
     * e.g., "www.amazon.co.uk" -> "amazon"
     * e.g., "login.amazon.com" -> "amazon"
     */
    extractBaseDomain(hostname) {
        // Remove www. prefix
        let domain = hostname.replace(/^www\./, '');
        
        // Known multi-part TLDs
        const multiPartTLDs = ['.co.uk', '.co.jp', '.co.nz', '.com.au', '.com.br', '.co.in', '.org.uk'];
        
        // Check for multi-part TLD
        for (const tld of multiPartTLDs) {
            if (domain.endsWith(tld)) {
                domain = domain.slice(0, -tld.length);
                break;
            }
        }
        
        // Remove single TLD if not already handled
        if (domain.includes('.')) {
            const parts = domain.split('.');
            // If we have subdomains, get the second-to-last part (main domain)
            // e.g., "login.amazon" -> "amazon"
            // e.g., "amazon" -> "amazon"
            if (parts.length >= 2) {
                // Check if it looks like a subdomain situation
                const possibleDomain = parts[parts.length - 2];
                const lastPart = parts[parts.length - 1];
                
                // Common TLDs
                const commonTLDs = ['com', 'org', 'net', 'edu', 'gov', 'io', 'ai', 'app', 'dev', 'uk', 'de', 'fr', 'jp', 'cn', 'au', 'ca'];
                
                if (commonTLDs.includes(lastPart)) {
                    return possibleDomain;
                }
            }
            // Just return the first meaningful part
            return parts[0];
        }
        
        return domain;
    }

    getPasswordsForUrl(url) {
        try {
            const hostname = new URL(url).hostname;
            const baseDomain = this.extractBaseDomain(hostname);
            
            console.log('[Password Service] Looking up passwords for URL:', url);
            console.log('[Password Service] Hostname:', hostname);
            console.log('[Password Service] Base domain:', baseDomain);
            
            // Search using the base domain for broader matching
            const stmt = this.db.prepare(`
                SELECT id, url, username, password, created_at, updated_at
                FROM passwords
                WHERE url LIKE ?
                ORDER BY updated_at DESC
            `);
            
            const searchPattern = `%${baseDomain}%`;
            console.log('[Password Service] Search pattern:', searchPattern);
            
            const rows = stmt.all(searchPattern);
            console.log('[Password Service] Found', rows.length, 'matching passwords');
            
            const results = rows.map(row => ({
                id: row.id,
                url: row.url,
                username: row.username,
                password: this.decrypt(row.password),
                created_at: row.created_at,
                updated_at: row.updated_at
            }));
            
            if (results.length > 0) {
                console.log('[Password Service] Returning credentials for:');
                results.forEach(r => {
                    console.log('  - URL:', r.url, '| Username:', r.username);
                });
            } else {
                console.log('[Password Service] No passwords found for base domain:', baseDomain);
            }
            
            return results;
        } catch (e) {
            console.error('[Password Service] Error getting passwords for URL:', e);
            return [];
        }
    }

    getAllPasswords() {
        const stmt = this.db.prepare(`
            SELECT id, url, username, password, created_at, updated_at
            FROM passwords
            ORDER BY url, username
        `);
        
        const rows = stmt.all();
        
        console.log('[Password Service] getAllPasswords called, found', rows.length, 'total passwords');
        if (rows.length > 0) {
            console.log('[Password Service] Database contents:');
            rows.forEach(row => {
                console.log('  - ID:', row.id, '| URL:', row.url, '| Username:', row.username);
            });
        }
        
        return rows.map(row => ({
            id: row.id,
            url: row.url,
            username: row.username,
            password: this.decrypt(row.password),
            created_at: row.created_at,
            updated_at: row.updated_at
        }));
    }

    importFromCSV(csvData) {
        const lines = csvData.split('\n');
        let imported = 0;
        let errors = 0;
        
        // Skip header row (name,url,username,password)
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            try {
                // Parse CSV line (handle quoted fields)
                const fields = this.parseCSVLine(line);
                
                if (fields.length >= 4) {
                    const [name, url, username, password] = fields;
                    
                    if (url && username && password) {
                        this.addPassword(url, username, password);
                        imported++;
                    }
                }
            } catch (e) {
                console.error('Error importing password line:', e);
                errors++;
            }
        }
        
        return { imported, errors };
    }

    parseCSVLine(line) {
        const fields = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                fields.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        fields.push(current);
        return fields;
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = PasswordService;
