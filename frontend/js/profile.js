// 检查登录
if (!isLoggedIn()) {
    alert("请先登录");
    window.location.href = "login.html";
}

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    await loadProfile();
    await loadUserPosts();
    await loadUserFavorites();
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
            avatarDiv.innerHTML = '';
            avatarDiv.appendChild(img);
        } else {
            avatarDiv.innerHTML = '<span style="font-size: 4rem;">👤</span>';
        }
    } else {
        document.getElementById('profile-name').textContent = "加载失败";
        document.getElementById('profile-email').textContent = "请尝试重新登录";
    }
}

function showEditProfile() {
    const editSection = document.getElementById('edit-profile-section');
    editSection.style.display = 'block';
    
    // Pre-fill current values
    if (currentUser) {
        document.getElementById('avatar-input').value = currentUser.avatar || '';
        document.getElementById('signature-input').value = currentUser.signature || '';
    }
}

function cancelEdit() {
    document.getElementById('edit-profile-section').style.display = 'none';
}

async function saveProfile() {
    const avatar = document.getElementById('avatar-input').value.trim();
    const signature = document.getElementById('signature-input').value.trim();
    
    try {
        const response = await authFetch('/users/me', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                avatar: avatar,
                signature: signature
            })
        });
        
        if (response && response.ok) {
            alert('资料更新成功！');
            document.getElementById('edit-profile-section').style.display = 'none';
            await loadProfile(); // Reload profile to show updates
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
    }
    
    // Show/hide content
    if (tabName === 'posts') {
        document.getElementById('posts-section').style.display = 'block';
        document.getElementById('favorites-section').style.display = 'none';
    } else if (tabName === 'favorites') {
        document.getElementById('posts-section').style.display = 'none';
        document.getElementById('favorites-section').style.display = 'block';
    }
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
    if (contentPreview.length > 150) {
        contentPreview = contentPreview.substring(0, 150) + '...';
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
    
    metaEl.appendChild(authorSpan);
    metaEl.appendChild(timeSpan);
    metaEl.appendChild(votesSpan);
    
    card.appendChild(titleEl);
    card.appendChild(previewEl);
    card.appendChild(metaEl);
    
    return card;
}
