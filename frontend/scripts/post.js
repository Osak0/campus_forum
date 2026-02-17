const API_BASE_URL = "http://127.0.0.1:8000";

// 获取 URL 参数中的 id (例如 post.html?id=5)
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', () => {
    if (!postId) {
        alert('帖子不存在');
        window.location.href = 'index.html';
        return;
    }
    loadPostDetail();
    loadComments();

    // 绑定发送评论事件
    document.getElementById('send-comment-btn').addEventListener('click', submitComment);
});

async function loadPostDetail() {
    const container = document.getElementById('detail-container');
    try {
        const res = await fetch(`${API_BASE_URL}/posts/${postId}`);
        if (!res.ok) throw new Error('帖子不存在');
        const post = await res.json();

        // 渲染帖子内容
        // 注意：这里我们用 insertAdjacentHTML 把内容插到最前面，不覆盖后面的评论列表
        const html = `
            <div class="post-detail-card">
                <h1 class="detail-title">${post.title}</h1>
                <div class="detail-meta">
                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user_name}" class="avatar">
                    <div class="meta-info">
                        <span class="author">${post.user_name}</span>
                        <span class="time">${post.release_time}</span>
                    </div>
                </div>
                <div class="detail-content">${post.content}</div>
            </div>
            <div class="comments-section">
                <h3>评论区</h3>
                <div id="comments-list">加载评论...</div>
            </div>
        `;
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = `<p class="error">加载失败: ${err.message}</p>`;
    }
}

async function loadComments() {
    const list = document.getElementById('comments-list');
    try {
        const res = await fetch(`${API_BASE_URL}/posts/${postId}/comments`);
        const comments = await res.json();
        
        if (comments.length === 0) {
            list.innerHTML = '<p class="empty-tip">还没有人评论，快来抢沙发~</p>';
            return;
        }

        list.innerHTML = comments.map(c => `
            <div class="comment-item">
                <div class="comment-user">${c.user_name}</div>
                <div class="comment-text">${c.content}</div>
                <div class="comment-time">${c.release_time || '刚刚'}</div>
            </div>
        `).join('');
    } catch (err) {
        console.error(err);
    }
}

async function submitComment() {
    const input = document.getElementById('comment-input');
    const content = input.value.trim();
    if (!content) return;

    // TODO: 这里需要用户登录后的邮箱，暂时先写死一个测试用
    const userEmail = "zhangsan@xjtu.edu.cn"; 

    try {
        const res = await fetch(`${API_BASE_URL}/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_email: userEmail,
                content: content
            })
        });
        
        if (res.ok) {
            input.value = ''; // 清空输入框
            loadComments();   // 刷新评论列表
        } else {
            alert('评论失败');
        }
    } catch (err) {
        alert('网络错误');
    }
}