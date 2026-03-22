// 检查登录
if (!isLoggedIn()) {
    alert("请先登录");
    window.location.href = "login.html";
}

// Constants
const MAX_PREVIEW_LENGTH = 150;

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadProfile();
    await loadSettings();
    await loadUserPosts();
    await loadUserFavorites();
    await loadUserReports();
    await loadUserFeedback();
});

async function loadProfile() {
    const response = await authFetch('/users/me');
    
    if (response && response.ok) {
        currentUser = await response.json();
        
        // Fill in profile data
        document.getElementById('profile-name').textContent = currentUser.user_name || "未设置昵称";
        document.getElementById('profile-email').textContent = currentUser.user_email;
        
        // Update signature
        if (currentUser.signature) {
            document.getElementById('profile-signature').textContent = currentUser.signature;
            document.getElementById('profile-signature').style.fontStyle = 'italic';
        } else {
            document.getElementById('profile-signature').textContent = '暂无个性签名';
            document.getElementById('profile-signature').style.fontStyle = 'italic';
            document.getElementById('profile-signature').style.color = '#999';
        }
        
        // Update avatar
        const avatarDiv = document.getElementById('profile-avatar');
        if (currentUser.avatar && currentUser.avatar.trim() !== '') {
            // Create img element safely to prevent XSS
            const img = document.createElement('img');
            img.src = currentUser.avatar;
            img.alt = 'Avatar';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '50%';
            avatarDiv.textContent = ''; // Clear existing content safely
            avatarDiv.appendChild(img);
        } else {
            avatarDiv.textContent = ''; // Clear existing content safely
            const iconSpan = document.createElement('span');
            iconSpan.style.fontSize = '4rem';
            iconSpan.textContent = '👤';
            avatarDiv.appendChild(iconSpan);
        }
    } else {
        document.getElementById('profile-name').textContent = "加载失败";
        document.getElementById('profile-email').textContent = "请尝试重新登录";
    }
}

async function saveSettings() {
    let avatar = document.getElementById('avatar-input').value.trim();
    const signature = document.getElementById('signature-input').value.trim();
    const preferredTags = document.getElementById('preferred-tags-input').value.trim();
    const avatarFile = document.getElementById('avatar-file-input').files[0];
    
    try {
        // If a file is selected, upload it first
        if (avatarFile) {
            const formData = new FormData();
            formData.append('file', avatarFile);
            
            const uploadResponse = await authFetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            if (uploadResponse && uploadResponse.ok) {
                const uploadResult = await uploadResponse.json();
                avatar = `${API_BASE_URL}${uploadResult.file_url}`;
            } else {
                alert('上传头像失败，请重试');
                return;
            }
        }
        
        const response = await authFetch('/users/me/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                avatar: avatar,
                signature: signature,
                preferred_tags: preferredTags
            })
        });
        
        if (response && response.ok) {
            alert('设置更新成功！');
            await loadProfile(); // Reload profile to show updates
            await loadSettings();
        } else {
            alert('更新失败，请重试');
        }
    } catch (error) {
        console.error('保存资料失败:', error);
        alert('更新失败，请重试');
    }
}

function switchTab(tabName, event) {
    // Update tab buttons
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => btn.classList.remove('active'));
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        const targetBtn = document.querySelector(`.tab-btn[onclick*="${tabName}"]`);
        if (targetBtn) targetBtn.classList.add('active');
    }
    
    // Hide all sections
    document.getElementById('posts-section').style.display = 'none';
    document.getElementById('favorites-section').style.display = 'none';
    document.getElementById('reports-section').style.display = 'none';
    document.getElementById('feedback-section').style.display = 'none';
    document.getElementById('settings-section').style.display = 'none';
    
    // Show selected section
    const sectionId = `${tabName}-section`;
    const section = document.getElementById(sectionId);
    if (section) {
        section.style.display = 'block';
    }
}

