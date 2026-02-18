// 页面加载时执行
document.addEventListener('DOMContentLoaded', () => {
    loadPosts();
});

async function loadPosts() {
    const container = document.getElementById('posts-container');
    container.innerHTML = '<p style="text-align:center">正在加载帖子...</p>';

    try {
        // 获取帖子列表 (公开接口，不需要 authFetch)
        const response = await fetch(`${API_BASE_URL}/posts/`);

        if (!response.ok) {
            throw new Error('获取帖子失败');
        }

        const posts = await response.json();

        // 清空容器
        container.innerHTML = '';

        if (posts.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#666">暂时还没有帖子，快去发布第一个吧！</p>';
            return;
        }

        // 倒序排列，新的在前面
        posts.reverse().forEach(post => {
            const postCard = document.createElement('div');
            postCard.className = 'post-card';

            // 点击卡片跳转到详情页
            postCard.innerHTML = `
                <h3><a href="post_detail.html?id=${post.id}" style="text-decoration:none; color:#333;">${post.title}</a></h3>
                <p style="color:#666; font-size: 0.9em;">
                    ${post.content.substring(0, 100)}... 
                    ${post.content.length > 100 ? '<span style="color:#007bff">(点击查看全文)</span>' : ''}
                </p>
                <div class="post-meta">
                    <span>作者: ${post.user_name} | 时间: ${post.release_time}</span>
                    <span style="color: #666;">
                        <span style="margin-left: 15px;">👍 ${post.upvotes}</span>
                        <span style="margin-left: 10px;">👎 ${post.downvotes}</span>
                    </span>
                </div>
            `;
            container.appendChild(postCard);
        });

    } catch (error) {
        console.error(error);
        container.innerHTML = '<p style="color:red; text-align:center">加载失败，请检查后端是否运行。</p>';
    }
}