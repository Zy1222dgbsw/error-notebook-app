/* ============================================================
   智能错题本 - Smart Error Notebook
   核心功能：拍照OCR识别 + AI解答 + 学科分类管理
   ============================================================ */

// ===== 全局状态管理 =====
const STATE = {
  subjects: [],           // 学科列表
  errors: [],             // 错题列表
  currentImage: null,     // 当前拍摄/上传的图片 (dataURL)
  ocrResult: '',          // OCR识别结果
  cameraStream: null,     // 摄像头流
  currentTab: 'scan'      // 当前标签页
};

const DEFAULT_SUBJECTS = [
  { id: 'math', name: '数学', color: '#4F46E5' },
  { id: 'english', name: '英语', color: '#10B981' },
  { id: 'physics', name: '物理', color: '#F59E0B' },
  { id: 'chemistry', name: '化学', color: '#EF4444' }
];

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initTabNavigation();
  initUploadHandlers();
  initOCR();
  initSubjectManager();
  initErrorNotebook();
  initSettings();
  initModalControls();
  renderAll();

  // 延迟绑定保存按钮
  const saveBtn = document.getElementById('btnSaveError');
  if (saveBtn) saveBtn.addEventListener('click', saveError);
});

// ===== 数据持久化 =====
function loadData() {
  try {
    const savedSubjects = localStorage.getItem('errorNotebook_subjects');
    const savedErrors = localStorage.getItem('errorNotebook_errors');

    if (savedSubjects) {
      STATE.subjects = JSON.parse(savedSubjects);
    } else {
      STATE.subjects = [...DEFAULT_SUBJECTS];
      saveSubjects();
    }

    if (savedErrors) {
      STATE.errors = JSON.parse(savedErrors);
    }
  } catch (e) {
    console.error('数据加载失败:', e);
    STATE.subjects = [...DEFAULT_SUBJECTS];
    STATE.errors = [];
  }
}

function saveSubjects() {
  localStorage.setItem('errorNotebook_subjects', JSON.stringify(STATE.subjects));
}

function saveErrors() {
  localStorage.setItem('errorNotebook_errors', JSON.stringify(STATE.errors));
}

// ===== Toast 通知 =====
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ===== 标签切换 =====
function initTabNavigation() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });
}

function switchTab(tab) {
  STATE.currentTab = tab;

  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`panel-${tab}`).classList.add('active');

  if (tab === 'notebook') renderErrorList();
  if (tab === 'subjects') renderSubjectList();
  if (tab === 'scan') updateSubjectSelect();
}

// ===== 上传处理 =====
function initUploadHandlers() {
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');

  // 点击拍照
  document.getElementById('btnTakePhoto').addEventListener('click', () => {
    startCamera();
  });

  // 选择文件
  document.getElementById('btnPickFile').addEventListener('click', () => {
    fileInput.click();
  });

  // 文件选择
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleImageFile(e.target.files[0]);
    }
  });

  // 重新拍摄
  document.getElementById('btnRetake').addEventListener('click', () => {
    resetUpload();
  });

  // 拖拽上传
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });

  uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
  });

  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    if (e.dataTransfer.files.length > 0) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  });

  // 点击上传区域
  uploadArea.addEventListener('click', (e) => {
    if (e.target === uploadArea || e.target.closest('.upload-placeholder')) {
      fileInput.click();
    }
  });
}

function handleImageFile(file) {
  if (!file.type.startsWith('image/')) {
    showToast('请选择图片文件', 'error');
    return;
  }

  stopCamera();

  const reader = new FileReader();
  reader.onload = (e) => {
    STATE.currentImage = e.target.result;
    showImagePreview(e.target.result);
    showOCRButton();
  };
  reader.readAsDataURL(file);
}

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    STATE.cameraStream = stream;

    const video = document.getElementById('cameraPreview');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');

    video.srcObject = stream;
    video.hidden = false;
    uploadPlaceholder.hidden = true;
    document.getElementById('imagePreview').hidden = true;

    document.getElementById('btnTakePhoto').hidden = true;
    document.getElementById('btnPickFile').textContent = '📸 点击拍摄';
    document.getElementById('btnPickFile').onclick = capturePhoto;
    document.getElementById('btnRetake').hidden = false;
  } catch (err) {
    console.error('摄像头启动失败:', err);
    showToast('无法访问摄像头，请检查权限设置', 'error');
  }
}

