// --- 1. 全局配置 ---
const API_BASE_URL = "http://127.0.0.1:8000";

// --- 2. 初始化逻辑 ---
document.addEventListener('DOMContentLoaded', () => {
    // 页面加载完成后，立刻去获取帖子
    fetchPosts();

    // 绑定搜索框事件
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        // 'input' 事件：用户每敲一个字都会触发
        searchInput.addEventListener('input', handleSearch);
    }
});

// --- 3. 核心功能：获取帖子列表 ---
// 参数 query: 搜索关键词（可选，默认为空）
async function fetchPosts(query = '') {
    const container = document.getElementById('post-container');
    
    // 显示加载中状态
    container.innerHTML = `
        <div class="loading-state">
            <i class="fas fa-spinner fa-spin"></i> 
            <p>正在加载精彩内容...</p>
        </div>
    `;

    try {
        // 发送请求给后端
        // 注意：目前后端还没有搜索接口，所以这里暂时还是查所有帖子
        // 等后端加了 ?q=xxx 功能，我们再改这里
        const response = await fetch(`${API_BASE_URL}/posts/`);
        
        if (!response.ok) {
            throw new Error(`网络请求失败: ${response.status}`);
        }

        let posts = await response.json();

        // --- 前端实现简单的搜索过滤 ---
        // 如果后端还没做搜索，前端先自己过滤一下凑合用
        if (query) {
            posts = posts.filter(post => 
                post.title.includes(query) || post.content.includes(query)
            );
        }

        renderPosts(posts);

    } catch (error) {
        console.error('获取帖子失败:', error);
        container.innerHTML = `
            <div class="loading-state" style="color: red;">
                <i class="fas fa-exclamation-circle"></i>
                <p>加载失败，请检查网络或后端服务。</p>
                <p class="small">${error.message}</p>
            </div>
        `;
    }
}

// --- 4. 渲染逻辑：把数据变成 HTML ---
function renderPosts(posts) {
    const container = document.getElementById('post-container');
    container.innerHTML = ''; // 清空加载动画

    if (posts.length === 0) {
        container.innerHTML = `
            <div class="loading-state">
                <i class="fas fa-box-open" style="font-size: 48px; color: #ddd; margin-bottom: 10px;"></i>
                <p>暂时没有相关帖子</p>
            </div>
        `;
        return;
    }

    // 倒序排列，让最新的帖子在最上面（虽然后端可能排好了，前端保险起见再排一次）
    // 假设 id 越大越新
    posts.sort((a, b) => b.id - a.id);

    posts.forEach(post => {
        const postCard = document.createElement('div');
        postCard.className = 'post-card';
        
        // 点击卡片跳转详情页
        postCard.onclick = () => {
             window.location.href = `post.html?id=${post.id}`;
        };

        // 处理时间格式 (简单截取前10位：YYYY-MM-DD)
        const displayTime = post.release_time ? post.release_time.substring(0, 16) : '刚刚';

        postCard.innerHTML = `
            <div class="post-title">${escapeHtml(post.title)}</div>
            <div class="post-meta">
                <span><i class="fas fa-user-circle"></i> ${escapeHtml(post.user_name)}</span>
                <span>${displayTime}</span>
            </div>
            <div class="post-content">${escapeHtml(post.content)}</div>
        `;

        container.appendChild(postCard);
    });
}

// --- 5. 搜索处理函数 (防抖) ---
// 防抖 (Debounce)：防止用户打字太快频繁请求后端
let searchTimeout;
function handleSearch(event) {
    const query = event.target.value.trim();

    // 清除上一次的定时器
    clearTimeout(searchTimeout);

    // 设置一个新的定时器，300ms 后执行搜索
    searchTimeout = setTimeout(() => {
        fetchPosts(query);
    }, 300);
}

// --- 6. 工具函数：防止 XSS 攻击 ---
// 把 <script> 这种危险字符转义，防止黑客注入代码
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// --- 7. 底部导航栏高亮逻辑 ---
// 简单的判断：当前 URL 包含哪个关键词，就高亮哪个图标
const currentPath = window.location.pathname;
if (currentPath.includes('index.html') || currentPath === '/') {
    document.getElementById('tab-home').classList.add('active');
} else if (currentPath.includes('new-post.html')) {
    document.getElementById('tab-post').classList.add('active');
} else if (currentPath.includes('profile.html')) {
    document.getElementById('tab-profile').classList.add('active');
}