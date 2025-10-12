const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const axios = require('axios');
const { autoUpdater } = require('electron-updater');

// Configurações
const CONFIG = {
    PORT: 5000,
    API_URL: `http://127.0.0.1:5000`,
    PYTHON_SCRIPT: app.isPackaged 
        ? path.join(process.resourcesPath, 'backend', 'app.py')
        : path.join(__dirname, 'backend', 'app.py'),
    CHECK_INTERVAL: 2000,
    MAX_RETRIES: 10
};

// Configurações do Auto-Updater
const UPDATE_CONFIG = {
    // URL do servidor de atualizações (GitHub Releases)
    UPDATE_SERVER_URL: 'https://github.com/AlexandreSilvestrin/XY-task/releases/latest',
    CHECK_INTERVAL: 24 * 60 * 60 * 1000, // Verificar a cada 24 horas
    AUTO_DOWNLOAD: false, // Sempre perguntar antes de baixar
    AUTO_INSTALL_ON_APP_QUIT: false // Sempre perguntar antes de instalar
};

// Configurar o auto-updater
autoUpdater.autoDownload = UPDATE_CONFIG.AUTO_DOWNLOAD;
autoUpdater.autoInstallOnAppQuit = UPDATE_CONFIG.AUTO_INSTALL_ON_APP_QUIT;

// Força aceitar update não assinado (para uso interno)
autoUpdater.allowPrerelease = true;
autoUpdater.forceDevUpdateConfig = true;

// Configurar o servidor de atualizações corretamente
autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'AlexandreSilvestrin',
    repo: 'XY-task',
    private: false
});

// Configurar headers para evitar erro 406
autoUpdater.requestHeaders = {
    'User-Agent': 'XY-task-updater',
    'Accept': 'application/vnd.github.v3+json'
};

let mainWindow;
let pythonProcess;
let isPythonRunning = false;

// Função para criar a janela principal
function createWindow() {
    console.log('🪟 Criando janela principal...');
    
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 1000,
        minWidth: 800,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'icon_pg.png'), // Ícone do programa
        title: 'XY-task - Electron + Python',
        show: false, // Não mostrar até estar pronto
        frame: false, // Remove a borda padrão da janela
        titleBarStyle: 'hidden', // Esconde a barra de título padrão
        resizable: true,
        minimizable: true,
        maximizable: true
    });

    // Carregar o arquivo HTML
    mainWindow.loadFile(path.join(__dirname, 'frontend', 'index.html'));

    // Mostrar janela quando estiver pronta
    mainWindow.once('ready-to-show', () => {
        console.log('✅ Janela pronta para exibição');
        mainWindow.show();
        
        // Focar na janela
        if (process.platform === 'darwin') {
            app.dock.show();
        }
    });

    // Abrir DevTools em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    // Eventos da janela
    mainWindow.on('closed', () => {
        console.log('🪟 Janela fechada');
        mainWindow = null;
    });

    mainWindow.on('minimize', () => {
        console.log('📦 Janela minimizada');
    });

    mainWindow.on('maximize', () => {
        console.log('📦 Janela maximizada');
    });

    // Prevenir navegação para URLs externas
    mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        
        if (parsedUrl.origin !== `file://`) {
            event.preventDefault();
            console.log('🚫 Navegação bloqueada para:', navigationUrl);
        }
    });
}

// Event listeners do Auto-Updater
autoUpdater.on('checking-for-update', () => {
    console.log('🔍 Verificando atualizações...');
    if (mainWindow) {
        mainWindow.webContents.send('update-checking');
    }
});

autoUpdater.on('update-available', (info) => {
    console.log('📦 Atualização disponível:', info.version);
    if (mainWindow) {
        mainWindow.webContents.send('update-available', info);
    }
    
    // Mostrar notificação para o usuário
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Atualização Disponível',
        message: `Uma nova versão (${info.version}) está disponível!`,
        detail: 'Deseja baixar e instalar a atualização agora?',
        buttons: ['Baixar Agora', 'Mais Tarde'],
        defaultId: 0,
        cancelId: 1
    }).then((result) => {
        if (result.response === 0) {
            // Usuário escolheu baixar agora
            autoUpdater.downloadUpdate();
        }
    });
});