function capturePhoto() {
  const video = document.getElementById('cameraPreview');
  const canvas = document.getElementById('cameraCanvas');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);

  STATE.currentImage = canvas.toDataURL('image/jpeg', 0.9);
  stopCamera();
  showImagePreview(STATE.currentImage);
  showOCRButton();
}

function stopCamera() {
  if (STATE.cameraStream) {
    STATE.cameraStream.getTracks().forEach(track => track.stop());
    STATE.cameraStream = null;
  }

  document.getElementById('cameraPreview').hidden = true;
  document.getElementById('cameraPreview').srcObject = null;
  document.getElementById('uploadPlaceholder').hidden = false;
  document.getElementById('btnTakePhoto').hidden = false;
  document.getElementById('btnPickFile').textContent = '📁 选择图片';
  document.getElementById('btnPickFile').onclick = () => document.getElementById('fileInput').click();
  document.getElementById('btnRetake').hidden = true;
}

function showImagePreview(dataURL) {
  const img = document.getElementById('imagePreview');
  img.src = dataURL;
  img.hidden = false;
  document.getElementById('uploadPlaceholder').hidden = true;
  document.getElementById('cameraPreview').hidden = true;
}

function resetUpload() {
  stopCamera();
  STATE.currentImage = null;
  STATE.ocrResult = '';

  document.getElementById('imagePreview').hidden = true;
  document.getElementById('uploadPlaceholder').hidden = false;
  document.getElementById('ocrSection').hidden = true;
  document.getElementById('saveSection').hidden = true;
  document.getElementById('ocrResult').hidden = true;
  document.getElementById('ocrProgress').hidden = true;
  document.getElementById('fileInput').value = '';
}

function showOCRButton() {
  document.getElementById('ocrSection').hidden = false;
  document.getElementById('ocrResult').hidden = true;
  document.getElementById('ocrProgress').hidden = true;
  document.getElementById('saveSection').hidden = true;
}

// ===== OCR 文字识别 (Tesseract.js) =====
let ocrWorker = null;

function initOCR() {
  document.getElementById('btnStartOCR').addEventListener('click', startOCR);
}

async function startOCR() {
  // 检查 Tesseract 是否加载成功
  if (typeof Tesseract === 'undefined' || window.TESSERACT_UNAVAILABLE) {
    showToast('OCR 引擎加载失败，请检查网络后刷新页面重试', 'error');
    return;
  }

  if (!STATE.currentImage) {
    showToast('请先拍摄或选择图片', 'warning');
    return;
  }

  const progressDiv = document.getElementById('ocrProgress');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  progressDiv.hidden = false;
  document.getElementById('ocrResult').hidden = true;
  document.getElementById('btnStartOCR').disabled = true;

  try {
    // 复用 Worker 实例，避免重复加载语言包（首次加载约30MB）
    if (!ocrWorker) {
      ocrWorker = await Tesseract.createWorker('chi_sim+eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            progressFill.style.width = progress + '%';
            progressText.textContent = `正在识别文字... ${progress}%`;
          } else if (m.status === 'loading tesseract core') {
            progressText.textContent = '正在加载识别引擎（首次可能较慢）...';
          } else if (m.status === 'initializing tesseract') {
            progressText.textContent = '正在初始化中文语言包...';
          } else {
            progressText.textContent = '正在准备识别...';
          }
        }
      });

      // 设置页面分割模式为自动，提升复杂排版识别率
      await ocrWorker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
      });
    }

    const { data } = await ocrWorker.recognize(STATE.currentImage);
    // 不 terminate，保留 worker 复用

    STATE.ocrResult = data.text.trim();
    // 清理多余空白字符
    STATE.ocrResult = STATE.ocrResult.replace(/\n{3,}/g, '\n\n').replace(/ {2,}/g, ' ');

    if (!STATE.ocrResult) {
      showToast('未能识别到文字，请确保图片清晰且包含文字', 'warning');
      progressDiv.hidden = true;
      document.getElementById('btnStartOCR').disabled = false;
      return;
    }

    document.getElementById('ocrText').textContent = STATE.ocrResult;
    document.getElementById('ocrResult').hidden = false;
    document.getElementById('saveSection').hidden = false;
    updateSubjectSelect();

    showToast('文字识别完成！', 'success');
  } catch (err) {
    console.error('OCR识别失败:', err);
    // 释放异常 worker，下次重新创建
    if (ocrWorker) {
      try { await ocrWorker.terminate(); } catch (e) {}
      ocrWorker = null;
    }
    showToast('OCR识别失败，请确保图片清晰后重试', 'error');
  } finally {
    progressDiv.hidden = true;
    document.getElementById('btnStartOCR').disabled = false;
  }
}