async function loadSettings() {
    const response = await authFetch('/users/me/settings');
    if (!(response && response.ok)) return;
    const settings = await response.json();
    document.getElementById('avatar-input').value = settings.avatar || '';
    document.getElementById('signature-input').value = settings.signature || '';
    document.getElementById('preferred-tags-input').value = settings.preferred_tags || '';
}

async function loadUserPosts() {
    const container = document.getElementById('my-posts-list');
    
    try {
        const response = await authFetch('/users/me/posts');
        
        if (response && response.ok) {
            const posts = await response.json();
            
            if (posts.length === 0) {
                container.innerHTML = '<p style="text-align:center; color:#888; padding: 40px 0;">还没有发布任何帖子</p>';
                return;
            }
            
            container.innerHTML = '';
            posts.forEach(post => {
                const postCard = createPostCard(post);
                container.appendChild(postCard);
            });
        } else {
            container.innerHTML = '<p style="text-align:center; color:red; padding: 40px 0;">加载失败</p>';
        }
    } catch (error) {
        console.error('加载帖子失败:', error);
        container.innerHTML = '<p style="text-align:center; color:red; padding: 40px 0;">加载失败</p>';
    }
}

async function loadUserFavorites() {
    const container = document.getElementById('my-favorites-list');
    
    try {
        const response = await authFetch('/users/me/favorites');
        
        if (response && response.ok) {
            const posts = await response.json();
            
            if (posts.length === 0) {
                container.innerHTML = '<p style="text-align:center; color:#888; padding: 40px 0;">还没有收藏任何帖子</p>';
                return;
            }
            
            container.innerHTML = '';
            posts.forEach(post => {
                const postCard = createPostCard(post);
                container.appendChild(postCard);
            });
        } else {
            container.innerHTML = '<p style="text-align:center; color:red; padding: 40px 0;">加载失败</p>';
        }
    } catch (error) {
        console.error('加载收藏失败:', error);
        container.innerHTML = '<p style="text-align:center; color:red; padding: 40px 0;">加载失败</p>';
    }
}

