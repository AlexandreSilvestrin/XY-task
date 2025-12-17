const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const axios = require('axios');

// Configurar atualizações automáticas via update-electron-app
// Isso cuida automaticamente de verificar, baixar e notificar sobre atualizações
require('update-electron-app')({
    repo: 'AlexandreSilvestrin/XY-task',
    updateInterval: '1 hour',
    notifyUser: true
});


// Verificação de instância única
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    console.log('Aplicação já está em execução. Fechando nova instância...');
    app.quit();
} else {
    // Configurar handler para quando uma segunda instância tentar abrir
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        console.log('Segunda instância detectada, focando na janela existente...');
        
        // Se a janela principal existe, focar nela
        if (mainWindow) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
            }
            mainWindow.focus();
            mainWindow.show();
        }
    });
}

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


let mainWindow;
let splashWindow;
let pythonProcess;
let isPythonRunning = false;

// Função para criar a janela principal
function createWindow() {
    console.log('Criando janela principal...');
    
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

    // Criar janela de splash screen pequena
    createSplashWindow();

    // Carregar a aplicação principal imediatamente (mas não mostrar)
    loadMainApplication();
}

// Função para criar janela de splash pequena
function createSplashWindow() {
    console.log('Criando janela de splash...');
    
    splashWindow = new BrowserWindow({
        width: 500,
        height: 350,
        minWidth: 500,
        minHeight: 350,
        maxWidth: 500,
        maxHeight: 350,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        },
        icon: path.join(__dirname, 'assets', 'icon_pg.png'),
        title: 'XY-task - Carregando...',
        show: false,
        frame: false,
        titleBarStyle: 'hidden',
        resizable: false,
        minimizable: false,
        maximizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        center: true
    });

    // Carregar splash screen com versão
    const version = require('./package.json').version;
    splashWindow.loadFile(path.join(__dirname, 'frontend', 'splash.html'), {
        query: { version: version }
    });

    // Mostrar splash quando estiver pronto
    splashWindow.once('ready-to-show', () => {
        console.log('Splash screen pronto');
        splashWindow.show();
        splashWindow.center();
        
        // Focar na janela
        if (process.platform === 'darwin') {
            app.dock.show();
        }
    });

    // Fechar splash e mostrar janela principal após delay
    setTimeout(() => {
        if (splashWindow) {
            splashWindow.close();
            splashWindow = null;
        }
        if (mainWindow) {
            mainWindow.show();
            mainWindow.center();
            mainWindow.focus();
        }
    }, 2000);

    // Abrir DevTools em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
        mainWindow.webContents.openDevTools();
    }

    // Eventos da janela
    mainWindow.on('closed', () => {
        console.log('Janela fechada');
        mainWindow = null;
    });

    mainWindow.on('minimize', () => {
        console.log('Janela minimizada');
    });

    mainWindow.on('maximize', () => {
        console.log('Janela maximizada');
    });

    // Prevenir navegação para URLs externas
    mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        
        if (parsedUrl.origin !== `file://`) {
            event.preventDefault();
            console.log('Navegação bloqueada para:', navigationUrl);
        }
    });
}

// Função para carregar a aplicação principal
async function loadMainApplication() {
    console.log('Carregando aplicação principal...');
    
    try {
        // Carregar o HTML principal
        await mainWindow.loadFile(path.join(__dirname, 'frontend', 'index.html'));
        console.log('Aplicação principal carregada');
        
        // Notificar o renderer que a aplicação está pronta
        mainWindow.webContents.send('app-ready');
        
    } catch (error) {
        console.error('Erro ao carregar aplicação principal:', error);
    }
}


