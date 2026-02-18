// API 基础路径 (根据你的后端地址调整，通常是本地 8000)
const API_BASE_URL = "http://127.0.0.1:8000";

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
function updateNavbar() {
    const authContainer = document.getElementById('auth-buttons');
    if (!authContainer) return; // 如果页面没有导航栏容器，就不执行

    if (isLoggedIn()) {
        authContainer.innerHTML = `
            <a href="create_post.html" class="btn btn-sm">➕ 发帖</a>
            <a href="profile.html" class="btn btn-sm btn-secondary">我的主页</a>
            <button onclick="logout()" class="btn btn-sm" style="background:#dc3545">退出</button>
        `;
    } else {
        authContainer.innerHTML = `
            <a href="login.html" class="btn btn-sm">登录</a>
            <a href="register.html" class="btn btn-sm btn-secondary">注册</a>
        `;
    }
}

// 全局退出函数
function logout() {
    removeToken();
    window.location.href = "index.html";
}

// 页面加载完成后自动更新导航栏
document.addEventListener('DOMContentLoaded', updateNavbar);