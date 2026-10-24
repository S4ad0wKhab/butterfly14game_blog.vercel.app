const POSTS_PER_PAGE = 3;
let allPosts = [];
let currentIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. ตรวจสอบว่าผู้ใช้เข้ามาผ่านลิงก์โพสต์เจาะจงหรือไม่
    // รองรับทั้งแบบ Query Parameter (?post=filename.md) และ Path (/posts/filename.md)
    const urlParams = new URLSearchParams(window.location.search);
    const queryPost = urlParams.get('post') || urlParams.get('p');
    
    const pathname = window.location.pathname;
    const pathMatch = pathname.match(/\/posts\/([^/]+\.md)$/);

    let targetFilename = queryPost;
    if (!targetFilename && pathMatch) {
        targetFilename = pathMatch[1]; // ได้ชื่อไฟล์เช่น post-1.md หรือ 1.md
    }

    // 2. ถ้ามีระบุไฟล์ ให้โหลดแสดงโพสต์เดี่ยว / ถ้าไม่มี ให้แสดงหน้าแรกปกติ
    if (targetFilename) {
        await renderSinglePostDirectly(targetFilename);
    } else {
        await loadPostManifest();
    }
});

// ฟังก์ชันสำหรับแสดงโพสต์เดียว (กรณีเข้าผ่านลิงก์ตรง)
async function renderSinglePostDirectly(filename) {
    const container = document.getElementById('posts-container');
    document.getElementById('load-more-btn').style.display = 'none'; // ซ่อนปุ่มโหลดเพิ่ม

    try {
        let postTitle = filename;
        let postDate = '';
        
        // พยายามดึงชื่อเรื่องและวันที่จาก manifest.json (ถ้ามี)
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
            console.warn('Could not load manifest for metadata, using defaults.');
        }

        // โหลดไฟล์ .md ที่ระบุ
        const mdResponse = await fetch(`posts/${filename}`);
        if (!mdResponse.ok) throw new Error('ไม่พบไฟล์โพสต์นี้');

        const markdownText = await mdResponse.text();

        marked.setOptions({ headerIds: true, mangle: false, gfm: true });
        const rawHtml = marked.parse(markdownText);
        const cleanHtml = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });

        // แสดงผลในกรอบโค้งสีขาวตามดีไซน์เดิม
        container.innerHTML = `
            <article class="post-card">
                ${postDate ? `<div class="post-date">${postDate}</div>` : ''}
                <h2 class="post-title">${postTitle}</h2>
                <div class="post-content">${cleanHtml}</div>
            </article>
            <div style="text-align: center; margin-top: 2.5rem;">
                <a href="/" class="btn-load-more" style="text-decoration: none; display: inline-block;">← กลับสู่หน้าแรก</a>
            </div>
        `;
    } catch (error) {
        console.error('Error loading single post:', error);
        container.innerHTML = `
            <div class="post-card" style="text-align: center;">
                <h2 class="post-title" style="color: #ff6b6b;">ไม่พบโพสต์ที่คุณต้องการ</h2>
                <p style="margin-bottom: 1.5rem; color: #aaa;">ไฟล์ "${filename}" อาจไม่มีอยู่จริงหรือถูกย้ายตำแหน่ง</p>
                <a href="/" class="btn-load-more" style="text-decoration: none; display: inline-block;">กลับสู่หน้าแรก</a>
            </div>
        `;
    }
}

// โหลดรายการโพสต์ทั้งหมดสำหรับหน้าแรก (โค้ดเดิม)
async function loadPostManifest() {
    try {
        const response = await fetch('posts/manifest.json');
        if (!response.ok) throw new Error('ไม่สามารถโหลดไฟล์ manifest.json ได้');
        
        allPosts = await response.json();
        allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

        renderPosts();
    } catch (error) {
        console.error('Error loading posts manifest:', error);
        document.getElementById('posts-container').innerHTML = 
            '<p style="text-align: center; color: #ff6b6b;">ไม่สามารถโหลดรายการโพสต์ได้</p>';
    }
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

    if (currentIndex >= allPosts.length) {
        loadMoreBtn.style.display = 'none';
    }
}

function loadMorePosts() {
    renderPosts();
}
