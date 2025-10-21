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
    transformBtn: document.getElementById('transformBtn'),
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
    initializeUpdateLog();
    
    // Configurar listener para quando a aplicação estiver pronta
    if (window.electronAPI && window.electronAPI.onAppReady) {
        window.electronAPI.onAppReady(() => {
            console.log('🚀 Aplicação principal carregada!');
            // Inicializar funcionalidades que dependem da aplicação principal
            initializePythonControl();
            
            // Iniciar servidor Python automaticamente após um pequeno delay
            setTimeout(() => {
                startPythonServerAutomatically();
            }, 1000);
        });
    }
});

function initializeApp() {
    console.log('🚀 Inicializando aplicação...');
    loadTheme();
    updateUI();
    checkServerHealth();
    initializeConfigTab();
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
    
    // Botão de transformar
    elements.transformBtn.addEventListener('click', transformFile);
    
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

// Transformação do arquivo
async function transformFile() {
    if (!appState.selectedPath || !appState.selectedFolder) {
        showStatus('Selecione arquivo(s)/pasta e uma pasta de saída', 'error');
        return;
    }
    
    if (appState.isProcessing) {
        return;
    }
    
    // Verificar se o servidor Python está funcionando
    if (!appState.serverOnline) {
        showStatus('Servidor Python não está funcionando. Tentando iniciar...', 'warning');
        
        // Tentar iniciar o servidor Python
        const pythonStarted = await startPythonServer();
        if (!pythonStarted) {
            showStatus('Erro: Não foi possível iniciar o servidor Python. Verifique as configurações.', 'error');
            return;
        }
        
        // Aguardar um pouco para o servidor ficar pronto
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verificar novamente se está funcionando
        const isServerOnline = await checkServerHealth();
        if (!isServerOnline) {
            showStatus('Erro: Servidor Python não respondeu após inicialização.', 'error');
            return;
        }
    }
    
    try {
        appState.isProcessing = true;
        updateUI();
        
        showStatus('Transformando arquivo(s) de balancete...', 'processing');
        showProgress(true);
        
        console.log('🔄 Iniciando transformação...');
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
            console.log('✅ Transformação concluída:', data);
        } else {
            showStatus(data.message || 'Erro na transformação', 'error');
            console.error('❌ Erro na transformação:', data);
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
            updateUI(); // Atualizar UI quando servidor estiver online
            updateServerStatusDisplay(true); // Atualizar aba de configurações
            return true;
        } else {
            throw new Error('Servidor não respondeu');
        }
    } catch (error) {
        appState.serverOnline = false;
        console.warn('⚠️ Servidor offline:', error.message);
        updateUI(); // Atualizar UI quando servidor estiver offline
        updateServerStatusDisplay(false); // Atualizar aba de configurações
        return false;
    }
}

function startServerHealthCheck() {
    // Verificar saúde do servidor a cada 5 segundos
    setInterval(checkServerHealth, CONFIG.CHECK_INTERVAL);
}

