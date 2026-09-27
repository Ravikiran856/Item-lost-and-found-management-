// Force access via server
if (window.location.protocol === 'file:' || !window.location.origin.includes('localhost:5000') && !window.location.origin.includes('127.0.0.1:5000')) {
    alert('Please access the app via the server: http://localhost:5000');
    window.location.href = 'http://localhost:5000';
}

// Data management
let items = JSON.parse(localStorage.getItem('myitems2')) || [];
const currentUser = JSON.parse(localStorage.getItem('user')) || {};

// Logout function
function logout() {
    console.log('Logout function called');
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('Logged out successfully');
        window.location.href = 'http://localhost:5000/index.html';
    }
}

// Check login
if (!localStorage.getItem('token') && !window.location.href.includes('index.html') && !window.location.href.includes('register.html') && !window.location.href.includes('forgot-password.html') && !window.location.href.includes('reset-password.html')) {
    window.location.href = 'http://localhost:5000/index.html';
}

// Update dashboard greeting
if (window.location.href.includes('dashboard.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        const h2 = document.querySelector('.dashboard-page h2');
        if (h2 && currentUser.name) {
            h2.textContent = `Hi ${currentUser.name}, welcome to dashboard`;
        }

        // Notification handling
        socket = io();
        socket.emit('set user', currentUser.id);
        socket.on('notification', (data) => {
            const notificationList = document.getElementById('notification-list');
            const notif = document.createElement('div');
            notif.textContent = 'New message about your item: ' + data.msg;
            const noMsg = document.getElementById('no-messages');
            if (noMsg) noMsg.remove();
            notificationList.appendChild(notif);
            document.getElementById('notifications').classList.remove('hidden');
        });

    document.getElementById('notification-btn').addEventListener('click', () => {
        const notifDiv = document.getElementById('notifications');
        const wasHidden = notifDiv.classList.contains('hidden');
        notifDiv.classList.toggle('hidden');
        if (!wasHidden) {
            // was visible, now hidden, remove listener
            if (notifDiv.closeListener) {
                document.removeEventListener('click', notifDiv.closeListener);
                notifDiv.closeListener = null;
            }
        } else {
            // was hidden, now visible, add listener
            const closeNotif = (e) => {
                if (!notifDiv.contains(e.target) && e.target !== document.getElementById('notification-btn')) {
                    notifDiv.classList.add('hidden');
                    document.removeEventListener('click', closeNotif);
                    notifDiv.closeListener = null;
                }
            };
            setTimeout(() => document.addEventListener('click', closeNotif), 0);
            notifDiv.closeListener = closeNotif;
        }
    });

    function showMatches() {
        fetch('/api/items/potential-matches', {
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
        }).then(res => res.json()).then(data => {
            const container = document.getElementById('matches-container');
            const list = document.getElementById('matches-list');
            list.innerHTML = '';
            if (data.message) {
                list.innerHTML = '<p>' + data.message + '</p>';
            } else if (data.matches.length === 0) {
                list.innerHTML = '<p>No potential matches found.</p>';
            } else {
                data.matches.forEach(match => {
                    const div = document.createElement('div');
                    div.className = 'match-item';
                    div.innerHTML = `
                        <p><strong>Lost:</strong> ${match.lostItem.name} - <span class="description">${match.lostItem.description}</span></p>
                        <p><strong>Found:</strong> ${match.foundItem.name} - <span class="description">${match.foundItem.description}</span></p>
                        <p><strong>Similarity:</strong> ${match.similarity.toFixed(2)}%</p>
                        <p><strong>Contact:</strong> ${match.foundItem.contact}</p>
                    `;
                    list.appendChild(div);
                });
            }
            container.classList.remove('hidden');
            container.scrollIntoView({ behavior: 'smooth' });
        }).catch(err => alert('Error fetching matches: ' + err.message));
    }

    window.showMatches = showMatches;
    });
}

// Login form
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('Response not JSON:', parseError);
                alert('Server not running or invalid response. Please ensure the server is started with "npm start" and access the app via http://localhost:5000');
                return;
            }
            if (response.ok) {
                localStorage.setItem('token', data.token);
                if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
                window.location.href = 'http://localhost:5000/dashboard.html';
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Network error: Please check if the server is running.');
        }
    });
}

// Register form
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('token', data.token); // Auto-login after register
                if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
                alert(data.message + ' You are now logged in.');
                window.location.href = 'http://localhost:5000/dashboard.html';
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Register error:', error);
            alert('Error registering: ' + error.message);
        }
    });
}

