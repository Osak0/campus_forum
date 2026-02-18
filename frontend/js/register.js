document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // 简单的前端校验
    if (password.length < 6) {
        alert("密码至少需要6位");
        return;
    }

    // 构造 JSON 数据
    const payload = {
        user_email: email,
        user_name: username,
        password: password
    };

    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert('注册成功！即将跳转到登录页...');
            window.location.href = 'login.html';
        } else {
            const err = await response.json();
            alert('注册失败: ' + (err.detail || '未知错误'));
        }
    } catch (error) {
        console.error(error);
        alert('无法连接到服务器');
    }
});