// Atualização da interface
function updateUI() {
    // Botão sempre ativo, só desabilitar se estiver processando
    const isProcessing = appState.isProcessing;
    
    elements.transformBtn.disabled = isProcessing;
    
    if (isProcessing) {
        elements.transformBtn.innerHTML = '<span class="loading"></span> Transformando...';
    } else {
        elements.transformBtn.innerHTML = '🔄 Transformar Balancete';
    }
    
    // Botão sempre com aparência ativa quando não está processando
    elements.transformBtn.style.opacity = '1';
    elements.transformBtn.style.cursor = 'pointer';
    
    // Atualizar mensagem de status
    if (isProcessing) {
        showStatus('Transformando...', 'processing');
    } else {
        showStatus('Clique em "Transformar Balancete" para começar!', 'info');
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
    
    // Debug: listar todas as abas encontradas
    tabButtons.forEach((button, index) => {
        const tabId = button.getAttribute('data-tab');
        console.log(`📑 Aba ${index + 1}: ${tabId}`);
    });
    
    tabContents.forEach((content, index) => {
        console.log(`📑 Conteúdo ${index + 1}: ${content.id}`);
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
    console.log(`🔄 Mudando para aba: ${tabId}`);
    
    // Remover classe active de todas as abas
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Adicionar classe active na aba selecionada
    const activeButton = document.querySelector(`[data-tab="${tabId}"]`);
    const activeContent = document.getElementById(`tab-${tabId}`);
    
    console.log(`🔍 Elementos encontrados:`, {
        activeButton: activeButton ? 'encontrado' : 'não encontrado',
        activeContent: activeContent ? 'encontrado' : 'não encontrado'
    });
    
    if (activeButton && activeContent) {
        activeButton.classList.add('active');
        activeContent.classList.add('active');
        console.log(`✅ Aba ativada: ${tabId}`);
        
        // Se for a aba de configurações, atualizar informações
        if (tabId === 'configuracoes') {
            console.log('⚙️ Atualizando informações da aba de configurações...');
            loadAppInfo();
        }
    } else {
        console.error(`❌ Erro ao ativar aba: ${tabId}`);
        if (!activeButton) console.error(`❌ Botão não encontrado para: ${tabId}`);
        if (!activeContent) console.error(`❌ Conteúdo não encontrado para: tab-${tabId}`);
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
    mainCheckUpdatesBtn: document.getElementById('mainCheckUpdatesBtn'),
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
    actionBtn: document.getElementById('versionActionBtn'),
    checkBtn: document.getElementById('versionCheckBtn')
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
    
    // Mostrar status inicial com ícone de setas girando
    updateVersionNotification('updated', updateState.currentVersion || '1.0.8');
}

// Configurar event listeners da notificação
function setupVersionNotificationListeners() {
    // Botão de ação (download)
    if (versionElements.actionBtn) {
        versionElements.actionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleVersionActionClick();
        });
    }
    
    // Botão de verificação de atualizações
    if (versionElements.checkBtn) {
        versionElements.checkBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            console.log('🔄 Botão de verificação clicado');
            addUpdateLogEntry('🔄 Botão de verificação clicado pelo usuário', 'info');
            checkForUpdates();
        });
    }
    
    // Tornar a notificação inteira clicável
    if (versionElements.notification) {
        versionElements.notification.addEventListener('click', () => {
            console.log('🔔 Notificação clicada');
            handleNotificationClick();
        });
    }
}

