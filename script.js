const POSTS_PER_PAGE = 3; // กำหนดให้โหลดทีละ 3 โพสต์
let allPosts = [];
let currentIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
    await loadPostManifest();
});

// โหลดรายการไฟล์โพสต์ทั้งหมดจาก manifest.json
async function loadPostManifest() {
    try {
        const response = await fetch('posts/manifest.json');
        if (!response.ok) throw new Error('ไม่สามารถโหลดไฟล์ manifest.json ได้');
        
        allPosts = await response.json();
        
        // เรียงลำดับโพสต์จากปัจจุบัน (วันที่ล่าสุด) ไปหาแรกสุด (เก่าสุด)
        allPosts.sort((a, b) => new Date(b.date) - new Date(a.date));

        // เริ่มแสดงผลชุดแรก
        renderPosts();
    } catch (error) {
        console.error('Error loading posts manifest:', error);
        document.getElementById('posts-container').innerHTML = 
            '<p style="text-align: center; color: #ff6b6b;">ไม่สามารถโหลดรายการโพสต์ได้ กรุณาตรวจสอบการตั้งค่าเซิร์ฟเวอร์</p>';
    }
}

// เรนเดอร์โพสต์ทีละชุด
async function renderPosts() {
    const container = document.getElementById('posts-container');
    const loadMoreBtn = document.getElementById('load-more-btn');

    // ตัดแบ่งโพสต์ตามจำนวนที่กำหนดต่อหน้า (3 โพสต์)
    const nextBatch = allPosts.slice(currentIndex, currentIndex + POSTS_PER_PAGE);

    for (const postMeta of nextBatch) {
        try {
            const mdResponse = await fetch(`posts/${postMeta.filename}`);
            if (!mdResponse.ok) continue;
            
            const markdownText = await mdResponse.text();

            // ตั้งค่าการแปลง Markdown เป็น HTML
            marked.setOptions({
                headerIds: true,
                mangle: false,
                gfm: true
            });

            const rawHtml = marked.parse(markdownText);
            // ป้องกัน XSS แต่ยังคงอนุญาตให้ฝัง HTML แทรกได้ตามต้องการ
            const cleanHtml = DOMPurify.sanitize(rawHtml, { USE_PROFILES: { html: true } });

            // สร้าง Element สำหรับโพสต์
            const postArticle = document.createElement('article');
            postArticle.className = 'post-card';
            postArticle.innerHTML = `
                <div class="post-date">${postMeta.date}</div>
                <h2 class="post-title">${postMeta.title}</h2>
                <div class="post-content">${cleanHtml}</div>
            `;
            container.appendChild(postArticle);
        } catch (err) {
            console.error(`Error loading markdown file ${postMeta.filename}:`, err);
        }
    }

    currentIndex += nextBatch.length;

    // ซ่อนปุ่มโหลดเพิ่มหากแสดงครบทุกโพสต์แล้ว
    if (currentIndex >= allPosts.length) {
        loadMoreBtn.style.display = 'none';
    }
}

function loadMorePosts() {
    renderPosts();
}
