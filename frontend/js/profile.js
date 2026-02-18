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
            avatarDiv.innerHTML = `<img src="${currentUser.avatar}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
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

function switchTab(tabName) {
    // Update tab buttons
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
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
    
    // Truncate content if too long
    let contentPreview = post.content;
    if (contentPreview.length > 150) {
        contentPreview = contentPreview.substring(0, 150) + '...';
    }
    
    card.innerHTML = `
        <h3 class="post-title">${post.title}</h3>
        <p class="post-preview">${contentPreview}</p>
        <div class="post-meta">
            <span>👤 ${post.user_name}</span>
            <span>🕐 ${post.release_time}</span>
            <span>👍 ${post.upvotes} 👎 ${post.downvotes}</span>
        </div>
    `;
    
    return card;
}
