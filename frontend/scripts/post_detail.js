// 从浏览器地址栏获取 id 参数 (例如 post_detail.html?id=123)
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

// 页面加载逻辑
document.addEventListener('DOMContentLoaded', async () => {
    if (!postId) {
        alert("无效的帖子ID");
        window.location.href = "index.html";
        return;
    }
    await loadPostDetail();
});

async function loadPostDetail() {
    const container = document.getElementById('post-container');
    container.innerHTML = '<p>加载中...</p>';

    try {
        // 注意：这里需要后端有 GET /posts/{id} 接口
        // 如果你后端还没写这个接口，这行代码会报 404 或 405 错误
        const response = await fetch(`${API_BASE_URL}/posts/${postId}`); // 不需要登录也能看
        
        if (response.ok) {
            const post = await response.json();
            
            // 渲染帖子内容
            // replace(/\n/g, '<br>') 是为了把换行符转换成 HTML 的换行
            container.innerHTML = `
                <h1 class="detail-title">${post.title}</h1>
                <div class="detail-meta">
                    <span>作者: ${post.user_name}</span>
                    <span style="margin-left: 15px;">时间: ${post.release_time}</span>
                </div>
                <div class="detail-content" style="margin-top: 20px; font-size: 1.1em; line-height: 1.6;">
                    ${post.content.replace(/\n/g, '<br>')}
                </div>
                <hr style="margin-top: 30px;">
                <button onclick="history.back()" class="btn btn-secondary">返回列表</button>
            `;
        } else {
            container.innerHTML = '<h2>帖子不存在或已被删除</h2><br><a href="index.html">返回首页</a>';
        }
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p style="color:red">加载失败</p>';
    }
}