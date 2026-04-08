(async function() {
    // ---------- 配置 ----------
    const MAX_CHAPTERS = 20;           // 最大抓取章节数
    const NEXT_SELECTOR = '#j_chapterNext'; // 下一章链接选择器
    const DELAY_MS = 20000;               // 请求间隔（毫秒），避免过快被屏蔽

    // ---------- 动态加载 JSZip ----------
    if (typeof JSZip === 'undefined') {
        console.log('正在加载 JSZip 库...');
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
        console.log('JSZip 加载完成');
    }

    // ---------- 工具函数：从 HTML 字符串中提取数据 ----------
    function extractChapterData(html, url) {
        const dom = new DOMParser().parseFromString(html, 'text/html');

        // 1. 找到正文容器（兼容多种选择器）
        let contentContainer = dom.querySelector('.read-content, #j_chapterBox, .text-wrap, .main-text-wrap');
        if (!contentContainer) {
            throw new Error('未找到正文容器');
        }

        // 2. 提取元数据
        let bookTitle = '';
        const bookTitleElement = dom.querySelector('a[href*="/novel/"]');
        if (bookTitleElement) bookTitle = bookTitleElement.textContent.trim();
        if (!bookTitle) {
            const breadcrumb = dom.querySelector('.breadcrumb, .crumbs');
            if (breadcrumb) {
                const links = breadcrumb.querySelectorAll('a');
                if (links.length >= 2) bookTitle = links[1].textContent.trim();
            }
        }

        let chapterTitle = '';
        const chapterElement = dom.querySelector('.j_chapterName');
        if (chapterElement) chapterTitle = chapterElement.textContent.trim();
        if (!chapterTitle) {
            const backup = dom.querySelector('h1, .chapter-title, .title, h3');
            if (backup) chapterTitle = backup.textContent.trim();
        }
        chapterTitle = chapterTitle.replace(/^\s+|\s+$/g, '');

        let author = '';
        const authorLink = dom.querySelector('a[href*="?f=author"]');
        if (authorLink) author = authorLink.textContent.trim();
        if (!author) {
            const infoArea = dom.querySelector('.info');
            if (infoArea) {
                const allLinks = infoArea.querySelectorAll('a');
                if (allLinks.length >= 2) author = allLinks[1].textContent.trim();
            }
        }
        author = author.replace(/[☐☑✓✔✗✘❌❎✅★☆○●◯◆◇■□▣▶▷◀◁↑↓←→↗↙↘↖➡⬅⬆⬇〓※]/g, '').trim();

        let wordCount = '';
        const wordCountElement = dom.querySelector('.j_chapterWordCut');
        if (wordCountElement) wordCount = wordCountElement.textContent.trim();

        let updateTime = '';
        const timeElement = dom.querySelector('.j_updateTime');
        if (timeElement) updateTime = timeElement.textContent.trim();

        let category = '';
        const categoryElement = dom.querySelector('.info a:first-child');
        if (categoryElement) category = categoryElement.textContent.trim();
        category = category.replace(/[☐☑✓✔✗✘❌❎✅★☆○●◯◆◇■□▣▶▷◀◁↑↓←→↗↙↘↖➡⬅⬆⬇〓※]/g, '').trim();

        const saveTime = new Date().toLocaleString('zh-CN', { hour12: false });

        // 3. 构建 YAML Front Matter
        let yaml = '---\n';
        if (bookTitle) yaml += `title: "${bookTitle}"\n`;
        if (chapterTitle && chapterTitle !== '首页') yaml += `chapter: "${chapterTitle}"\n`;
        if (author) yaml += `author: "${author}"\n`;
        if (wordCount) yaml += `word_count: ${wordCount}\n`;
        if (category) yaml += `category: "${category}"\n`;
        if (updateTime) yaml += `update_time: "${updateTime}"\n`;
        yaml += `save_time: "${saveTime}"\n`;
        yaml += `source: "${url}"\n`;
        yaml += '---\n\n';

        // 4. 提取正文段落
        const paragraphs = contentContainer.querySelectorAll('p');
        const skipParents = ['.text-head', '.text-info', '.info', '.book-info', '.ad', '.ads', '.user_ad_content', '.advertisement'];
        const metadataKeywords = [bookTitle, chapterTitle, author, category, `${wordCount}字`, wordCount, updateTime].filter(k => k && k.length > 0);

        let validParagraphs = [];
        let filteredCount = 0;

        paragraphs.forEach(el => {
            let inSkipArea = false;
            for (const sel of skipParents) {
                if (el.closest(sel)) {
                    inSkipArea = true;
                    break;
                }
            }
            if (inSkipArea) return;

            let text = el.textContent.trim();
            if (!text) return;

            text = text
                .replace(/[☐☑✓✔✗✘❌❎✅★☆○●◯◆◇■□▣▶▷◀◁↑↓←→↗↙↘↖➡⬅⬆⬇〓※]/g, '')
                .replace(/[\uE000-\uF8FF]/g, '')
                .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            if (!text) return;

            // 判断是否为元数据段落
            let isMetadata = false;
            if (chapterTitle && text.includes(chapterTitle)) {
                let matchCount = 0;
                for (const kw of [author, category, `${wordCount}字`, updateTime]) {
                    if (kw && text.includes(kw)) matchCount++;
                }
                if (matchCount >= 1) isMetadata = true;
            }
            if (!isMetadata && /[^\s]+\s+[^\s]+\s+\d+字/.test(text)) isMetadata = true;
            if (!isMetadata && text.length < 200) {
                let matchCount = 0;
                for (const kw of metadataKeywords) {
                    if (kw && text.includes(kw)) matchCount++;
                }
                if (matchCount >= 2) isMetadata = true;
            }

            if (isMetadata) {
                filteredCount++;
                return;
            }

            text = text.replace(/^#+\s*/, '');
            validParagraphs.push(text);
        });

        if (validParagraphs.length === 0) {
            let fullText = contentContainer.textContent.trim();
            fullText = fullText
                .replace(/[☐☑✓✔✗✘❌❎✅★☆○●◯◆◇■□▣▶▷◀◁↑↓←→↗↙↘↖➡⬅⬆⬇〓※]/g, '')
                .replace(/[\uE000-\uF8FF]/g, '')
                .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
                .replace(/\s+/g, ' ');
            fullText = fullText.replace(/^#+\s*/gm, '');
            fullText = fullText.replace(/[。！？]/g, match => match + '\n\n');
            fullText = fullText.replace(/\n{3,}/g, '\n\n');
            validParagraphs = [fullText];
        }

        let markdown = yaml;
        for (let paragraph of validParagraphs) {
            let cleaned = paragraph.replace(/^[\s"']+|[\s"']+$/g, '').trim();
            if (cleaned) {
                markdown += `${cleaned}\n\n`;
            }
        }
        markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
        if (!markdown.endsWith('\n')) markdown += '\n';

        // 5. 生成文件名（不含扩展名）
        let filename = '';
        if (bookTitle && chapterTitle && chapterTitle !== '首页') {
            filename = `${bookTitle}_${chapterTitle}`;
        } else if (chapterTitle && chapterTitle !== '首页') {
            filename = chapterTitle;
        } else if (bookTitle) {
            filename = bookTitle;
        } else {
            filename = `chapter-${Date.now()}`;
        }
        filename = filename.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '_');
        if (filename.length > 100) filename = filename.slice(0, 100);
        filename += '.md';

        return { markdown, filename, bookTitle, chapterTitle };
    }

    // ---------- 获取下一章 URL ----------
    function getNextChapterUrl(html, baseUrl) {
        const dom = new DOMParser().parseFromString(html, 'text/html');
        const nextLink = dom.querySelector(NEXT_SELECTOR);
        if (!nextLink) return null;
        let href = nextLink.getAttribute('href');
        if (!href) return null;
        // 处理相对路径
        return new URL(href, baseUrl).href;
    }

    // ---------- 抓取单章 ----------
    async function fetchChapter(url) {
        console.log(`正在抓取：${url}`);
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        const data = extractChapterData(html, url);
        const nextUrl = getNextChapterUrl(html, url);
        return { ...data, nextUrl };
    }

    // ---------- 批量抓取 ----------
    const zip = new JSZip();
    let currentUrl = window.location.href;
    let fetchCount = 0;
    let chapterList = [];

    while (fetchCount < MAX_CHAPTERS && currentUrl) {
        try {
            const { markdown, filename, bookTitle, chapterTitle, nextUrl } = await fetchChapter(currentUrl);
            zip.file(filename, markdown);
            chapterList.push({ filename, chapterTitle });
            console.log(`✅ 已抓取：${filename}`);
            fetchCount++;
            currentUrl = nextUrl;
            if (currentUrl && fetchCount < MAX_CHAPTERS) {
                await new Promise(resolve => setTimeout(resolve, DELAY_MS));
            }
        } catch (err) {
            console.error(`抓取失败：${currentUrl}`, err);
            break;
        }
    }

    // ---------- 生成 ZIP 并下载 ----------
    if (chapterList.length === 0) {
        alert('未抓取到任何章节，请检查页面结构。');
        return;
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = zipUrl;
    a.download = `${chapterList[0]?.bookTitle || '小说'}_${chapterList.length}章.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(zipUrl);

    console.log(`🎉 批量抓取完成！共 ${chapterList.length} 章，已打包为 ZIP 下载。`);
    alert(`批量抓取完成！共 ${chapterList.length} 章，文件已开始下载。`);
})();