if (!isLoggedIn()) {
    alert("请先登录");
    window.location.href = "login.html";
}

document.addEventListener('DOMContentLoaded', loadNotifications);

async function loadNotifications() {
    const container = document.getElementById('notifications-list');
    const response = await authFetch('/notifications');
    if (!(response && response.ok)) {
        container.innerHTML = '<p style="color:red;">加载通知失败</p>';
        return;
    }

    const data = await response.json();
    const notifications = data.notifications || [];
    if (notifications.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888;">暂无通知</p>';
        return;
    }

    container.innerHTML = '';
    notifications.forEach(item => {
        const card = document.createElement('div');
        card.className = 'post-card';
        card.style.borderLeft = item.is_read ? '4px solid #dee2e6' : '4px solid #007bff';

        const message = document.createElement('p');
        message.textContent = item.message;
        card.appendChild(message);

        const meta = document.createElement('div');
        meta.className = 'post-meta';
        const left = document.createElement('span');
        left.textContent = `${item.notification_type === 'reply' ? '回复' : '投票'} | ${item.release_time}`;
        const right = document.createElement('span');
        right.textContent = item.is_read ? '已读' : '未读';
        meta.appendChild(left);
        meta.appendChild(right);
        card.appendChild(meta);

        if (!item.is_read) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-sm';
            btn.style.marginTop = '10px';
            btn.textContent = '标记已读';
            btn.onclick = () => markRead(item.id);
            card.appendChild(btn);
        }
        container.appendChild(card);
    });
}

async function markRead(id) {
    const response = await authFetch(`/notifications/${id}/read`, { method: 'PUT' });
    if (response && response.ok) {
        loadNotifications();
    }
}

async function markAllRead() {
    const response = await authFetch('/notifications/read-all', { method: 'PUT' });
    if (response && response.ok) {
        loadNotifications();
    }
}