// ===== 学科管理 =====
function initSubjectManager() {
  document.getElementById('btnAddSubject').addEventListener('click', addSubject);
  document.getElementById('newSubjectName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addSubject();
  });
}

function addSubject() {
  const nameInput = document.getElementById('newSubjectName');
  const colorInput = document.getElementById('newSubjectColor');
  const name = nameInput.value.trim();

  if (!name) {
    showToast('请输入学科名称', 'warning');
    return;
  }

  const id = 'subject_' + Date.now();
  STATE.subjects.push({
    id,
    name,
    color: colorInput.value
  });

  saveSubjects();
  nameInput.value = '';
  renderSubjectList();
  updateSubjectSelect();
  updateFilterSelect();
  showToast(`学科「${name}」已添加`, 'success');
}

function deleteSubject(id) {
  const subject = STATE.subjects.find(s => s.id === id);
  if (!subject) return;

  // 检查是否有关联错题
  const relatedErrors = STATE.errors.filter(e => e.subjectId === id);
  if (relatedErrors.length > 0) {
    const confirmed = confirm(
      `学科「${subject.name}」下有 ${relatedErrors.length} 道错题，删除学科后这些错题将变为"未分类"。确定删除吗？`
    );
    if (!confirmed) return;

    // 将关联错题设为无分类
    STATE.errors.forEach(e => {
      if (e.subjectId === id) e.subjectId = null;
    });
    saveErrors();
  }

  STATE.subjects = STATE.subjects.filter(s => s.id !== id);
  saveSubjects();
  renderSubjectList();
  updateSubjectSelect();
  updateFilterSelect();
  showToast(`学科「${subject.name}」已删除`, 'success');
}

