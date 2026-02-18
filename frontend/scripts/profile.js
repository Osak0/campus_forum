// 检查登录
if (!isLoggedIn()) {
    alert("请先登录");
    window.location.href = "login.html";
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadProfile();
});

async function loadProfile() {
    // 调用后端 /users/me 接口
    const response = await authFetch('/users/me');
    
    if (response && response.ok) {
        const user = await response.json();
        
        // 填充页面数据
        document.getElementById('profile-name').textContent = user.user_name || "未设置昵称";
        document.getElementById('profile-email').textContent = user.user_email;
        
    } else {
        document.getElementById('profile-name').textContent = "加载失败";
        document.getElementById('profile-email').textContent = "请尝试重新登录";
    }
}