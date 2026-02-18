// 从浏览器地址栏获取 id 参数 (例如 post_detail.html?id=123)
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

// 获取用户邮箱的辅助函数
function getUserEmail() {
    const userEmail = localStorage.getItem('user_email');
    if (!userEmail) {
        alert("请重新登录");
        window.location.href = "login.html";
        return null;
    }
    return userEmail;
}

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
            let isFavorited = false;
            if (isLoggedIn()) {
                const voteResponse = await authFetch(`/posts/${postId}/vote`);
                if (voteResponse && voteResponse.ok) {
                    const voteData = await voteResponse.json();
                    userVote = voteData.vote_type;
                }
                
                // 获取收藏状态
                const favoriteResponse = await authFetch(`/posts/${postId}/favorite`);
                if (favoriteResponse && favoriteResponse.ok) {
                    const favoriteData = await favoriteResponse.json();
                    isFavorited = favoriteData.is_favorited;
                }
            }
            
            // 渲染帖子内容 - Use DOM API to prevent XSS
            container.innerHTML = '';
            
            // Title
            const titleEl = document.createElement('h1');
            titleEl.className = 'detail-title';
            titleEl.textContent = post.title;
            container.appendChild(titleEl);
            
            // Meta info
            const metaEl = document.createElement('div');
            metaEl.className = 'detail-meta';
            const authorSpan = document.createElement('span');
            authorSpan.textContent = `作者: ${post.user_name}`;
            const timeSpan = document.createElement('span');
            timeSpan.style.marginLeft = '15px';
            timeSpan.textContent = `时间: ${post.release_time}`;
            metaEl.appendChild(authorSpan);
            metaEl.appendChild(timeSpan);
            container.appendChild(metaEl);
            
            // Content
            const contentEl = document.createElement('div');
            contentEl.className = 'detail-content';
            contentEl.style.marginTop = '20px';
            contentEl.style.fontSize = '1.1em';
            contentEl.style.lineHeight = '1.6';
            // Preserve line breaks safely
            const lines = post.content.split('\n');
            lines.forEach((line, index) => {
                contentEl.appendChild(document.createTextNode(line));
                if (index < lines.length - 1) {
                    contentEl.appendChild(document.createElement('br'));
                }
            });
            container.appendChild(contentEl);
            
            // Vote section
            const voteSection = document.createElement('div');
            voteSection.className = 'vote-section';
            voteSection.style.marginTop = '20px';
            voteSection.style.display = 'flex';
            voteSection.style.alignItems = 'center';
            voteSection.style.gap = '15px';
            voteSection.style.flexWrap = 'wrap';
            
            // Upvote button
            const upvoteBtn = document.createElement('button');
            upvoteBtn.id = 'upvote-btn';
            upvoteBtn.className = `vote-btn ${userVote === 'upvote' ? 'active-upvote' : ''}`;
            upvoteBtn.onclick = () => votePost('upvote');
            upvoteBtn.innerHTML = `👍 <span id="upvote-count">${post.upvotes}</span>`;
            voteSection.appendChild(upvoteBtn);
            
            // Downvote button
            const downvoteBtn = document.createElement('button');
            downvoteBtn.id = 'downvote-btn';
            downvoteBtn.className = `vote-btn ${userVote === 'downvote' ? 'active-downvote' : ''}`;
            downvoteBtn.onclick = () => votePost('downvote');
            downvoteBtn.innerHTML = `👎 <span id="downvote-count">${post.downvotes}</span>`;
            voteSection.appendChild(downvoteBtn);
            
            // Favorite button (if logged in)
            if (isLoggedIn()) {
                const favoriteBtn = document.createElement('button');
                favoriteBtn.id = 'favorite-btn';
                favoriteBtn.className = `favorite-btn ${isFavorited ? 'favorited' : ''}`;
                favoriteBtn.onclick = toggleFavorite;
                favoriteBtn.innerHTML = `<span id="favorite-icon">${isFavorited ? '⭐' : '☆'}</span><span id="favorite-text">${isFavorited ? '已收藏' : '收藏'}</span>`;
                voteSection.appendChild(favoriteBtn);
            }
            
            container.appendChild(voteSection);
            
            // Separator
            const hr1 = document.createElement('hr');
            hr1.style.marginTop = '30px';
            container.appendChild(hr1);
            
            // Comments section
            const commentsSection = document.createElement('div');
            commentsSection.className = 'comments-section';
            const commentsTitle = document.createElement('h3');
            commentsTitle.textContent = '评论区';
            commentsSection.appendChild(commentsTitle);
            
            // Comment form (if logged in)
            if (isLoggedIn()) {
                const commentForm = document.createElement('div');
                commentForm.className = 'comment-form';
                commentForm.style.marginBottom = '30px';
                
                const textarea = document.createElement('textarea');
                textarea.id = 'comment-input';
                textarea.placeholder = '发表你的评论...';
                textarea.rows = 3;
                textarea.style.width = '100%';
                textarea.style.padding = '10px';
                textarea.style.border = '1px solid #ddd';
                textarea.style.borderRadius = '6px';
                textarea.style.resize = 'vertical';
                commentForm.appendChild(textarea);
                
                const submitBtn = document.createElement('button');
                submitBtn.className = 'btn';
                submitBtn.style.marginTop = '10px';
                submitBtn.textContent = '发表评论';
                submitBtn.onclick = submitComment;
                commentForm.appendChild(submitBtn);
                
                commentsSection.appendChild(commentForm);
            } else {
                const loginPrompt = document.createElement('p');
                loginPrompt.style.color = '#888';
                loginPrompt.innerHTML = '请<a href="login.html">登录</a>后发表评论';
                commentsSection.appendChild(loginPrompt);
            }
            
            // Comments container
            const commentsContainer = document.createElement('div');
            commentsContainer.id = 'comments-container';
            const loadingText = document.createElement('p');
            loadingText.style.textAlign = 'center';
            loadingText.style.color = '#888';
            loadingText.textContent = '加载评论中...';
            commentsContainer.appendChild(loadingText);
            commentsSection.appendChild(commentsContainer);
            
            container.appendChild(commentsSection);
            
            // Separator
            const hr2 = document.createElement('hr');
            hr2.style.marginTop = '30px';
            container.appendChild(hr2);
            
            // Back button
            const backBtn = document.createElement('button');
            backBtn.className = 'btn btn-secondary';
            backBtn.textContent = '返回列表';
            backBtn.onclick = () => history.back();
            container.appendChild(backBtn);
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

    const userEmail = getUserEmail();
    if (!userEmail) return;

    try {
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

    const userEmail = getUserEmail();
    if (!userEmail) return;

    try {
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

    const userEmail = getUserEmail();
    if (!userEmail) return;

    try {
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

async function toggleFavorite() {
    if (!isLoggedIn()) {
        alert("请先登录");
        window.location.href = "login.html";
        return;
    }

    const userEmail = getUserEmail();
    if (!userEmail) return;

    try {
        const response = await authFetch(`/posts/${postId}/favorite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_email: userEmail
            })
        });

        if (response && response.ok) {
            const data = await response.json();
            
            // Update button appearance
            const favoriteBtn = document.getElementById('favorite-btn');
            const favoriteIcon = document.getElementById('favorite-icon');
            const favoriteText = document.getElementById('favorite-text');
            
            if (data.is_favorited) {
                favoriteBtn.classList.add('favorited');
                favoriteIcon.textContent = '⭐';
                favoriteText.textContent = '已收藏';
            } else {
                favoriteBtn.classList.remove('favorited');
                favoriteIcon.textContent = '☆';
                favoriteText.textContent = '收藏';
            }
        }
    } catch (error) {
        console.error("收藏失败:", error);
        alert("收藏失败，请重试");
    }
}