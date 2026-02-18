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
    await loadComments();
});

async function loadPostDetail() {
    const container = document.getElementById('post-container');
    container.innerHTML = '<p>加载中...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}`);
        
        if (response.ok) {
            const post = await response.json();
            
            // 获取用户投票状态（如果已登录）
            let userVote = null;
            if (isLoggedIn()) {
                const voteResponse = await authFetch(`/posts/${postId}/vote`);
                if (voteResponse && voteResponse.ok) {
                    const voteData = await voteResponse.json();
                    userVote = voteData.vote_type;
                }
            }
            
            // 渲染帖子内容
            container.innerHTML = `
                <h1 class="detail-title">${post.title}</h1>
                <div class="detail-meta">
                    <span>作者: ${post.user_name}</span>
                    <span style="margin-left: 15px;">时间: ${post.release_time}</span>
                </div>
                <div class="detail-content" style="margin-top: 20px; font-size: 1.1em; line-height: 1.6;">
                    ${post.content.replace(/\n/g, '<br>')}
                </div>
                <div class="vote-section" style="margin-top: 20px; display: flex; align-items: center; gap: 15px;">
                    <button onclick="votePost('upvote')" class="vote-btn ${userVote === 'upvote' ? 'active-upvote' : ''}" id="upvote-btn">
                        👍 <span id="upvote-count">${post.upvotes}</span>
                    </button>
                    <button onclick="votePost('downvote')" class="vote-btn ${userVote === 'downvote' ? 'active-downvote' : ''}" id="downvote-btn">
                        👎 <span id="downvote-count">${post.downvotes}</span>
                    </button>
                </div>
                <hr style="margin-top: 30px;">
                
                <!-- 评论区 -->
                <div class="comments-section">
                    <h3>评论区</h3>
                    ${isLoggedIn() ? `
                        <div class="comment-form" style="margin-bottom: 30px;">
                            <textarea id="comment-input" placeholder="发表你的评论..." rows="3" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; resize: vertical;"></textarea>
                            <button onclick="submitComment()" class="btn" style="margin-top: 10px;">发表评论</button>
                        </div>
                    ` : '<p style="color: #888;">请<a href="login.html">登录</a>后发表评论</p>'}
                    <div id="comments-container">
                        <p style="text-align: center; color: #888;">加载评论中...</p>
                    </div>
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

async function votePost(voteType) {
    if (!isLoggedIn()) {
        alert("请先登录");
        window.location.href = "login.html";
        return;
    }

    try {
        // Get user email from token (we need to decode it or get it from a profile endpoint)
        // For simplicity, let's assume we store email in localStorage when logging in
        const userEmail = localStorage.getItem('user_email');
        if (!userEmail) {
            alert("请重新登录");
            window.location.href = "login.html";
            return;
        }

        const response = await authFetch(`/posts/${postId}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_email: userEmail,
                vote_type: voteType
            })
        });

        if (response && response.ok) {
            const data = await response.json();
            
            // Update vote counts
            document.getElementById('upvote-count').textContent = data.upvotes;
            document.getElementById('downvote-count').textContent = data.downvotes;
            
            // Update button states
            const upvoteBtn = document.getElementById('upvote-btn');
            const downvoteBtn = document.getElementById('downvote-btn');
            
            upvoteBtn.classList.remove('active-upvote');
            downvoteBtn.classList.remove('active-downvote');
            
            // Check if vote was toggled off or changed
            if (data.message.includes("removed")) {
                // Vote was removed, no active state
            } else if (voteType === 'upvote') {
                upvoteBtn.classList.add('active-upvote');
            } else {
                downvoteBtn.classList.add('active-downvote');
            }
        }
    } catch (error) {
        console.error("投票失败:", error);
        alert("投票失败，请重试");
    }
}

async function loadComments() {
    const container = document.getElementById('comments-container');
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/posts/${postId}/comments`);
        
        if (response.ok) {
            const comments = await response.json();
            
            if (comments.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #888;">暂无评论，快来抢沙发吧！</p>';
                return;
            }
            
            container.innerHTML = '';
            comments.forEach(comment => {
                const commentDiv = document.createElement('div');
                commentDiv.className = 'comment-item';
                
                commentDiv.innerHTML = `
                    <div class="comment-header">
                        <strong>${comment.user_name}</strong>
                        <span style="color: #888; font-size: 0.9em; margin-left: 10px;">${comment.release_time}</span>
                    </div>
                    <div class="comment-content">${comment.content}</div>
                    <div class="comment-actions" style="margin-top: 10px; display: flex; gap: 10px;">
                        <button onclick="voteComment(${comment.id}, 'upvote')" class="vote-btn-small" id="comment-upvote-${comment.id}">
                            👍 <span id="comment-upvote-count-${comment.id}">${comment.upvotes}</span>
                        </button>
                        <button onclick="voteComment(${comment.id}, 'downvote')" class="vote-btn-small" id="comment-downvote-${comment.id}">
                            👎 <span id="comment-downvote-count-${comment.id}">${comment.downvotes}</span>
                        </button>
                    </div>
                `;
                
                container.appendChild(commentDiv);
            });
        } else {
            container.innerHTML = '<p style="color: red;">加载评论失败</p>';
        }
    } catch (error) {
        console.error("加载评论失败:", error);
        container.innerHTML = '<p style="color: red;">加载评论失败</p>';
    }
}

async function submitComment() {
    const input = document.getElementById('comment-input');
    const content = input.value.trim();
    
    if (!content) {
        alert("评论内容不能为空");
        return;
    }
    
    if (!isLoggedIn()) {
        alert("请先登录");
        window.location.href = "login.html";
        return;
    }

    try {
        const userEmail = localStorage.getItem('user_email');
        if (!userEmail) {
            alert("请重新登录");
            window.location.href = "login.html";
            return;
        }

        const response = await authFetch(`/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_email: userEmail,
                content: content
            })
        });

        if (response && response.ok) {
            input.value = '';
            await loadComments(); // Reload comments
            alert("评论发表成功！");
        } else {
            alert("评论发表失败，请重试");
        }
    } catch (error) {
        console.error("发表评论失败:", error);
        alert("评论发表失败，请重试");
    }
}

async function voteComment(commentId, voteType) {
    if (!isLoggedIn()) {
        alert("请先登录");
        window.location.href = "login.html";
        return;
    }

    try {
        const userEmail = localStorage.getItem('user_email');
        if (!userEmail) {
            alert("请重新登录");
            window.location.href = "login.html";
            return;
        }

        const response = await authFetch(`/comments/${commentId}/vote`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_email: userEmail,
                vote_type: voteType
            })
        });

        if (response && response.ok) {
            const data = await response.json();
            
            // Update vote counts
            document.getElementById(`comment-upvote-count-${commentId}`).textContent = data.upvotes;
            document.getElementById(`comment-downvote-count-${commentId}`).textContent = data.downvotes;
            
            // Update button states
            const upvoteBtn = document.getElementById(`comment-upvote-${commentId}`);
            const downvoteBtn = document.getElementById(`comment-downvote-${commentId}`);
            
            upvoteBtn.classList.remove('active-upvote');
            downvoteBtn.classList.remove('active-downvote');
            
            // Check if vote was toggled off or changed
            if (data.message.includes("removed")) {
                // Vote was removed, no active state
            } else if (voteType === 'upvote') {
                upvoteBtn.classList.add('active-upvote');
            } else {
                downvoteBtn.classList.add('active-downvote');
            }
        }
    } catch (error) {
        console.error("投票失败:", error);
        alert("投票失败，请重试");
    }
}