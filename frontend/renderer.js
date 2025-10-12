// Configurações da aplicação
const CONFIG = {
    API_BASE_URL: 'http://127.0.0.1:5000',
    CHECK_INTERVAL: 5000, // 5 segundos
    TIMEOUT: 30000 // 30 segundos
};

// Elementos DOM
const elements = {
    inputPath: document.getElementById('inputPath'),
    outputFolder: document.getElementById('outputFolder'),
    selectFileBtn: document.getElementById('selectFileBtn'),
    selectFolderBtn: document.getElementById('selectFolderBtn'),
    selectOutputFolderBtn: document.getElementById('selectOutputFolderBtn'),
    processBtn: document.getElementById('processBtn'),
    clearBtn: document.getElementById('clearBtn'),
    openFolderBtn: document.getElementById('openFolderBtn'),
    statusMessage: document.getElementById('statusMessage'),
    progressBar: document.getElementById('progressBar'),
    resultCard: document.getElementById('resultCard'),
    resultContent: document.getElementById('resultContent'),
    // Botões da barra de título
    minimizeBtn: document.getElementById('minimizeBtn'),
    maximizeBtn: document.getElementById('maximizeBtn'),
    closeBtn: document.getElementById('closeBtn'),
    // Botão de tema
    themeToggleBtn: document.getElementById('themeToggleBtn')
};

// Estado da aplicação
let appState = {
    selectedPath: null,
    selectedFolder: null,
    isProcessing: false,
    serverOnline: false,
    currentTheme: 'light', // 'light' ou 'dark'
    lastOutputFolder: null // Armazenar a última pasta de saída usada
};

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    startServerHealthCheck();
});

function initializeApp() {
    console.log('🚀 Inicializando aplicação...');
    loadTheme();
    updateUI();
    checkServerHealth();
}

function setupEventListeners() {
    console.log('🔧 Configurando event listeners...');
    console.log('🔍 Elementos encontrados:', {
        minimizeBtn: elements.minimizeBtn ? 'encontrado' : 'não encontrado',
        maximizeBtn: elements.maximizeBtn ? 'encontrado' : 'não encontrado',
        closeBtn: elements.closeBtn ? 'encontrado' : 'não encontrado',
        themeToggleBtn: elements.themeToggleBtn ? 'encontrado' : 'não encontrado'
    });
    
    // Botões de seleção
    elements.selectFileBtn.addEventListener('click', selectFile);
    elements.selectFolderBtn.addEventListener('click', selectFolder);
    elements.selectOutputFolderBtn.addEventListener('click', selectOutputFolder);
    
    // Botão de processamento
    elements.processBtn.addEventListener('click', processFile);
    
    // Botão de limpar
    elements.clearBtn.addEventListener('click', clearForm);
    
    // Botão de abrir pasta
    elements.openFolderBtn.addEventListener('click', openOutputFolder);
    
    // Botões da barra de título
    if (elements.minimizeBtn) {
        elements.minimizeBtn.addEventListener('click', () => {
            console.log('🪟 Minimizando janela...');
            window.electronAPI.minimizeWindow();
        });
    }
    
    if (elements.maximizeBtn) {
        elements.maximizeBtn.addEventListener('click', () => {
            console.log('🪟 Maximizando janela...');
            window.electronAPI.maximizeWindow();
        });
    }
    
    if (elements.closeBtn) {
        elements.closeBtn.addEventListener('click', () => {
            console.log('🪟 Fechando janela...');
            window.electronAPI.closeWindow();
        });
    }
    
    // Botão de tema
    if (elements.themeToggleBtn) {
        elements.themeToggleBtn.addEventListener('click', toggleTheme);
    }
    
    // Sistema de abas
    setupTabs();
    
    // Link do GitHub
    setupGitHubLink();
    
    // Mudanças nos inputs
    elements.inputPath.addEventListener('change', updateUI);
    elements.outputFolder.addEventListener('change', updateUI);
}