autoUpdater.on('update-not-available', (info) => {
    console.log('✅ Aplicação está atualizada:', info.version);
    if (mainWindow) {
        mainWindow.webContents.send('update-not-available', info);
    }
});

autoUpdater.on('error', (err) => {
    console.error('❌ Erro ao verificar atualizações:', err);
    if (mainWindow) {
        mainWindow.webContents.send('update-error', err.message);
    }
});

autoUpdater.on('download-progress', (progressObj) => {
    let log_message = "Velocidade de download: " + progressObj.bytesPerSecond;
    log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
    log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
    console.log('📥 Progresso do download:', log_message);
    
    if (mainWindow) {
        mainWindow.webContents.send('update-download-progress', progressObj);
    }
});

autoUpdater.on('update-downloaded', (info) => {
    console.log('✅ Atualização baixada:', info.version);
    if (mainWindow) {
        mainWindow.webContents.send('update-downloaded', info);
    }
    
    // Perguntar se o usuário quer reiniciar agora
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Atualização Baixada',
        message: 'A atualização foi baixada com sucesso!',
        detail: 'Deseja reiniciar a aplicação agora para aplicar a atualização?',
        buttons: ['Reiniciar Agora', 'Mais Tarde'],
        defaultId: 0,
        cancelId: 1
    }).then((result) => {
        if (result.response === 0) {
            // Usuário escolheu reiniciar agora
            autoUpdater.quitAndInstall();
        }
    });
});

// Função para iniciar o servidor Python
async function startPythonServer() {
    if (isPythonRunning) {
        console.log('🐍 Servidor Python já está rodando');
        return true;
    }

    console.log('🐍 Iniciando servidor Python...');
    console.log('📁 Script Python:', CONFIG.PYTHON_SCRIPT);

    try {
        // Verificar se o arquivo Python existe
        if (!fs.existsSync(CONFIG.PYTHON_SCRIPT)) {
            throw new Error(`Arquivo Python não encontrado: ${CONFIG.PYTHON_SCRIPT}`);
        }

        // Iniciar processo Python
        // Detectar se estamos em um build empacotado ou em desenvolvimento
        let pythonPath, backendDir;
        
        if (app.isPackaged) {
            // Em build empacotado, o Python está em resources/backend/python/
            pythonPath = path.join(process.resourcesPath, 'backend', 'python', 'python.exe');
            backendDir = path.join(process.resourcesPath, 'backend');
            console.log('📦 MODO DE PRODUÇÃO - Aplicação empacotada');
        } else {
            // Em desenvolvimento, usar caminho relativo
            pythonPath = path.join(__dirname, 'backend', 'python', 'python.exe');
            backendDir = path.join(__dirname, 'backend');
            console.log('🔧 MODO DE DESENVOLVIMENTO - Aplicação não empacotada');
        }
        
        console.log('🐍 Caminho do Python:', pythonPath);
        console.log('🐍 Diretório do backend:', backendDir);
        
        // Verificar se o executável Python existe
        if (!fs.existsSync(pythonPath)) {
            throw new Error(`Executável Python não encontrado: ${pythonPath}`);
        }
        
        // Verificar se o diretório do backend existe
        if (!fs.existsSync(backendDir)) {
            throw new Error(`Diretório do backend não encontrado: ${backendDir}`);
        }
        
        console.log('✅ Todos os arquivos necessários foram encontrados');
        
        pythonProcess = spawn(pythonPath, [CONFIG.PYTHON_SCRIPT], {
            cwd: backendDir,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PYTHONPATH: backendDir
            }
        });

        // Configurar handlers do processo
        pythonProcess.stdout.on('data', (data) => {
            console.log('🐍 Python stdout:', data.toString().trim());
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error('🐍 Python stderr:', data.toString().trim());
        });

        pythonProcess.on('close', (code) => {
            console.log(`🐍 Processo Python finalizado com código: ${code}`);
            isPythonRunning = false;
            pythonProcess = null;
        });

        pythonProcess.on('error', (error) => {
            console.error('🐍 Erro no processo Python:', error);
            isPythonRunning = false;
            pythonProcess = null;
        });

        // Aguardar o servidor estar pronto
        const isReady = await waitForServer();
        if (isReady) {
            isPythonRunning = true;
            console.log('✅ Servidor Python iniciado com sucesso!');
            return true;
        } else {
            throw new Error('Servidor Python não respondeu');
        }

    } catch (error) {
        console.error('❌ Erro ao iniciar servidor Python:', error);
        isPythonRunning = false;
        return false;
    }
}