// Função para iniciar o servidor Python
async function startPythonServer() {
    if (isPythonRunning) {
        console.log('Servidor Python já está rodando');
        return true;
    }

    console.log('Iniciando servidor Python...');
    console.log('Script Python:', CONFIG.PYTHON_SCRIPT);

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
            console.log('MODO DE PRODUÇÃO - Aplicação empacotada');
        } else {
            // Em desenvolvimento, usar caminho relativo
            pythonPath = path.join(__dirname, 'backend', 'python', 'python.exe');
            backendDir = path.join(__dirname, 'backend');
            console.log('MODO DE DESENVOLVIMENTO - Aplicação não empacotada');
        }
        
        console.log('Caminho do Python:', pythonPath);
        console.log('Diretório do backend:', backendDir);
        
        // Verificar se o executável Python existe
        if (!fs.existsSync(pythonPath)) {
            throw new Error(`Executável Python não encontrado: ${pythonPath}`);
        }
        
        // Verificar se o diretório do backend existe
        if (!fs.existsSync(backendDir)) {
            throw new Error(`Diretório do backend não encontrado: ${backendDir}`);
        }
        
        console.log('Todos os arquivos necessários foram encontrados');
        
        pythonProcess = spawn(pythonPath, [CONFIG.PYTHON_SCRIPT], {
            cwd: backendDir,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                PYTHONPATH: backendDir,
                PYTHONIOENCODING: 'utf-8',
                PYTHONUTF8: '1'
            }
        });

        // Configurar handlers do processo
        pythonProcess.stdout.on('data', (data) => {
            // Garantir decodificação UTF-8
            const text = Buffer.isBuffer(data) ? data.toString('utf8') : data.toString('utf8');
            console.log('Python stdout:', text.trim());
        });

        pythonProcess.stderr.on('data', (data) => {
            // Garantir decodificação UTF-8
            const text = Buffer.isBuffer(data) ? data.toString('utf8') : data.toString('utf8');
            console.error('Python stderr:', text.trim());
        });

        pythonProcess.on('close', (code) => {
            console.log(`Processo Python finalizado com código: ${code}`);
            isPythonRunning = false;
            pythonProcess = null;
        });

        pythonProcess.on('error', (error) => {
            console.error('Erro no processo Python:', error);
            isPythonRunning = false;
            pythonProcess = null;
        });

        // Aguardar o servidor estar pronto
        const isReady = await waitForServer();
        if (isReady) {
            isPythonRunning = true;
            console.log('Servidor Python iniciado com sucesso!');
            return true;
        } else {
            throw new Error('Servidor Python não respondeu');
        }

    } catch (error) {
        console.error('Erro ao iniciar servidor Python:', error);
        isPythonRunning = false;
        return false;
    }
}

// Função para aguardar o servidor estar pronto
async function waitForServer(retries = 0) {
    if (retries >= CONFIG.MAX_RETRIES) {
        console.error('Timeout aguardando servidor Python');
        return false;
    }

    try {
        console.log(`Verificando servidor Python... (tentativa ${retries + 1}/${CONFIG.MAX_RETRIES})`);
        
        const response = await axios.get(`${CONFIG.API_URL}/health`, {
            timeout: 2000
        });

        if (response.status === 200) {
            console.log('Servidor Python está respondendo!');
            return true;
        }
    } catch (error) {
        console.log('Servidor ainda não está pronto, aguardando...');
        
        // Aguardar antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, CONFIG.CHECK_INTERVAL));
        return waitForServer(retries + 1);
    }
}

// Função para parar o servidor Python
async function stopPythonServer() {
    if (pythonProcess && isPythonRunning) {
        console.log('Parando servidor Python...');
        
        try {
            // Primeiro, tentar shutdown via HTTP
            console.log('Enviando requisição de shutdown via HTTP...');
            await axios.post(`${CONFIG.API_URL}/shutdown`, {}, {
                timeout: 3000
            });
            console.log('Requisição de shutdown enviada');
        } catch (error) {
            console.log('Shutdown via HTTP falhou, usando sinais do sistema...');
        }
        
        // Aguardar um pouco para o shutdown gracioso
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verificar se o processo ainda está ativo
        if (pythonProcess && !pythonProcess.killed) {
            console.log('Processo ainda ativo, enviando SIGTERM...');
            pythonProcess.kill('SIGTERM');
            
            // Aguardar mais um pouco
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Se ainda estiver ativo, forçar com SIGKILL
            if (pythonProcess && !pythonProcess.killed) {
                console.log('Forçando parada com SIGKILL...');
                pythonProcess.kill('SIGKILL');
                
                // Aguardar e verificar novamente
                setTimeout(() => {
                    if (pythonProcess && !pythonProcess.killed) {
                        console.error('Não foi possível finalizar o processo Python');
                        console.log('PID do processo:', pythonProcess.pid);
                    } else {
                        console.log('Processo Python finalizado com sucesso');
                    }
                }, 2000);
            } else {
                console.log('Processo Python finalizado graciosamente');
            }
        } else {
            console.log('Processo Python finalizado via HTTP');
        }
        
        isPythonRunning = false;
        pythonProcess = null;
    } else if (pythonProcess) {
        // Se o processo existe mas isPythonRunning é false, forçar kill
        console.log('Forçando finalização de processo Python órfão...');
        pythonProcess.kill('SIGKILL');
        pythonProcess = null;
    }
}

