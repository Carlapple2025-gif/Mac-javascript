// 小红书单篇笔记提取器 - 简化版
(async () => {
    console.log("🚀 正在提取当前笔记数据...");

    try {
        // 1. 获取全局数据（小红书的数据都在这里）
        const state = window.__INITIAL_STATE__;

        // 2. 获取笔记ID（用来拼接链接）
        const noteId = window.location.pathname.split('/').pop();

        // 3. 获取标题
        const title = state.note?.noteDetailMap?.[noteId]?.note?.title || "无标题";

        // 4. 获取作者信息
        const author = state.user?.userInfo?.nickname || "未知作者";
        const authorId = state.user?.userInfo?.userId || "";

        // 5. 获取正文内容
        const desc = state.note?.noteDetailMap?.[noteId]?.note?.desc || "无正文";
        // 去除HTML标签，只保留文字
        const descText = desc.replace(/<[^>]+>/g, "");

        // 6. 获取图片/视频链接
        let mediaLinks = [];
        const images = state.note?.noteDetailMap?.[noteId]?.note?.imageList || [];
        images.forEach((img, index) => {
            // 尝试获取高清图
            const hdUrl = img.urlDefault || img.urlPre || img.url;
            mediaLinks.push(`图片${index + 1}: ${hdUrl}`);
        });

        // 7. 拼接最终结果
        const result = `---
标题: ${title}
作者: ${author} (ID: ${authorId})
链接: https://www.xiaohongshu.com/explore/${noteId}
---
正文:
${descText}

---
图片/视频链接:
${mediaLinks.join("\n")}`;

        // 8. 打印到控制台
        console.log("%c提取成功！Markdown 内容已复制到剪贴板", "color: green; font-size: 16px; font-weight: bold;");
        console.log("--- 以下是 Markdown 内容 ---");
        console.log(result);
        console.log("--- 提取结束 ---");

        // 9. 尝试复制到剪贴板 (如果浏览器报错，手动复制上面的console.log内容即可)
        try {
            await navigator.clipboard.writeText(result);
            alert("✅ 提取成功！内容已自动复制到剪贴板，快去粘贴吧！");
        } catch (e) {
            console.error("📋 自动复制失败，请手动复制上面的文本。");
        }

    } catch (error) {
        console.error("❌ 发生错误:", error);
        alert("提取失败，请查看控制台报错信息。");
    }
})();