// Função para aguardar o servidor estar pronto
async function waitForServer(retries = 0) {
    if (retries >= CONFIG.MAX_RETRIES) {
        console.error('❌ Timeout aguardando servidor Python');
        return false;
    }

    try {
        console.log(`🔄 Verificando servidor Python... (tentativa ${retries + 1}/${CONFIG.MAX_RETRIES})`);
        
        const response = await axios.get(`${CONFIG.API_URL}/health`, {
            timeout: 2000
        });

        if (response.status === 200) {
            console.log('✅ Servidor Python está respondendo!');
            return true;
        }
    } catch (error) {
        console.log('⏳ Servidor ainda não está pronto, aguardando...');
        
        // Aguardar antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, CONFIG.CHECK_INTERVAL));
        return waitForServer(retries + 1);
    }
}

// Função para parar o servidor Python
async function stopPythonServer() {
    if (pythonProcess && isPythonRunning) {
        console.log('🛑 Parando servidor Python...');
        
        try {
            // Primeiro, tentar shutdown via HTTP
            console.log('🌐 Enviando requisição de shutdown via HTTP...');
            await axios.post(`${CONFIG.API_URL}/shutdown`, {}, {
                timeout: 3000
            });
            console.log('✅ Requisição de shutdown enviada');
        } catch (error) {
            console.log('⚠️ Shutdown via HTTP falhou, usando sinais do sistema...');
        }
        
        // Aguardar um pouco para o shutdown gracioso
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verificar se o processo ainda está ativo
        if (pythonProcess && !pythonProcess.killed) {
            console.log('🔨 Processo ainda ativo, enviando SIGTERM...');
            pythonProcess.kill('SIGTERM');
            
            // Aguardar mais um pouco
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Se ainda estiver ativo, forçar com SIGKILL
            if (pythonProcess && !pythonProcess.killed) {
                console.log('🔨 Forçando parada com SIGKILL...');
                pythonProcess.kill('SIGKILL');
                
                // Aguardar e verificar novamente
                setTimeout(() => {
                    if (pythonProcess && !pythonProcess.killed) {
                        console.error('❌ Não foi possível finalizar o processo Python');
                        console.log('🔍 PID do processo:', pythonProcess.pid);
                    } else {
                        console.log('✅ Processo Python finalizado com sucesso');
                    }
                }, 2000);
            } else {
                console.log('✅ Processo Python finalizado graciosamente');
            }
        } else {
            console.log('✅ Processo Python finalizado via HTTP');
        }
        
        isPythonRunning = false;
        pythonProcess = null;
    } else if (pythonProcess) {
        // Se o processo existe mas isPythonRunning é false, forçar kill
        console.log('🔨 Forçando finalização de processo Python órfão...');
        pythonProcess.kill('SIGKILL');
        pythonProcess = null;
    }
}

// Handlers IPC para comunicação com o renderer
ipcMain.handle('select-file', async () => {
    try {
        console.log('📂 Abrindo diálogo de seleção de arquivo...');
        
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Selecionar Arquivo',
            properties: ['openFile'],
            filters: [
                { name: 'Todos os Arquivos', extensions: ['*'] },
                { name: 'Documentos', extensions: ['txt', 'doc', 'docx', 'pdf'] },
                { name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp'] },
                { name: 'Arquivos de Dados', extensions: ['csv', 'xlsx', 'json', 'xml'] }
            ]
        });

        console.log('📂 Resultado da seleção:', result);
        return result;
    } catch (error) {
        console.error('❌ Erro ao selecionar arquivo:', error);
        return { canceled: true };
    }
});