// Handlers IPC para comunicação com o renderer
ipcMain.handle('select-file', async () => {
    try {
        console.log('Abrindo diálogo de seleção de arquivo...');
        
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

        console.log('Resultado da seleção:', result);
        return result;
    } catch (error) {
        console.error('Erro ao selecionar arquivo:', error);
        return { canceled: true };
    }
});

ipcMain.handle('select-folder', async () => {
    try {
        console.log('Abrindo diálogo de seleção de pasta de entrada...');
        
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Selecionar Pasta de Entrada',
            properties: ['openDirectory', 'createDirectory']
        });

        console.log('Resultado da seleção:', result);
        return result;
    } catch (error) {
        console.error('Erro ao selecionar pasta:', error);
        return { canceled: true };
    }
});

ipcMain.handle('select-output-folder', async () => {
    try {
        console.log('Abrindo diálogo de seleção de pasta de saída...');
        
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Selecionar Pasta de Saída',
            properties: ['openDirectory', 'createDirectory']
        });

        console.log('Resultado da seleção:', result);
        return result;
    } catch (error) {
        console.error('Erro ao selecionar pasta de saída:', error);
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

// Handler para iniciar Python sob demanda
ipcMain.handle('start-python-server', async () => {
    console.log('Iniciando servidor Python sob demanda...');
    const success = await startPythonServer();
    return { success, isRunning: isPythonRunning };
});

// Handler para verificar status do Python
ipcMain.handle('check-python-status', () => {
    return { isRunning: isPythonRunning };
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
        console.log('Abrindo pasta:', folderPath);
        
        const { shell } = require('electron');
        await shell.openPath(folderPath);
        
        console.log('Pasta aberta com sucesso');
        return { success: true };
    } catch (error) {
        console.error('Erro ao abrir pasta:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('open-external', async (event, url) => {
    try {
        console.log('Abrindo URL no navegador padrão:', url);
        
        const { shell } = require('electron');
        await shell.openExternal(url);
        
        console.log('URL aberta no navegador padrão');
        return { success: true };
    } catch (error) {
        console.error('Erro ao abrir URL:', error);
        return { success: false, error: error.message };
    }
});

// Handler para forçar parada do servidor Python
ipcMain.handle('force-stop-python', async () => {
    console.log('Forçando parada do servidor Python via IPC...');
    await stopPythonServer();
    return { success: true };
});

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

// Função para verificar releases via API REST do GitHub
async function checkGitHubReleases() {
    try {
        console.log('Verificando releases via API REST do GitHub...');
        
        // Buscar as releases
        const releasesResponse = await axios.get('https://api.github.com/repos/AlexandreSilvestrin/XY-task/releases', {
            headers: {
                'User-Agent': 'XY-task-updater',
                'Accept': 'application/vnd.github.v3+json'
            },
            timeout: 10000
        });
        
        console.log('Total de releases encontradas:', releasesResponse.data.length);
        
        if (releasesResponse.data.length === 0) {
            throw new Error('Nenhuma release encontrada no repositório');
        }
        
        const latestRelease = releasesResponse.data[0]; // Primeira release é a mais recente
        const currentVersion = app.getVersion();
        
        console.log('Release mais recente:', latestRelease.tag_name);
        console.log('Versão atual:', currentVersion);
        
        // Extrair versão da tag (remover 'v' se houver)
        const latestVersion = latestRelease.tag_name.replace(/^v/, '');
        
        // Comparar versões
        const isUpdateAvailable = compareVersions(latestVersion, currentVersion) > 0;
        
        return {
            updateAvailable: isUpdateAvailable,
            currentVersion: currentVersion,
            latestVersion: latestVersion,
            releaseInfo: latestRelease,
            totalReleases: releasesResponse.data.length
        };
        
    } catch (error) {
        console.error('Erro ao verificar releases do GitHub:', error);
        
        // Se for erro 404, pode ser que o repositório não exista ou seja privado
        if (error.response && error.response.status === 404) {
            throw new Error('Repositório não encontrado ou não acessível. Verifique se o repositório existe e é público.');
        }
        
        throw error;
    }
}

// Handlers para controle de atualizações
// O update-electron-app cuida automaticamente das atualizações
// Este handler permite verificação manual via botão
ipcMain.handle('check-for-updates', async () => {
    try {
        console.log('Verificação manual de atualizações solicitada...');
        
        // Verificar apenas se estiver empacotado (em desenvolvimento não faz sentido)
        if (!app.isPackaged) {
            console.log('Modo desenvolvimento - simulando verificação');
            return { 
                success: true, 
                result: {
                    updateAvailable: false,
                    currentVersion: app.getVersion(),
                    message: 'Modo desenvolvimento - verificação de atualizações disponível apenas em versão empacotada'
                }
            };
        }
        
        // Fazer verificação manual via API do GitHub
        const result = await checkGitHubReleases();
        
        console.log('Resultado da verificação:', result);
        
        return { 
            success: true, 
            result: result
        };
    } catch (error) {
        console.error('Erro ao verificar atualizações:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
});

// Função para baixar atualização do GitHub
async function downloadUpdateFromGitHub(releaseInfo) {
    try {
        console.log('Baixando atualização do GitHub...');
        
        // Encontrar o arquivo de instalação para Windows
        const installerAsset = releaseInfo.assets.find(asset => 
            asset.name.includes('.exe') && 
            (asset.name.includes('Setup') || asset.name.includes('Installer') || asset.name.includes('XY-task'))
        );
        
        if (!installerAsset) {
            throw new Error('Arquivo de instalação não encontrado na release');
        }
        
        console.log('Arquivo encontrado:', installerAsset.name);
        console.log('URL de download:', installerAsset.browser_download_url);
        
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
        
        console.log('Salvando em:', installerPath);
        
        // Salvar o arquivo
        const writer = fs.createWriteStream(installerPath);
        response.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log('Download concluído:', installerPath);
                resolve({
                    success: true,
                    installerPath: installerPath,
                    version: releaseInfo.tag_name.replace(/^v/, ''),
                    releaseInfo: releaseInfo
                });
            });
            
            writer.on('error', (error) => {
                console.error('Erro ao salvar arquivo:', error);
                reject(error);
            });
        });
        
    } catch (error) {
        console.error('Erro ao baixar atualização:', error);
        throw error;
    }
}