// Lidar com clique na notificação
function handleNotificationClick() {
    switch (versionNotificationState.currentStatus) {
        case 'updated':
            // Se está atualizado, verificar novamente
            console.log('🔄 Verificando atualizações via clique na notificação...');
            addUpdateLogEntry('🔄 Verificação iniciada via clique na notificação', 'info');
            checkForUpdates();
            break;
        case 'available':
            // Se há atualização disponível, baixar
            console.log('📥 Baixando atualização via clique na notificação...');
            addUpdateLogEntry('📥 Download iniciado via clique na notificação', 'info');
            downloadUpdate();
            break;
        case 'ready':
            // Se está pronta, instalar
            console.log('🚀 Instalando atualização via clique na notificação...');
            addUpdateLogEntry('🚀 Instalação iniciada via clique na notificação', 'info');
            installUpdate();
            break;
        default:
            // Para outros estados, verificar atualizações
            console.log('🔄 Verificando atualizações via clique na notificação...');
            addUpdateLogEntry('🔄 Verificação iniciada via clique na notificação', 'info');
            checkForUpdates();
            break;
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
            versionElements.icon.textContent = '🔄';
            versionElements.text.textContent = `Atualizado v${version}`;
            versionElements.actionBtn.style.display = 'none';
            versionElements.checkBtn.style.display = 'flex';
            versionElements.checkBtn.textContent = '🔄';
            versionElements.checkBtn.title = 'Verificar atualizações';
            versionElements.notification.classList.add('updated');
            // Tornar clicável
            versionElements.notification.style.cursor = 'pointer';
            break;
            
        case 'available':
            versionElements.icon.textContent = '📥';
            versionElements.text.textContent = 'Atualização disponível';
            versionElements.actionBtn.style.display = 'flex';
            versionElements.checkBtn.style.display = 'none';
            versionElements.actionBtn.textContent = '📥';
            versionElements.actionBtn.title = 'Baixar atualização';
            versionElements.notification.classList.add('update-available');
            versionElements.notification.style.cursor = 'pointer';
            break;
            
        case 'downloading':
            versionElements.icon.textContent = '⏳';
            versionElements.text.textContent = 'Baixando atualização...';
            versionElements.actionBtn.style.display = 'none';
            versionElements.checkBtn.style.display = 'none';
            versionElements.notification.classList.add('update-downloading');
            versionElements.notification.style.cursor = 'default';
            break;
            
        case 'ready':
            versionElements.icon.textContent = '🚀';
            versionElements.text.textContent = 'Atualização pronta!';
            versionElements.actionBtn.style.display = 'flex';
            versionElements.checkBtn.style.display = 'none';
            versionElements.actionBtn.textContent = '🔄';
            versionElements.actionBtn.title = 'Instalar e reiniciar';
            versionElements.notification.classList.add('update-ready');
            versionElements.notification.style.cursor = 'pointer';
            break;
            
        case 'checking':
            versionElements.icon.textContent = '⏳';
            versionElements.text.textContent = 'Verificando atualizações...';
            versionElements.actionBtn.style.display = 'none';
            versionElements.checkBtn.style.display = 'none';
            versionElements.notification.classList.add('update-downloading');
            versionElements.notification.style.cursor = 'default';
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
            addUpdateLogEntry('📥 Iniciando download manual da atualização...', 'info');
            downloadUpdate();
            break;
        case 'ready':
            // Instalar atualização
            addUpdateLogEntry('🚀 Iniciando instalação da atualização...', 'info');
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
    // Botão principal de verificar atualizações
    if (updateElements.mainCheckUpdatesBtn) {
        updateElements.mainCheckUpdatesBtn.addEventListener('click', () => {
            console.log('🔍 Botão principal de verificação clicado');
            checkForUpdates();
        });
    }
    
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
            updateState.isChecking = false;
            updateStatus(`Atualização disponível: v${info.version}`, 'success');
            showDownloadButton();
            
            // Restaurar botão principal
            if (updateElements.mainCheckUpdatesBtn) {
                updateElements.mainCheckUpdatesBtn.disabled = false;
                updateElements.mainCheckUpdatesBtn.innerHTML = '🔍 Verificar Atualizações Agora';
            }
            
            // Restaurar botão de verificação na notificação
            if (versionElements.checkBtn) {
                versionElements.checkBtn.disabled = false;
                versionElements.checkBtn.textContent = '🔄';
                versionElements.checkBtn.title = 'Verificar atualizações';
            }
            
            // Atualizar notificação de versão
            updateVersionNotification('available', info.version);
        });
        
        // Nenhuma atualização disponível
        window.electronAPI.onUpdateNotAvailable((event, info) => {
            console.log('✅ Aplicação está atualizada:', info);
            updateState.updateAvailable = false;
            updateState.isChecking = false;
            updateStatus('Aplicação está atualizada', 'success');
            hideUpdateButtons();
            
            // Restaurar botão principal
            if (updateElements.mainCheckUpdatesBtn) {
                updateElements.mainCheckUpdatesBtn.disabled = false;
                updateElements.mainCheckUpdatesBtn.innerHTML = '🔍 Verificar Atualizações Agora';
            }
            
            // Restaurar botão de verificação na notificação
            if (versionElements.checkBtn) {
                versionElements.checkBtn.disabled = false;
                versionElements.checkBtn.textContent = '🔄';
                versionElements.checkBtn.title = 'Verificar atualizações';
            }
            
            // Atualizar notificação de versão
            updateVersionNotification('updated', info.version || updateState.currentVersion);
        });
        
        // Erro na verificação
        window.electronAPI.onUpdateError((event, error) => {
            console.error('❌ Erro ao verificar atualizações:', error);
            updateStatus(`Erro: ${error}`, 'error');
            updateState.isChecking = false;
            
            // Restaurar botão principal
            if (updateElements.mainCheckUpdatesBtn) {
                updateElements.mainCheckUpdatesBtn.disabled = false;
                updateElements.mainCheckUpdatesBtn.innerHTML = '🔍 Verificar Atualizações Agora';
            }
            
            // Restaurar botão de verificação na notificação
            if (versionElements.checkBtn) {
                versionElements.checkBtn.disabled = false;
                versionElements.checkBtn.textContent = '🔄';
                versionElements.checkBtn.title = 'Verificar atualizações';
            }
            
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
        addUpdateLogEntry('⚠️ Verificação já em andamento, ignorando nova solicitação', 'warning');
        return;
    }
    
    try {
        console.log('🔍 Verificando atualizações...');
        addUpdateLogEntry('🔍 Iniciando verificação de atualizações...', 'info');
        
        updateState.isChecking = true;
        updateStatus('Verificando atualizações...', 'info');
        
        // Atualizar notificação para mostrar ampulheta
        updateVersionNotification('checking');
        
        // Atualizar botão principal
        if (updateElements.mainCheckUpdatesBtn) {
            updateElements.mainCheckUpdatesBtn.disabled = true;
            updateElements.mainCheckUpdatesBtn.innerHTML = '⏳ Verificando...';
        }
        
        // Atualizar botão de verificação na notificação
        if (versionElements.checkBtn) {
            versionElements.checkBtn.disabled = true;
            versionElements.checkBtn.textContent = '⏳';
            versionElements.checkBtn.title = 'Verificando...';
        }
        
        updateUI();
        
        if (window.electronAPI && window.electronAPI.checkForUpdates) {
            addUpdateLogEntry('📡 Chamando API do Electron para verificar atualizações...', 'info');
            const result = await window.electronAPI.checkForUpdates();
            console.log('📋 Resultado da verificação:', result);
            addUpdateLogEntry(`📋 Resultado da API: ${JSON.stringify(result)}`, 'info');
            
            // Processar resultado da verificação
            if (result.success && result.result.updateAvailable) {
                addUpdateLogEntry(`🎉 Atualização disponível: v${result.result.latestVersion}`, 'success');
                addUpdateLogEntry(`📥 Download disponível em: ${result.result.releaseInfo.html_url}`, 'info');
                
                // Atualizar notificação de versão
                updateVersionNotification('available', result.result.latestVersion);
                
                // Se o download foi iniciado automaticamente
                if (result.result.downloadStarted) {
                    addUpdateLogEntry('📥 Download automático iniciado...', 'info');
                    updateVersionNotification('downloading', result.result.latestVersion);
                }
            } else if (result.success) {
                addUpdateLogEntry(`✅ Aplicação está atualizada (v${result.result.currentVersion})`, 'success');
                updateVersionNotification('updated', result.result.currentVersion);
            }
        } else {
            addUpdateLogEntry('❌ API do Electron não disponível', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao verificar atualizações:', error);
        addUpdateLogEntry(`❌ Erro na verificação: ${error.message}`, 'error');
        updateStatus(`Erro: ${error.message}`, 'error');
        updateState.isChecking = false;
        
        // Restaurar botão principal
        if (updateElements.mainCheckUpdatesBtn) {
            updateElements.mainCheckUpdatesBtn.disabled = false;
            updateElements.mainCheckUpdatesBtn.innerHTML = '🔍 Verificar Atualizações Agora';
        }
        
        // Restaurar botão de verificação na notificação
        if (versionElements.checkBtn) {
            versionElements.checkBtn.disabled = false;
            versionElements.checkBtn.textContent = '🔄';
            versionElements.checkBtn.title = 'Verificar atualizações';
        }
        
        updateUI();
    }
}

// Baixar atualização
async function downloadUpdate() {
    if (updateState.isDownloading || !updateState.updateAvailable) {
        addUpdateLogEntry('⚠️ Download já em andamento ou atualização não disponível', 'warning');
        return;
    }
    
    try {
        console.log('📥 Baixando atualização...');
        addUpdateLogEntry('📥 Iniciando download da atualização...', 'info');
        updateState.isDownloading = true;
        updateStatus('Baixando atualização...', 'info');
        showProgressBar();
        updateUI();
        
        if (window.electronAPI && window.electronAPI.downloadUpdate) {
            const result = await window.electronAPI.downloadUpdate();
            console.log('📋 Resultado do download:', result);
            
            if (result.success) {
                addUpdateLogEntry('✅ Download concluído com sucesso!', 'success');
                updateState.isDownloading = false;
                updateState.updateReady = true;
                updateStatus('Atualização pronta para instalação!', 'success');
                hideProgressBar();
                updateUI();
            } else {
                addUpdateLogEntry(`❌ Erro no download: ${result.error}`, 'error');
                updateState.isDownloading = false;
                updateStatus(`Erro: ${result.error}`, 'error');
                hideProgressBar();
                updateUI();
            }
        } else {
            addUpdateLogEntry('❌ API de download não disponível', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao baixar atualização:', error);
        addUpdateLogEntry(`❌ Erro no download: ${error.message}`, 'error');
        updateStatus(`Erro: ${error.message}`, 'error');
        updateState.isDownloading = false;
        updateUI();
    }
}

// Instalar atualização
async function installUpdate() {
    if (!updateState.updateReady) {
        addUpdateLogEntry('⚠️ Atualização não está pronta para instalação', 'warning');
        return;
    }
    
    try {
        console.log('🔄 Instalando atualização...');
        addUpdateLogEntry('🚀 Iniciando instalação da atualização...', 'info');
        updateStatus('Instalando atualização e reiniciando...', 'info');
        
        if (window.electronAPI && window.electronAPI.installUpdate) {
            const result = await window.electronAPI.installUpdate();
            console.log('📋 Resultado da instalação:', result);
            
            if (result.success) {
                addUpdateLogEntry('✅ Instalação iniciada! Aplicação será fechada...', 'success');
                addUpdateLogEntry('🔄 Reinicie a aplicação após a instalação', 'info');
            } else {
                addUpdateLogEntry(`❌ Erro na instalação: ${result.error}`, 'error');
            }
        } else {
            addUpdateLogEntry('❌ API de instalação não disponível', 'error');
        }
    } catch (error) {
        console.error('❌ Erro ao instalar atualização:', error);
        addUpdateLogEntry(`❌ Erro na instalação: ${error.message}`, 'error');
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
    if (updateElements.mainCheckUpdatesBtn) {
        updateElements.mainCheckUpdatesBtn.disabled = updateState.isChecking || updateState.isDownloading;
    }
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

// ==================== FUNCIONALIDADES DAS ABAS ====================



// ==================== SISTEMA DE LOG DE ATUALIZAÇÕES ====================

// Elementos DOM para log de atualizações
const updateLogElements = {
    container: document.getElementById('updateLogContent'),
    clearBtn: document.getElementById('clearLogBtn'),
    testBtn: document.getElementById('testUpdateBtn')
};

// Estado do log
let updateLogState = {
    entries: [],
    maxEntries: 50
};

// Inicializar sistema de log
function initializeUpdateLog() {
    console.log('📝 Inicializando sistema de log de atualizações...');
    
    // Configurar event listeners
    if (updateLogElements.clearBtn) {
        updateLogElements.clearBtn.addEventListener('click', clearUpdateLog);
    }
    
    if (updateLogElements.testBtn) {
        updateLogElements.testBtn.addEventListener('click', testUpdateSystem);
    }
    
    // Adicionar entrada inicial
    addUpdateLogEntry('Sistema de atualizações inicializado', 'info');
    
    // Configurar interceptadores de eventos
    setupUpdateEventInterceptors();
    
    console.log('✅ Sistema de log de atualizações configurado');
}

// Adicionar entrada no log
function addUpdateLogEntry(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    const entry = {
        time: timestamp,
        message: message,
        type: type
    };
    
    updateLogState.entries.push(entry);
    
    // Manter apenas as últimas entradas
    if (updateLogState.entries.length > updateLogState.maxEntries) {
        updateLogState.entries.shift();
    }
    
    // Atualizar interface
    updateUpdateLogDisplay();
    
    console.log(`📝 [${timestamp}] ${message}`);
}

// Atualizar exibição do log
function updateUpdateLogDisplay() {
    if (!updateLogElements.container) return;
    
    const html = updateLogState.entries.map(entry => {
        return `
            <div class="log-entry ${entry.type}">
                <span class="log-time">[${entry.time}]</span>
                <span class="log-message">${entry.message}</span>
            </div>
        `;
    }).join('');
    
    updateLogElements.container.innerHTML = html;
    
    // Scroll para o final
    updateLogElements.container.scrollTop = updateLogElements.container.scrollHeight;
}

// Limpar log
function clearUpdateLog() {
    updateLogState.entries = [];
    addUpdateLogEntry('Log limpo pelo usuário', 'info');
}

// Testar sistema de atualizações
async function testUpdateSystem() {
    addUpdateLogEntry('Iniciando teste do sistema de atualizações...', 'info');
    
    try {
        // Verificar se a API está disponível
        if (!window.electronAPI) {
            addUpdateLogEntry('❌ API do Electron não está disponível', 'error');
            return;
        }
        
        if (!window.electronAPI.checkForUpdates) {
            addUpdateLogEntry('❌ Função checkForUpdates não está disponível', 'error');
            return;
        }
        
        addUpdateLogEntry('🔍 Chamando checkForUpdates...', 'info');
        
        const result = await window.electronAPI.checkForUpdates();
        
        if (result.success) {
            addUpdateLogEntry('✅ Verificação de atualizações executada com sucesso', 'success');
            addUpdateLogEntry(`📋 Resultado: ${JSON.stringify(result.result)}`, 'info');
            
            // Processar resultado da verificação
            if (result.result.updateAvailable) {
                addUpdateLogEntry(`🎉 Atualização disponível: v${result.result.latestVersion}`, 'success');
                addUpdateLogEntry(`📥 Download disponível em: ${result.result.releaseInfo.html_url}`, 'info');
            } else {
                addUpdateLogEntry(`✅ Aplicação está atualizada (v${result.result.currentVersion})`, 'success');
            }
        } else {
            addUpdateLogEntry(`❌ Erro na verificação: ${result.error}`, 'error');
        }
        
    } catch (error) {
        addUpdateLogEntry(`❌ Erro inesperado: ${error.message}`, 'error');
        console.error('❌ Erro no teste de atualizações:', error);
    }
}

// Interceptar eventos de atualização
function setupUpdateEventInterceptors() {
    if (window.electronAPI) {
        // Verificando atualizações
        window.electronAPI.onUpdateChecking(() => {
            addUpdateLogEntry('🔍 Verificando atualizações...', 'info');
            addUpdateLogEntry('📡 Conectando com GitHub API...', 'info');
        });
        
        // Atualização disponível
        window.electronAPI.onUpdateAvailable((event, info) => {
            addUpdateLogEntry(`📦 Atualização disponível: v${info.version}`, 'success');
            addUpdateLogEntry(`📋 Detalhes: ${JSON.stringify(info)}`, 'info');
        });
        
        // Nenhuma atualização disponível
        window.electronAPI.onUpdateNotAvailable((event, info) => {
            addUpdateLogEntry(`✅ Aplicação está atualizada: v${info.version}`, 'success');
        });
        
        // Erro na verificação
        window.electronAPI.onUpdateError((event, error) => {
            addUpdateLogEntry(`❌ Erro ao verificar atualizações: ${error}`, 'error');
            
            // Analisar o tipo de erro
            if (error.includes('406')) {
                addUpdateLogEntry('🔍 Erro 406: Problema com headers da requisição', 'warning');
                addUpdateLogEntry('💡 Solução: Verificar configuração do GitHub Provider', 'info');
            } else if (error.includes('404')) {
                addUpdateLogEntry('🔍 Erro 404: Repositório não encontrado', 'warning');
                addUpdateLogEntry('💡 Solução: Verificar se o repositório existe e é público', 'info');
            } else if (error.includes('Unable to find latest version')) {
                addUpdateLogEntry('🔍 Erro: Não consegue encontrar versão mais recente', 'warning');
                addUpdateLogEntry('💡 Solução: Verificar se há releases no GitHub', 'info');
            } else if (error.includes('HttpError')) {
                addUpdateLogEntry('🔍 Erro HTTP: Problema de conectividade', 'warning');
                addUpdateLogEntry('💡 Solução: Verificar conexão com internet', 'info');
            } else if (error.includes('Repositório não encontrado')) {
                addUpdateLogEntry('🔍 Erro: Repositório não acessível', 'warning');
                addUpdateLogEntry('💡 Solução: Verificar se o repositório AlexandreSilvestrin/XY-task existe', 'info');
            }
        });
        
        // Progresso do download
        window.electronAPI.onUpdateDownloadProgress((event, progress) => {
            const percent = Math.round(progress.percent);
            addUpdateLogEntry(`📥 Download: ${percent}% (${progress.bytesPerSecond} bytes/s)`, 'info');
        });
        
        // Download concluído
        window.electronAPI.onUpdateDownloaded((event, info) => {
            addUpdateLogEntry(`✅ Atualização baixada: v${info.version}`, 'success');
        });
    } else {
        addUpdateLogEntry('❌ API do Electron não está disponível', 'error');
    }
}

// Inicializar aba de configurações
function initializeConfigTab() {
    console.log('⚙️ Inicializando aba de configurações...');
    
    // Carregar informações da aplicação
    loadAppInfo();
    
    // Configurar event listeners da aba de configurações
    setupConfigTabListeners();
    
    // Carregar configurações salvas
    loadConfigSettings();
}

// Carregar informações da aplicação
async function loadAppInfo() {
    try {
        if (window.electronAPI && window.electronAPI.getAppInfo) {
            const appInfo = await window.electronAPI.getAppInfo();
            
            // Atualizar informações na interface
            const currentVersionEl = document.getElementById('currentVersion');
            const platformEl = document.getElementById('platform');
            const architectureEl = document.getElementById('architecture');
            const serverStatusEl = document.getElementById('serverStatus');
            
            if (currentVersionEl) currentVersionEl.textContent = appInfo.version || 'Desconhecida';
            if (platformEl) platformEl.textContent = appInfo.platform || 'Desconhecida';
            if (architectureEl) architectureEl.textContent = appInfo.arch || 'Desconhecida';
            
            // Atualizar status do servidor
            updateServerStatusDisplay(appInfo.pythonRunning);
        }
    } catch (error) {
        console.error('❌ Erro ao carregar informações da aplicação:', error);
    }
}

// Atualizar exibição do status do servidor
function updateServerStatusDisplay(isRunning) {
    const serverStatusEl = document.getElementById('serverStatus');
    if (serverStatusEl) {
        serverStatusEl.textContent = isRunning ? '🟢 Online' : '🔴 Offline';
        serverStatusEl.style.color = isRunning ? '#4caf50' : '#f44336';
    }
}

// Configurar event listeners da aba de configurações
function setupConfigTabListeners() {
    // Apenas os controles do log de atualizações permanecem
    console.log('⚙️ Event listeners da aba de configurações configurados');
}

// Carregar configurações salvas
function loadConfigSettings() {
    // Configurações simplificadas - apenas log de atualizações
    console.log('⚙️ Configurações carregadas');
}

// Funções de configuração simplificadas removidas

// ==================== CONTROLE DO PYTHON ====================

// Inicializar controle do Python
function initializePythonControl() {
    console.log('🐍 Inicializando controle do Python...');
    
    // Verificar status inicial do Python
    checkPythonStatus();
    
    // Configurar botões de controle do Python se existirem
    setupPythonControlButtons();
}

// Iniciar servidor Python automaticamente
async function startPythonServerAutomatically() {
    console.log('🐍 Iniciando servidor Python automaticamente...');
    
    try {
        // Verificar se já está rodando
        const isRunning = await checkPythonStatus();
        if (isRunning) {
            console.log('✅ Servidor Python já está rodando');
            return true;
        }
        
        // Tentar iniciar o servidor
        const result = await startPythonServer();
        if (result) {
            console.log('✅ Servidor Python iniciado automaticamente');
            return true;
        } else {
            console.warn('⚠️ Falha ao iniciar servidor Python automaticamente');
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor Python automaticamente:', error);
        return false;
    }
}

// Verificar status do Python
async function checkPythonStatus() {
    try {
        if (window.electronAPI && window.electronAPI.checkPythonStatus) {
            const status = await window.electronAPI.checkPythonStatus();
            console.log('🐍 Status do Python:', status);
            
            // Atualizar estado do servidor
            appState.serverOnline = status.isRunning;
            
            // Atualizar interface com o status
            updatePythonStatusUI(status.isRunning);
            updateUI(); // Atualizar UI geral
            
            // Atualizar status na aba de configurações
            updateServerStatusDisplay(status.isRunning);
            
            return status.isRunning;
        }
    } catch (error) {
        console.error('❌ Erro ao verificar status do Python:', error);
        appState.serverOnline = false;
        updateUI();
        updateServerStatusDisplay(false);
        return false;
    }
}

// Iniciar servidor Python manualmente
async function startPythonServer() {
    try {
        console.log('🐍 Iniciando servidor Python...');
        showStatus('Iniciando servidor Python...', 'info');
        
        if (window.electronAPI && window.electronAPI.startPythonServer) {
            const result = await window.electronAPI.startPythonServer();
            
            if (result.success) {
                console.log('✅ Servidor Python iniciado com sucesso');
                showStatus('Servidor Python iniciado!', 'success');
                appState.serverOnline = true;
                updatePythonStatusUI(true);
                updateUI(); // Atualizar UI geral
                updateServerStatusDisplay(true); // Atualizar aba de configurações
                return true;
            } else {
                console.error('❌ Falha ao iniciar servidor Python');
                showStatus('Falha ao iniciar servidor Python', 'error');
                appState.serverOnline = false;
                updateUI();
                updateServerStatusDisplay(false); // Atualizar aba de configurações
                return false;
            }
        } else {
            console.error('❌ API do Python não disponível');
            showStatus('API do Python não disponível', 'error');
            appState.serverOnline = false;
            updateUI();
            updateServerStatusDisplay(false); // Atualizar aba de configurações
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao iniciar servidor Python:', error);
        showStatus('Erro ao iniciar servidor Python: ' + error.message, 'error');
        appState.serverOnline = false;
        updateUI();
        updateServerStatusDisplay(false); // Atualizar aba de configurações
        return false;
    }
}

// Parar servidor Python
async function stopPythonServer() {
    try {
        console.log('🛑 Parando servidor Python...');
        showStatus('Parando servidor Python...', 'info');
        
        if (window.electronAPI && window.electronAPI.forceStopPython) {
            const result = await window.electronAPI.forceStopPython();
            
            if (result.success) {
                console.log('✅ Servidor Python parado com sucesso');
                showStatus('Servidor Python parado!', 'success');
                appState.serverOnline = false;
                updatePythonStatusUI(false);
                updateUI(); // Atualizar UI geral
                updateServerStatusDisplay(false); // Atualizar aba de configurações
                return true;
            } else {
                console.error('❌ Falha ao parar servidor Python');
                showStatus('Falha ao parar servidor Python', 'error');
                return false;
            }
        } else {
            console.error('❌ API do Python não disponível');
            showStatus('API do Python não disponível', 'error');
            return false;
        }
    } catch (error) {
        console.error('❌ Erro ao parar servidor Python:', error);
        showStatus('Erro ao parar servidor Python: ' + error.message, 'error');
        return false;
    }
}

// Configurar botões de controle do Python
function setupPythonControlButtons() {
    // Procurar por botões de controle do Python na interface
    const startPythonBtn = document.getElementById('startPythonBtn');
    const stopPythonBtn = document.getElementById('stopPythonBtn');
    const pythonStatusIndicator = document.getElementById('pythonStatusIndicator');
    
    if (startPythonBtn) {
        startPythonBtn.addEventListener('click', async () => {
            await startPythonServer();
        });
    }
    
    if (stopPythonBtn) {
        stopPythonBtn.addEventListener('click', async () => {
            await stopPythonServer();
        });
    }
    
    // Atualizar status inicial
    checkPythonStatus().then(isRunning => {
        updatePythonStatusUI(isRunning);
    });
}

// Atualizar interface do status do Python
function updatePythonStatusUI(isRunning) {
    const pythonStatusIndicator = document.getElementById('pythonStatusIndicator');
    const startPythonBtn = document.getElementById('startPythonBtn');
    const stopPythonBtn = document.getElementById('stopPythonBtn');
    
    if (pythonStatusIndicator) {
        pythonStatusIndicator.textContent = isRunning ? '🟢 Online' : '🔴 Offline';
        pythonStatusIndicator.style.color = isRunning ? '#4caf50' : '#f44336';
    }
    
    if (startPythonBtn) {
        startPythonBtn.disabled = isRunning;
        startPythonBtn.style.display = isRunning ? 'none' : 'inline-block';
    }
    
    if (stopPythonBtn) {
        stopPythonBtn.disabled = !isRunning;
        stopPythonBtn.style.display = isRunning ? 'inline-block' : 'none';
    }
    
    // Atualizar status do servidor na aplicação
    appState.serverOnline = isRunning;
    updateUI();
}

console.log('📱 Frontend carregado com sucesso!');
