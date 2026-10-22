/**
 * ContextTrace AI — Production Frontend Controller
 * Directs grounded RAG synthesis, interactive citations, document lifecycle, and forensic audit inspection.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Application State ---
    const state = {
        tenantId: localStorage.getItem('contexttrace_tenant') || 'default',
        apiKey: sessionStorage.getItem('contexttrace_apikey') || '',
        activeTab: 'askView',
        attachedDoc: null,
        theme: document.documentElement.getAttribute('data-theme') || localStorage.getItem('contexttrace_theme') || 'light'
    };

    // --- DOM Elements ---
    const tenantInput = document.getElementById('tenantInput');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const systemStatusBadge = document.getElementById('systemStatusBadge');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const toastContainer = document.getElementById('toastContainer');

    // Tab 1 Elements
    const askForm = document.getElementById('askForm');
    const questionInput = document.getElementById('questionInput');
    const submitQuestionBtn = document.getElementById('submitQuestionBtn');
    const clearQuestionBtn = document.getElementById('clearQuestionBtn');
    const quickQueryChips = document.getElementById('quickQueryChips');
    const answerEmptyState = document.getElementById('answerEmptyState');
    const answerLoadingState = document.getElementById('answerLoadingState');
    const abstentionBanner = document.getElementById('abstentionBanner');
    const abstentionReason = document.getElementById('abstentionReason');
    const answerDisplay = document.getElementById('answerDisplay');
    const answerText = document.getElementById('answerText');
    const copyAnswerBtn = document.getElementById('copyAnswerBtn');
    const sourcesList = document.getElementById('sourcesList');
    const sourceCountBadge = document.getElementById('sourceCountBadge');
    const verifiedStatusBadge = document.getElementById('verifiedStatusBadge');
    const answerModelTag = document.getElementById('answerModelTag');
    const answerLatencyTag = document.getElementById('answerLatencyTag');
    const answerRequestId = document.getElementById('answerRequestId');
    const answerPromptVersion = document.getElementById('answerPromptVersion');
    const answerVerificationOutcome = document.getElementById('answerVerificationOutcome');

    // File Upload Elements
    const askUploadDropzone = document.getElementById('askUploadDropzone');
    const askFileInput = document.getElementById('askFileInput');
    const attachedDocPill = document.getElementById('attachedDocPill');
    const attachedDocTitle = document.getElementById('attachedDocTitle');
    const attachedDocMeta = document.getElementById('attachedDocMeta');
    const detachDocBtn = document.getElementById('detachDocBtn');

    // Tab 2 Elements
    const kbUploadDropzone = document.getElementById('kbUploadDropzone');
    const kbFileInput = document.getElementById('kbFileInput');
    const docIngestForm = document.getElementById('docIngestForm');
    const docTitle = document.getElementById('docTitle');
    const docCategory = document.getElementById('docCategory');
    const docTags = document.getElementById('docTags');
    const docContent = document.getElementById('docContent');
    const titleCharCount = document.getElementById('titleCharCount');
    const contentCharCount = document.getElementById('contentCharCount');
    const docCountBadge = document.getElementById('docCountBadge');
    const docListTenantDisplay = document.getElementById('docListTenantDisplay');
    const refreshDocsBtn = document.getElementById('refreshDocsBtn');
    const docsTableBody = document.getElementById('docsTableBody');

    // Tab 3 Elements
    const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');
    const historyTableBody = document.getElementById('historyTableBody');
    const traceModal = document.getElementById('traceModal');
    const modalBody = document.getElementById('modalBody');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const closeModalFooterBtn = document.getElementById('closeModalFooterBtn');

    // --- State Initialization ---
    tenantInput.value = state.tenantId;
    apiKeyInput.value = state.apiKey;
    if (docListTenantDisplay) docListTenantDisplay.textContent = state.tenantId;

    // --- Theme Controller (Light / Dark) ---
    function applyTheme(newTheme) {
        state.theme = newTheme;
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('contexttrace_theme', newTheme);
        if (themeToggleBtn) {
            themeToggleBtn.setAttribute('aria-label', `Current theme: ${newTheme}. Click to switch.`);
        }
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
            applyTheme(nextTheme);
        });
    }

    // --- API Helper Function (Critical Contract) ---
    async function apiFetch(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            'X-Tenant-Id': state.tenantId,
            ...(options.headers || {})
        };

        if (state.apiKey && state.apiKey.trim()) {
            headers['X-API-Key'] = state.apiKey.trim();
        }

        const res = await fetch(endpoint, {
            ...options,
            headers
        });

        const contentType = res.headers.get('content-type') || '';
        let data = null;
        if (contentType.includes('application/json')) {
            data = await res.json();
        } else {
            data = { text: await res.text() };
        }

        const requestId = res.headers.get('x-request-id') || data?.details?.requestId || 'N/A';

        if (!res.ok) {
            const errorMsg = data?.error || res.statusText || 'Unknown network error';
            const error = new Error(errorMsg);
            error.status = res.status;
            error.details = data?.details;
            error.requestId = requestId;
            throw error;
        }

        return { data, res, requestId };
    }

    // --- Notification Toast Helper ---
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.25s ease';
            setTimeout(() => toast.remove(), 250);
        }, 3800);
    }

    // --- System Health Verification ---
    async function checkSystemHealth() {
        try {
            const { data } = await apiFetch('/api/health');
            systemStatusBadge.querySelector('.status-dot').className = 'status-dot online';
            systemStatusBadge.querySelector('.status-text').textContent = 'API Connected';
        } catch (err) {
            systemStatusBadge.querySelector('.status-dot').className = 'status-dot offline';
            systemStatusBadge.querySelector('.status-text').textContent = 'Offline';
        }
    }

    // --- Header Inputs Event Listeners ---
    tenantInput.addEventListener('change', () => {
        state.tenantId = tenantInput.value.trim() || 'default';
        localStorage.setItem('contexttrace_tenant', state.tenantId);
        if (docListTenantDisplay) docListTenantDisplay.textContent = state.tenantId;
        showToast(`Tenant scope switched to: ${state.tenantId}`, 'info');
        loadDocuments();
        loadHistory();
    });

    apiKeyInput.addEventListener('change', () => {
        state.apiKey = apiKeyInput.value.trim();
        sessionStorage.setItem('contexttrace_apikey', state.apiKey);
        showToast('API Key updated for requests', 'info');
    });

    // --- Tab Navigation Switching ---
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetPaneId = tab.getAttribute('data-tab');
            navTabs.forEach(t => t.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(targetPaneId).classList.add('active');
            state.activeTab = targetPaneId;

            if (targetPaneId === 'docsView') loadDocuments();
            if (targetPaneId === 'historyView') loadHistory();
        });
    });

    // --- Char Counters for Ingestion Form ---
    if (docTitle && titleCharCount) {
        docTitle.addEventListener('input', () => {
            titleCharCount.textContent = `${docTitle.value.length}/250`;
        });
    }

    if (docContent && contentCharCount) {
        docContent.addEventListener('input', () => {
            contentCharCount.textContent = `${docContent.value.length.toLocaleString()}/100,000`;
        });
    }

    // --- Keyboard Shortcuts ---
    if (questionInput) {
        questionInput.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                submitQuestion();
            }
        });
    }

    // --- Copy Answer Action ---
    if (copyAnswerBtn) {
        copyAnswerBtn.addEventListener('click', async () => {
            const textToCopy = answerText.innerText || answerText.textContent;
            if (!textToCopy) return;

            try {
                await navigator.clipboard.writeText(textToCopy);
                const originalHtml = copyAnswerBtn.innerHTML;
                copyAnswerBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="20 6 9 17 4 12"/>
                    </svg> Copied!
                `;
                setTimeout(() => {
                    copyAnswerBtn.innerHTML = originalHtml;
                }, 2000);
                showToast('Answer copied to clipboard', 'info');
            } catch (err) {
                showToast('Failed to copy text', 'error');
            }
        });
    }

    // --- TAB 1: ASK & VERIFY WORKSPACE ---
    // Target Document Upload & Attachment (Scoped Q&A)
    async function uploadAndAttachDocument(file) {
        if (!file) return;

        showToast(`Uploading and extracting "${file.name}"...`, 'info');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('isEphemeral', 'true'); // 24h retention to preserve 512MB free tier

        const headers = {
            'X-Tenant-Id': state.tenantId
        };
        if (state.apiKey && state.apiKey.trim()) {
            headers['X-API-Key'] = state.apiKey.trim();
        }

        try {
            const res = await fetch('/api/content/upload', {
                method: 'POST',
                headers,
                body: formData
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to upload document');
            }

            state.attachedDoc = data;
            attachedDocTitle.textContent = data.title;
            const hashPreview = data.contentHash ? data.contentHash.substring(0, 8) : 'N/A';
            attachedDocMeta.textContent = `v${data.version || 1} • SHA: ${hashPreview} • 24h Session`;
            attachedDocPill.style.display = 'flex';
            askUploadDropzone.style.display = 'none';

            showToast(`Document "${data.title}" ready! You can now ask questions about it.`, 'success');
            loadDocuments(); // Refresh knowledge base table
        } catch (err) {
            showToast(`Upload failed: ${err.message}`, 'error');
        } finally {
            if (askFileInput) askFileInput.value = '';
        }
    }

    if (detachDocBtn) {
        detachDocBtn.addEventListener('click', () => {
            state.attachedDoc = null;
            attachedDocPill.style.display = 'none';
            askUploadDropzone.style.display = 'block';
            showToast('Document detached. Questions will now search the entire knowledge base.', 'info');
        });
    }

    // Drag-and-drop helper
    function setupDropzone(dropzoneEl, fileInputEl, onFileSelected) {
        if (!dropzoneEl || !fileInputEl) return;

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzoneEl.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzoneEl.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzoneEl.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzoneEl.classList.remove('drag-over');
            });
        });

        dropzoneEl.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt?.files;
            if (files && files.length > 0) {
                onFileSelected(files[0]);
            }
        });

        fileInputEl.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                onFileSelected(e.target.files[0]);
            }
        });
    }

    setupDropzone(askUploadDropzone, askFileInput, uploadAndAttachDocument);

    // Knowledge Base direct file intake (Tab 2)
    setupDropzone(kbUploadDropzone, kbFileInput, async (file) => {
        if (!file) return;

        showToast(`Extracting and ingesting "${file.name}"...`, 'info');

        const formData = new FormData();
        formData.append('file', file);
        const lifecycleVal = document.getElementById('docLifecycle')?.value || 'permanent';
        if (lifecycleVal === '24h') formData.append('ttlHours', '24');
        else if (lifecycleVal === '1h') formData.append('ttlHours', '1');
        else formData.append('isPermanent', 'true');

        const headers = { 'X-Tenant-Id': state.tenantId };
        if (state.apiKey && state.apiKey.trim()) headers['X-API-Key'] = state.apiKey.trim();

        try {
            const res = await fetch('/api/content/upload', {
                method: 'POST',
                headers,
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to ingest file');

            showToast(`Document "${data.title}" ingested into knowledge base!`, 'success');
            loadDocuments();
            docIngestForm.reset();
        } catch (err) {
            showToast(`Ingestion failed: ${err.message}`, 'error');
        } finally {
            if (kbFileInput) kbFileInput.value = '';
        }
    });

    if (quickQueryChips) {
        quickQueryChips.addEventListener('click', (e) => {
            if (e.target.classList.contains('chip')) {
                questionInput.value = e.target.getAttribute('data-query');
                submitQuestion();
            }
        });
    }

    if (clearQuestionBtn) {
        clearQuestionBtn.addEventListener('click', () => {
            questionInput.value = '';
            answerDisplay.style.display = 'none';
            abstentionBanner.style.display = 'none';
            answerLoadingState.style.display = 'none';
            answerEmptyState.style.display = 'flex';
        });
    }

    if (askForm) {
        askForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitQuestion();
        });
    }

    async function submitQuestion() {
        const question = questionInput.value.trim();
        if (!question) return;

        // UI State: Loading
        answerEmptyState.style.display = 'none';
        answerDisplay.style.display = 'none';
        abstentionBanner.style.display = 'none';
        answerLoadingState.style.display = 'flex';
        submitQuestionBtn.disabled = true;

        const startTime = Date.now();

        try {
            const payload = { question };
            if (state.attachedDoc && state.attachedDoc._id) {
                payload.documentId = state.attachedDoc._id;
            }

            const { data, requestId } = await apiFetch('/api/chat/ask', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            const roundtripMs = Date.now() - startTime;
            renderAnswer(data, roundtripMs, requestId);
        } catch (err) {
            answerLoadingState.style.display = 'none';
            if (err.status === 429) {
                showToast('Rate limit exceeded (30 req/min). Please pause briefly before retrying.', 'error');
            } else if (err.status === 401) {
                showToast('Authentication error: Check your API Key in the top header.', 'error');
            } else {
                showToast(`Query failed: ${err.message}`, 'error');
            }
            answerEmptyState.style.display = 'flex';
        } finally {
            submitQuestionBtn.disabled = false;
        }
    }

    function renderAnswer(data, roundtripMs, headerRequestId) {
        answerLoadingState.style.display = 'none';
        answerDisplay.style.display = 'block';

        const isAbstained = data.abstained || data.insufficientEvidence;

        if (isAbstained) {
            abstentionBanner.style.display = 'flex';
            abstentionReason.textContent = data.answer || 'No matching knowledge candidates were found to support a verifiable answer.';
            verifiedStatusBadge.className = 'badge badge-warning';
            verifiedStatusBadge.textContent = 'Abstained (Unverifiable)';
            answerVerificationOutcome.className = 'badge badge-warning';
            answerVerificationOutcome.textContent = 'ABSTAINED';
        } else {
            abstentionBanner.style.display = 'none';
            verifiedStatusBadge.className = 'badge badge-success';
            verifiedStatusBadge.textContent = 'Grounded & Verified';
            answerVerificationOutcome.className = 'badge badge-success';
            answerVerificationOutcome.textContent = 'PASSED';
        }

        // Format answer with interactive citation links [1], [2], etc.
        const rawAnswer = data.answer || '';
        const formattedAnswer = escapeHtml(rawAnswer).replace(/\[(\d+)\]/g, (match, p1) => {
            return `<a class="citation-ref" href="#source-${p1}" data-target-source="${p1}">[${p1}]</a>`;
        });
        answerText.innerHTML = formattedAnswer;

        answerModelTag.textContent = data.model || 'gemini-3.5-flash-lite';
        answerLatencyTag.textContent = `${data.latencyMs || roundtripMs} ms`;
        answerRequestId.textContent = data.requestId || headerRequestId || 'N/A';
        answerPromptVersion.textContent = data.promptTemplateVersion || 'v1.1';

        // Render Citations
        sourcesList.innerHTML = '';
        const sources = data.sources || [];
        sourceCountBadge.textContent = sources.length;

        if (sources.length === 0) {
            sourcesList.innerHTML = '<p class="state-desc" style="padding: 0.5rem 0;">No citations referenced for this response.</p>';
        } else {
            sources.forEach((src, idx) => {
                const card = document.createElement('div');
                card.className = 'source-card';
                card.id = `source-${idx + 1}`;
                card.innerHTML = `
                    <div class="source-card-header">
                        <span class="source-title">[${idx + 1}] ${escapeHtml(src.title || 'Untitled Document')}</span>
                        <span class="source-version">v${src.version || 1}</span>
                    </div>
                    <div class="source-excerpt">"${escapeHtml(src.excerpt || 'Evidence excerpt snapshot recorded.')}"</div>
                `;
                sourcesList.appendChild(card);
            });

            // Wire interactive citation link clicks
            answerText.querySelectorAll('.citation-ref').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetIndex = link.getAttribute('data-target-source');
                    const targetCard = document.getElementById(`source-${targetIndex}`);
                    if (targetCard) {
                        targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        targetCard.classList.add('highlighted-source');
                        setTimeout(() => {
                            targetCard.classList.remove('highlighted-source');
                        }, 1800);
                    }
                });
            });
        }
    }

    // --- TAB 2: KNOWLEDGE BASE (DOCUMENT INGESTION & MANAGEMENT) ---
    if (docIngestForm) {
        docIngestForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const saveBtn = document.getElementById('saveDocBtn');
            saveBtn.disabled = true;

            const lifecycle = document.getElementById('docLifecycle')?.value || 'permanent';
            const payload = {
                title: docTitle.value.trim(),
                category: docCategory.value.trim() || 'General',
                tags: docTags.value.split(',').map(t => t.trim()).filter(Boolean),
                content: docContent.value.trim()
            };

            if (lifecycle === '24h') payload.ttlHours = 24;
            if (lifecycle === '1h') payload.ttlHours = 1;

            try {
                await apiFetch('/api/content', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                showToast('Document ingested and indexed successfully!', 'success');
                docIngestForm.reset();
                if (titleCharCount) titleCharCount.textContent = '0/250';
                if (contentCharCount) contentCharCount.textContent = '0/100,000';
                loadDocuments();
            } catch (err) {
                if (err.status === 409) {
                    showToast('Conflict: An identical document with this title and content already exists (Duplicate SHA-256 hash).', 'error');
                } else if (err.status === 507) {
                    showToast('Storage Limit: Cloud cluster approaching 512 MB ceiling. Purge old or transient documents.', 'error');
                } else {
                    showToast(`Failed to ingest document: ${err.message}`, 'error');
                }
            } finally {
                saveBtn.disabled = false;
            }
        });
    }

    const purgeDocsBtn = document.getElementById('purgeDocsBtn');
    if (purgeDocsBtn) {
        purgeDocsBtn.addEventListener('click', async () => {
            if (confirm(`Purge transient documents for tenant "${state.tenantId}" to recover 512 MB storage?`)) {
                try {
                    const { data } = await apiFetch('/api/content/purge?onlyEphemeral=true', { method: 'DELETE' });
                    showToast(`Purged ${data.deletedCount} transient documents.`, 'success');
                    loadDocuments();
                } catch (err) {
                    showToast(`Failed to purge: ${err.message}`, 'error');
                }
            }
        });
    }

    if (refreshDocsBtn) refreshDocsBtn.addEventListener('click', loadDocuments);

    async function loadDocuments() {
        if (!docsTableBody) return;
        docsTableBody.innerHTML = '<tr><td colspan="5" class="table-empty">Loading documents...</td></tr>';
        try {
            const { data } = await apiFetch('/api/content?limit=50');
            const docs = Array.isArray(data) ? data : (data.documents || []);
            if (docCountBadge) docCountBadge.textContent = docs.length;

            if (docs.length === 0) {
                docsTableBody.innerHTML = '<tr><td colspan="5" class="table-empty">No active documents found in this tenant scope. Ingest one to get started.</td></tr>';
                return;
            }

            docsTableBody.innerHTML = '';
            docs.forEach(doc => {
                const tr = document.createElement('tr');
                const shortHash = (doc.contentHash || '').substring(0, 10);
                tr.innerHTML = `
                    <td><strong>${escapeHtml(doc.title)}</strong></td>
                    <td><span class="badge badge-info">${escapeHtml(doc.category || 'General')}</span></td>
                    <td><span class="code-badge">v${doc.version || 1}</span></td>
                    <td><code class="code-badge" title="${escapeHtml(doc.contentHash || '')}">${shortHash}...</code></td>
                    <td>
                        <button class="btn btn-danger btn-sm delete-doc-btn" data-id="${doc._id}" title="Soft-archive document">
                            Archive
                        </button>
                    </td>
                `;
                docsTableBody.appendChild(tr);
            });

            // Attach soft-archive handlers
            document.querySelectorAll('.delete-doc-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const id = btn.getAttribute('data-id');
                    if (confirm('Archive this document? It will be excluded from search candidates while preserving historical audit traces.')) {
                        try {
                            await apiFetch(`/api/content/${id}`, { method: 'DELETE' });
                            showToast('Document soft-archived successfully.', 'info');
                            loadDocuments();
                        } catch (err) {
                            showToast(`Failed to archive document: ${err.message}`, 'error');
                        }
                    }
                });
            });
        } catch (err) {
            docsTableBody.innerHTML = `<tr><td colspan="5" class="table-empty" style="color: var(--status-danger-text);">Error loading documents: ${escapeHtml(err.message)}</td></tr>`;
        }
    }

    // --- TAB 3: AUDIT HISTORY & FORENSIC TRACES ---
    if (refreshHistoryBtn) refreshHistoryBtn.addEventListener('click', loadHistory);

    async function loadHistory() {
        if (!historyTableBody) return;
        historyTableBody.innerHTML = '<tr><td colspan="6" class="table-empty">Loading audit trail...</td></tr>';
        try {
            const { data } = await apiFetch('/api/chat/history?limit=50');
            const history = Array.isArray(data) ? data : (data.history || []);

            if (history.length === 0) {
                historyTableBody.innerHTML = '<tr><td colspan="6" class="table-empty">No audit traces recorded yet for this tenant.</td></tr>';
                return;
            }

            historyTableBody.innerHTML = '';
            history.forEach(item => {
                const tr = document.createElement('tr');
                const dateStr = item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now';
                const isAbstained = item.abstained || item.insufficientEvidence;
                const statusBadge = isAbstained
                    ? '<span class="badge badge-warning">Abstained</span>'
                    : '<span class="badge badge-success">Verified</span>';

                tr.innerHTML = `
                    <td><span class="meta-tag">${dateStr}</span></td>
                    <td style="max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(item.question)}">${escapeHtml(item.question)}</td>
                    <td><span class="meta-tag">${escapeHtml(item.model || 'gemini-3.5-flash-lite')} (${item.promptTemplateVersion || 'v1.1'})</span></td>
                    <td><span class="meta-tag">${item.latencyMs || '-'} ms</span></td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-secondary btn-sm inspect-trace-btn" data-id="${item._id}">
                            Inspect Trace
                        </button>
                    </td>
                `;
                historyTableBody.appendChild(tr);
            });

            // Attach inspect buttons
            document.querySelectorAll('.inspect-trace-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.getAttribute('data-id');
                    openForensicTraceModal(id);
                });
            });
        } catch (err) {
            historyTableBody.innerHTML = `<tr><td colspan="6" class="table-empty" style="color: var(--status-danger-text);">Error loading history: ${escapeHtml(err.message)}</td></tr>`;
        }
    }

    // --- FORENSIC AUDIT MODAL INSPECTION ---
    async function openForensicTraceModal(interactionId) {
        if (!traceModal || !modalBody) return;
        traceModal.style.display = 'flex';
        modalBody.innerHTML = '<div style="display: flex; justify-content: center; padding: 2rem;"><div class="spinner"></div></div>';

        try {
            const { data } = await apiFetch(`/api/chat/history/${interactionId}`);
            
            const sources = data.sources || [];
            const sourcesHtml = sources.length === 0
                ? '<p class="state-desc">No evidence citations recorded at answer time.</p>'
                : sources.map((s, idx) => `
                    <div class="source-card" style="margin-bottom: 0.5rem;">
                        <div class="source-card-header">
                            <span class="source-title">[${idx + 1}] ${escapeHtml(s.title || 'Untitled')}</span>
                            <span class="source-version">Version v${s.version || 1}</span>
                        </div>
                        <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 0.35rem; font-family: var(--font-mono);">
                            SHA-256: <code>${escapeHtml(s.contentHash || 'N/A')}</code> | Score: ${s.score || 'N/A'}
                        </div>
                        <div class="source-excerpt">"${escapeHtml(s.excerpt || '')}"</div>
                    </div>
                `).join('');

            modalBody.innerHTML = `
                <div class="trace-section">
                    <div class="trace-label">Question Asked</div>
                    <div class="trace-value">${escapeHtml(data.question)}</div>
                </div>

                <div class="trace-section">
                    <div class="trace-label">Synthesized Grounded Answer</div>
                    <div class="trace-value">${escapeHtml(data.answer)}</div>
                </div>

                <div class="trace-section">
                    <div class="trace-label">Audit & Execution Telemetry</div>
                    <div class="audit-meta-footer" style="padding-top: 0.5rem; border-top: none;">
                        <div class="meta-item"><span class="meta-label">Request ID:</span> <code class="code-badge">${escapeHtml(data.requestId || 'N/A')}</code></div>
                        <div class="meta-item"><span class="meta-label">Model:</span> <span class="meta-tag">${escapeHtml(data.model || 'gemini-3.5-flash-lite')}</span></div>
                        <div class="meta-item"><span class="meta-label">Prompt Version:</span> <span class="badge badge-info">${escapeHtml(data.promptTemplateVersion || 'v1.1')}</span></div>
                        <div class="meta-item"><span class="meta-label">Latency:</span> <span class="meta-tag">${data.latencyMs || 'N/A'} ms</span></div>
                        <div class="meta-item"><span class="meta-label">Outcome:</span> <span class="badge ${data.abstained ? 'badge-warning' : 'badge-success'}">${data.abstained ? 'ABSTAINED' : 'PASSED'}</span></div>
                    </div>
                </div>

                <div class="trace-section">
                    <div class="trace-label">Answer-Time Evidence Snapshots (Immutable Audit Trial)</div>
                    <div style="margin-top: 0.5rem;">${sourcesHtml}</div>
                </div>
            `;
        } catch (err) {
            modalBody.innerHTML = `<div class="alert-banner alert-warning">Failed to load forensic trace: ${escapeHtml(err.message)}</div>`;
        }
    }

    function closeModal() {
        if (traceModal) traceModal.style.display = 'none';
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (closeModalFooterBtn) closeModalFooterBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === traceModal) closeModal();
    });

    // --- Utility: HTML Escaping to Prevent XSS ---
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // --- Initial Boot ---
    checkSystemHealth();
    loadDocuments();
});