function renderSubjectList() {
  const container = document.getElementById('subjectList');

  if (STATE.subjects.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📚</span>
        <p>还没有学科分类</p>
        <p class="hint">在上面创建一个学科开始使用吧！</p>
      </div>`;
    return;
  }

  container.innerHTML = STATE.subjects.map(subject => {
    const count = STATE.errors.filter(e => e.subjectId === subject.id).length;
    return `
      <div class="subject-item">
        <div class="subject-info">
          <span class="subject-color-dot" style="background: ${subject.color}"></span>
          <span class="subject-name">${escapeHTML(subject.name)}</span>
          <span class="subject-count">${count} 道错题</span>
        </div>
        <div class="subject-actions">
          <button class="btn btn-danger btn-sm" onclick="deleteSubject('${subject.id}')">删除</button>
        </div>
      </div>`;
  }).join('');
}

function updateSubjectSelect() {
  const select = document.getElementById('subjectSelect');
  const currentValue = select.value;

  select.innerHTML = '<option value="">-- 请选择学科 --</option>' +
    STATE.subjects.map(s =>
      `<option value="${s.id}" ${s.id === currentValue ? 'selected' : ''}>${s.name}</option>`
    ).join('');
}

function updateFilterSelect() {
  const select = document.getElementById('filterSubject');
  const currentValue = select.value;

  select.innerHTML = '<option value="all">全部学科</option>' +
    STATE.subjects.map(s =>
      `<option value="${s.id}" ${s.id === currentValue ? 'selected' : ''}>${s.name}</option>`
    ).join('');
}

// ===== 保存错题 =====
function saveError() {
  const subjectId = document.getElementById('subjectSelect').value;
  const ocrText = document.getElementById('ocrText').textContent.trim();

  if (!ocrText) {
    showToast('请先识别或输入题目内容', 'warning');
    return;
  }

  const error = {
    id: 'error_' + Date.now(),
    subjectId: subjectId || null,
    imageData: STATE.currentImage,
    ocrText: ocrText,
    aiAnswer: null,
    createdAt: new Date().toISOString()
  };

  STATE.errors.unshift(error);
  saveErrors();

  // 重置界面
  resetUpload();
  document.getElementById('ocrSection').hidden = true;
  document.getElementById('saveSection').hidden = true;

  renderErrorList();
  updateFilterSelect();
  updateSubjectSelect();
  showToast('错题已保存！', 'success');
}

// ===== 错题本 =====
function initErrorNotebook() {
  document.getElementById('filterSubject').addEventListener('change', renderErrorList);
  document.getElementById('searchInput').addEventListener('input', renderErrorList);
}

function renderErrorList() {
  const container = document.getElementById('errorList');
  const filterSubject = document.getElementById('filterSubject').value;
  const searchQuery = document.getElementById('searchInput').value.toLowerCase();

  updateFilterSelect();

  let filtered = STATE.errors;

  if (filterSubject !== 'all') {
    filtered = filtered.filter(e => e.subjectId === filterSubject);
  }

  if (searchQuery) {
    filtered = filtered.filter(e => e.ocrText.toLowerCase().includes(searchQuery));
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📝</span>
        <p>${STATE.errors.length === 0 ? '还没有错题记录' : '没有找到匹配的错题'}</p>
        <p class="hint">${STATE.errors.length === 0 ? '去「拍照录入」添加你的第一道错题吧！' : '试试调整筛选条件'}</p>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(error => {
    const subject = STATE.subjects.find(s => s.id === error.subjectId);
    const subjectName = subject ? subject.name : '未分类';
    const subjectColor = subject ? subject.color : '#9CA3AF';
    const date = new Date(error.createdAt).toLocaleDateString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return `
      <div class="error-card">
        <div class="error-card-header">
          <span class="subject-badge" style="background: ${subjectColor}">
            📚 ${escapeHTML(subjectName)}
          </span>
          <span class="error-date">${date}</span>
        </div>
        <div class="error-card-body">
          ${error.imageData ? `<img src="${error.imageData}" class="error-image" alt="错题图片" loading="lazy">` : ''}
          <div class="error-text" onclick="this.classList.toggle('expanded')">
            ${escapeHTML(error.ocrText)}
          </div>
        </div>
        <div class="error-card-footer">
          <button class="btn btn-primary btn-sm" onclick="askAI('${error.id}')">🤖 AI解答</button>
          <button class="btn btn-danger btn-sm" onclick="deleteError('${error.id}')">🗑 删除</button>
        </div>
      </div>`;
  }).join('');
}

function deleteError(id) {
  if (!confirm('确定删除这道错题吗？')) return;
  STATE.errors = STATE.errors.filter(e => e.id !== id);
  saveErrors();
  renderErrorList();
  updateFilterSelect();
  showToast('错题已删除', 'success');
}

// ===== AI 智能解答 =====
function askAI(errorId) {
  const error = STATE.errors.find(e => e.id === errorId);
  if (!error) return;

  // 显示弹窗
  const overlay = document.getElementById('modalOverlay');
  const questionEl = document.getElementById('modalQuestion');
  const answerContent = document.getElementById('answerContent');
  const answerLoading = document.getElementById('answerLoading');
  const answerError = document.getElementById('answerError');

  questionEl.textContent = error.ocrText;
  answerContent.hidden = true;
  answerError.hidden = true;
  answerLoading.hidden = false;
  overlay.hidden = false;

  // 调用AI接口
  callAI(error.ocrText)
    .then(answer => {
      answerLoading.hidden = true;

      if (answer) {
        // 保存AI答案到错题
        error.aiAnswer = answer;
        saveErrors();

        // 格式化显示
        answerContent.innerHTML = formatAIAnswer(answer);
        answerContent.hidden = false;
      } else {
        answerContent.hidden = true;
        answerError.hidden = false;
      }
    })
    .catch(err => {
      console.error('AI解答失败:', err);
      answerLoading.hidden = true;
      answerContent.hidden = true;
      answerError.hidden = false;
    });
}

async function callAI(question, retryCount = 0) {
  const provider = localStorage.getItem('errorNotebook_aiProvider') || 'pollinations';
  const apiKey = localStorage.getItem('errorNotebook_apiKey') || '';
  const customEndpoint = localStorage.getItem('errorNotebook_customEndpoint') || '';
  const MAX_RETRIES = 2;

  const systemPrompt = `你是一位经验丰富的老师。请为学生解答这道错题。请按以下格式回答：

1. 【正确答案】给出正确答案
2. 【解题思路】详细解释解题步骤和思路
3. 【知识点】列出本题涉及的关键知识点
4. 【易错提醒】指出学生容易出错的地方

请用中文回答。`;

  if (provider === 'pollinations') {
    // 免费的 Pollinations AI，无需 API Key
    // 使用 AbortController 实现超时控制
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question }
          ],
          model: 'openai',
          temperature: 0.7,
          max_tokens: 2000
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('API 返回错误: ' + response.status);

      const data = await response.json();
      return data.choices ? data.choices[0].message.content : (data.text || data.response || JSON.stringify(data));
    } catch (err) {
      console.error('Pollinations AI 调用失败:', err.message);
      // 重试一次
      if (retryCount < MAX_RETRIES) {
        console.log('正在重试... (' + (retryCount + 1) + '/' + MAX_RETRIES + ')');
        return callAI(question, retryCount + 1);
      }
      return generateFallbackAnswer(question);
    }
  }

  if (provider === 'deepseek') {
    if (!apiKey) throw new Error('请先配置DeepSeek API密钥');

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) throw new Error('DeepSeek API请求失败');

    const data = await response.json();
    return data.choices[0].message.content;
  }

  if (provider === 'custom') {
    if (!customEndpoint) throw new Error('请先配置自定义API接口地址');

    const response = await fetch(customEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': `Bearer ${apiKey}` } : {})
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ]
      })
    });

    if (!response.ok) throw new Error('自定义API请求失败');

    const data = await response.json();
    return data.choices ? data.choices[0].message.content : (data.text || data.response || JSON.stringify(data));
  }

  throw new Error('未配置AI服务');
}

function generateFallbackAnswer(question) {
  // 当AI API不可用时的本地备用方案
  return `【温馨提示】
AI服务暂时不可用。以下是手动分析建议：

【题目内容】
${question}

【建议操作】
1. 请检查网络连接是否正常
2. 在「设置」中配置可用的AI API密钥（如DeepSeek）
3. 或手动查找本题的参考解答

【自学提示】
- 尝试回忆老师在课堂上讲过的相关知识点
- 翻看课本对应章节的例题
- 与同学讨论，集思广益

💡 提示：配置API密钥后可以获得更详细的智能解答。`;
}

function formatAIAnswer(text) {
  // 将AI返回的文本格式化为HTML
  return text
    .replace(/【(.+?)】/g, '<h3>【$1】</h3>')
    .replace(/\n/g, '<br>')
    .replace(/(\d+)\.\s/g, '<br>$1. ');
}

// ===== 弹窗控制 =====
function initModalControls() {
  // 关闭AI解答弹窗
  document.querySelectorAll('#btnCloseModal, #btnCloseModal2').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('modalOverlay').hidden = true;
    });
  });

  // 点击遮罩关闭
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.hidden = true;
  });

  // 设置弹窗
  document.getElementById('btnSettings').addEventListener('click', openSettings);
  document.getElementById('btnCloseSettings').addEventListener('click', () => {
    document.getElementById('settingsOverlay').hidden = true;
  });
  document.getElementById('settingsOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.hidden = true;
  });
}

// ===== 设置管理 =====
function initSettings() {
  document.getElementById('btnSaveSettings').addEventListener('click', saveSettings);

  const provider = localStorage.getItem('errorNotebook_aiProvider') || 'pollinations';
  document.getElementById('aiProvider').value = provider;
  toggleProviderFields(provider);

  document.getElementById('aiProvider').addEventListener('change', (e) => {
    toggleProviderFields(e.target.value);
  });
}

function toggleProviderFields(provider) {
  document.getElementById('apiKeyGroup').hidden = (provider === 'pollinations');
  document.getElementById('customEndpointGroup').hidden = (provider !== 'custom');
}

function openSettings() {
  const provider = localStorage.getItem('errorNotebook_aiProvider') || 'pollinations';
  const apiKey = localStorage.getItem('errorNotebook_apiKey') || '';
  const customEndpoint = localStorage.getItem('errorNotebook_customEndpoint') || '';

  document.getElementById('aiProvider').value = provider;
  document.getElementById('apiKey').value = apiKey;
  document.getElementById('customEndpoint').value = customEndpoint;
  toggleProviderFields(provider);

  document.getElementById('settingsOverlay').hidden = false;
}

function saveSettings() {
  const provider = document.getElementById('aiProvider').value;
  const apiKey = document.getElementById('apiKey').value.trim();
  const customEndpoint = document.getElementById('customEndpoint').value.trim();

  localStorage.setItem('errorNotebook_aiProvider', provider);
  localStorage.setItem('errorNotebook_apiKey', apiKey);
  localStorage.setItem('errorNotebook_customEndpoint', customEndpoint);

  document.getElementById('settingsOverlay').hidden = true;
  showToast('设置已保存', 'success');
}

// ===== 全局渲染 =====
function renderAll() {
  updateSubjectSelect();
  updateFilterSelect();
  renderSubjectList();
  renderErrorList();
}

// ===== 工具函数 =====
function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