// Forgot password form
const forgotForm = document.getElementById('forgot-form');
if (forgotForm) {
    forgotForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (response.ok) {
                alert(data.message + ' ' + data.link);
                window.location.href = 'http://localhost:5000/index.html';
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            alert('Error sending reset link');
        }
    });
}

// Reset password form
const resetForm = document.getElementById('reset-form');
if (resetForm) {
    resetForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        if (newPassword !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword })
            });
            const data = await response.json();
            if (response.ok) {
                alert(data.message);
                window.location.href = 'http://localhost:5000/index.html';
            } else {
                alert(data.message);
            }
        } catch (error) {
            console.error('Reset password error:', error);
            alert('Error resetting password');
        }
    });
}

// Add item form
const addItemForm = document.getElementById('add-item-form');
if (addItemForm) {
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.has('lost') ? 'lost' : urlParams.has('found') ? 'found' : '';
    if (type) {
        const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
        document.getElementById('item-type').textContent = capitalizedType + ' Item';
        document.getElementById('location-label').textContent = `Location ${capitalizedType}:`;
    }

    // Image compression
    document.getElementById('item-image').addEventListener('change', compressSelectedImage);
    addItemForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const formData = new FormData();
        formData.append('name', document.getElementById('item-name').value);
        formData.append('item_type', document.getElementById('item-type-select').value);
        formData.append('description', document.getElementById('item-description').value);
        formData.append('location', document.getElementById('item-location').value);
        formData.append('contact', document.getElementById('contact-info').value);
        formData.append('type', type);
        const imageFile = document.getElementById('item-image').files[0];
        if (imageFile) {
            formData.append('image', imageFile);
        }
        try {
            const headers = { 'Authorization': 'Bearer ' + localStorage.getItem('token') };
            const response = await fetch('/api/items/add', {
                method: 'POST',
                body: formData,
                headers: headers
            });
            if (response.ok) {
                alert('Item added successfully!');
                window.location.href = 'http://localhost:5000/items.html';
            } else {
                alert('Failed to add item');
            }
        } catch (error) {
            alert('Error adding item');
        }
    });

    // Map functionality
    let map;
    let marker;
    document.getElementById('select-map-btn').addEventListener('click', () => {
        document.getElementById('map-container').style.display = 'block';
        if (!map) {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    map = L.map('map').setView([lat, lng], 13);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors'
                    }).addTo(map);
                    marker = L.marker([lat, lng]).addTo(map); // Add marker at current location
                    map.on('click', (e) => {
                        if (marker) {
                            map.removeLayer(marker);
                        }
                        marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
                    });
                }, () => {
                    // Fallback to default
                    map = L.map('map').setView([51.505, -0.09], 13);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors'
                    }).addTo(map);
                    map.on('click', (e) => {
                        if (marker) {
                            map.removeLayer(marker);
                        }
                        marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
                    });
                });
            } else {
                map = L.map('map').setView([51.505, -0.09], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(map);
                map.on('click', (e) => {
                    if (marker) {
                        map.removeLayer(marker);
                    }
                    marker = L.marker([e.latlng.lat, e.latlng.lng]).addTo(map);
                });
            }
        }
    });
    document.getElementById('confirm-location-btn').addEventListener('click', async () => {
        if (marker) {
            const latlng = marker.getLatLng();
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}`);
                const data = await response.json();
                const address = data.display_name || `${latlng.lat}, ${latlng.lng}`;
                document.getElementById('item-location').value = address;
            } catch (error) {
                document.getElementById('item-location').value = `${latlng.lat}, ${latlng.lng}`;
            }
            document.getElementById('map-container').style.display = 'none';
        } else {
            alert('Please select a location on the map.');
        }
    });
    document.getElementById('cancel-map-btn').addEventListener('click', () => {
        document.getElementById('map-container').style.display = 'none';
    });
}

// Items page
if (document.getElementById('items-container')) {
    loadItems();
    document.getElementById('search-bar').addEventListener('input', filterItems);
    document.getElementById('filter-select').addEventListener('change', filterItems);
}

async function loadItems() {
    try {
        const headers = {};
        const token = localStorage.getItem('token');
        if (token) {
            headers['Authorization'] = 'Bearer ' + token;
        }
        const response = await fetch('/api/items', { headers });
        if (response.ok) {
            const data = await response.json();
            items = data.items;
            renderItems(items);
        } else {
            renderItems([]);
        }
    } catch (error) {
        renderItems([]);
    }
}

async function deleteItem(id) {
    if (confirm('Are you sure you want to delete this item?')) {
        try {
            const response = await fetch(`/api/items/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
            });
            if (response.ok) {
                loadItems();
                alert('Item deleted successfully');
            } else {
                alert('Failed to delete item');
            }
        } catch (error) {
            alert('Error deleting item');
        }
    }
}

