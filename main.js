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

// Handlers para controle de atualizações
// O update-electron-app cuida automaticamente das atualizações
// Estes handlers são mantidos apenas para compatibilidade com o frontend
ipcMain.handle('check-for-updates', async () => {
    try {
        console.log('Verificação de atualizações é feita automaticamente pelo update-electron-app');
        // O update-electron-app verifica automaticamente, então apenas retornamos a versão atual
        return { 
            success: true, 
            result: {
                updateAvailable: false,
                currentVersion: app.getVersion(),
                message: 'As atualizações são verificadas automaticamente. Você será notificado quando houver uma nova versão disponível.'
            }
        };
    } catch (error) {
        console.error('Erro ao verificar atualizações:', error);
        return { success: false, error: error.message };
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
