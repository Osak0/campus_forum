let currentReportPage = 1;
let currentFeedbackPage = 1;

document.addEventListener('DOMContentLoaded', async () => {
    if (!isLoggedIn()) {
        alert('请先登录');
        window.location.href = 'login.html';
        return;
    }
    
    await checkAdminPermission();
    await loadSensitiveWords();
});

async function checkAdminPermission() {
    try {
        const response = await authFetch('/users/me');
        if (!response || !response.ok) {
            alert('获取用户信息失败');
            window.location.href = 'index.html';
            return;
        }
        const user = await response.json();
        if (!user.is_admin) {
            alert('您没有管理员权限');
            window.location.href = 'index.html';
            return;
        }
    } catch (error) {
        console.error('检查权限失败:', error);
        window.location.href = 'index.html';
    }
}

function switchTab(tabId) {
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.admin-section').forEach(section => section.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(tabId).classList.add('active');
    
    if (tabId === 'sensitive-words') loadSensitiveWords();
    else if (tabId === 'reports') loadReports();
    else if (tabId === 'feedback') loadFeedback();
    else if (tabId === 'boards') loadBoards();
}

// 敏感词管理
async function loadSensitiveWords() {
    const container = document.getElementById('sensitive-words-list');
    try {
        const response = await authFetch('/admin/sensitive-words');
        if (!response || !response.ok) {
            container.innerHTML = '<p style="color: red;">加载失败</p>';
            return;
        }
        const data = await response.json();
        const words = data.words || [];
        
        if (words.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #888;">暂无敏感词</p>';
            return;
        }
        
        container.innerHTML = words.map(word => `
            <div class="admin-item">
                <div class="admin-item-content">${word.word}</div>
                <div class="admin-item-actions">
                    <button class="btn btn-sm btn-secondary" style="background: #dc3545;" onclick="deleteSensitiveWord(${word.id})">删除</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载敏感词失败:', error);
        container.innerHTML = '<p style="color: red;">加载失败</p>';
    }
}

async function addSensitiveWord() {
    const input = document.getElementById('new-sensitive-word');
    const word = input.value.trim();
    if (!word) {
        alert('请输入敏感词');
        return;
    }
    
    try {
        const response = await authFetch('/admin/sensitive-words', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ word })
        });
        
        if (response && response.ok) {
            input.value = '';
            loadSensitiveWords();
        } else {
            const data = await response.json();
            alert(data.detail || '添加失败');
        }
    } catch (error) {
        console.error('添加敏感词失败:', error);
        alert('添加失败');
    }
}

async function deleteSensitiveWord(id) {
    if (!confirm('确定要删除这个敏感词吗？')) return;
    
    try {
        const response = await authFetch(`/admin/sensitive-words/${id}`, {
            method: 'DELETE'
        });
        
        if (response && response.ok) {
            loadSensitiveWords();
        } else {
            alert('删除失败');
        }
    } catch (error) {
        console.error('删除敏感词失败:', error);
        alert('删除失败');
    }
}

// 举报管理
async function loadReports() {
    const container = document.getElementById('reports-list');
    const status = document.getElementById('report-status-filter').value;
    
    try {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        params.append('page', currentReportPage);
        params.append('page_size', 10);
        
        const response = await authFetch(`/admin/reports?${params.toString()}`);
        if (!response || !response.ok) {
            container.innerHTML = '<p style="color: red;">加载失败</p>';
            return;
        }
        
        const data = await response.json();
        const reports = data.reports || [];
        
        if (reports.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #888;">暂无举报记录</p>';
            return;
        }
        
        container.innerHTML = reports.map(report => `
            <div class="report-item">
                <div class="report-meta">
                    <span>举报人: ${report.reporter_name}</span> | 
                    <span>类型: ${report.target_type === 'post' ? '帖子' : '评论'}</span> | 
                    <span>时间: ${report.created_at}</span>
                    <span class="status-badge status-${report.status}" style="margin-left: 8px;">
                        ${report.status === 'pending' ? '待处理' : report.status === 'resolved' ? '已处理' : '已拒绝'}
                    </span>
                </div>
                <div class="report-content">
                    <strong>举报内容:</strong> ${report.target_title || '[已删除]'}<br>
                    <strong>举报原因:</strong> ${report.reason}
                </div>
                ${report.admin_reply ? `<div style="color: #059669;"><strong>管理员回复:</strong> ${report.admin_reply}</div>` : ''}
                ${report.status === 'pending' ? `
                    <div class="reply-form">
                        <textarea id="reply-${report.id}" placeholder="输入处理回复..."></textarea>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn btn-sm" onclick="resolveReport(${report.id}, 'resolved')">通过并屏蔽</button>
                            <button class="btn btn-sm btn-secondary" onclick="resolveReport(${report.id}, 'rejected')">拒绝</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        renderPagination('reports-pagination', data.total, currentReportPage, (page) => {
            currentReportPage = page;
            loadReports();
        });
    } catch (error) {
        console.error('加载举报失败:', error);
        container.innerHTML = '<p style="color: red;">加载失败</p>';
    }
}

async function resolveReport(reportId, status) {
    const replyInput = document.getElementById(`reply-${reportId}`);
    const adminReply = replyInput ? replyInput.value.trim() : '';
    
    if (status === 'resolved' && !adminReply) {
        alert('请填写处理说明');
        return;
    }
    
    try {
        const response = await authFetch(`/admin/reports/${reportId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, admin_reply: adminReply || '举报已处理' })
        });
        
        if (response && response.ok) {
            loadReports();
        } else {
            const data = await response.json();
            alert(data.detail || '处理失败');
        }
    } catch (error) {
        console.error('处理举报失败:', error);
        alert('处理失败');
    }
}

