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
            postCard.style.cursor = 'pointer';

            // Click handler for entire card
            postCard.onclick = () => window.location.href = `post_detail.html?id=${post.id}`;

            // Create title
            const titleEl = document.createElement('h3');
            titleEl.textContent = post.title;
            titleEl.style.color = '#333';
            titleEl.style.marginBottom = '10px';
            
            // Create content preview
            const contentEl = document.createElement('p');
            contentEl.style.color = '#666';
            contentEl.style.fontSize = '0.9em';
            contentEl.style.marginBottom = '10px';
            
            let contentPreview = post.content.substring(0, 100);
            if (post.content.length > 100) {
                contentPreview += '... (点击查看全文)';
            }
            contentEl.textContent = contentPreview;
            
            // Create image element if exists
            let imageEl = null;
            if (post.image_url && post.image_url.trim() !== '') {
                imageEl = document.createElement('img');
                imageEl.src = post.image_url;
                imageEl.alt = 'Post image';
                imageEl.style.maxWidth = '100%';
                imageEl.style.maxHeight = '200px';
                imageEl.style.objectFit = 'cover';
                imageEl.style.borderRadius = '8px';
                imageEl.style.marginBottom = '10px';
            }
            
            // Create meta section
            const metaEl = document.createElement('div');
            metaEl.className = 'post-meta';
            metaEl.innerHTML = `
                <span>作者: ${post.user_name} | 时间: ${post.release_time}</span>
                <span style="color: #666;">
                    <span style="margin-left: 15px;">👍 ${post.upvotes}</span>
                    <span style="margin-left: 10px;">👎 ${post.downvotes}</span>
                </span>
            `;

            postCard.appendChild(titleEl);
            postCard.appendChild(contentEl);
            if (imageEl) {
                postCard.appendChild(imageEl);
            }
            postCard.appendChild(metaEl);
            
            container.appendChild(postCard);
        });

    } catch (error) {
        console.error(error);
        container.innerHTML = '<p style="color:red; text-align:center">加载失败，请检查后端是否运行。</p>';
    }
}