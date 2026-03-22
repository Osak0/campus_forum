let currentTag = '全部';
let currentKeyword = '';
let currentBoardId = null;
let tagsCollapsed = false;
let currentPage = 1;
const PAGE_SIZE = 20;
let totalPages = 1;
let isLoadingPosts = false;
let userPreferredTags = [];
let hasPreferredTags = false;

document.addEventListener('DOMContentLoaded', async () => {
    await loadUserPreferences();
    await loadBoards();
    await loadTrendingSearches();
    await loadTagFilters();
    await loadPosts();
});

async function loadUserPreferences() {
    if (!isLoggedIn()) return;
    try {
        const response = await authFetch('/users/me/settings');
        if (response && response.ok) {
            const settings = await response.json();
            if (settings.preferred_tags && settings.preferred_tags.trim()) {
                userPreferredTags = settings.preferred_tags.split(',').map(t => t.trim()).filter(Boolean);
                hasPreferredTags = userPreferredTags.length > 0;
                if (hasPreferredTags) {
                    document.getElementById('collapse-hint').style.display = 'block';
                }
            }
        }
    } catch (e) {
        console.error('加载用户偏好失败:', e);
    }
}

async function loadBoards() {
    const container = document.getElementById('boards-nav');
    if (!container) return;
    try {
        const response = await fetch(`${API_BASE_URL}/boards`);
        if (!response.ok) return;
        const data = await response.json();
        const boards = data.boards || [];
        if (boards.length === 0) return;

        container.innerHTML = '';
        const allBtn = document.createElement('button');
        allBtn.className = 'board-btn active';
        allBtn.textContent = '全部板块';
        allBtn.onclick = () => selectBoard(null);
        container.appendChild(allBtn);

        boards.forEach(board => {
            const btn = document.createElement('button');
            btn.className = 'board-btn';
            btn.textContent = `${board.name} (${board.post_count})`;
            btn.onclick = () => selectBoard(board.id, board.name);
            container.appendChild(btn);
        });
    } catch (error) {
        console.error('加载板块失败:', error);
    }
}

function selectBoard(boardId, boardName) {
    currentBoardId = boardId;
    currentPage = 1;
    document.querySelectorAll('.board-btn').forEach(b => b.classList.remove('active'));
    if (boardId === null) {
        document.querySelector('.board-btn').classList.add('active');
        document.getElementById('page-title').textContent = '最新动态';
    } else {
        event.target.classList.add('active');
        document.getElementById('page-title').textContent = boardName || '板块';
    }
    loadPosts(false);
}

async function loadTrendingSearches() {
    const container = document.getElementById('trending-container');
    if (!container) return;
    try {
        const response = await fetch(`${API_BASE_URL}/trending-searches`);
        if (!response.ok) return;
        const data = await response.json();
        const trending = data.trending || [];
        if (trending.length === 0) {
            container.style.display = 'none';
            return;
        }
        trending.forEach(keyword => {
            const tag = document.createElement('span');
            tag.className = 'trending-tag';
            tag.textContent = keyword;
            tag.onclick = () => {
                document.getElementById('search-input').value = keyword;
                searchPosts();
            };
            container.appendChild(tag);
        });
    } catch (error) {
        container.style.display = 'none';
    }
}

async function loadTagFilters() {
    const container = document.getElementById('tag-filter-container');
    if (!container) return;
    container.innerHTML = '';

    const defaultBtn = document.createElement('button');
    defaultBtn.className = 'btn btn-sm';
    defaultBtn.textContent = '全部';
    defaultBtn.onclick = () => selectTag('全部');
    container.appendChild(defaultBtn);

    try {
        const response = await fetch(`${API_BASE_URL}/tags`);
        if (!response.ok) return;
        const data = await response.json();
        (data.tags || []).forEach(tag => {
            if (tag === '全部') return;
            const tagBtn = document.createElement('button');
            tagBtn.className = 'btn btn-sm btn-secondary';
            tagBtn.textContent = tag;
            tagBtn.onclick = () => selectTag(tag);
            container.appendChild(tagBtn);
        });
    } catch (error) {
        console.error('加载标签失败:', error);
    }
}

function toggleTags() {
    tagsCollapsed = !tagsCollapsed;
    const container = document.getElementById('tag-filter-container');
    if (container) {
        container.style.display = tagsCollapsed ? 'none' : 'flex';
    }
}

function selectTag(tag) {
    currentTag = tag;
    currentPage = 1;
    loadPosts(false);
}

function searchPosts() {
    currentKeyword = document.getElementById('search-input').value.trim();
    currentPage = 1;
    loadPosts(false);
}

function clearSearch() {
    document.getElementById('search-input').value = '';
    currentKeyword = '';
    currentTag = '全部';
    currentBoardId = null;
    currentPage = 1;
    document.querySelectorAll('.board-btn').forEach(b => b.classList.remove('active'));
    const firstBoard = document.querySelector('.board-btn');
    if (firstBoard) firstBoard.classList.add('active');
    document.getElementById('page-title').textContent = '最新动态';
    loadPosts(false);
}

function isPreferredTag(tag) {
    if (!hasPreferredTags) return true;
    return userPreferredTags.includes(tag);
}