async function loadUserReports() {
    const container = document.getElementById('my-reports-list');
    
    try {
        const response = await authFetch('/reports/my');
        
        if (response && response.ok) {
            const data = await response.json();
            const reports = data.reports || [];
            
            if (reports.length === 0) {
                container.innerHTML = '<p style="text-align:center; color:#888; padding: 40px 0;">还没有举报记录</p>';
                return;
            }
            
            container.innerHTML = reports.map(report => {
                const statusText = report.status === 'pending' ? '待处理' : report.status === 'resolved' ? '已处理' : '已拒绝';
                const statusClass = `status-${report.status}`;
                const targetType = report.target_type === 'post' ? '帖子' : '评论';
                
                return `
                    <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
                        <div style="font-size: 0.85em; color: #666; margin-bottom: 8px;">
                            <span>类型: ${targetType}</span> | 
                            <span>时间: ${report.created_at}</span>
                            <span class="status-badge ${statusClass}" style="margin-left: 8px;">${statusText}</span>
                        </div>
                        <div><strong>举报原因:</strong> ${report.reason}</div>
                        ${report.admin_reply ? `<div style="color: #059669; margin-top: 8px;"><strong>管理员回复:</strong> ${report.admin_reply}</div>` : ''}
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<p style="text-align:center; color:red; padding: 40px 0;">加载失败</p>';
        }
    } catch (error) {
        console.error('加载举报记录失败:', error);
        container.innerHTML = '<p style="text-align:center; color:red; padding: 40px 0;">加载失败</p>';
    }
}

async function loadUserFeedback() {
    const container = document.getElementById('my-feedback-list');
    
    try {
        const response = await authFetch('/feedback/my');
        
        if (response && response.ok) {
            const data = await response.json();
            const items = data.feedback || [];
            
            if (items.length === 0) {
                container.innerHTML = '<p style="text-align:center; color:#888; padding: 40px 0;">还没有反馈记录</p>';
                return;
            }
            
            const categoryMap = { suggestion: '建议', bug: '问题', appeal: '申诉' };
            
            container.innerHTML = items.map(item => {
                const statusText = item.status === 'pending' ? '待处理' : '已处理';
                const statusClass = `status-${item.status}`;
                const category = categoryMap[item.category] || item.category;
                
                return `
                    <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin-bottom: 12px;">
                        <div style="font-size: 0.85em; color: #666; margin-bottom: 8px;">
                            <span>分类: ${category}</span> | 
                            <span>时间: ${item.created_at}</span>
                            <span class="status-badge ${statusClass}" style="margin-left: 8px;">${statusText}</span>
                        </div>
                        <div>${item.content}</div>
                        ${item.admin_reply ? `<div style="color: #059669; margin-top: 8px;"><strong>管理员回复:</strong> ${item.admin_reply}</div>` : ''}
                    </div>
                `;
            }).join('');
        } else {
            container.innerHTML = '<p style="text-align:center; color:red; padding: 40px 0;">加载失败</p>';
        }
    } catch (error) {
        console.error('加载反馈记录失败:', error);
        container.innerHTML = '<p style="text-align:center; color:red; padding: 40px 0;">加载失败</p>';
    }
}

function showFeedbackForm() {
    const content = prompt('请输入反馈内容：');
    if (!content || !content.trim()) return;
    
    const categoryOptions = ['suggestion', 'bug', 'appeal'];
    const categoryLabels = ['建议', '问题', '申诉'];
    const categoryInput = prompt(`请选择分类（输入数字）：\n1. 建议\n2. 问题\n3. 申诉`);
    const categoryIndex = parseInt(categoryInput) - 1;
    
    if (categoryIndex < 0 || categoryIndex >= categoryOptions.length) {
        alert('无效的分类选择');
        return;
    }
    
    submitFeedback(content.trim(), categoryOptions[categoryIndex]);
}

async function submitFeedback(content, category) {
    try {
        const response = await authFetch('/feedback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content, category })
        });
        
        if (response && response.ok) {
            alert('反馈已提交，感谢你的意见！');
            await loadUserFeedback();
        } else {
            const data = await response.json();
            alert(data.detail || '提交失败');
        }
    } catch (error) {
        console.error('提交反馈失败:', error);
        alert('提交失败');
    }
}

function createPostCard(post) {
    const card = document.createElement('div');
    card.className = 'post-card';
    card.onclick = () => window.location.href = `post_detail.html?id=${post.id}`;
    
    // Create title element safely
    const titleEl = document.createElement('h3');
    titleEl.className = 'post-title';
    titleEl.textContent = post.title;
    
    // Truncate content if too long
    let contentPreview = post.content;
    if (contentPreview.length > MAX_PREVIEW_LENGTH) {
        contentPreview = contentPreview.substring(0, MAX_PREVIEW_LENGTH) + '...';
    }
    
    // Create preview element safely
    const previewEl = document.createElement('p');
    previewEl.className = 'post-preview';
    previewEl.textContent = contentPreview;
    
    // Create meta section
    const metaEl = document.createElement('div');
    metaEl.className = 'post-meta';
    
    const authorSpan = document.createElement('span');
    authorSpan.textContent = `👤 ${post.user_name}`;
    
    const timeSpan = document.createElement('span');
    timeSpan.textContent = `🕐 ${post.release_time}`;
    
    const votesSpan = document.createElement('span');
    votesSpan.textContent = `👍 ${post.upvotes} 👎 ${post.downvotes}`;

    const tagSpan = document.createElement('span');
    tagSpan.textContent = `#${post.tag || '全部'}`;
    
    metaEl.appendChild(authorSpan);
    metaEl.appendChild(timeSpan);
    metaEl.appendChild(votesSpan);
    metaEl.appendChild(tagSpan);
    
    card.appendChild(titleEl);
    card.appendChild(previewEl);
    card.appendChild(metaEl);
    
    return card;
}