ipcMain.handle('select-folder', async () => {
    try {
        console.log('📁 Abrindo diálogo de seleção de pasta de entrada...');
        
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Selecionar Pasta de Entrada',
            properties: ['openDirectory', 'createDirectory']
        });

        console.log('📁 Resultado da seleção:', result);
        return result;
    } catch (error) {
        console.error('❌ Erro ao selecionar pasta:', error);
        return { canceled: true };
    }
});

ipcMain.handle('select-output-folder', async () => {
    try {
        console.log('📁 Abrindo diálogo de seleção de pasta de saída...');
        
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Selecionar Pasta de Saída',
            properties: ['openDirectory', 'createDirectory']
        });

        console.log('📁 Resultado da seleção:', result);
        return result;
    } catch (error) {
        console.error('❌ Erro ao selecionar pasta de saída:', error);
        return { canceled: true };
    }
});

ipcMain.handle('get-app-info', () => {
    return {
        name: app.getName(),
        version: app.getVersion(),
        platform: process.platform,
        arch: process.arch,
        pythonRunning: isPythonRunning,
        serverUrl: CONFIG.API_URL
    };
});

// Handlers para controle da janela
ipcMain.handle('window-close', () => {
    mainWindow.close();
});

ipcMain.handle('window-minimize', () => {
    mainWindow.minimize();
});

