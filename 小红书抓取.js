(async () => {
    console.log("🚀 正在分析页面数据...");

    try {
        // 1. 核心步骤：直接从浏览器内存中读取全局变量
        // 这一步比 Python 的 BeautifulSoup 解析 HTML 要稳得多，因为数据就在这里
        const initialState = window.__INITIAL_STATE__;

        if (!initialState) {
            alert("❌ 未找到数据！请刷新页面试试，或者检查是否处于笔记详情页。");
            return;
        }

        // 2. 定位到具体的笔记数据
        // 小红书的笔记数据通常存储在 note.noteDetailMap 下
        const noteData = initialState.note?.noteDetailMap;
        
        if (!noteData) {
            alert("❌ 数据结构似乎变了，请检查控制台报错。");
            return;
        }

        // 获取当前笔记的 ID (从 URL 或数据中获取)
        const noteId = Object.keys(noteData)[0]; 
        const note = noteData[noteId];

        // 3. 提取我们想要的信息
        const title = note.title || "无标题";
        const desc = note.desc || "无描述";
        const author = note.user?.nickname || "未知作者";
        const images = note.imageList || [];
        
        // 4. 生成 Markdown 格式的内容
        let markdown = `### ${title}\n\n`;
        markdown += `**作者：** ${author}\n\n`;
        markdown += `**正文：**\n${desc}\n\n`;
        
        // 提取图片链接
        if (images.length > 0) {
            markdown += `**图片 (${images.length}张)：**\n`;
            images.forEach((img, index) => {
                // 这里的 url_pre 是小红书的高清图链接
                markdown += `![图片${index+1}](${img.url_pre})\n`;
            });
        }

        // 5. 输出结果
        console.log("%c✅ 提取成功！以下是 Markdown 内容：", "color: green; font-size: 20px;");
        console.log(markdown);

        // 6. 自动复制到剪贴板 (方便你直接粘贴)
        await navigator.clipboard.writeText(markdown);
        alert("✅ 提取成功！Markdown 内容已自动复制到你的剪贴板，快去粘贴吧！");

    } catch (error) {
        console.error("❌ 发生错误:", error);
        alert("出错了，请查看控制台的具体报错信息。");
    }
})();