function renderItems(itemList) {
    const container = document.getElementById('items-container');
    container.innerHTML = '';
    itemList.forEach(item => {
        const canDelete = item.user_id && item.user_id._id === currentUser.id;
        const deleteButtonHTML = canDelete ? `<button onclick="deleteItem('${item._id}')" class="btn secondary delete-btn">Delete</button>` : '';
        const chatButtonHTML = '<button onclick="toggleChat(\'' + item._id + '\', \'' + item.user_id._id + '\')" class="btn secondary">Chat</button>';
        const imgSrc = item.image_path ? '/uploads/' + (item.image_path.includes('/') || item.image_path.includes('\\') ? item.image_path.split(/[\\\\//]/).pop() : item.image_path) : 'placeholder.jpg';
        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <img src="${imgSrc}" alt="${item.name}">
            <h3>${item.name}</h3>
            <p><strong>Type:</strong> ${item.item_type}</p>
            <p class="description"><strong>Description:</strong> ${item.description}</p>
            <p><strong>Location:</strong> ${item.location}</p>
            <p><strong>Contact:</strong> ${item.contact}</p>
            <button class="item-status ${item.type}">${item.type.toUpperCase()}</button>
            ${deleteButtonHTML} ${chatButtonHTML}
        `;
        container.appendChild(card);
    });
}

function filterItems() {
    const searchTerm = document.getElementById('search-bar').value.toLowerCase();
    const filter = document.getElementById('filter-select').value;
    let filtered = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm) || item.description.toLowerCase().includes(searchTerm);
        const matchesFilter = filter === 'all' || item.type === filter;
        return matchesSearch && matchesFilter;
    });
    renderItems(filtered);
}

async function compressSelectedImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
        const compressedFile = await compressImage(file);
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(compressedFile);
        event.target.files = dataTransfer.files;
    } catch (e) {
        console.error('Compression failed:', e);
    }
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                // Calculate new dimensions
                const maxDim = 1024;
                let { width, height } = img;
                const scale = Math.min(1, maxDim / width, maxDim / height);
                width *= scale;
                height *= scale;

                // Canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    // Create new file
                    const newFileName = file.name.replace(/\.[^.]+$/, '.jpg');
                    const compressedFile = new File([blob], newFileName, { type: 'image/jpeg' });
                    resolve(compressedFile);
                }, 'image/jpeg', 0.92);
            };
        };
        reader.onerror = reject;
    });
}

// Chat functionality
let socket;
let currentItemId = null;
let currentOwnerId = null;

if (window.location.href.includes('items.html')) {
    socket = io();
    socket.emit('set user', currentUser.id);
    const messages = document.getElementById('messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    socket.on('chat message', (data) => {
        const messageDiv = document.createElement('div');
        messageDiv.textContent = data.msg;
        messageDiv.style.padding = '5px';
        messageDiv.style.borderBottom = '1px solid #eee';
        messages.appendChild(messageDiv);
        messages.scrollTop = messages.scrollHeight;
    });

    sendBtn.addEventListener('click', () => {
        const msg = chatInput.value.trim();
        if (msg && currentItemId) {
            socket.emit('chat message', {itemId: currentItemId, msg: `${currentUser.name || 'Anonymous'}: ${msg}`, senderId: currentUser.id, ownerId: currentOwnerId});
            chatInput.value = '';
        }
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendBtn.click();
        }
    });
}

function toggleChat(itemId, ownerId) {
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer.classList.contains('hidden')) {
        // opening
        currentItemId = itemId;
        currentOwnerId = ownerId;
        socket.emit('join room', {itemId, ownerId});
        // add click outside to close
        const closeChat = (e) => {
            if (!chatContainer.contains(e.target)) {
                toggleChat();
            }
        };
        setTimeout(() => document.addEventListener('click', closeChat), 0);
        chatContainer.closeChatListener = closeChat; // store to remove later
    } else {
        // closing
        socket.emit('leave room', currentItemId);
        currentItemId = null;
        currentOwnerId = null;
        // clear messages
        document.getElementById('messages').innerHTML = '';
        // remove listener
        if (chatContainer.closeChatListener) {
            document.removeEventListener('click', chatContainer.closeChatListener);
            chatContainer.closeChatListener = null;
        }
    }
    chatContainer.classList.toggle('hidden');
}