ipcMain.handle('window-maximize', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

ipcMain.handle('open-folder', async (event, folderPath) => {
    try {
        console.log('📁 Abrindo pasta:', folderPath);
        
        const { shell } = require('electron');
        await shell.openPath(folderPath);
        
        console.log('✅ Pasta aberta com sucesso');
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao abrir pasta:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('open-external', async (event, url) => {
    try {
        console.log('🌐 Abrindo URL no navegador padrão:', url);
        
        const { shell } = require('electron');
        await shell.openExternal(url);
        
        console.log('✅ URL aberta no navegador padrão');
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao abrir URL:', error);
        return { success: false, error: error.message };
    }
});

// Handler para forçar parada do servidor Python
ipcMain.handle('force-stop-python', async () => {
    console.log('🛑 Forçando parada do servidor Python via IPC...');
    await stopPythonServer();
    return { success: true };
});

// Handlers para controle de atualizações
ipcMain.handle('check-for-updates', async () => {
    try {
        console.log('🔍 Verificando atualizações manualmente...');
        if (app.isPackaged) {
            // Usar verificação manual via API REST do GitHub
            const result = await checkGitHubReleases();
            
            // Se há atualização disponível, iniciar download automático
            if (result.updateAvailable) {
                console.log('📥 Iniciando download automático da atualização...');
                await downloadUpdateFromGitHub(result.releaseInfo);
            }
            
            return { success: true, result };
        } else {
            console.log('⚠️ Modo desenvolvimento - simulando verificação de atualizações');
            return { success: false, error: 'Aplicação não está empacotada' };
        }
    } catch (error) {
        console.error('❌ Erro ao verificar atualizações:', error);
        return { success: false, error: error.message };
    }
});

// Função para verificar releases via API REST do GitHub
async function checkGitHubReleases() {
    try {
        console.log('🔍 Verificando releases via API REST do GitHub...');
        
        // Primeiro, verificar se o repositório existe
        const repoResponse = await axios.get('https://api.github.com/repos/AlexandreSilvestrin/XY-task', {
            headers: {
                'User-Agent': 'XY-task-updater',
                'Accept': 'application/vnd.github.v3+json'
            },
            timeout: 10000
        });
        
        console.log('📋 Repositório encontrado:', repoResponse.data.full_name);
        
        // Agora buscar as releases
        const releasesResponse = await axios.get('https://api.github.com/repos/AlexandreSilvestrin/XY-task/releases', {
            headers: {
                'User-Agent': 'XY-task-updater',
                'Accept': 'application/vnd.github.v3+json'
            },
            timeout: 10000
        });
        
        console.log('📋 Total de releases encontradas:', releasesResponse.data.length);
        
        if (releasesResponse.data.length === 0) {
            throw new Error('Nenhuma release encontrada no repositório');
        }
        
        const latestRelease = releasesResponse.data[0]; // Primeira release é a mais recente
        const currentVersion = app.getVersion();
        
        console.log('📋 Release mais recente:', latestRelease.tag_name);
        console.log('📋 Versão atual:', currentVersion);
        
        // Comparar versões
        const isUpdateAvailable = compareVersions(latestRelease.tag_name.replace('v', ''), currentVersion) > 0;
        
        return {
            updateAvailable: isUpdateAvailable,
            currentVersion: currentVersion,
            latestVersion: latestRelease.tag_name.replace('v', ''),
            releaseInfo: latestRelease,
            totalReleases: releasesResponse.data.length
        };
        
    } catch (error) {
        console.error('❌ Erro ao verificar releases do GitHub:', error);
        
        // Se for erro 404, pode ser que o repositório não exista ou seja privado
        if (error.response && error.response.status === 404) {
            throw new Error('Repositório não encontrado ou não acessível. Verifique se o repositório existe e é público.');
        }
        
        throw error;
    }
}

// Função para comparar versões
function compareVersions(version1, version2) {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
        const v1part = v1parts[i] || 0;
        const v2part = v2parts[i] || 0;
        
        if (v1part > v2part) return 1;
        if (v1part < v2part) return -1;
    }
    
    return 0;
}

// Função para baixar atualização do GitHub
async function downloadUpdateFromGitHub(releaseInfo) {
    try {
        console.log('📥 Baixando atualização do GitHub...');
        
        // Encontrar o arquivo de instalação para Windows
        const installerAsset = releaseInfo.assets.find(asset => 
            asset.name.includes('.exe') && 
            (asset.name.includes('Setup') || asset.name.includes('Installer'))
        );
        
        if (!installerAsset) {
            throw new Error('Arquivo de instalação não encontrado na release');
        }
        
        console.log('📦 Arquivo encontrado:', installerAsset.name);
        console.log('📦 URL de download:', installerAsset.browser_download_url);
        
        // Baixar o arquivo
        const response = await axios({
            method: 'GET',
            url: installerAsset.browser_download_url,
            responseType: 'stream',
            headers: {
                'User-Agent': 'XY-task-updater',
                'Accept': 'application/octet-stream'
            }
        });
        
        const downloadsPath = app.getPath('downloads');
        const installerPath = path.join(downloadsPath, installerAsset.name);
        
        console.log('💾 Salvando em:', installerPath);
        
        // Salvar o arquivo
        const writer = fs.createWriteStream(installerPath);
        response.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log('✅ Download concluído:', installerPath);
                resolve({
                    success: true,
                    installerPath: installerPath,
                    version: releaseInfo.tag_name.replace('v', ''),
                    releaseInfo: releaseInfo
                });
            });
            
            writer.on('error', (error) => {
                console.error('❌ Erro ao salvar arquivo:', error);
                reject(error);
            });
        });
        
    } catch (error) {
        console.error('❌ Erro ao baixar atualização:', error);
        throw error;
    }
}

ipcMain.handle('download-update', async () => {
    try {
        console.log('📥 Baixando atualização...');
        await autoUpdater.downloadUpdate();
        return { success: true };
    } catch (error) {
        console.error('❌ Erro ao baixar atualização:', error);
        return { success: false, error: error.message };
    }
});

