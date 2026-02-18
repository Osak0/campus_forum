document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // 阻止表单默认提交刷新页面

    const errorMsg = document.getElementById('errorMsg');
    errorMsg.style.display = 'none';

    // 获取表单数据
    const formData = new FormData(e.target);
    const data = new URLSearchParams(formData); // 转成 application/x-www-form-urlencoded 格式

    try {
        const response = await fetch(`${API_BASE_URL}/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: data
        });

        if (response.ok) {
            const result = await response.json();
            // 登录成功，保存 Token
            setToken(result.access_token);
            // 跳转回首页
            window.location.href = 'index.html';
        } else {
            // 登录失败
            errorMsg.style.display = 'block';
            errorMsg.textContent = '用户名或密码错误';
        }
    } catch (err) {
        console.error('登录出错:', err);
        errorMsg.style.display = 'block';
        errorMsg.textContent = '服务器连接失败';
    }
});