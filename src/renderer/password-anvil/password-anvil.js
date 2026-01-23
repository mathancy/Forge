let passwords = [];
let editingId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadPasswords();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('add-btn').addEventListener('click', () => openModal());
    document.getElementById('import-btn').addEventListener('click', () => document.getElementById('file-input').click());
    document.getElementById('cancel-btn').addEventListener('click', () => closeModal());
    document.getElementById('save-btn').addEventListener('click', () => savePassword());
    document.getElementById('search').addEventListener('input', (e) => filterPasswords(e.target.value));
    document.getElementById('file-input').addEventListener('change', (e) => importCSV(e.target.files[0]));
    
    // Close modal on overlay click
    document.getElementById('password-modal').addEventListener('click', (e) => {
        if (e.target.id === 'password-modal') {
            closeModal();
        }
    });
}

async function loadPasswords() {
    const result = await window.electronAPI.passwords.getAll();
    passwords = result;
    renderPasswords(passwords);
}

function renderPasswords(passwordList) {
    const container = document.getElementById('passwords-list');
    
    if (passwordList.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🔐</div>
                <div class="empty-state-text">No passwords saved yet</div>
                <div class="empty-state-subtext">Add your first password or import from Chrome</div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = passwordList.map(pwd => `
        <div class="password-item">
            <div class="password-info">
                <div class="password-url">${escapeHtml(pwd.url)}</div>
                <div class="password-username">${escapeHtml(pwd.username)}</div>
            </div>
            <div class="password-actions">
                <button class="icon-btn" onclick="copyPassword(${pwd.id})">Copy</button>
                <button class="icon-btn" onclick="editPassword(${pwd.id})">Edit</button>
                <button class="icon-btn delete" onclick="deletePassword(${pwd.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function filterPasswords(query) {
    const filtered = passwords.filter(pwd => 
        pwd.url.toLowerCase().includes(query.toLowerCase()) ||
        pwd.username.toLowerCase().includes(query.toLowerCase())
    );
    renderPasswords(filtered);
}

function openModal(password = null) {
    const modal = document.getElementById('password-modal');
    const title = document.getElementById('modal-title');
    
    if (password) {
        title.textContent = 'Edit Password';
        document.getElementById('url-input').value = password.url;
        document.getElementById('username-input').value = password.username;
        document.getElementById('password-input').value = password.password;
        editingId = password.id;
    } else {
        title.textContent = 'Add Password';
        document.getElementById('url-input').value = '';
        document.getElementById('username-input').value = '';
        document.getElementById('password-input').value = '';
        editingId = null;
    }
    
    modal.classList.add('show');
}

function closeModal() {
    document.getElementById('password-modal').classList.remove('show');
    editingId = null;
}

async function savePassword() {
    const url = document.getElementById('url-input').value.trim();
    const username = document.getElementById('username-input').value.trim();
    const password = document.getElementById('password-input').value;
    
    if (!url || !username || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    if (editingId) {
        await window.electronAPI.passwords.update(editingId, url, username, password);
    } else {
        await window.electronAPI.passwords.add(url, username, password);
    }
    
    closeModal();
    loadPasswords();
}

async function editPassword(id) {
    const password = passwords.find(p => p.id === id);
    if (password) {
        openModal(password);
    }
}

async function deletePassword(id) {
    if (confirm('Are you sure you want to delete this password?')) {
        await window.electronAPI.passwords.delete(id);
        loadPasswords();
    }
}

async function copyPassword(id) {
    const password = passwords.find(p => p.id === id);
    if (password) {
        await navigator.clipboard.writeText(password.password);
        
        // Show feedback
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.background = '#4CAF50';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    }
}

async function importCSV(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const csvData = e.target.result;
        const result = await window.electronAPI.passwords.importCSV(csvData);
        
        alert(`Import complete!\nImported: ${result.imported}\nErrors: ${result.errors}`);
        loadPasswords();
    };
    reader.readAsText(file);
    
    // Reset file input
    document.getElementById('file-input').value = '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