// 反馈管理
async function loadFeedback() {
    const container = document.getElementById('feedback-list');
    const status = document.getElementById('feedback-status-filter').value;
    
    try {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        params.append('page', currentFeedbackPage);
        params.append('page_size', 10);
        
        const response = await authFetch(`/admin/feedback?${params.toString()}`);
        if (!response || !response.ok) {
            container.innerHTML = '<p style="color: red;">加载失败</p>';
            return;
        }
        
        const data = await response.json();
        const items = data.feedback || [];
        
        if (items.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #888;">暂无反馈记录</p>';
            return;
        }
        
        const categoryMap = { suggestion: '建议', bug: '问题', appeal: '申诉' };
        
        container.innerHTML = items.map(item => `
            <div class="feedback-item">
                <div class="feedback-meta">
                    <span>用户: ${item.user_name}</span> | 
                    <span>分类: ${categoryMap[item.category] || item.category}</span> | 
                    <span>时间: ${item.created_at}</span>
                    <span class="status-badge status-${item.status}" style="margin-left: 8px;">
                        ${item.status === 'pending' ? '待处理' : '已处理'}
                    </span>
                </div>
                <div class="feedback-content">${item.content}</div>
                ${item.admin_reply ? `<div style="color: #059669;"><strong>管理员回复:</strong> ${item.admin_reply}</div>` : ''}
                ${item.status === 'pending' ? `
                    <div class="reply-form">
                        <textarea id="feedback-reply-${item.id}" placeholder="输入回复内容..."></textarea>
                        <button class="btn btn-sm" onclick="replyFeedback(${item.id})">回复</button>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        renderPagination('feedback-pagination', data.total, currentFeedbackPage, (page) => {
            currentFeedbackPage = page;
            loadFeedback();
        });
    } catch (error) {
        console.error('加载反馈失败:', error);
        container.innerHTML = '<p style="color: red;">加载失败</p>';
    }
}

async function replyFeedback(feedbackId) {
    const replyInput = document.getElementById(`feedback-reply-${feedbackId}`);
    const adminReply = replyInput.value.trim();
    
    if (!adminReply) {
        alert('请输入回复内容');
        return;
    }
    
    try {
        const response = await authFetch(`/admin/feedback/${feedbackId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_reply: adminReply, status: 'resolved' })
        });
        
        if (response && response.ok) {
            loadFeedback();
        } else {
            const data = await response.json();
            alert(data.detail || '回复失败');
        }
    } catch (error) {
        console.error('回复反馈失败:', error);
        alert('回复失败');
    }
}

// 板块管理
async function loadBoards() {
    const container = document.getElementById('boards-list');
    try {
        const response = await authFetch('/admin/boards');
        if (!response || !response.ok) {
            container.innerHTML = '<p style="color: red;">加载失败</p>';
            return;
        }
        
        const data = await response.json();
        const boards = data.boards || [];
        
        if (boards.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #888;">暂无板块</p>';
            return;
        }
        
        container.innerHTML = boards.map(board => `
            <div class="board-item">
                <div>
                    <strong>${board.name}</strong>
                    ${board.description ? `<br><small style="color: #666;">${board.description}</small>` : ''}
                    <br><small style="color: #999;">排序: ${board.sort_order}</small>
                </div>
                <button class="btn btn-sm btn-secondary" style="background: #dc3545;" onclick="deleteBoard(${board.id})">删除</button>
            </div>
        `).join('');
    } catch (error) {
        console.error('加载板块失败:', error);
        container.innerHTML = '<p style="color: red;">加载失败</p>';
    }
}

async function createBoard() {
    const name = document.getElementById('new-board-name').value.trim();
    const description = document.getElementById('new-board-desc').value.trim();
    const sortOrder = parseInt(document.getElementById('new-board-sort').value) || 0;
    
    if (!name) {
        alert('请输入板块名称');
        return;
    }
    
    try {
        const response = await authFetch('/admin/boards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, sort_order: sortOrder })
        });
        
        if (response && response.ok) {
            document.getElementById('new-board-name').value = '';
            document.getElementById('new-board-desc').value = '';
            document.getElementById('new-board-sort').value = '';
            loadBoards();
        } else {
            const data = await response.json();
            alert(data.detail || '创建失败');
        }
    } catch (error) {
        console.error('创建板块失败:', error);
        alert('创建失败');
    }
}

async function deleteBoard(boardId) {
    if (!confirm('确定要删除这个板块吗？该板块下的帖子将取消板块分类。')) return;
    
    try {
        const response = await authFetch(`/admin/boards/${boardId}`, {
            method: 'DELETE'
        });
        
        if (response && response.ok) {
            loadBoards();
        } else {
            alert('删除失败');
        }
    } catch (error) {
        console.error('删除板块失败:', error);
        alert('删除失败');
    }
}

// 分页渲染
function renderPagination(containerId, total, currentPage, onPageChange) {
    const container = document.getElementById(containerId);
    const pageSize = 10;
    const totalPages = Math.ceil(total / pageSize);
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '';
    if (currentPage > 1) {
        html += `<button onclick="(${onPageChange})(${currentPage - 1})">上一页</button>`;
    }
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            html += `<button class="${i === currentPage ? 'active' : ''}" onclick="(${onPageChange})(${i})">${i}</button>`;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            html += `<span>...</span>`;
        }
    }
    
    if (currentPage < totalPages) {
        html += `<button onclick="(${onPageChange})(${currentPage + 1})">下一页</button>`;
    }
    
    container.innerHTML = html;
}
