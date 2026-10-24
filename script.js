const POSTS_PER_PAGE = 3;
let allPosts = [];
let currentIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('posts-container');
    
    // 1. ตรวจสอบว่าโหลดไลบรารี CDN (Marked.js และ DOMPurify) สำเร็จหรือไม่
    if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') {
        container.innerHTML = `
            <div class="post-card" style="border-color: #ff6b6b; text-align: center;">
                <h2 class="post-title" style="color: #ff6b6b;">ไม่พบไลบรารีที่จำเป็น (CDN Error)</h2>
                <p style="color: #ccc; margin-top: 10px;">กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตเพื่อให้เบราว์เซอร์โหลด Markdown Parser ได้</p>
            </div>
        `;
        return;
    }

    try {
        // 2. ตรวจสอบ URL ว่าเข้ามาดูโพสต์เดี่ยวหรือไม่
        const urlParams = new URLSearchParams(window.location.search);
        const queryPost = urlParams.get('post') || urlParams.get('p');
        
        const pathname = window.location.pathname;
        const pathMatch = pathname.match(/\/posts\/([^/]+\.md)$/);

        let targetFilename = queryPost;
        if (!targetFilename && pathMatch) {
            targetFilename = pathMatch[1];
        }

        // 3. แยกการทำงานระหว่างหน้าโพสต์เดี่ยวกับหน้าแรก
        if (targetFilename) {
            await renderSinglePostDirectly(targetFilename);
        } else {
            await loadPostManifest();
        }
    } catch (err) {
        console.error("Critical error:", err);
        container.innerHTML = `
            <div class="post-card" style="border-color: #ff6b6b; text-align: center;">
                <h2 class="post-title" style="color: #ff6b6b;">เกิดข้อผิดพลาดในการโหลดระบบ</h2>
                <p style="color: #ccc; margin-top: 10px;">${err.message}</p>
                <p style="color: #aaa; font-size: 0.9rem; margin-top: 15px;">
                    💡 <strong>ข้อควรระวัง:</strong> ต้องรันผ่าน <strong>Local Server</strong> (เช่น VS Code Live Server หรือคำสั่ง Python) ห้ามดับเบิลคลิกเปิดไฟล์ html ตรงๆ เด็ดขาดเนื่องจากติดระบบความปลอดภัย CORS
                </p>
            </div>
        `;
    }
});

// ฟังก์ชันแสดงโพสต์เดี่ยว
async function renderSinglePostDirectly(filename) {
    const container = document.getElementById('posts-container');
    const loadMoreBtn = document.getElementById('load-more-btn');
    if (loadMoreBtn) loadMoreBtn.style.display = 'none';

    let postTitle = filename;
    let postDate = '';
    
    try {
        const res = await fetch('posts/manifest.json');
        if (res.ok) {
            const manifest = await res.json();
            const found = manifest.find(p => p.filename === filename);
            if (found) {
                postTitle = found.title;
                postDate = found.date;
            }
        }
    } catch (e) {
        console.warn('Could not load manifest, using filename as title.');
    }

    const mdResponse = await fetch(`posts/${filename}`);
    if (!mdResponse.ok) throw new Error(`ไม่พบไฟล์โพสต์: posts/${filename}`);

    const markdownText = await mdResponse.text();

    marked.setOptions({ headerIds: true, mangle: false, gfm: true });
    const rawHtml = marked.parse(markdownText);
    const cleanHtml = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });

    container.innerHTML = `
        <article class="post-card">
            ${postDate ? `<div class="post-date">${postDate}</div>` : ''}
            <h2 class="post-title">${postTitle}</h2>
            <div class="post-content">${cleanHtml}</div>
        </article>
        <div style="text-align: center; margin-top: 2.5rem;">
            <a href="./" class="btn-load-more" style="text-decoration: none; display: inline-block;">← กลับสู่หน้าแรก</a>
        </div>
    `;
}

// โหลดรายการโพสต์สำหรับหน้าแรก
async function loadPostManifest() {
    const response = await fetch('posts/manifest.json');
    if (!response.ok) throw new Error('ไม่สามารถโหลดไฟล์ posts/manifest.json ได้');
    
    allPosts = await response.json();
    allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

    renderPosts();
}

async function renderPosts() {
    const container = document.getElementById('posts-container');
    const loadMoreBtn = document.getElementById('load-more-btn');

    const nextBatch = allPosts.slice(currentIndex, currentIndex + POSTS_PER_PAGE);

    for (const postMeta of nextBatch) {
        try {
            const mdResponse = await fetch(`posts/${postMeta.filename}`);
            if (!mdResponse.ok) continue;
            
            const markdownText = await mdResponse.text();
            marked.setOptions({ headerIds: true, mangle: false, gfm: true });
            
            const rawHtml = marked.parse(markdownText);
            const cleanHtml = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });

            const postArticle = document.createElement('article');
            postArticle.className = 'post-card';
            postArticle.innerHTML = `
                <div class="post-date">${postMeta.date}</div>
                <h2 class="post-title"><a href="posts/${postMeta.filename}" style="color: inherit; text-decoration: none;">${postMeta.title}</a></h2>
                <div class="post-content">${cleanHtml}</div>
            `;
            container.appendChild(postArticle);
        } catch (err) {
            console.error(`Error loading markdown file ${postMeta.filename}:`, err);
        }
    }

    currentIndex += nextBatch.length;

    if (currentIndex >= allPosts.length && loadMoreBtn) {
        loadMoreBtn.style.display = 'none';
    }
}

function loadMorePosts() {
    renderPosts();
}