// Seleção de arquivos e pastas
async function selectFile() {
    try {
        console.log('📂 Abrindo seletor de arquivo...');
        
        // Usar API do Electron para seleção de arquivo
        const result = await window.electronAPI.selectFile();
        
        if (result && result.filePaths && result.filePaths.length > 0) {
            const filePath = result.filePaths[0];
            elements.inputPath.value = filePath;
            appState.selectedPath = filePath;
            updateUI();
            
            console.log('✅ Arquivo selecionado:', filePath);
        }
    } catch (error) {
        console.error('❌ Erro ao selecionar arquivo:', error);
        showStatus('Erro ao selecionar arquivo', 'error');
    }
}

async function selectFolder() {
    try {
        console.log('📁 Abrindo seletor de pasta de entrada...');
        console.log('🔍 Verificando API do Electron:', window.electronAPI);
        
        if (!window.electronAPI) {
            throw new Error('API do Electron não está disponível');
        }
        
        if (!window.electronAPI.selectFolder) {
            throw new Error('Função selectFolder não está disponível');
        }
        
        // Usar API do Electron para seleção de pasta
        const result = await window.electronAPI.selectFolder();
        console.log('📁 Resultado da seleção:', result);
        
        if (result && result.filePaths && result.filePaths.length > 0) {
            const folderPath = result.filePaths[0];
            elements.inputPath.value = folderPath;
            appState.selectedPath = folderPath;
            updateUI();
            
            console.log('✅ Pasta de entrada selecionada:', folderPath);
        } else {
            console.log('ℹ️ Seleção cancelada pelo usuário');
        }
    } catch (error) {
        console.error('❌ Erro ao selecionar pasta:', error);
        showStatus('Erro ao selecionar pasta: ' + error.message, 'error');
    }
}

async function selectOutputFolder() {
    try {
        console.log('📁 Abrindo seletor de pasta de saída...');
        console.log('🔍 Verificando API do Electron:', window.electronAPI);
        
        if (!window.electronAPI) {
            throw new Error('API do Electron não está disponível');
        }
        
        if (!window.electronAPI.selectOutputFolder) {
            throw new Error('Função selectOutputFolder não está disponível');
        }
        
        // Usar API do Electron para seleção de pasta de saída
        const result = await window.electronAPI.selectOutputFolder();
        console.log('📁 Resultado da seleção:', result);
        
        if (result && result.filePaths && result.filePaths.length > 0) {
            const folderPath = result.filePaths[0];
            elements.outputFolder.value = folderPath;
            appState.selectedFolder = folderPath;
            updateUI();
            
            console.log('✅ Pasta de saída selecionada:', folderPath);
        } else {
            console.log('ℹ️ Seleção cancelada pelo usuário');
        }
    } catch (error) {
        console.error('❌ Erro ao selecionar pasta de saída:', error);
        showStatus('Erro ao selecionar pasta de saída: ' + error.message, 'error');
    }
}

// Processamento do arquivo
async function processFile() {
    if (!appState.selectedPath || !appState.selectedFolder) {
        showStatus('Selecione arquivo(s)/pasta e uma pasta de saída', 'error');
        return;
    }
    
    if (appState.isProcessing) {
        return;
    }
    
    try {
        appState.isProcessing = true;
        updateUI();
        
        showStatus('Processando arquivo(s) de balancete...', 'processing');
        showProgress(true);
        
        console.log('⚡ Iniciando processamento...');
        console.log('📁 Caminho de entrada:', appState.selectedPath);
        console.log('📂 Pasta de saída:', appState.selectedFolder);
        
        const response = await fetch(`${CONFIG.API_BASE_URL}/process-file`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputPath: appState.selectedPath,
                outputFolder: appState.selectedFolder,
                operation: 'balancete'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Armazenar a pasta de saída para o botão "Abrir Pasta"
            appState.lastOutputFolder = appState.selectedFolder;
            showStatus(data.message, 'success');
            showResult(data);
            console.log('✅ Processamento concluído:', data);
        } else {
            showStatus(data.message || 'Erro no processamento', 'error');
            console.error('❌ Erro no processamento:', data);
        }
        
    } catch (error) {
        console.error('❌ Erro na requisição:', error);
        showStatus('Erro de comunicação com o servidor', 'error');
    } finally {
        appState.isProcessing = false;
        showProgress(false);
        updateUI();
    }
}

