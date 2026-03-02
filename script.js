/**
 * YudhhAbhyas Student Portal - Core Logic V2.1
 */

// CONFIGURATION: Replace with your actual Google Apps Script Web App URL
const API_URL = "https://script.google.com/macros/s/AKfycbzU9rj9vDWmWxRjYtedKkSbY5NLJpuovDaVNj2VmtopzY8P5j58h5HV948eWpQWEaK1jQ/exec";

// Global Loader Management
const loader = document.getElementById('loader');
const loaderText = document.getElementById('loaderText');

function showLoading(text) {
    if (loader && loaderText) {
        loader.style.display = 'flex';
        loaderText.textContent = text || 'प्रतीक्षा करें...';
    }
}

function hideLoading() {
    if (loader) loader.style.display = 'none';
}

// Re-usable Fetch function for GAS (Avoids common CORS issues)
async function callGAS(action, data) {
    try {
        const fetchOptions = {
            method: 'POST',
            // Set content type to text/plain to bypass complex CORS preflights
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action, ...data })
        };

        const response = await fetch(API_URL, fetchOptions);
        if (!response.ok) throw new Error('Network response was not ok');
        return await response.json();
    } catch (err) {
        console.error("Fetch Error:", err);
        throw err;
    }
}

// Authentication Logic
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const logoutBtns = document.querySelectorAll('#logoutBtn, .logout-btn');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('studentId').value.trim().toUpperCase();
        const password = document.getElementById('password').value.trim();

        showLoading('लॉगिन किया जा रहा है...');

        try {
            const result = await callGAS('login', { id, password });

            if (result.success) {
                localStorage.setItem('user', JSON.stringify(result.user));
                window.location.href = 'dashboard.html';
            } else {
                hideLoading();
                alert('लॉगिन विफल: ' + result.message);
            }
        } catch (err) {
            hideLoading();
            alert("लॉगिन विफल रहा। कृपया इंटरनेट कनेक्शन और API URL चेक करें।\n\nत्रुटि: " + err.message);
        }
    });
}

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('newName').value.trim();
        const id = document.getElementById('newId').value.trim().toUpperCase();
        const password = document.getElementById('newPassword').value.trim();

        showLoading('प्रोफाइल बनाई जा रही है...');

        try {
            const result = await callGAS('signup', { id, password, name });

            if (result.success) {
                alert('पंजीकरण सफल! अब आप लॉगिन कर सकते हैं।');
                location.reload();
            } else {
                hideLoading();
                alert('पंजीकरण विफल: ' + result.message);
            }
        } catch (err) {
            hideLoading();
            alert("पंजीकरण विफल रहा। कृपया API URL चेक करें।\n\nत्रुटि: " + err.message);
        }
    });
}

if (logoutBtns.length > 0) {
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            localStorage.clear(); // Clear all progress and user data on logout
            window.location.href = 'index.html';
        });
    });
}

// Student Access Control
function checkAuth() {
    const userString = localStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;
    const path = window.location.pathname;
    const currentPage = path.split('/').pop() || 'index.html';

    if (!user && currentPage !== 'index.html') {
        window.location.href = 'index.html';
        return;
    }

    if (user && currentPage === 'index.html') {
        window.location.href = 'dashboard.html';
        return;
    }

    if (user) {
        const nameDisplay = document.getElementById('userNameDisplay');
        if (nameDisplay) {
            nameDisplay.textContent = `योद्धा, ${user.name}`;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    if (typeof updateAnalytics === 'function' && localStorage.getItem('user')) {
        updateAnalytics();
    }
});

// Progress Tracking Core Logic
async function updateProgress(subjectId, topic, status) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    const key = `progress_${subjectId}`;
    let data = JSON.parse(localStorage.getItem(key)) || {};
    data[topic] = status;
    localStorage.setItem(key, JSON.stringify(data));

    // Update UI elements synchronously
    const score = Object.values(data).filter(p => p === true).length;
    const subject = syllabus.find(s => s.id === subjectId);
    let totalTopics = 0;
    subject.parts.forEach(part => totalTopics += part.topics.length);
    const pct = Math.round((score / totalTopics) * 100);

    const pctEl = document.getElementById(`pct_${subjectId}`);
    const barEl = document.getElementById(`bar_${subjectId}`);
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (barEl) barEl.style.width = `${pct}%`;

    if (typeof updateAnalytics === 'function') updateAnalytics();

    // Background Sync
    try {
        callGAS('updateProgress', {
            id: user.id,
            subject: subjectId,
            progress: pct
        });
    } catch (err) { console.error("Sync failed"); }
}

// Status (Red/Yellow/Green) Management
function updateStatus(subjectId, topic, status) {
    const key = `status_${subjectId}`;
    let data = JSON.parse(localStorage.getItem(key)) || {};
    data[topic] = status;
    localStorage.setItem(key, JSON.stringify(data));

    // UI Feedback
    const topicEscaped = topic.replace(/'/g, "\\'");
    const parent = document.querySelector(`[onclick*="${topicEscaped}"]`).closest('.topic-item');
    if (parent) {
        parent.classList.remove('status-red', 'status-yellow', 'status-green');
        parent.classList.add(`status-${status}`);

        parent.querySelectorAll('.circle').forEach(c => c.classList.remove('active'));
        parent.querySelector(`.circle.${status}`).classList.add('active');

        if (status === 'green') {
            const checkbox = parent.querySelector('input[type="checkbox"]');
            if (checkbox && !checkbox.checked) {
                checkbox.checked = true;
                updateProgress(subjectId, topic, true);
            }
        }
    }
    if (typeof updateAnalytics === 'function') updateAnalytics();
}

function incrementRevision(subjectId, topic) {
    const key = `revision_${subjectId}`;
    let data = JSON.parse(localStorage.getItem(key)) || {};
    data[topic] = (data[topic] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(data));

    const topicEscaped = topic.replace(/'/g, "\\'");
    const badge = document.querySelector(`[onclick*="incrementRevision('${subjectId}', '${topicEscaped}'"]`);
    if (badge) {
        badge.innerHTML = `<i class="fas fa-redo"></i> ${data[topic]}`;
        badge.classList.add('anim-pop');
        setTimeout(() => badge.classList.remove('anim-pop'), 300);
    }
    if (typeof updateAnalytics === 'function') updateAnalytics();
}
