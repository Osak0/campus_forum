// API 基础路径 (根据你的后端地址调整)
const API_BASE_URL = "http://127.0.0.1:8000";

// 1. 保存 Token
function setToken(token) {
    localStorage.setItem('access_token', token);
}

// 2. 获取 Token
function getToken() {
    return localStorage.getItem('access_token');
}

// 3. 删除 Token (退出登录)
function removeToken() {
    localStorage.removeItem('access_token');
}

// 4. 检查是否登录
function isLoggedIn() {
    const token = getToken();
    // 这里可以加更复杂的逻辑，比如检查是否过期
    return !!token; 
}

// 5.带 Token 的请求封装 (核心!)
async function authFetch(url, options = {}) {
    const token = getToken();
    
    // 自动添加 Header
    const headers = options.headers || {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers: headers
    });

    // 如果后端返回 401 (未授���)，说明 Token 过期或无效
    if (response.status === 401) {
        alert("登录已过期，请重新登录");
        removeToken();
        window.location.href = "/login.html"; // 跳转回登录页
        return null;
    }

    return response;
}