/**
 * YudhhAbhyas Student Portal - Core Logic (Student Version)
 */

const API_URL = "https://script.google.com/macros/s/AKfycbxhuyzj65oAsWJp0DdEJ4z5zRcUFiPQ09IhzfB3455PaKa6GJmAh2lICljE1fpwiQbyuA/exec";

// Authentication Logic
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const logoutBtns = document.querySelectorAll('#logoutBtn, .logout-btn');

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('studentId').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'login', id, password })
            });
            const result = await response.json();
            if (result.success) {
                localStorage.setItem('user', JSON.stringify(result.user));
                window.location.href = 'dashboard.html';
            } else {
                alert(result.message);
            }
        } catch (err) {
            console.error("Login Error:", err);
            alert("लॉगिन विफल रहा। कृपया इंटरनेट कनेक्शन चेक करें।");
        }
    });
}

if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('newName').value;
        const id = document.getElementById('newId').value;
        const password = document.getElementById('newPassword').value;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'signup', id, password, name })
            });
            const result = await response.json();
            alert(result.message);
            if (result.success) location.reload();
        } catch (err) {
            console.error("Signup Error:", err);
            alert("नामांकन विफल रहा।");
        }
    });
}

if (logoutBtns.length > 0) {
    logoutBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            localStorage.removeItem('user');
            window.location.href = 'index.html';
        });
    });
}

// Student Access Control
function checkAuth() {
    const user = JSON.parse(localStorage.getItem('user'));
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
            nameDisplay.textContent = `आपका स्वागत है, ${user.name}`;
        }
    }
}

document.addEventListener('DOMContentLoaded', checkAuth);

// Progress Management
async function updateProgress(subjectId, topic, status) {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) return;

    const key = `progress_${subjectId}`;
    let data = JSON.parse(localStorage.getItem(key)) || {};
    data[topic] = status;
    localStorage.setItem(key, JSON.stringify(data));

    const score = Object.values(data).filter(p => p === true).length;
    const subject = syllabus.find(s => s.id === subjectId);

    let totalTopics = 0;
    subject.parts.forEach(part => totalTopics += part.topics.length);

    const pct = Math.round((score / totalTopics) * 100);

    document.getElementById(`pct_${subjectId}`).textContent = `${pct}%`;
    document.getElementById(`bar_${subjectId}`).style.width = `${pct}%`;

    if (typeof updateOverallProgress === 'function') updateOverallProgress();

    if (API_URL) {
        try {
            await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({
                    action: 'updateProgress',
                    id: user.id,
                    subject: subjectId,
                    progress: pct
                })
            });
        } catch (err) {
            console.error("Sync failed");
        }
    }
}