async function loadPosts(append = false) {
    if (isLoadingPosts) return;
    isLoadingPosts = true;
    const container = document.getElementById('posts-container');
    if (!append) {
        container.innerHTML = '<p style="text-align:center">正在加载帖子...</p>';
    }

    try {
        const query = new URLSearchParams();
        if (currentTag && currentTag !== '全部') query.append('tag', currentTag);
        if (currentKeyword) query.append('keyword', currentKeyword);
        if (currentBoardId !== null) query.append('board_id', currentBoardId);
        query.append('page', currentPage);
        query.append('page_size', PAGE_SIZE);
        const response = await fetch(`${API_BASE_URL}/posts/?${query.toString()}`);

        if (!response.ok) {
            throw new Error('获取帖子失败');
        }

        const data = await response.json();
        const posts = data.posts || [];
        const total = data.total || 0;
        totalPages = data.total_pages || 1;
        if (!append) container.innerHTML = '';

        if (posts.length === 0) {
            if (!append) {
                container.innerHTML = '<p style="text-align:center; color:#666">没有匹配的帖子</p>';
            }
            isLoadingPosts = false;
            renderPagination(container, total);
            return;
        }

        posts.forEach(post => {
            const collapsed = hasPreferredTags && !isPreferredTag(post.tag);
            const postCard = document.createElement('div');
            postCard.className = 'post-card' + (collapsed ? ' post-collapsed' : '');

            if (collapsed) {
                postCard.style.cursor = 'pointer';
                const titleRow = document.createElement('div');
                titleRow.style.display = 'flex';
                titleRow.style.justifyContent = 'space-between';
                titleRow.style.alignItems = 'center';
                const titleEl = document.createElement('h3');
                titleEl.textContent = post.title;
                titleEl.style.color = '#333';
                titleEl.style.marginBottom = '0';
                const tagEl = document.createElement('span');
                tagEl.className = 'btn btn-sm btn-secondary';
                tagEl.textContent = `#${post.tag || '全部'}`;
                tagEl.style.fontSize = '0.75em';
                titleRow.appendChild(titleEl);
                titleRow.appendChild(tagEl);
                postCard.appendChild(titleRow);
                postCard.onclick = () => window.location.href = `post_detail.html?id=${post.id}`;
            } else {
                postCard.style.cursor = 'pointer';
                postCard.onclick = () => window.location.href = `post_detail.html?id=${post.id}`;

                const titleEl = document.createElement('h3');
                titleEl.textContent = post.title;
                titleEl.style.color = '#333';
                titleEl.style.marginBottom = '10px';

                const tagRow = document.createElement('div');
                tagRow.style.display = 'flex';
                tagRow.style.gap = '6px';
                tagRow.style.marginBottom = '10px';
                const tagEl = document.createElement('span');
                tagEl.className = 'btn btn-sm btn-secondary';
                tagEl.textContent = `#${post.tag || '全部'}`;
                tagRow.appendChild(tagEl);
                if (post.board_name) {
                    const boardEl = document.createElement('span');
                    boardEl.className = 'btn btn-sm';
                    boardEl.style.backgroundColor = '#6f42c1';
                    boardEl.textContent = post.board_name;
                    tagRow.appendChild(boardEl);
                }

                const contentEl = document.createElement('p');
                contentEl.style.color = '#666';
                contentEl.style.fontSize = '0.9em';
                contentEl.style.marginBottom = '10px';
                let contentPreview = post.content.substring(0, 100);
                if (post.content.length > 100) contentPreview += '... (点击查看全文)';
                contentEl.textContent = contentPreview;

                if (post.image_url && post.image_url.trim() !== '') {
                    const imageEl = document.createElement('img');
                    imageEl.src = post.image_url;
                    imageEl.alt = 'Post image';
                    imageEl.style.maxWidth = '100%';
                    imageEl.style.maxHeight = '200px';
                    imageEl.style.objectFit = 'cover';
                    imageEl.style.borderRadius = '8px';
                    imageEl.style.marginBottom = '10px';
                    postCard.appendChild(imageEl);
                }

                const metaEl = document.createElement('div');
                metaEl.className = 'post-meta';
                const left = document.createElement('span');
                left.textContent = `作者: ${post.user_name} | 时间: ${post.release_time}`;
                const right = document.createElement('span');
                right.textContent = `👍 ${post.upvotes} 👎 ${post.downvotes}`;
                metaEl.appendChild(left);
                metaEl.appendChild(right);

                postCard.appendChild(titleEl);
                postCard.appendChild(tagRow);
                postCard.appendChild(contentEl);
                postCard.appendChild(metaEl);
            }
            container.appendChild(postCard);
        });

        isLoadingPosts = false;
        renderPagination(container, total);
    } catch (error) {
        console.error(error);
        isLoadingPosts = false;
        container.innerHTML = '<p style="color:red; text-align:center">加载失败，请检查后端是否运行。</p>';
    }
}

function renderPagination(container, total) {
    const oldPagination = document.getElementById('posts-pagination');
    if (oldPagination) oldPagination.remove();
    if (totalPages <= 1 || total === 0) return;

    const paginationEl = document.createElement('div');
    paginationEl.id = 'posts-pagination';
    paginationEl.style.display = 'flex';
    paginationEl.style.alignItems = 'center';
    paginationEl.style.justifyContent = 'center';
    paginationEl.style.gap = '10px';
    paginationEl.style.marginTop = '20px';
    paginationEl.style.padding = '10px 0';

    const infoEl = document.createElement('span');
    infoEl.style.color = '#666';
    infoEl.textContent = `已加载第 ${currentPage} 页 / 共 ${totalPages} 页（共 ${total} 条帖子）`;

    const loadMoreBtn = document.createElement('button');
    loadMoreBtn.className = 'btn btn-sm btn-secondary';
    loadMoreBtn.textContent = currentPage < totalPages ? '加载更多' : '已加载全部';
    loadMoreBtn.disabled = currentPage >= totalPages;
    loadMoreBtn.onclick = () => {
        if (currentPage < totalPages && !isLoadingPosts) {
            currentPage++;
            loadPosts(true);
        }
    };

    paginationEl.appendChild(infoEl);
    paginationEl.appendChild(loadMoreBtn);
    container.appendChild(paginationEl);
}
