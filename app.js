/* ============================================================
   智能错题本 - Smart Error Notebook
   核心功能：拍照OCR识别 + AI解答 + 学科分类管理
   所有逻辑统一在 DOMContentLoaded 内执行
   ============================================================ */

(function () {
  'use strict';

  // ===== 全局状态 =====
  const STATE = {
    subjects: [],
    errors: [],
    currentImage: null,
    ocrResult: '',
    cameraStream: null
  };

  const DEFAULT_SUBJECTS = [
    { id: 'math', name: '数学', color: '#4F46E5',
      types: ['选择题', '填空题', '解答题', '判断题', '应用题', '证明题', '计算题'] },
    { id: 'english', name: '英语', color: '#10B981',
      types: ['选择题', '填空题', '阅读理解', '翻译题', '写作题', '完形填空', '改错题'] },
    { id: 'physics', name: '物理', color: '#F59E0B',
      types: ['选择题', '填空题', '解答题', '判断题', '实验题', '计算题', '作图题'] },
    { id: 'chemistry', name: '化学', color: '#EF4444',
      types: ['选择题', '填空题', '解答题', '判断题', '实验题', '计算题', '推断题'] }
  ];

  // ===== DOM 工具 =====
  function $(id) { return document.getElementById(id); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function showToast(message, type) {
    type = type || 'success';
    const container = $('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(function () { toast.style.opacity = '0'; }, 2500);
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = String(str == null ? '' : str);
    return div.innerHTML;
  }

  // ===== 数据持久化 =====
  function loadData() {
    try {
      const savedSubjects = localStorage.getItem('errorNotebook_subjects');
      const savedErrors = localStorage.getItem('errorNotebook_errors');
      if (savedSubjects) {
        STATE.subjects = JSON.parse(savedSubjects);
        // 兼容老数据：确保每个学科都有 types 字段
        var needsResave = false;
        STATE.subjects.forEach(function (s) {
          if (!s.types) { s.types = []; needsResave = true; }
        });
        if (needsResave) saveSubjects();
      } else {
        STATE.subjects = DEFAULT_SUBJECTS.slice();
        saveSubjects();
      }
      if (savedErrors) STATE.errors = JSON.parse(savedErrors);
    } catch (e) {
      console.error('数据加载失败:', e);
      STATE.subjects = DEFAULT_SUBJECTS.slice();
      STATE.errors = [];
    }
  }

  function saveSubjects() {
    try { localStorage.setItem('errorNotebook_subjects', JSON.stringify(STATE.subjects)); } catch (e) {}
  }

  function saveErrors() {
    try { localStorage.setItem('errorNotebook_errors', JSON.stringify(STATE.errors)); } catch (e) {}
  }

  // ===== 标签切换 =====
  function switchTab(tab) {
    $$('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
    $$('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
    const btn = document.querySelector('[data-tab="' + tab + '"]');
    const panel = $('panel-' + tab);
    if (btn) btn.classList.add('active');
    if (panel) panel.classList.add('active');
    if (tab === 'notebook') renderErrorList();
    if (tab === 'subjects') renderSubjectList();
    if (tab === 'scan') updateSubjectSelect();
  }

  // ===== 学科管理 =====
  function addSubject() {
    const nameInput = $('newSubjectName');
    const colorInput = $('newSubjectColor');
    const typesInput = $('newSubjectTypes');
    const name = nameInput.value.trim();
    if (!name) { showToast('请输入学科名称', 'warning'); return; }
    // 解析用户输入的题型，逗号分隔
    const typesRaw = typesInput.value.trim();
    const types = typesRaw ? typesRaw.split(/[,，、\s]+/).filter(function(t) { return t.length > 0; }) : [];
    STATE.subjects.push({
      id: 'subject_' + Date.now(),
      name: name,
      color: colorInput.value,
      types: types
    });
    saveSubjects();
    nameInput.value = '';
    typesInput.value = '';
    renderSubjectList();
    updateSubjectSelect();
    updateFilterSelect();
    showToast('学科「' + name + '」已添加', 'success');
  }

  function deleteSubject(id) {
    const subject = STATE.subjects.find(function (s) { return s.id === id; });
    if (!subject) return;
    const relatedErrors = STATE.errors.filter(function (e) { return e.subjectId === id; });
    if (relatedErrors.length > 0) {
      if (!confirm('学科「' + subject.name + '」下有 ' + relatedErrors.length + ' 道错题，删除后这些错题将变为"未分类"。确定删除吗？')) return;
      STATE.errors.forEach(function (e) { if (e.subjectId === id) e.subjectId = null; });
      saveErrors();
    }
    STATE.subjects = STATE.subjects.filter(function (s) { return s.id !== id; });
    saveSubjects();
    renderSubjectList();
    updateSubjectSelect();
    updateFilterSelect();
    showToast('学科「' + subject.name + '」已删除', 'success');
  }

  // ===== 编辑学科 =====
  function openEditSubject(id) {
    const subject = STATE.subjects.find(function (s) { return s.id === id; });
    if (!subject) return;
    $('editSubjectName').value = subject.name;
    $('editSubjectColor').value = subject.color;
    $('editSubjectTypes').value = (subject.types || []).join(',');
    $('editSubjectOverlay').dataset.editId = id;
    $('editSubjectOverlay').hidden = false;
  }

  function saveEditSubject() {
    const id = $('editSubjectOverlay').dataset.editId;
    const subject = STATE.subjects.find(function (s) { return s.id === id; });
    if (!subject) return;
    const name = $('editSubjectName').value.trim();
    if (!name) { showToast('请输入学科名称', 'warning'); return; }
    const typesRaw = $('editSubjectTypes').value.trim();
    const types = typesRaw ? typesRaw.split(/[,，、\s]+/).filter(function(t) { return t.length > 0; }) : [];
    subject.name = name;
    subject.color = $('editSubjectColor').value;
    subject.types = types;
    saveSubjects();
    $('editSubjectOverlay').hidden = true;
    renderSubjectList();
    updateSubjectSelect();
    updateFilterSelect();
    showToast('学科已更新 ✓', 'success');
  }

  function renderSubjectList() {
    const container = $('subjectList');
    if (!container) return;
    if (STATE.subjects.length === 0) {
      container.innerHTML = '<div class="empty-state"><span class="empty-icon">📚</span><p>还没有学科分类</p><p class="hint">在上面创建一个学科开始使用吧！</p></div>';
      return;
    }
    container.innerHTML = STATE.subjects.map(function (subject) {
      const count = STATE.errors.filter(function (e) { return e.subjectId === subject.id; }).length;
      const typesPreview = (subject.types && subject.types.length) ? ' · ' + subject.types.join('、') : '';
      return '<div class="subject-item"><div class="subject-info"><span class="subject-color-dot" style="background:' + subject.color + '"></span><div><div class="subject-name">' + escapeHTML(subject.name) + '</div><div class="subject-types-preview">' + escapeHTML(typesPreview.replace(/^ · /, '')) + '</div></div><span class="subject-count">' + count + ' 道错题</span></div><div class="subject-actions"><button class="btn btn-secondary btn-sm" data-action="edit-subject" data-id="' + subject.id + '">编辑</button><button class="btn btn-danger btn-sm" data-action="delete-subject" data-id="' + subject.id + '">删除</button></div></div>';
    }).join('');
  }

  function updateSubjectSelect() {
    const select = $('subjectSelect');
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="">-- 选择学科 --</option>' + STATE.subjects.map(function (s) {
      return '<option value="' + s.id + '"' + (s.id === currentValue ? ' selected' : '') + '>' + escapeHTML(s.name) + '</option>';
    }).join('');
    updateQuestionTypeSelect();
  }

  function updateQuestionTypeSelect() {
    const typeSelect = $('questionTypeSelect');
    if (!typeSelect) return;
    const subjectId = $('subjectSelect').value;
    const subject = STATE.subjects.find(function (s) { return s.id === subjectId; });
    const types = subject && subject.types ? subject.types : [];
    const currentVal = typeSelect.value;
    if (types.length === 0) {
      typeSelect.innerHTML = '<option value="">-- 先选学科 --</option>';
    } else {
      typeSelect.innerHTML = '<option value="">-- 选择题型 --</option>' + types.map(function (t) {
        return '<option value="' + t + '"' + (t === currentVal ? ' selected' : '') + '>' + t + '</option>';
      }).join('');
    }
  }

  function updateFilterSelect() {
    const select = $('filterSubject');
    if (!select) return;
    const currentValue = select.value;
    select.innerHTML = '<option value="all">全部学科</option>' + STATE.subjects.map(function (s) {
      return '<option value="' + s.id + '"' + (s.id === currentValue ? ' selected' : '') + '>' + escapeHTML(s.name) + '</option>';
    }).join('');
  }

  // ===== 拍照 / 上传 =====
  function handleImageFile(file) {
    if (!file || !file.type || !file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'error'); return;
    }
    stopCamera();
    const reader = new FileReader();
    reader.onload = function (e) {
      STATE.currentImage = e.target.result;
      const img = $('imagePreview');
      if (img) { img.src = e.target.result; img.hidden = false; }
      $('uploadPlaceholder').hidden = true;
      $('cameraPreview').hidden = true;
      $('ocrSection').hidden = false;
      $('ocrResult').hidden = true;
      $('ocrProgress').hidden = true;
      $('saveSection').hidden = true;
    };
    reader.readAsDataURL(file);
  }

  function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('当前浏览器不支持摄像头，请使用选择图片功能', 'error'); return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(function (stream) {
        STATE.cameraStream = stream;
        const video = $('cameraPreview');
        video.srcObject = stream;
        video.hidden = false;
        $('uploadPlaceholder').hidden = true;
        $('imagePreview').hidden = true;
        $('btnTakePhoto').hidden = true;
        $('btnPickFile').hidden = true;
        $('btnRetake').hidden = false;
      })
      .catch(function (err) {
        console.error('摄像头启动失败:', err);
        showToast('无法访问摄像头：' + (err.message || err.name), 'error');
      });
  }

  function capturePhoto() {
    const video = $('cameraPreview');
    const canvas = $('cameraCanvas');
    if (!video.videoWidth) { showToast('摄像头未就绪', 'error'); return; }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    STATE.currentImage = canvas.toDataURL('image/jpeg', 0.9);
    stopCamera();
    $('imagePreview').src = STATE.currentImage;
    $('imagePreview').hidden = false;
    $('uploadPlaceholder').hidden = true;
    $('cameraPreview').hidden = true;
    $('ocrSection').hidden = false;
    $('ocrResult').hidden = true;
    $('ocrProgress').hidden = true;
    $('saveSection').hidden = true;
  }

  function stopCamera() {
    if (STATE.cameraStream) {
      STATE.cameraStream.getTracks().forEach(function (t) { t.stop(); });
      STATE.cameraStream = null;
    }
    const video = $('cameraPreview');
    if (video) { video.srcObject = null; video.hidden = true; }
    $('uploadPlaceholder').hidden = false;
    $('btnTakePhoto').hidden = false;
    $('btnPickFile').hidden = false;
    $('btnRetake').hidden = true;
  }

  function resetUpload() {
    stopCamera();
    STATE.currentImage = null;
    STATE.ocrResult = '';
    $('imagePreview').hidden = true;
    $('uploadPlaceholder').hidden = false;
    $('ocrSection').hidden = true;
    $('saveSection').hidden = true;
    $('ocrResult').hidden = true;
    $('ocrProgress').hidden = true;
    const fi = $('fileInput'); if (fi) fi.value = '';
  }

  // ===== OCR 识别（硅基流动视觉模型） =====
  function startOCR() {
    var apiKey = localStorage.getItem('errorNotebook_siliconflowKey') || localStorage.getItem('errorNotebook_apiKey') || '';
    if (!apiKey) {
      showToast('请先在设置中配置硅基流动 API Key', 'warning');
      $('btnSettings').click();
      return;
    }
    if (!STATE.currentImage) { showToast('请先拍摄或选择图片', 'warning'); return; }

    $('ocrProgress').hidden = false;
    $('ocrResult').hidden = true;
    var btn = $('btnStartOCR'); btn.disabled = true;
    var progressFill = $('progressFill');
    var progressText = $('progressText');
    progressFill.style.width = '30%';
    progressText.textContent = '正在调用 AI 识别文字...';

    // 提取 base64 部分（去掉 data:image/...;base64, 前缀）
    var base64 = STATE.currentImage.split(',')[1] || STATE.currentImage;
    var mime = STATE.currentImage.match(/data:(image\/\w+)/);
    var imageUrl = 'data:' + (mime ? mime[1] : 'image/jpeg') + ';base64,' + base64;

    fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model: 'Pro/Qwen/Qwen2-VL-7B-Instruct',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: '请识别这张图片中的所有文字内容，完整输出，保持原来的段落和换行。如果包含数学公式，请用 LaTeX 格式输出。只输出文字，不要添加任何解释。' },
            { type: 'image_url', image_url: { url: imageUrl } }
          ]
        }],
        max_tokens: 2048,
        temperature: 0.1
      })
    }).then(function (r) {
      progressFill.style.width = '70%';
      progressText.textContent = '正在解析结果...';
      if (!r.ok) throw new Error('API 请求失败: HTTP ' + r.status);
      return r.json();
    }).then(function (data) {
      var text = '';
      if (data.choices && data.choices[0] && data.choices[0].message) {
        text = data.choices[0].message.content || '';
      }
      text = text.trim();
      if (!text) { showToast('未能识别到文字，请确保图片清晰', 'warning'); return; }
      STATE.ocrResult = text;
      $('ocrText').textContent = text;
      $('ocrResult').hidden = false;
      $('saveSection').hidden = false;
      updateSubjectSelect();
      progressFill.style.width = '100%';
      progressText.textContent = '识别完成！';
      showToast('AI 文字识别完成！', 'success');
    }).catch(function (err) {
      console.error('OCR识别失败:', err);
      showToast('OCR识别失败：' + (err.message || '网络错误'), 'error');
    }).then(function () {
      setTimeout(function () { $('ocrProgress').hidden = true; }, 500);
      btn.disabled = false;
    });
  }

  // ===== 保存错题 =====
  function saveError() {
    const subjectId = $('subjectSelect').value;
    const questionType = $('questionTypeSelect').value;
    const ocrText = $('ocrText').textContent.trim();
    if (!ocrText) { showToast('请先输入或确认题目内容', 'warning'); return; }
    STATE.errors.unshift({
      id: 'error_' + Date.now(),
      subjectId: subjectId || null,
      questionType: questionType || null,
      imageData: STATE.currentImage,
      ocrText: ocrText,
      aiAnswer: null,
      createdAt: new Date().toISOString()
    });
    saveErrors();
    resetUpload();
    $('ocrSection').hidden = true;
    $('saveSection').hidden = true;
    renderErrorList();
    updateFilterSelect();
    updateSubjectSelect();
    showToast('错题已保存！', 'success');
  }

  // ===== 错题列表 =====
  function renderErrorList() {
    const container = $('errorList');
    if (!container) return;
    updateFilterSelect();
    const filterSubject = $('filterSubject').value;
    const searchQuery = $('searchInput').value.toLowerCase();
    let filtered = STATE.errors;
    if (filterSubject !== 'all') filtered = filtered.filter(function (e) { return e.subjectId === filterSubject; });
    if (searchQuery) filtered = filtered.filter(function (e) { return e.ocrText.toLowerCase().includes(searchQuery); });

    if (filtered.length === 0) {
      container.innerHTML = '<div class="empty-state"><span class="empty-icon">📝</span><p>' + (STATE.errors.length === 0 ? '还没有错题记录' : '没有找到匹配的错题') + '</p><p class="hint">' + (STATE.errors.length === 0 ? '去「拍照录入」添加你的第一道错题吧！' : '试试调整筛选条件') + '</p></div>';
      return;
    }

    container.innerHTML = filtered.map(function (error) {
      const subject = STATE.subjects.find(function (s) { return s.id === error.subjectId; });
      const subjectName = subject ? subject.name : '未分类';
      const subjectColor = subject ? subject.color : '#9CA3AF';
      const typeTag = error.questionType ? '<span class="type-badge">' + escapeHTML(error.questionType) + '</span>' : '';
      const date = new Date(error.createdAt).toLocaleString('zh-CN');
      return '<div class="error-card"><div class="error-card-header"><input type="checkbox" class="error-checkbox" data-action="toggle-select" data-id="' + error.id + '" data-print="1"><span class="subject-badge" style="background:' + subjectColor + '">📚 ' + escapeHTML(subjectName) + '</span>' + typeTag + '<span class="error-date">' + escapeHTML(date) + '</span></div><div class="error-card-body">' + (error.imageData ? '<img src="' + error.imageData + '" class="error-image" alt="错题图片" loading="lazy">' : '') + '<div class="error-text" data-action="toggle-text">' + escapeHTML(error.ocrText) + '</div>' + (error.aiAnswer ? '<details class="ai-answer-print"><summary>🤖 AI 解答</summary><div class="ai-answer-content">' + formatAIAnswer(error.aiAnswer) + '</div></details>' : '') + '</div><div class="error-card-footer"><button class="btn btn-primary btn-sm" data-action="ask-ai" data-id="' + error.id + '">🤖 AI解答</button><button class="btn btn-danger btn-sm" data-action="delete-error" data-id="' + error.id + '">🗑 删除</button></div></div>';
    }).join('');
  }

  function deleteError(id) {
    if (!confirm('确定删除这道错题吗？')) return;
    STATE.errors = STATE.errors.filter(function (e) { return e.id !== id; });
    saveErrors();
    renderErrorList();
    updateFilterSelect();
    showToast('错题已删除', 'success');
  }

  // ===== 打印功能 =====
  function printSelectedErrors() {
    const checkboxes = $$('.error-checkbox:checked');
    if (checkboxes.length === 0) {
      showToast('请先勾选要打印的错题', 'warning');
      return;
    }
    const selectedIds = checkboxes.map(function (cb) { return cb.dataset.id; });
    const selected = STATE.errors.filter(function (e) { return selectedIds.indexOf(e.id) >= 0; });

    // 构建打印 HTML
    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (!printWin) {
      showToast('浏览器拦截了弹窗，请允许弹窗', 'error');
      return;
    }
    const styleHTML = document.querySelector('link[rel="stylesheet"]').outerHTML;
    const printCSS = `
      <style>
        @page { margin: 1.5cm; size: A4; }
        body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; padding: 20px; color: #1F2937; }
        h1 { text-align: center; color: #4F46E5; border-bottom: 2px solid #4F46E5; padding-bottom: 10px; }
        .meta { text-align: center; color: #6B7280; margin-bottom: 20px; font-size: 14px; }
        .error-item { border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin-bottom: 16px; page-break-inside: avoid; }
        .error-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .subject-tag { background: #4F46E5; color: white; padding: 4px 10px; border-radius: 4px; font-size: 13px; }
        .type-tag { background: #818CF8; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; margin-left: 6px; }
        .date { color: #6B7280; font-size: 13px; }
        .question-num { color: #4F46E5; font-weight: 700; margin-bottom: 8px; }
        .question-text { white-space: pre-wrap; font-size: 15px; line-height: 1.8; margin-bottom: 10px; }
        .question-image { max-width: 100%; max-height: 300px; border-radius: 4px; margin: 8px 0; }
        .ai-answer { background: #F3F4F6; border-left: 3px solid #4F46E5; padding: 12px; margin-top: 12px; border-radius: 4px; font-size: 14px; line-height: 1.7; }
        .ai-answer h3 { color: #4F46E5; font-size: 14px; margin: 8px 0 4px; }
        .answer-line { border-top: 1px dashed #E5E7EB; height: 30px; margin-top: 12px; }
      </style>`;
    const now = new Date().toLocaleString('zh-CN');

    let itemsHTML = selected.map(function (error, idx) {
      const subject = STATE.subjects.find(function (s) { return s.id === error.subjectId; });
      const subjectName = subject ? subject.name : '未分类';
      const typeTag = error.questionType ? '<span class="type-tag">' + escapeHTML(error.questionType) + '</span>' : '';
      const imageHTML = error.imageData ? '<img src="' + error.imageData + '" class="question-image">' : '';
      const answerHTML = error.aiAnswer ? '<div class="ai-answer"><strong>AI 解答：</strong>' + formatAIAnswer(error.aiAnswer) + '</div>' : '<div class="answer-line"></div><div class="answer-line"></div><div class="answer-line"></div>';
      return '<div class="error-item"><div class="error-header"><div><span class="subject-tag">' + escapeHTML(subjectName) + '</span>' + typeTag + '<span class="date">第 ' + (idx + 1) + ' 题 · ' + new Date(error.createdAt).toLocaleDateString('zh-CN') + '</span></div></div><div class="question-num">第 ' + (idx + 1) + ' 题</div>' + imageHTML + '<div class="question-text">' + escapeHTML(error.ocrText) + '</div>' + answerHTML + '</div>';
    }).join('');

    printWin.document.write('<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>错题打印</title>' + styleHTML + printCSS + '</head><body><h1>📓 我的错题本</h1><div class="meta">打印时间：' + now + ' · 共 ' + selected.length + ' 道题</div>' + itemsHTML + '<script>window.onload = function() { setTimeout(function() { window.print(); }, 200); };<\/script></body></html>');
    printWin.document.close();
    showToast('已生成打印预览', 'success');
  }

  function toggleSelectAll() {
    const checkboxes = $$('.error-checkbox');
    const allChecked = checkboxes.every(function (cb) { return cb.checked; });
    checkboxes.forEach(function (cb) { cb.checked = !allChecked; });
    $('btnSelectAll').textContent = allChecked ? '全选' : '取消全选';
  }

  // ===== AI 智能解答 =====
  function renderMarkdown(text) {
    if (!text) return '';
    if (typeof marked !== 'undefined' && marked.parse) {
      try { return marked.parse(text); } catch (e) {}
    }
    return text.replace(/\n/g, '<br>');
  }

  function askAI(errorId) {
    var error = STATE.errors.find(function (e) { return e.id === errorId; });
    if (!error) return;
    $('modalQuestion').innerHTML = renderMarkdown(error.ocrText);
    $('answerContent').hidden = true;
    $('answerError').hidden = true;
    $('answerLoading').hidden = false;
    $('modalOverlay').hidden = false;

    callAI(error.ocrText).then(function (answer) {
      $('answerLoading').hidden = true;
      if (answer) {
        error.aiAnswer = answer;
        saveErrors();
        $('answerContent').innerHTML = formatAIAnswer(answer);
        $('answerContent').hidden = false;
      } else {
        $('answerError').hidden = false;
      }
    }).catch(function (err) {
      console.error('AI解答失败:', err);
      $('answerLoading').hidden = true;
      $('answerError').hidden = false;
    });
  }

  function callAI(question) {
    var provider = localStorage.getItem('errorNotebook_aiProvider') || 'siliconflow';
    var apiKey = localStorage.getItem('errorNotebook_siliconflowKey') || localStorage.getItem('errorNotebook_apiKey') || '';
    var customEndpoint = localStorage.getItem('errorNotebook_customEndpoint') || '';
    var systemPrompt = '你是一位经验丰富的老师。请为学生解答这道错题。请按以下 Markdown 格式回答：\n\n## 正确答案\n给出正确答案\n\n## 解题思路\n详细解释解题步骤和思路\n\n## 知识点\n列出本题涉及的关键知识点\n\n## 易错提醒\n指出学生容易出错的地方\n\n请用中文回答。涉及数学公式请用 LaTeX 语法（如 $x^2$），代码用反引号包裹。';

    // 硅基流动
    if (provider === 'siliconflow') {
      if (!apiKey) return Promise.resolve(generateFallbackAnswer(question));
      return fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({
          model: 'Pro/Qwen/Qwen2-7B-Instruct',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: question }],
          temperature: 0.7,
          max_tokens: 2000
        })
      }).then(function (r) { return r.json(); })
        .then(function (data) { return data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content; })
        .catch(function () { return generateFallbackAnswer(question); });
    }

    // DeepSeek
    if (provider === 'deepseek') {
      if (!apiKey) return Promise.resolve(generateFallbackAnswer(question));
      return fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: question }],
          temperature: 0.7,
          max_tokens: 2000
        })
      }).then(function (r) { return r.json(); })
        .then(function (data) { return data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content; })
        .catch(function () { return generateFallbackAnswer(question); });
    }

    if (provider === 'custom') {
      if (!customEndpoint) return Promise.resolve(generateFallbackAnswer(question));
      return fetch(customEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': apiKey ? 'Bearer ' + apiKey : '' },
        body: JSON.stringify({ messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: question }] })
      }).then(function (r) { return r.json(); })
        .then(function (data) {
          return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
            || data.text || data.response || null;
        })
        .catch(function () { return generateFallbackAnswer(question); });
    }

    // 默认 Pollinations
    return fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: question }],
        model: 'openai',
        temperature: 0.7,
        max_tokens: 2000
      })
    }).then(function (r) { return r.json(); })
      .then(function (data) {
        return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content)
          || data.text || data.response || null;
      })
      .catch(function () { return generateFallbackAnswer(question); });
  }

  function generateFallbackAnswer(question) {
    return '## 温馨提示\n\nAI服务暂时不可用。请尝试：\n\n1. 检查网络连接\n2. 在「设置」中配置硅基流动 API 密钥\n3. 访问 [cloud.siliconflow.cn](https://cloud.siliconflow.cn) 注册并获取密钥\n\n---\n\n**题目内容**\n\n' + question + '\n\n---\n\n**建议**：翻看课本对应章节或与同学讨论。';
  }

  function formatAIAnswer(text) {
    var html = String(text);
    // 1. 用 marked 转 Markdown → HTML
    if (typeof marked !== 'undefined' && marked.parse) {
      try { html = marked.parse(html); } catch (e) { /* 降级 */ }
    } else {
      // 降级：简单换行 + 标题转换
      html = html
        .replace(/## (.+)/g, '<h3>$1</h3>')
        .replace(/\n/g, '<br>');
    }
    // 2. KaTeX 渲染数学公式
    if (typeof renderMathInElement !== 'undefined') {
      setTimeout(function () {
        var el = $('answerContent');
        if (el) {
          try { renderMathInElement(el, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }] }); } catch (e) {}
        }
      }, 50);
    }
    return html;
  }

  // ===== 弹窗控制 =====
  function openSettings() {
    var provider = localStorage.getItem('errorNotebook_aiProvider') || 'siliconflow';
    $('aiProvider').value = provider;
    $('apiKey').value = localStorage.getItem('errorNotebook_siliconflowKey') || localStorage.getItem('errorNotebook_apiKey') || '';
    $('customEndpoint').value = localStorage.getItem('errorNotebook_customEndpoint') || '';
    toggleProviderFields(provider);
    $('settingsOverlay').hidden = false;
  }

  function toggleProviderFields(provider) {
    $('apiKeyGroup').hidden = false;
    $('customEndpointGroup').hidden = (provider !== 'custom');
  }

  function saveSettings() {
    localStorage.setItem('errorNotebook_aiProvider', $('aiProvider').value);
    var apiKey = $('apiKey').value.trim();
    localStorage.setItem('errorNotebook_siliconflowKey', apiKey);
    localStorage.setItem('errorNotebook_apiKey', apiKey);
    localStorage.setItem('errorNotebook_customEndpoint', $('customEndpoint').value.trim());
    $('settingsOverlay').hidden = true;
    showToast('设置已保存', 'success');
  }

  // ===== 初始化（DOMContentLoaded 内执行） =====
  function init() {
    console.log('[ErrorNotebook] 初始化开始');
    loadData();
    renderSubjectList();
    renderErrorList();
    updateSubjectSelect();
    updateFilterSelect();

    // 标签页
    $$('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () { switchTab(btn.dataset.tab); });
    });

    // 拍照 / 上传
    $('btnTakePhoto').addEventListener('click', startCamera);
    $('btnPickFile').addEventListener('click', function () {
      $('fileInput').click();
    });
    $('fileInput').addEventListener('change', function (e) {
      if (e.target.files.length > 0) handleImageFile(e.target.files[0]);
    });
    $('btnRetake').addEventListener('click', resetUpload);

    var uploadArea = $('uploadArea');
    uploadArea.addEventListener('dragover', function (e) { e.preventDefault(); uploadArea.classList.add('drag-over'); });
    uploadArea.addEventListener('dragleave', function () { uploadArea.classList.remove('drag-over'); });
    uploadArea.addEventListener('drop', function (e) {
      e.preventDefault(); uploadArea.classList.remove('drag-over');
      if (e.dataTransfer.files.length > 0) handleImageFile(e.dataTransfer.files[0]);
    });

    // OCR
    $('btnStartOCR').addEventListener('click', startOCR);
    $('btnSaveError').addEventListener('click', saveError);
    // 编辑工具栏
    $('btnClearText').addEventListener('click', function () {
      $('ocrText').textContent = '';
      $('ocrText').focus();
    });
    $('btnConfirmText').addEventListener('click', function () {
      STATE.ocrResult = $('ocrText').textContent.trim();
      showToast('内容已确认 ✓', 'success');
      $('saveSection').hidden = false;
    });
    // 学科切换时联动题型
    $('subjectSelect').addEventListener('change', updateQuestionTypeSelect);

    // 学科管理
    $('btnAddSubject').addEventListener('click', addSubject);
    $('newSubjectName').addEventListener('keypress', function (e) { if (e.key === 'Enter') addSubject(); });

    // 错题筛选
    $('filterSubject').addEventListener('change', renderErrorList);
    $('searchInput').addEventListener('input', renderErrorList);
    $('btnSelectAll').addEventListener('click', toggleSelectAll);
    $('btnPrintSelected').addEventListener('click', printSelectedErrors);

    // ===== 设置弹窗（关键修复：每个按钮都单独绑定） =====
    $('btnSettings').addEventListener('click', openSettings);
    // 深色模式切换
    const btnTheme = $('btnTheme');
    const savedTheme = localStorage.getItem('errorNotebook_theme');
    function applyTheme(t) {
      document.documentElement.dataset.theme = t;
      btnTheme.textContent = t === 'dark' ? '☀️' : '🌙';
    }
    applyTheme(savedTheme || 'auto');
    btnTheme.addEventListener('click', function () {
      const cur = document.documentElement.dataset.theme || 'auto';
      const next = cur === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      localStorage.setItem('errorNotebook_theme', next);
    });
    $('btnCloseSettings').addEventListener('click', function () { $('settingsOverlay').hidden = true; });
    $('settingsOverlay').addEventListener('click', function (e) {
      if (e.target === e.currentTarget) e.currentTarget.hidden = true;
    });
    $('aiProvider').addEventListener('change', function (e) { toggleProviderFields(e.target.value); });
    $('btnSaveSettings').addEventListener('click', saveSettings);

    // ===== AI 弹窗 =====
    $('btnCloseModal').addEventListener('click', function () { $('modalOverlay').hidden = true; });
    $('btnCloseModal2').addEventListener('click', function () { $('modalOverlay').hidden = true; });
    $('modalOverlay').addEventListener('click', function (e) {
      if (e.target === e.currentTarget) e.currentTarget.hidden = true;
    });

    // ===== 事件委托：错题卡片上的按钮 =====
    $('errorList').addEventListener('click', function (e) {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'ask-ai') askAI(id);
      else if (action === 'delete-error') deleteError(id);
      else if (action === 'toggle-text') btn.classList.toggle('expanded');
    });
    $('errorList').addEventListener('click', function (e) {
      if (e.target.dataset && e.target.dataset.action === 'toggle-text') {
        e.target.classList.toggle('expanded');
      }
    });

    // ===== 事件委托：学科管理编辑/删除按钮 =====
    $('subjectList').addEventListener('click', function (e) {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'delete-subject') deleteSubject(btn.dataset.id);
      else if (btn.dataset.action === 'edit-subject') openEditSubject(btn.dataset.id);
    });

    // ===== 编辑学科弹窗 =====
    $('btnCloseEditSubject').addEventListener('click', function () { $('editSubjectOverlay').hidden = true; });
    $('btnCancelEditSubject').addEventListener('click', function () { $('editSubjectOverlay').hidden = true; });
    $('editSubjectOverlay').addEventListener('click', function (e) {
      if (e.target === e.currentTarget) e.currentTarget.hidden = true;
    });
    $('btnSaveEditSubject').addEventListener('click', saveEditSubject);

    // ===== 安装指南弹窗 =====
    $('btnInstallGuide').addEventListener('click', function () { $('installGuideOverlay').hidden = false; });
    $('btnCloseInstallGuide').addEventListener('click', function () { $('installGuideOverlay').hidden = true; });
    $('btnCloseInstallGuide2').addEventListener('click', function () { $('installGuideOverlay').hidden = true; });
    $('installGuideOverlay').addEventListener('click', function (e) {
      if (e.target === e.currentTarget) e.currentTarget.hidden = true;
    });
    $('btnCopyLink').addEventListener('click', function () {
      var link = 'https://5715cd46ea204e47b1bdcbcc5ca7a5bc.app.codebuddy.work';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(function () {
          showToast('链接已复制！粘贴到手机浏览器即可打开', 'success');
        });
      } else {
        // 降级方案
        var ta = document.createElement('textarea');
        ta.value = link;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('链接已复制！粘贴到手机浏览器即可打开', 'success');
      }
    });

    // ===== 初始 Provider 显示 =====
    var provider = localStorage.getItem('errorNotebook_aiProvider') || 'siliconflow';
    $('aiProvider').value = provider;
    $('aiProvider').value = provider;
    toggleProviderFields(provider);

    console.log('[ErrorNotebook] 初始化完成，按钮事件已绑定');
  }

  // ===== 启动 =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
