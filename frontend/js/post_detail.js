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
            const tagSpan = document.createElement('span');
            tagSpan.style.marginLeft = '15px';
            tagSpan.textContent = `标签: ${post.tag || '全部'}`;
            metaEl.appendChild(tagSpan);
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
            
            // Post image (if exists)
            if (post.image_url && post.image_url.trim() !== '') {
                const imageEl = document.createElement('img');
                imageEl.src = post.image_url;
                imageEl.alt = 'Post image';
                imageEl.style.maxWidth = '100%';
                imageEl.style.maxHeight = '500px';
                imageEl.style.objectFit = 'contain';
                imageEl.style.borderRadius = '8px';
                imageEl.style.marginTop = '20px';
                imageEl.style.display = 'block';
                container.appendChild(imageEl);
            }
            
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
            upvoteBtn.textContent = '👍 ';
            const upvoteCount = document.createElement('span');
            upvoteCount.id = 'upvote-count';
            upvoteCount.textContent = post.upvotes;
            upvoteBtn.appendChild(upvoteCount);
            voteSection.appendChild(upvoteBtn);
            
            // Downvote button
            const downvoteBtn = document.createElement('button');
            downvoteBtn.id = 'downvote-btn';
            downvoteBtn.className = `vote-btn ${userVote === 'downvote' ? 'active-downvote' : ''}`;
            downvoteBtn.onclick = () => votePost('downvote');
            downvoteBtn.textContent = '👎 ';
            const downvoteCount = document.createElement('span');
            downvoteCount.id = 'downvote-count';
            downvoteCount.textContent = post.downvotes;
            downvoteBtn.appendChild(downvoteCount);
            voteSection.appendChild(downvoteBtn);
            
            // Favorite button (if logged in)
            if (isLoggedIn()) {
                const favoriteBtn = document.createElement('button');
                favoriteBtn.id = 'favorite-btn';
                favoriteBtn.className = `favorite-btn ${isFavorited ? 'favorited' : ''}`;
                favoriteBtn.onclick = toggleFavorite;
                
                const favoriteIcon = document.createElement('span');
                favoriteIcon.id = 'favorite-icon';
                favoriteIcon.textContent = isFavorited ? '⭐' : '☆';
                favoriteBtn.appendChild(favoriteIcon);
                
                const favoriteText = document.createElement('span');
                favoriteText.id = 'favorite-text';
                favoriteText.textContent = isFavorited ? '已收藏' : '收藏';
                favoriteBtn.appendChild(favoriteText);
                
                voteSection.appendChild(favoriteBtn);
            }
            
            container.appendChild(voteSection);

            if (isLoggedIn() && getUserEmail() === post.user_email) {
                const postActionSection = document.createElement('div');
                postActionSection.style.marginTop = '15px';
                postActionSection.style.display = 'flex';
                postActionSection.style.gap = '10px';

                const editBtn = document.createElement('button');
                editBtn.className = 'btn btn-secondary btn-sm';
                editBtn.textContent = '编辑帖子';
                editBtn.onclick = () => editPost(post);
                postActionSection.appendChild(editBtn);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-sm';
                deleteBtn.style.backgroundColor = '#dc3545';
                deleteBtn.textContent = '删除帖子';
                deleteBtn.onclick = deletePost;
                postActionSection.appendChild(deleteBtn);

                container.appendChild(postActionSection);
            }
            
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
                
                const imageInput = document.createElement('input');
                imageInput.type = 'file';
                imageInput.id = 'comment-image-input';
                imageInput.accept = 'image/*';
                imageInput.style.marginTop = '10px';
                imageInput.style.display = 'block';
                commentForm.appendChild(imageInput);
                
                const imageHint = document.createElement('small');
                imageHint.style.color = '#888';
                imageHint.style.display = 'block';
                imageHint.style.marginTop = '5px';
                imageHint.textContent = '可选：为评论添加图片';
                commentForm.appendChild(imageHint);
                
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
                loginPrompt.appendChild(document.createTextNode('请'));
                const loginLink = document.createElement('a');
                loginLink.href = 'login.html';
                loginLink.textContent = '登录';
                loginPrompt.appendChild(loginLink);
                loginPrompt.appendChild(document.createTextNode('后发表评论'));
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
                
                // Comment header
                const headerDiv = document.createElement('div');
                headerDiv.className = 'comment-header';
                
                const authorStrong = document.createElement('strong');
                authorStrong.textContent = comment.user_name;
                headerDiv.appendChild(authorStrong);
                
                const timeSpan = document.createElement('span');
                timeSpan.style.color = '#888';
                timeSpan.style.fontSize = '0.9em';
                timeSpan.style.marginLeft = '10px';
                timeSpan.textContent = comment.release_time;
                headerDiv.appendChild(timeSpan);
                
                commentDiv.appendChild(headerDiv);
                
                // Comment content
                const contentDiv = document.createElement('div');
                contentDiv.className = 'comment-content';
                contentDiv.textContent = comment.content;
                commentDiv.appendChild(contentDiv);
                
                // Comment image (if exists)
                if (comment.image_url && comment.image_url.trim() !== '') {
                    const imageEl = document.createElement('img');
                    imageEl.src = comment.image_url;
                    imageEl.alt = 'Comment image';
                    imageEl.style.maxWidth = '100%';
                    imageEl.style.maxHeight = '300px';
                    imageEl.style.objectFit = 'contain';
                    imageEl.style.borderRadius = '8px';
                    imageEl.style.marginTop = '10px';
                    imageEl.style.display = 'block';
                    commentDiv.appendChild(imageEl);
                }
                
                // Comment actions
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'comment-actions';
                actionsDiv.style.marginTop = '10px';
                actionsDiv.style.display = 'flex';
                actionsDiv.style.gap = '10px';
                
                const upvoteBtn = document.createElement('button');
                upvoteBtn.className = 'vote-btn-small';
                upvoteBtn.id = `comment-upvote-${comment.id}`;
                upvoteBtn.onclick = () => voteComment(comment.id, 'upvote');
                upvoteBtn.innerHTML = `👍 <span id="comment-upvote-count-${comment.id}">${comment.upvotes}</span>`;
                actionsDiv.appendChild(upvoteBtn);
                
                const downvoteBtn = document.createElement('button');
                downvoteBtn.className = 'vote-btn-small';
                downvoteBtn.id = `comment-downvote-${comment.id}`;
                downvoteBtn.onclick = () => voteComment(comment.id, 'downvote');
                downvoteBtn.innerHTML = `👎 <span id="comment-downvote-count-${comment.id}">${comment.downvotes}</span>`;
                actionsDiv.appendChild(downvoteBtn);

                if (isLoggedIn() && getUserEmail() === comment.user_email) {
                    const editBtn = document.createElement('button');
                    editBtn.className = 'btn btn-secondary btn-sm';
                    editBtn.textContent = '编辑';
                    editBtn.onclick = () => editComment(comment);
                    actionsDiv.appendChild(editBtn);

                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn btn-sm';
                    deleteBtn.style.backgroundColor = '#dc3545';
                    deleteBtn.textContent = '删除';
                    deleteBtn.onclick = () => deleteComment(comment.id);
                    actionsDiv.appendChild(deleteBtn);
                }
                
                commentDiv.appendChild(actionsDiv);
                
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
    const imageInput = document.getElementById('comment-image-input');
    const imageFile = imageInput ? imageInput.files[0] : null;
    
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
        let imageUrl = "";
        
        // If image is selected, upload it first
        if (imageFile) {
            const formData = new FormData();
            formData.append('file', imageFile);
            
            const uploadResponse = await authFetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            if (uploadResponse && uploadResponse.ok) {
                const uploadResult = await uploadResponse.json();
                imageUrl = `${API_BASE_URL}${uploadResult.file_url}`;
            } else {
                alert('上传图片失败，请重试');
                return;
            }
        }
        
        const response = await authFetch(`/posts/${postId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_email: userEmail,
                content: content,
                image_url: imageUrl
            })
        });

        if (response && response.ok) {
            input.value = '';
            if (imageInput) imageInput.value = '';
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

async function editPost(post) {
    const title = prompt('编辑标题', post.title);
    if (title === null) return;
    const content = prompt('编辑内容', post.content);
    if (content === null) return;
    const tag = prompt('编辑标签', post.tag || '全部');
    if (tag === null) return;
    const response = await authFetch(`/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: title.trim(),
            content: content.trim(),
            image_url: post.image_url || '',
            tag: tag.trim() || '全部'
        })
    });
    if (response && response.ok) {
        await loadPostDetail();
    } else {
        alert('编辑帖子失败');
    }
}

async function deletePost() {
    if (!confirm('确认删除该帖子吗？')) return;
    const response = await authFetch(`/posts/${postId}`, { method: 'DELETE' });
    if (response && response.ok) {
        alert('删除成功');
        window.location.href = 'index.html';
    } else {
        alert('删除失败');
    }
}

async function editComment(comment) {
    const content = prompt('编辑评论', comment.content);
    if (content === null) return;
    const response = await authFetch(`/comments/${comment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            content: content.trim(),
            image_url: comment.image_url || ''
        })
    });
    if (response && response.ok) {
        await loadComments();
    } else {
        alert('编辑评论失败');
    }
}

async function deleteComment(commentId) {
    if (!confirm('确认删除该评论吗？')) return;
    const response = await authFetch(`/comments/${commentId}`, { method: 'DELETE' });
    if (response && response.ok) {
        await loadComments();
    } else {
        alert('删除评论失败');
    }
}
