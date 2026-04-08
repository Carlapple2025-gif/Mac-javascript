// 将网页内容保存为 Markdown 文件（去除多余缩进和格式）
function 保存为Markdown() {
  // 1. 找到正文容器
  const 正文容器 = document.querySelector('.read-content, #j_chapterBox, .text-wrap, .main-text-wrap');
  
  if (!正文容器) {
    console.error('未找到正文内容');
    alert('未找到正文内容，请检查页面结构');
    return;
  }
  
  console.log('✅ 找到正文容器');
  
  // 2. 提取元数据
  let 书名 = '';
  const 书名元素 = document.querySelector('a[href*="/novel/"]');
  if (书名元素) 书名 = 书名元素.textContent.trim();
  if (!书名) {
    const 面包屑 = document.querySelector('.breadcrumb, .crumbs');
    if (面包屑) {
      const 链接 = 面包屑.querySelectorAll('a');
      if (链接.length >= 2) 书名 = 链接[1].textContent.trim();
    }
  }
  
  let 章节标题 = '';
  const 章节元素 = document.querySelector('.j_chapterName');
  if (章节元素) 章节标题 = 章节元素.textContent.trim();
  if (!章节标题) {
    const 备用 = document.querySelector('h1, .chapter-title, .title, h3');
    if (备用) 章节标题 = 备用.textContent.trim();
  }
  章节标题 = 章节标题.replace(/^\s+|\s+$/g, '');
  
  let 作者 = '';
  const 作者链接 = document.querySelector('a[href*="?f=author"]');
  if (作者链接) 作者 = 作者链接.textContent.trim();
  if (!作者) {
    const info区域 = document.querySelector('.info');
    if (info区域) {
      const 所有链接 = info区域.querySelectorAll('a');
      if (所有链接.length >= 2) 作者 = 所有链接[1].textContent.trim();
    }
  }
  作者 = 作者.replace(/[☐☑✓✔✗✘❌❎✅★☆○●◯◆◇■□▣▶▷◀◁↑↓←→↗↙↘↖➡⬅⬆⬇〓※]/g, '').trim();
  
  let 字数 = '';
  const 字数元素 = document.querySelector('.j_chapterWordCut');
  if (字数元素) 字数 = 字数元素.textContent.trim();
  
  let 更新时间 = '';
  const 时间元素 = document.querySelector('.j_updateTime');
  if (时间元素) 更新时间 = 时间元素.textContent.trim();
  
  let 分类 = '';
  const 分类元素 = document.querySelector('.info a:first-child');
  if (分类元素) 分类 = 分类元素.textContent.trim();
  分类 = 分类.replace(/[☐☑✓✔✗✘❌❎✅★☆○●◯◆◇■□▣▶▷◀◁↑↓←→↗↙↘↖➡⬅⬆⬇〓※]/g, '').trim();
  
  const 网址 = window.location.href;
  const 保存时间 = new Date().toLocaleString('zh-CN', { hour12: false });
  
  // 3. 构建 YAML Front Matter
  let yaml = '---\n';
  if (书名) yaml += `title: "${书名}"\n`;
  if (章节标题 && 章节标题 !== '首页') yaml += `chapter: "${章节标题}"\n`;
  if (作者) yaml += `author: "${作者}"\n`;
  if (字数) yaml += `word_count: ${字数}\n`;
  if (分类) yaml += `category: "${分类}"\n`;
  if (更新时间) yaml += `update_time: "${更新时间}"\n`;
  yaml += `save_time: "${保存时间}"\n`;
  yaml += `source: "${网址}"\n`;
  yaml += '---\n\n';
  
  // 4. 构建正文（不添加任何标题）
  let markdown = yaml;
  
  // 获取所有段落元素
  const 候选段落 = 正文容器.querySelectorAll('p');
  
  console.log(`📄 找到 ${候选段落.length} 个段落元素`);
  
  // 需要跳过的父级选择器
  const 跳过父级 = ['.text-head', '.text-info', '.info', '.book-info', '.ad', '.ads', '.user_ad_content', '.advertisement'];
  
  // 元数据关键词
  const 元数据关键词 = [
    书名, 章节标题, 作者, 分类, `${字数}字`, 字数, 更新时间
  ].filter(k => k && k.length > 0);
  
  let 有效段落 = [];
  let 过滤计数 = 0;
  
  候选段落.forEach(el => {
    // 跳过在排除父级内的元素
    let 在排除区内 = false;
    for (const sel of 跳过父级) {
      if (el.closest(sel)) {
        在排除区内 = true;
        break;
      }
    }
    if (在排除区内) return;
    
    let 文本 = el.textContent.trim();
    if (!文本) return;
    
    // 清理图标符号
    文本 = 文本
      .replace(/[☐☑✓✔✗✘❌❎✅★☆○●◯◆◇■□▣▶▷◀◁↑↓←→↗↙↘↖➡⬅⬆⬇〓※]/g, '')
      .replace(/[\uE000-\uF8FF]/g, '')
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (!文本) return;
    
    // 判断是否为元数据段落
    let 是元数据 = false;
    
    // 情况1：包含章节标题且包含作者/分类/字数/时间中的至少一个
    if (章节标题 && 文本.includes(章节标题)) {
      let 匹配数 = 0;
      for (const kw of [作者, 分类, `${字数}字`, 更新时间]) {
        if (kw && 文本.includes(kw)) 匹配数++;
      }
      if (匹配数 >= 1) {
        是元数据 = true;
      }
    }
    
    // 情况2：匹配"分类 作者 字数"模式
    if (!是元数据 && /[^\s]+\s+[^\s]+\s+\d+字/.test(文本)) {
      是元数据 = true;
    }
    
    // 情况3：包含多个元数据关键词
    if (!是元数据 && 文本.length < 200) {
      let 匹配数 = 0;
      for (const kw of 元数据关键词) {
        if (kw && 文本.includes(kw)) 匹配数++;
      }
      if (匹配数 >= 2) {
        是元数据 = true;
      }
    }
    
    if (是元数据) {
      过滤计数++;
      console.log(`🗑️ 过滤元数据: "${文本.substring(0, 60)}..."`);
      return;
    }
    
    // 清理文本中的 Markdown 标题符号（如 ###）
    文本 = 文本.replace(/^#+\s*/, '');
    
    有效段落.push(文本);
  });
  
  console.log(`🗑️ 共过滤 ${过滤计数} 个元数据段落`);
  console.log(`✅ 保留 ${有效段落.length} 个有效段落`);
  
  // 如果没有找到有效段落，回退到全文模式
  if (有效段落.length === 0) {
    console.warn('未找到有效段落，使用全文模式');
    let 全文 = 正文容器.textContent.trim();
    全文 = 全文
      .replace(/[☐☑✓✔✗✘❌❎✅★☆○●◯◆◇■□▣▶▷◀◁↑↓←→↗↙↘↖➡⬅⬆⬇〓※]/g, '')
      .replace(/[\uE000-\uF8FF]/g, '')
      .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
      .replace(/\s+/g, ' ');
    // 移除所有标题符号
    全文 = 全文.replace(/^#+\s*/gm, '');
    // 按句子分割
    全文 = 全文.replace(/[。！？]/g, match => match + '\n\n');
    全文 = 全文.replace(/\n{3,}/g, '\n\n');
    有效段落 = [全文];
  }
  
  // 将有效段落写入 markdown，确保每个段落后都有换行
  for (let i = 0; i < 有效段落.length; i++) {
    const 段落 = 有效段落[i];
    // 清理段落开头可能的多余空格和符号
    let 清理后段落 = 段落.replace(/^[\s"']+|[\s"']+$/g, '').trim();
    if (清理后段落) {
      markdown += `${清理后段落}\n\n`;
    }
  }
  
  // 清理多余空行，确保段落之间只有一个空行
  markdown = markdown.replace(/\n{3,}/g, '\n\n').trim();
  
  // 确保最后有换行符
  if (!markdown.endsWith('\n')) {
    markdown += '\n';
  }
  
  // 5. 生成文件名
  let 文件名 = '';
  if (书名 && 章节标题 && 章节标题 !== '首页') {
    文件名 = `${书名}_${章节标题}`;
  } else if (章节标题 && 章节标题 !== '首页') {
    文件名 = 章节标题;
  } else if (书名) {
    文件名 = 书名;
  } else {
    文件名 = `chapter-${Date.now()}`;
  }
  文件名 = 文件名.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '_');
  if (文件名.length > 100) 文件名 = 文件名.slice(0, 100);
  文件名 += '.md';
  
  // 6. 下载
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 文件名;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  // 7. 统计
  console.log('=' .repeat(50));
  console.log('✅ 保存成功！');
  console.log(`📚 书名: ${书名 || '未获取到'}`);
  console.log(`📖 章节: ${章节标题}`);
  console.log(`✍️  作者: ${作者 || '未获取到'}`);
  console.log(`📊 字数: ${字数 || '未获取到'}`);
  console.log(`📁 分类: ${分类 || '未获取到'}`);
  console.log(`📄 文件名: ${文件名}`);
  console.log(`📝 段落数: ${有效段落.length}`);
  console.log(`💾 文件大小: ${(blob.size / 1024).toFixed(2)} KB`);
  console.log('=' .repeat(50));
  
  alert(`保存成功！\n\n书名：${书名 || '未获取'}\n章节：${章节标题}\n作者：${作者 || '未获取'}\n字数：${字数 || '未获取'}字\n段落：${有效段落.length}段`);
}

// 执行
保存为Markdown();