// Verificação de saúde do servidor
async function checkServerHealth() {
    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/health`, {
            method: 'GET',
            timeout: 5000
        });
        
        if (response.ok) {
            const data = await response.json();
            appState.serverOnline = true;
            console.log('✅ Servidor online:', data);
        } else {
            throw new Error('Servidor não respondeu');
        }
    } catch (error) {
        appState.serverOnline = false;
        console.warn('⚠️ Servidor offline:', error.message);
    }
}

function startServerHealthCheck() {
    // Verificar saúde do servidor a cada 5 segundos
    setInterval(checkServerHealth, CONFIG.CHECK_INTERVAL);
}

// Atualização da interface
function updateUI() {
    const canProcess = appState.selectedPath && 
                      appState.selectedFolder && 
                      !appState.isProcessing && 
                      appState.serverOnline;
    
    elements.processBtn.disabled = !canProcess;
    
    if (appState.isProcessing) {
        elements.processBtn.innerHTML = '<span class="loading"></span> Processando...';
    } else {
        elements.processBtn.innerHTML = '⚡ Processar Balancete';
    }
}


// Exibição de status e resultados
function showStatus(message, type = 'info') {
    elements.statusMessage.textContent = message;
    elements.statusMessage.className = `status-message ${type}`;
}

function showProgress(show) {
    elements.progressBar.style.display = show ? 'block' : 'none';
    
    if (show) {
        // Simular progresso
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }
            elements.progressBar.querySelector('.progress-fill').style.width = progress + '%';
        }, 200);
    }
}

function showResult(data) {
    elements.resultCard.style.display = 'block';
    
    // Mostrar botão "Abrir Pasta" se houver pasta de saída
    if (appState.lastOutputFolder) {
        elements.openFolderBtn.style.display = 'inline-flex';
    }
    
    // Criar HTML formatado para os resultados
    let resultHTML = '';
    
    if (data.result && data.result.processed_files) {
        resultHTML += '<div class="result-summary">';
        resultHTML += `<h3>📊 Resumo do Processamento</h3>`;
        resultHTML += `<p><strong>Total processado:</strong> ${data.result.processed_count} arquivo(s)</p>`;
        resultHTML += `<p><strong>Data/Hora:</strong> ${formatDate(data.timestamp)}</p>`;
        if (appState.lastOutputFolder) {
            resultHTML += `<p><strong>Pasta de saída:</strong> ${appState.lastOutputFolder}</p>`;
        }
        resultHTML += '</div>';
        
        resultHTML += '<div class="result-logs">';
        resultHTML += '<h3>📋 Log de Arquivos</h3>';
        
        // Processar arquivos com sucesso
        data.result.processed_files.forEach(file => {
            const fileName = file.inputFile.split('\\').pop().split('/').pop(); // Pegar apenas o nome do arquivo
            resultHTML += `<div class="log-entry success">`;
            resultHTML += `<span class="log-icon">✅</span>`;
            resultHTML += `<span class="log-file">${fileName}</span>`;
            resultHTML += `<span class="log-status">SUCESSO</span>`;
            resultHTML += `</div>`;
        });
        
        // Processar erros
        if (data.result.errors && data.result.errors.length > 0) {
            data.result.errors.forEach(error => {
                resultHTML += `<div class="log-entry error">`;
                resultHTML += `<span class="log-icon">❌</span>`;
                resultHTML += `<span class="log-file">${extractFileNameFromError(error)}</span>`;
                resultHTML += `<span class="log-status">FALHA</span>`;
                resultHTML += `<div class="log-error-detail">Erro: ${error}</div>`;
                resultHTML += `</div>`;
            });
        }
        
        resultHTML += '</div>';
    } else {
        // Fallback para dados não estruturados
        resultHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
    }
    
    elements.resultContent.innerHTML = resultHTML;
}

function extractFileNameFromError(errorMessage) {
    // Tentar extrair o nome do arquivo da mensagem de erro
    const match = errorMessage.match(/processar\s+([^:]+)/i);
    if (match) {
        return match[1];
    }
    return 'Arquivo desconhecido';
}

function clearForm() {
    elements.inputPath.value = '';
    elements.outputFolder.value = '';
    
    appState.selectedPath = null;
    appState.selectedFolder = null;
    appState.lastOutputFolder = null;
    
    elements.resultCard.style.display = 'none';
    elements.openFolderBtn.style.display = 'none';
    showStatus('Selecione arquivo(s)/pasta e uma pasta de saída para começar');
    
    updateUI();
    
    console.log('🗑️ Formulário limpo');
}

async function openOutputFolder() {
    try {
        console.log('📁 Abrindo pasta de saída:', appState.lastOutputFolder);
        
        if (!appState.lastOutputFolder) {
            showStatus('Nenhuma pasta de saída disponível', 'error');
            return;
        }
        
        // Usar API do Electron para abrir pasta
        if (window.electronAPI && window.electronAPI.openFolder) {
            await window.electronAPI.openFolder(appState.lastOutputFolder);
            console.log('✅ Pasta aberta com sucesso');
        } else {
            // Fallback: tentar abrir com shell do sistema
            const { shell } = require('electron');
            shell.openPath(appState.lastOutputFolder);
        }
        
    } catch (error) {
        console.error('❌ Erro ao abrir pasta:', error);
        showStatus('Erro ao abrir pasta: ' + error.message, 'error');
    }
}

// Utilitários
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString('pt-BR');
}

// Tratamento de erros globais
window.addEventListener('error', function(event) {
    console.error('❌ Erro global:', event.error);
    showStatus('Ocorreu um erro inesperado', 'error');
});

window.addEventListener('unhandledrejection', function(event) {
    console.error('❌ Promise rejeitada:', event.reason);
    showStatus('Erro de comunicação', 'error');
});

// Funções de controle de tema
function loadTheme() {
    const savedTheme = localStorage.getItem('app-theme') || 'light';
    appState.currentTheme = savedTheme;
    applyTheme(savedTheme);
    updateThemeIcon();
}

function toggleTheme() {
    appState.currentTheme = appState.currentTheme === 'light' ? 'dark' : 'light';
    applyTheme(appState.currentTheme);
    updateThemeIcon();
    localStorage.setItem('app-theme', appState.currentTheme);
    console.log(`🎨 Tema alterado para: ${appState.currentTheme}`);
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

function updateThemeIcon() {
    const themeIcon = elements.themeToggleBtn.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = appState.currentTheme === 'light' ? '🌙' : '☀️';
    }
}

// Sistema de Abas
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button:not(.add-tab-btn)');
    const tabContents = document.querySelectorAll('.tab-content');
    const addTabBtn = document.getElementById('addTabBtn');
    
    console.log('📑 Elementos encontrados:', {
        tabButtons: tabButtons.length,
        tabContents: tabContents.length,
        addTabBtn: addTabBtn ? 'encontrado' : 'não encontrado'
    });
    
    // Event listeners para as abas
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            console.log('📑 Clicando na aba:', tabId);
            switchTab(tabId);
        });
    });
    
    // Event listener para adicionar nova aba
    if (addTabBtn) {
        addTabBtn.addEventListener('click', addNewTab);
    }
    
    console.log('📑 Sistema de abas configurado');
}

function switchTab(tabId) {
    // Remover classe active de todas as abas
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Adicionar classe active na aba selecionada
    const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
    const activeContent = document.getElementById(`tab-${tabId}`);
    
    if (activeButton && activeContent) {
        activeButton.classList.add('active');
        activeContent.classList.add('active');
        console.log(`📑 Aba ativada: ${tabId}`);
    }
}

function addNewTab() {
    const tabName = prompt('Nome da nova aba:');
    if (tabName) {
        const tabId = `tab-${Date.now()}`;
        const tabButton = document.createElement('button');
        tabButton.className = 'tab-button';
        tabButton.setAttribute('data-tab', tabId);
        tabButton.textContent = `📄 ${tabName}`;
        
        const tabContent = document.createElement('div');
        tabContent.className = 'tab-content';
        tabContent.id = `tab-${tabId}`;
        tabContent.innerHTML = `
            <div class="main-content">
                <div class="card">
                    <h2>📄 ${tabName}</h2>
                    <p>Nova aba personalizada</p>
                    <div class="action-buttons">
                        <button type="button" class="btn btn-primary">🚀 Executar</button>
                    </div>
                </div>
            </div>
        `;
        
        // Adicionar antes do botão de adicionar
        const addTabBtn = document.getElementById('addTabBtn');
        addTabBtn.parentNode.insertBefore(tabButton, addTabBtn);
        
        // Adicionar conteúdo
        document.querySelector('.tabs-content').appendChild(tabContent);
        
        // Event listener para a nova aba
        tabButton.addEventListener('click', () => switchTab(tabId));
        
        // Ativar a nova aba
        switchTab(tabId);
        
        console.log(`📑 Nova aba criada: ${tabName}`);
    }
}

// Configurar link do GitHub
function setupGitHubLink() {
    const githubLink = document.getElementById('githubLink');
    if (githubLink) {
        githubLink.addEventListener('click', (event) => {
            event.preventDefault();
            console.log('🔗 Abrindo GitHub no navegador padrão...');
            
            // Usar API do Electron para abrir no navegador padrão
            if (window.electronAPI && window.electronAPI.openExternal) {
                window.electronAPI.openExternal('https://github.com/AlexandreSilvestrin');
            } else {
                // Fallback: tentar usar shell do sistema
                const { shell } = require('electron');
                shell.openExternal('https://github.com/AlexandreSilvestrin');
            }
        });
        
        console.log('🔗 Link do GitHub configurado');
    }
}

// ==================== SISTEMA DE ATUALIZAÇÕES ====================

// Elementos DOM para atualizações
const updateElements = {
    currentVersion: document.getElementById('currentVersion'),
    updateStatus: document.getElementById('updateStatus'),
    checkUpdatesBtn: document.getElementById('checkUpdatesBtn'),
    downloadUpdateBtn: document.getElementById('downloadUpdateBtn'),
    installUpdateBtn: document.getElementById('installUpdateBtn'),
    updateProgress: document.getElementById('updateProgress'),
    updateProgressFill: document.getElementById('updateProgressFill'),
    updateProgressText: document.getElementById('updateProgressText'),
    updateMessage: document.getElementById('updateMessage')
};

// Elementos DOM para notificação de versão
const versionElements = {
    notification: document.getElementById('versionNotification'),
    icon: document.getElementById('versionIcon'),
    text: document.getElementById('versionText'),
    actionBtn: document.getElementById('versionActionBtn')
};

// Estado das atualizações
let updateState = {
    isChecking: false,
    isDownloading: false,
    updateAvailable: false,
    updateDownloaded: false,
    currentVersion: null,
    latestVersion: null
};

// Estado da notificação de versão
let versionNotificationState = {
    isVisible: true,
    currentStatus: 'updated' // 'updated', 'available', 'downloading', 'ready'
};

// Inicializar sistema de atualizações
function initializeUpdateSystem() {
    console.log('🔄 Inicializando sistema de atualizações...');
    
    // Carregar informações da aplicação
    loadAppInfo();
    
    // Configurar event listeners
    setupUpdateEventListeners();
    
    // Inicializar notificação de versão
    initializeVersionNotification();
    
    // Verificar atualizações automaticamente
    setTimeout(() => {
        checkForUpdates();
    }, 2000);
}

// ==================== NOTIFICAÇÃO DE VERSÃO ====================

// Inicializar notificação de versão
function initializeVersionNotification() {
    console.log('🔔 Inicializando notificação de versão...');
    
    // Configurar event listeners da notificação
    setupVersionNotificationListeners();
    
    // Mostrar status inicial (discreto)
    updateVersionNotification('updated', updateState.currentVersion || '1.0.0');
}

// Configurar event listeners da notificação
function setupVersionNotificationListeners() {
    // Botão de ação (download)
    if (versionElements.actionBtn) {
        versionElements.actionBtn.addEventListener('click', () => {
            handleVersionActionClick();
        });
    }
}

// Atualizar notificação de versão
function updateVersionNotification(status, version = null) {
    if (!versionElements.notification) return;
    
    versionNotificationState.currentStatus = status;
    
    // Remover classes de status anteriores
    versionElements.notification.classList.remove('updated', 'update-available', 'update-downloading', 'update-ready');
    
    switch (status) {
        case 'updated':
            versionElements.icon.textContent = '✅';
            versionElements.text.textContent = `Atualizado v${version}`;
            versionElements.actionBtn.style.display = 'none';
            versionElements.notification.classList.add('updated');
            break;
            
        case 'available':
            versionElements.icon.textContent = '🔄';
            versionElements.text.textContent = 'Atualização pendente';
            versionElements.actionBtn.style.display = 'flex';
            versionElements.actionBtn.textContent = '📥';
            versionElements.actionBtn.title = 'Baixar atualização';
            versionElements.notification.classList.add('update-available');
            break;
            
        case 'downloading':
            versionElements.icon.textContent = '📥';
            versionElements.text.textContent = 'Baixando atualização...';
            versionElements.actionBtn.style.display = 'none';
            versionElements.notification.classList.add('update-downloading');
            break;
            
        case 'ready':
            versionElements.icon.textContent = '🚀';
            versionElements.text.textContent = 'Atualização pronta!';
            versionElements.actionBtn.style.display = 'flex';
            versionElements.actionBtn.textContent = '🔄';
            versionElements.actionBtn.title = 'Instalar e reiniciar';
            versionElements.notification.classList.add('update-ready');
            break;
    }
    
    // Mostrar notificação se estava oculta
    showVersionNotification();
    
    console.log(`🔔 Notificação atualizada: ${status} v${version}`);
}

// Mostrar notificação de versão
function showVersionNotification() {
    if (versionElements.notification) {
        versionElements.notification.classList.remove('hidden');
        versionNotificationState.isVisible = true;
    }
}

// Ocultar notificação de versão
function hideVersionNotification() {
    if (versionElements.notification) {
        versionElements.notification.classList.add('hidden');
        versionNotificationState.isVisible = false;
    }
}

// Lidar com clique no botão de ação
function handleVersionActionClick() {
    switch (versionNotificationState.currentStatus) {
        case 'available':
            // Baixar atualização
            downloadUpdate();
            break;
        case 'ready':
            // Instalar atualização
            installUpdate();
            break;
    }
}

// Carregar informações da aplicação
async function loadAppInfo() {
    try {
        if (window.electronAPI && window.electronAPI.getUpdateInfo) {
            const info = await window.electronAPI.getUpdateInfo();
            updateState.currentVersion = info.currentVersion;
            
            if (updateElements.currentVersion) {
                updateElements.currentVersion.textContent = info.currentVersion;
            }
            
            // Atualizar notificação de versão com a versão atual
            updateVersionNotification('updated', info.currentVersion);
            
            console.log('📋 Informações da aplicação carregadas:', info);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar informações da aplicação:', error);
    }
}

// Configurar event listeners para atualizações
function setupUpdateEventListeners() {
    // Botão de verificar atualizações
    if (updateElements.checkUpdatesBtn) {
        updateElements.checkUpdatesBtn.addEventListener('click', () => {
            checkForUpdates();
        });
    }
    
    // Botão de baixar atualização
    if (updateElements.downloadUpdateBtn) {
        updateElements.downloadUpdateBtn.addEventListener('click', () => {
            downloadUpdate();
        });
    }
    
    // Botão de instalar atualização
    if (updateElements.installUpdateBtn) {
        updateElements.installUpdateBtn.addEventListener('click', () => {
            installUpdate();
        });
    }
    
    // Event listeners do auto-updater
    if (window.electronAPI) {
        // Verificando atualizações
        window.electronAPI.onUpdateChecking(() => {
            updateStatus('Verificando atualizações...', 'info');
            updateState.isChecking = true;
            updateUI();
        });
        
        // Atualização disponível
        window.electronAPI.onUpdateAvailable((event, info) => {
            console.log('📦 Atualização disponível:', info);
            updateState.updateAvailable = true;
            updateState.latestVersion = info.version;
            updateStatus(`Atualização disponível: v${info.version}`, 'success');
            showDownloadButton();
            
            // Atualizar notificação de versão
            updateVersionNotification('available', info.version);
        });
        
        // Nenhuma atualização disponível
        window.electronAPI.onUpdateNotAvailable((event, info) => {
            console.log('✅ Aplicação está atualizada:', info);
            updateState.updateAvailable = false;
            updateStatus('Aplicação está atualizada', 'success');
            hideUpdateButtons();
            
            // Atualizar notificação de versão
            updateVersionNotification('updated', info.version || updateState.currentVersion);
        });
        
        // Erro na verificação
        window.electronAPI.onUpdateError((event, error) => {
            console.error('❌ Erro ao verificar atualizações:', error);
            updateStatus(`Erro: ${error}`, 'error');
            updateState.isChecking = false;
            updateUI();
        });
        
        // Progresso do download
        window.electronAPI.onUpdateDownloadProgress((event, progress) => {
            console.log('📥 Progresso do download:', progress);
            updateDownloadProgress(progress);
            
            // Atualizar notificação de versão
            updateVersionNotification('downloading');
        });
        
        // Download concluído
        window.electronAPI.onUpdateDownloaded((event, info) => {
            console.log('✅ Atualização baixada:', info);
            updateState.updateDownloaded = true;
            updateState.isDownloading = false;
            updateStatus('Atualização baixada com sucesso!', 'success');
            showInstallButton();
            hideProgressBar();
            
            // Atualizar notificação de versão
            updateVersionNotification('ready', info.version);
        });
    }
}

// Verificar atualizações
async function checkForUpdates() {
    if (updateState.isChecking || updateState.isDownloading) {
        return;
    }
    
    try {
        console.log('🔍 Verificando atualizações...');
        updateState.isChecking = true;
        updateStatus('Verificando atualizações...', 'info');
        updateUI();
        
        if (window.electronAPI && window.electronAPI.checkForUpdates) {
            const result = await window.electronAPI.checkForUpdates();
            console.log('📋 Resultado da verificação:', result);
        }
    } catch (error) {
        console.error('❌ Erro ao verificar atualizações:', error);
        updateStatus(`Erro: ${error.message}`, 'error');
        updateState.isChecking = false;
        updateUI();
    }
}

// Baixar atualização
async function downloadUpdate() {
    if (updateState.isDownloading || !updateState.updateAvailable) {
        return;
    }
    
    try {
        console.log('📥 Baixando atualização...');
        updateState.isDownloading = true;
        updateStatus('Baixando atualização...', 'info');
        showProgressBar();
        updateUI();
        
        if (window.electronAPI && window.electronAPI.downloadUpdate) {
            const result = await window.electronAPI.downloadUpdate();
            console.log('📋 Resultado do download:', result);
        }
    } catch (error) {
        console.error('❌ Erro ao baixar atualização:', error);
        updateStatus(`Erro: ${error.message}`, 'error');
        updateState.isDownloading = false;
        updateUI();
    }
}

// Instalar atualização
async function installUpdate() {
    if (!updateState.updateDownloaded) {
        return;
    }
    
    try {
        console.log('🔄 Instalando atualização...');
        updateStatus('Instalando atualização e reiniciando...', 'info');
        
        if (window.electronAPI && window.electronAPI.installUpdate) {
            const result = await window.electronAPI.installUpdate();
            console.log('📋 Resultado da instalação:', result);
        }
    } catch (error) {
        console.error('❌ Erro ao instalar atualização:', error);
        updateStatus(`Erro: ${error.message}`, 'error');
    }
}

// Atualizar status
function updateStatus(message, type = 'info') {
    if (updateElements.updateStatus) {
        updateElements.updateStatus.textContent = message;
    }
    
    if (updateElements.updateMessage) {
        updateElements.updateMessage.textContent = message;
        updateElements.updateMessage.className = `update-message ${type}`;
    }
    
    console.log(`📊 Status: ${message}`);
}

// Atualizar progresso do download
function updateDownloadProgress(progress) {
    const percent = Math.round(progress.percent);
    
    if (updateElements.updateProgressFill) {
        updateElements.updateProgressFill.style.width = `${percent}%`;
    }
    
    if (updateElements.updateProgressText) {
        updateElements.updateProgressText.textContent = `${percent}%`;
    }
    
    // Atualizar status com informações do download
    const speed = formatBytes(progress.bytesPerSecond);
    const downloaded = formatBytes(progress.transferred);
    const total = formatBytes(progress.total);
    
    updateStatus(`Baixando: ${downloaded} / ${total} (${speed}/s)`, 'info');
}

// Mostrar botão de download
function showDownloadButton() {
    if (updateElements.downloadUpdateBtn) {
        updateElements.downloadUpdateBtn.style.display = 'inline-block';
    }
    if (updateElements.checkUpdatesBtn) {
        updateElements.checkUpdatesBtn.style.display = 'none';
    }
}

// Mostrar botão de instalação
function showInstallButton() {
    if (updateElements.installUpdateBtn) {
        updateElements.installUpdateBtn.style.display = 'inline-block';
    }
    if (updateElements.downloadUpdateBtn) {
        updateElements.downloadUpdateBtn.style.display = 'none';
    }
}

// Ocultar botões de atualização
function hideUpdateButtons() {
    if (updateElements.downloadUpdateBtn) {
        updateElements.downloadUpdateBtn.style.display = 'none';
    }
    if (updateElements.installUpdateBtn) {
        updateElements.installUpdateBtn.style.display = 'none';
    }
    if (updateElements.checkUpdatesBtn) {
        updateElements.checkUpdatesBtn.style.display = 'inline-block';
    }
}

// Mostrar barra de progresso
function showProgressBar() {
    if (updateElements.updateProgress) {
        updateElements.updateProgress.style.display = 'block';
    }
}

// Ocultar barra de progresso
function hideProgressBar() {
    if (updateElements.updateProgress) {
        updateElements.updateProgress.style.display = 'none';
    }
}

// Atualizar UI
function updateUI() {
    // Atualizar estado dos botões
    if (updateElements.checkUpdatesBtn) {
        updateElements.checkUpdatesBtn.disabled = updateState.isChecking || updateState.isDownloading;
    }
    if (updateElements.downloadUpdateBtn) {
        updateElements.downloadUpdateBtn.disabled = updateState.isDownloading || !updateState.updateAvailable;
    }
    if (updateElements.installUpdateBtn) {
        updateElements.installUpdateBtn.disabled = !updateState.updateDownloaded;
    }
}

// Formatar bytes para leitura humana
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Inicializar sistema de atualizações quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar um pouco para garantir que tudo esteja carregado
    setTimeout(() => {
        initializeUpdateSystem();
    }, 1000);
});

console.log('📱 Frontend carregado com sucesso!');
