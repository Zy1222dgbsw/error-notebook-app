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

  function renderSubjectList() {
    const container = $('subjectList');
    if (!container) return;
    if (STATE.subjects.length === 0) {
      container.innerHTML = '<div class="empty-state"><span class="empty-icon">📚</span><p>还没有学科分类</p><p class="hint">在上面创建一个学科开始使用吧！</p></div>';
      return;
    }
    container.innerHTML = STATE.subjects.map(function (subject) {
      const count = STATE.errors.filter(function (e) { return e.subjectId === subject.id; }).length;
      return '<div class="subject-item"><div class="subject-info"><span class="subject-color-dot" style="background:' + subject.color + '"></span><span class="subject-name">' + escapeHTML(subject.name) + '</span><span class="subject-count">' + count + ' 道错题</span></div><div class="subject-actions"><button class="btn btn-danger btn-sm" data-action="delete-subject" data-id="' + subject.id + '">删除</button></div></div>';
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
        $('btnPickFile').textContent = '📸 点击拍摄';
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
    $('btnPickFile').textContent = '📁 选择图片';
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

  // ===== OCR 识别 =====
  let ocrWorker = null;
  let ocrUnavailable = false;

  function startOCR() {
    if (ocrUnavailable) { showToast('OCR 引擎加载失败，请检查网络', 'error'); return; }
    if (typeof Tesseract === 'undefined') { showToast('OCR 引擎尚未加载完成，请稍等', 'warning'); return; }
    if (!STATE.currentImage) { showToast('请先拍摄或选择图片', 'warning'); return; }

    $('ocrProgress').hidden = false;
    $('ocrResult').hidden = true;
    const btn = $('btnStartOCR'); btn.disabled = true;
    const progressFill = $('progressFill');
    const progressText = $('progressText');
    progressFill.style.width = '0%';
    progressText.textContent = '正在准备...';

    const logger = function (m) {
      if (m.status === 'recognizing text') {
        const p = Math.round(m.progress * 100);
        progressFill.style.width = p + '%';
        progressText.textContent = '正在识别文字... ' + p + '%';
      } else if (m.status === 'loading tesseract core') {
        progressText.textContent = '正在加载识别引擎（首次约30MB）...';
      } else if (m.status === 'initializing tesseract') {
        progressText.textContent = '正在初始化中文语言包...';
      } else if (m.status === 'loading language traineddata') {
        progressText.textContent = '正在下载中文语言包...';
      } else if (m.status) {
        progressText.textContent = '处理中: ' + m.status;
      }
    };

    const work = ocrWorker
      ? Promise.resolve(ocrWorker)
      : Tesseract.createWorker('chi_sim+eng', 1, { logger: logger }).then(function (w) {
          ocrWorker = w;
          return w.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.AUTO });
        }).then(function () { return ocrWorker; });

    work.then(function (worker) {
      return worker.recognize(STATE.currentImage);
    }).then(function (result) {
      STATE.ocrResult = (result.data.text || '').trim().replace(/\n{3,}/g, '\n\n').replace(/ {2,}/g, ' ');
      if (!STATE.ocrResult) { showToast('未能识别到文字，请确保图片清晰', 'warning'); return; }
      $('ocrText').textContent = STATE.ocrResult;
      $('ocrResult').hidden = false;
      $('saveSection').hidden = false;
      updateSubjectSelect();
      showToast('文字识别完成！', 'success');
    }).catch(function (err) {
      console.error('OCR识别失败:', err);
      if (ocrWorker) { try { ocrWorker.terminate(); } catch (e) {} ocrWorker = null; }
      showToast('OCR识别失败：' + (err.message || err), 'error');
    }).then(function () {
      $('ocrProgress').hidden = true;
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
      return '<div class="error-card"><div class="error-card-header"><span class="subject-badge" style="background:' + subjectColor + '">📚 ' + escapeHTML(subjectName) + '</span>' + typeTag + '<span class="error-date">' + escapeHTML(date) + '</span></div><div class="error-card-body">' + (error.imageData ? '<img src="' + error.imageData + '" class="error-image" alt="错题图片" loading="lazy">' : '') + '<div class="error-text" data-action="toggle-text">' + escapeHTML(error.ocrText) + '</div></div><div class="error-card-footer"><button class="btn btn-primary btn-sm" data-action="ask-ai" data-id="' + error.id + '">🤖 AI解答</button><button class="btn btn-danger btn-sm" data-action="delete-error" data-id="' + error.id + '">🗑 删除</button></div></div>';
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

  // ===== AI 智能解答 =====
  function askAI(errorId) {
    const error = STATE.errors.find(function (e) { return e.id === errorId; });
    if (!error) return;
    $('modalQuestion').textContent = error.ocrText;
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
    const provider = localStorage.getItem('errorNotebook_aiProvider') || 'pollinations';
    const apiKey = localStorage.getItem('errorNotebook_apiKey') || '';
    const customEndpoint = localStorage.getItem('errorNotebook_customEndpoint') || '';
    const systemPrompt = '你是一位经验丰富的老师。请为学生解答这道错题。请按以下格式回答：\n1. 【正确答案】给出正确答案\n2. 【解题思路】详细解释解题步骤和思路\n3. 【知识点】列出本题涉及的关键知识点\n4. 【易错提醒】指出学生容易出错的地方\n请用中文回答。';

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
    return '【温馨提示】\nAI服务暂时不可用。请尝试：\n1. 检查网络连接\n2. 在「设置」中配置 DeepSeek API 密钥\n\n【题目内容】\n' + question + '\n\n【建议】翻看课本对应章节或与同学讨论。';
  }

  function formatAIAnswer(text) {
    return String(text)
      .replace(/【(.+?)】/g, '<h3>【$1】</h3>')
      .replace(/\n/g, '<br>')
      .replace(/(\d+)\.\s/g, '<br>$1. ');
  }

  // ===== 弹窗控制 =====
  function openSettings() {
    const provider = localStorage.getItem('errorNotebook_aiProvider') || 'pollinations';
    $('aiProvider').value = provider;
    $('apiKey').value = localStorage.getItem('errorNotebook_apiKey') || '';
    $('customEndpoint').value = localStorage.getItem('errorNotebook_customEndpoint') || '';
    toggleProviderFields(provider);
    $('settingsOverlay').hidden = false;
  }

  function toggleProviderFields(provider) {
    $('apiKeyGroup').hidden = (provider === 'pollinations');
    $('customEndpointGroup').hidden = (provider !== 'custom');
  }

  function saveSettings() {
    localStorage.setItem('errorNotebook_aiProvider', $('aiProvider').value);
    localStorage.setItem('errorNotebook_apiKey', $('apiKey').value.trim());
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

    // ===== 事件委托：学科管理删除按钮 =====
    $('subjectList').addEventListener('click', function (e) {
      const btn = e.target.closest('button[data-action="delete-subject"]');
      if (btn) deleteSubject(btn.dataset.id);
    });

    // ===== 初始 Provider 显示 =====
    const provider = localStorage.getItem('errorNotebook_aiProvider') || 'pollinations';
    $('aiProvider').value = provider;
    toggleProviderFields(provider);

    console.log('[ErrorNotebook] 初始化完成，按钮事件已绑定');

  // 注册 Service Worker（PWA 离线支持）
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(function (reg) {
      console.log('[SW] 注册成功:', reg.scope);
    }).catch(function (err) {
      console.log('[SW] 注册失败:', err);
    });
  }
  }

  // ===== 启动 =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