// Handler para instalar atualização baixada
ipcMain.handle('install-update', async () => {
    try {
        console.log('🚀 Instalando atualização...');
        
        // Encontrar o arquivo de instalação mais recente na pasta Downloads
        const downloadsPath = app.getPath('downloads');
        const files = fs.readdirSync(downloadsPath);
        
        const installerFile = files.find(file => 
            file.includes('XY-task') && 
            file.includes('Setup') && 
            file.endsWith('.exe')
        );
        
        if (!installerFile) {
            throw new Error('Arquivo de instalação não encontrado na pasta Downloads');
        }
        
        const installerPath = path.join(downloadsPath, installerFile);
        console.log('📦 Executando instalador:', installerPath);
        
        // Executar o instalador
        const { spawn } = require('child_process');
        const installer = spawn(installerPath, ['/S'], {
            detached: true,
            stdio: 'ignore'
        });
        
        installer.unref();
        
        // Fechar a aplicação atual
        setTimeout(() => {
            app.quit();
        }, 2000);
        
        return { success: true, installerPath: installerPath };
        
    } catch (error) {
        console.error('❌ Erro ao instalar atualização:', error);
        return { success: false, error: error.message };
    }
});

// Eventos do auto-updater

ipcMain.handle('get-update-info', () => {
    return {
        currentVersion: app.getVersion(),
        autoDownload: autoUpdater.autoDownload,
        autoInstallOnAppQuit: autoUpdater.autoInstallOnAppQuit,
        updateServerUrl: UPDATE_CONFIG.UPDATE_SERVER_URL
    };
});

// Função para verificar e finalizar processos Python órfãos
function cleanupOrphanedProcesses() {
    console.log('🔍 Verificando processos Python órfãos...');
    
    // No Windows, podemos usar tasklist para verificar processos Python
    if (process.platform === 'win32') {
        const { exec } = require('child_process');
        exec('tasklist /FI "IMAGENAME eq python.exe" /FO CSV', (error, stdout) => {
            if (!error && stdout.includes('python.exe')) {
                console.log('⚠️ Processos Python encontrados no sistema:');
                console.log(stdout);
            } else {
                console.log('✅ Nenhum processo Python órfão encontrado');
            }
        });
    }
}

// Eventos da aplicação
app.whenReady().then(async () => {
    console.log('🚀 Aplicação Electron iniciada');
    
    // Verificar processos órfãos na inicialização
    cleanupOrphanedProcesses();
    
    // Iniciar servidor Python
    const pythonStarted = await startPythonServer();
    
    if (!pythonStarted) {
        console.error('❌ Falha ao iniciar servidor Python');
        
        // Mostrar erro para o usuário
        dialog.showErrorBox(
            'Erro de Inicialização',
            'Não foi possível iniciar o servidor Python.\n\nVerifique se o Python está instalado e as dependências estão corretas.'
        );
        
        app.quit();
        return;
    }
    
    // Criar janela principal
    createWindow();
    
    // Verificação automática removida - usuário deve verificar manualmente
    
    // Eventos específicos do macOS
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', async () => {
    console.log('🪟 Todas as janelas foram fechadas');
    
    // Parar servidor Python
    await stopPythonServer();
    
    // Aguardar um pouco para garantir que o processo Python seja finalizado
    setTimeout(() => {
        // No macOS, aplicações ficam ativas mesmo sem janelas
        if (process.platform !== 'darwin') {
            app.quit();
        }
    }, 1000);
});

app.on('before-quit', async (event) => {
    console.log('🛑 Aplicação sendo finalizada...');
    
    // Prevenir o fechamento imediato para garantir limpeza
    event.preventDefault();
    
    // Parar servidor Python
    await stopPythonServer();
    
    // Aguardar e então finalizar
    setTimeout(() => {
        app.exit(0);
    }, 2000);
});

app.on('will-quit', async (event) => {
    console.log('🛑 Finalizando aplicação...');
    await stopPythonServer();
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
    console.error('❌ Erro não capturado:', error);
    
    dialog.showErrorBox(
        'Erro Crítico',
        `Ocorreu um erro inesperado:\n\n${error.message}\n\nA aplicação será fechada.`
    );
    
    app.quit();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promise rejeitada não tratada:', reason);
});

// Log de informações do sistema
console.log('📊 Informações do Sistema:');
console.log('  - Electron:', process.versions.electron);
console.log('  - Node.js:', process.versions.node);
console.log('  - Chrome:', process.versions.chrome);
console.log('  - Plataforma:', process.platform);
console.log('  - Arquitetura:', process.arch);
console.log('  - Diretório da aplicação:', __dirname);
