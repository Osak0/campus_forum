// 1. 检查是否登录，没登录直接踢走
if (!isLoggedIn()) {
    alert("请先登录再发帖！");
    window.location.href = "login.html";
}

// 2. 监听表单提交
document.getElementById('createPostForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('title').value;
    const content = document.getElementById('content').value;
    const tag = document.getElementById('tag').value;
    const imageFile = document.getElementById('image').files[0];

    if (!title || !content) {
        alert("标题和内容不能为空");
        return;
    }

    const submitBtn = e.target.querySelector('button');
    submitBtn.disabled = true; // 防止重复点击
    submitBtn.textContent = "发布中...";

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
                submitBtn.disabled = false;
                submitBtn.textContent = "发布";
                return;
            }
        }
        
        // 使用 authFetch 发送请求 (自动带 Token)
        const response = await authFetch('/posts/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, image_url: imageUrl, tag })
        });

        if (response && response.ok) {
            alert('发布成功！');
            window.location.href = 'index.html'; // 成功后跳回首页
        } else {
            alert('发布失败，请重试');
            submitBtn.disabled = false;
            submitBtn.textContent = "发布";
        }
    } catch (error) {
        console.error(error);
        alert('网络错误');
        submitBtn.disabled = false;
        submitBtn.textContent = "发布";
    }
});