// Handler para baixar atualização manualmente
ipcMain.handle('download-update', async () => {
    try {
        console.log('Download manual de atualização solicitado...');
        
        // Primeiro verificar qual é a última release
        const releaseInfo = await checkGitHubReleases();
        
        if (!releaseInfo.updateAvailable) {
            return { 
                success: false, 
                error: 'Nenhuma atualização disponível' 
            };
        }
        
        // Baixar o instalador
        const downloadResult = await downloadUpdateFromGitHub(releaseInfo.releaseInfo);
        
        return {
            success: true,
            installerPath: downloadResult.installerPath,
            version: downloadResult.version
        };
        
    } catch (error) {
        console.error('Erro ao baixar atualização:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
});

// Handler para instalar atualização baixada
ipcMain.handle('install-update', async (event, installerPath = null) => {
    try {
        console.log('Instalação de atualização solicitada...');
        
        let installerFilePath = installerPath;
        
        // Se não foi passado um caminho, procurar na pasta Downloads
        if (!installerFilePath) {
            const downloadsPath = app.getPath('downloads');
            
            // Verificar se a pasta existe
            if (!fs.existsSync(downloadsPath)) {
                throw new Error('Pasta Downloads não encontrada');
            }
            
            const files = fs.readdirSync(downloadsPath);
            
            // Procurar por arquivos de instalação do XY-task
            const installerFiles = files.filter(file => 
                (file.includes('XY-task') || file.includes('xy-task')) && 
                (file.includes('Setup') || file.includes('Installer') || file.match(/XY-task.*\.exe$/i)) && 
                file.endsWith('.exe')
            );
            
            if (installerFiles.length === 0) {
                throw new Error('Arquivo de instalação não encontrado na pasta Downloads. Certifique-se de que o download foi concluído.');
            }
            
            // Pegar o arquivo mais recente por data de modificação
            const installerFilesWithStats = installerFiles.map(file => {
                const filePath = path.join(downloadsPath, file);
                const stats = fs.statSync(filePath);
                return {
                    name: file,
                    path: filePath,
                    mtime: stats.mtime
                };
            });
            
            // Ordenar por data de modificação (mais recente primeiro)
            installerFilesWithStats.sort((a, b) => b.mtime - a.mtime);
            installerFilePath = installerFilesWithStats[0].path;
        }
        
        // Verificar se o arquivo existe
        if (!fs.existsSync(installerFilePath)) {
            throw new Error(`Arquivo de instalação não encontrado: ${installerFilePath}`);
        }
        
        console.log('Executando instalador:', installerFilePath);
        
        // Executar o instalador
        // No Windows, sem parâmetros para mostrar o instalador normalmente
        const installerProcess = spawn(installerFilePath, [], {
            detached: true,
            stdio: 'ignore',
            shell: true // Usar shell no Windows para executar .exe
        });
        
        installerProcess.unref();
        
        // Aguardar um pouco e então fechar a aplicação
        setTimeout(() => {
            console.log('Fechando aplicação para permitir instalação...');
            app.quit();
        }, 2000);
        
        return { 
            success: true, 
            installerPath: installerFilePath 
        };
        
    } catch (error) {
        console.error('Erro ao instalar atualização:', error);
        return { 
            success: false, 
            error: error.message 
        };
    }
});

ipcMain.handle('get-update-info', () => {
    return {
        currentVersion: app.getVersion(),
        autoDownload: true, // update-electron-app baixa automaticamente
        autoInstallOnAppQuit: true, // update-electron-app instala automaticamente
        updateServerUrl: 'https://github.com/AlexandreSilvestrin/XY-task/releases/latest'
    };
});

// Função para verificar e finalizar processos Python órfãos
function cleanupOrphanedProcesses() {
    console.log('Verificando processos Python órfãos...');
    
    // No Windows, podemos usar tasklist para verificar processos Python
    if (process.platform === 'win32') {
        const { exec } = require('child_process');
        exec('tasklist /FI "IMAGENAME eq python.exe" /FO CSV', (error, stdout) => {
            if (!error && stdout.includes('python.exe')) {
                console.log('Processos Python encontrados no sistema:');
                console.log(stdout);
            } else {
                console.log('Nenhum processo Python órfão encontrado');
            }
        });
    }
}

// Eventos da aplicação
app.whenReady().then(async () => {
    console.log('Aplicação Electron iniciada');
    
    // Verificar processos órfãos na inicialização
    cleanupOrphanedProcesses();
    
    // Criar janela principal (sem iniciar Python automaticamente)
    createWindow();
    
    // Eventos específicos do macOS
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', async () => {
    console.log('Todas as janelas foram fechadas');
    
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
    console.log('Aplicação sendo finalizada...');
    
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
    console.log('Finalizando aplicação...');
    await stopPythonServer();
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
    console.error('Erro não capturado:', error);
    
    dialog.showErrorBox(
        'Erro Crítico',
        `Ocorreu um erro inesperado:\n\n${error.message}\n\nA aplicação será fechada.`
    );
    
    app.quit();
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Promise rejeitada não tratada:', reason);
});

// Log de informações do sistema
console.log('Informações do Sistema:');
console.log('  - Electron:', process.versions.electron);
console.log('  - Node.js:', process.versions.node);
console.log('  - Chrome:', process.versions.chrome);
console.log('  - Plataforma:', process.platform);
console.log('  - Arquitetura:', process.arch);
console.log('  - Diretório da aplicação:', __dirname);
