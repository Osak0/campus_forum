// API 基础路径 (根据你的后端地址调整，通常是本地 8000)
const API_BASE_URL = "http:// 192.168.43.25:8000";

// --- Token 管理 ---

function setToken(token) {
    localStorage.setItem('access_token', token);
}

function getToken() {
    return localStorage.getItem('access_token');
}

function removeToken() {
    localStorage.removeItem('access_token');
}

function isLoggedIn() {
    const token = getToken();
    return !!token; // 有 token 返回 true，否则 false
}

// --- 通用 Fetch 封装 (自动带 Token) ---

async function authFetch(endpoint, options = {}) {
    const token = getToken();

    // 自动添加 Header
    const headers = options.headers || {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // 确保 URL 格式正确
    const url = `${API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers: headers
        });

        // 如果后端返回 401 (未授权)，说明 Token 过期或无效
        if (response.status === 401) {
            alert("登录已过期，请重新登录");
            removeToken();
            window.location.href = "login.html"; // 跳转回登录页
            return null;
        }

        return response;
    } catch (error) {
        console.error("网络请求错误:", error);
        alert("无法连接到服务器，请检查后端是否启动。");
        return null;
    }
}

// --- 通用：页面加载时检查导航栏状态 ---
async function updateNavbar() {
    const authContainer = document.getElementById('auth-buttons');
    if (!authContainer) return; // 如果页面没有导航栏容器，就不执行

    if (isLoggedIn()) {
        let adminLink = '';
        try {
            const response = await authFetch('/users/me');
            if (response && response.ok) {
                const user = await response.json();
                if (user.is_admin) {
                    adminLink = `<a href="admin.html" class="btn btn-sm" style="background:#7c3aed;">⚙️ 管理</a>`;
                }
            }
        } catch (e) {
            console.error('检查管理员权限失败:', e);
        }
        
        authContainer.innerHTML = `
            ${adminLink}
            <a href="create_post.html" class="btn btn-sm">➕ 发帖</a>
            <a href="notifications.html" class="btn btn-sm btn-secondary" id="notification-link">🔔 通知</a>
            <a href="profile.html" class="btn btn-sm btn-secondary">我的主页</a>
            <button onclick="logout()" class="btn btn-sm" style="background:#dc3545">退出</button>
        `;
        updateNotificationBadge();
    } else {
        authContainer.innerHTML = `
            <a href="login.html" class="btn btn-sm">登录</a>
            <a href="register.html" class="btn btn-sm btn-secondary">注册</a>
        `;
    }
}

async function updateNotificationBadge() {
    const link = document.getElementById('notification-link');
    if (!link) return;
    const response = await authFetch('/notifications');
    if (response && response.ok) {
        const data = await response.json();
        const unread = data.unread_count || 0;
        if (unread > 0) {
            link.textContent = `🔔 通知(${unread})`;
        }
    }
}

// 全局退出函数
function logout() {
    removeToken();
    localStorage.removeItem('user_email');
    window.location.href = "index.html";
}

function initMobileAppShell() {
    if (!document.head) return;

    const ensureTag = (selector, createTag) => {
        if (!document.head.querySelector(selector)) {
            document.head.appendChild(createTag());
        }
    };

    ensureTag('link[rel="manifest"]', () => {
        const link = document.createElement('link');
        link.rel = 'manifest';
        link.href = 'manifest.webmanifest';
        return link;
    });

    ensureTag('meta[name="theme-color"]', () => {
        const meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.content = '#2563eb';
        return meta;
    });

    ensureTag('meta[name="apple-mobile-web-app-capable"]', () => {
        const meta = document.createElement('meta');
        meta.name = 'apple-mobile-web-app-capable';
        meta.content = 'yes';
        return meta;
    });

    ensureTag('meta[name="mobile-web-app-capable"]', () => {
        const meta = document.createElement('meta');
        meta.name = 'mobile-web-app-capable';
        meta.content = 'yes';
        return meta;
    });

    ensureTag('meta[name="apple-mobile-web-app-status-bar-style"]', () => {
        const meta = document.createElement('meta');
        meta.name = 'apple-mobile-web-app-status-bar-style';
        meta.content = 'default';
        return meta;
    });

    const canRegisterSW = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if ('serviceWorker' in navigator && canRegisterSW) {
        navigator.serviceWorker.getRegistration().then((registration) => {
            if (registration) return;
            navigator.serviceWorker.register('sw.js').catch((error) => {
                console.warn('Service Worker 注册失败:', error);
                if (!sessionStorage.getItem('pwa_init_warned')) {
                    sessionStorage.setItem('pwa_init_warned', '1');
                    console.warn('移动端离线能力初始化失败，页面仍可正常在线使用。');
                }
            });
        });
    }
}

// 页面加载完成后自动更新导航栏
document.addEventListener('DOMContentLoaded', () => {
    initMobileAppShell();
    updateNavbar();
});
