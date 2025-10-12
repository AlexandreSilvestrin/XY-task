# Sistema de Atualizações Automáticas

Este documento explica como configurar e usar o sistema de atualizações automáticas implementado no programa XY-task.

## 📋 Visão Geral

O sistema de atualizações foi implementado usando o `electron-updater`, que permite:
- ✅ Verificação automática de atualizações
- ✅ Download automático ou manual de atualizações
- ✅ Instalação automática ao fechar o aplicativo
- ✅ Interface visual para controle manual
- ✅ Suporte a GitHub Releases

## 🔧 Configuração

### 1. Configuração do GitHub Releases

Para usar o sistema de atualizações, você precisa:

1. **Criar um repositório no GitHub** (se ainda não tiver)
2. **Configurar o electron-builder.json** com suas informações:

```json
{
  "publish": {
    "provider": "github",
    "owner": "seu-usuario-github",
    "repo": "seu-repositorio"
  }
}
```

3. **Atualizar a URL no main.js**:

```javascript
const UPDATE_CONFIG = {
    UPDATE_SERVER_URL: 'https://github.com/seu-usuario/seu-repositorio/releases/latest',
    // ... outras configurações
};
```

### 2. Configuração do Token GitHub

Para publicar releases automaticamente, você precisa de um token GitHub:

1. Vá para GitHub → Settings → Developer settings → Personal access tokens
2. Crie um token com permissões `repo` e `write:packages`
3. Configure a variável de ambiente:

```bash
# Windows
set GH_TOKEN=seu_token_aqui

# Linux/Mac
export GH_TOKEN=seu_token_aqui
```

## 🚀 Como Publicar Atualizações

### 1. Preparar a Nova Versão

1. **Atualize a versão no package.json**:
```json
{
  "version": "1.0.1"
}
```

2. **Faça commit das mudanças**:
```bash
git add .
git commit -m "Nova versão 1.0.1"
git tag v1.0.1
git push origin main --tags
```

### 2. Build e Publicação

Execute o comando de build com publicação:

```bash
npm run build -- --publish=always
```

Isso irá:
- Fazer o build da aplicação
- Criar uma release no GitHub
- Fazer upload dos arquivos de instalação
- Configurar automaticamente o sistema de atualizações

## 🎯 Como Funciona

### Verificação Automática

- **Na inicialização**: Verifica atualizações 5 segundos após o app iniciar
- **Manual**: Usuário pode clicar em "Verificar Atualizações" na aba Configurações
- **Intervalo**: Configurado para verificar a cada 24 horas (modificável)

### Fluxo de Atualização

1. **Verificação**: App verifica se há nova versão disponível
2. **Notificação**: Se houver atualização, mostra diálogo para o usuário
3. **Download**: Usuário escolhe baixar agora ou mais tarde
4. **Instalação**: Após download, pergunta se quer instalar agora
5. **Reinicialização**: App fecha e reinicia com a nova versão

### Interface do Usuário

Na aba **Configurações**, você encontrará:

- **Versão Atual**: Mostra a versão instalada
- **Status**: Estado atual da verificação
- **Botões de Controle**:
  - 🔍 Verificar Atualizações
  - 📥 Baixar Atualização (quando disponível)
  - 🔄 Instalar e Reiniciar (após download)
- **Barra de Progresso**: Mostra progresso do download
- **Mensagens**: Feedback visual do processo

## ⚙️ Configurações Avançadas

### Modificar Comportamento

No arquivo `main.js`, você pode ajustar:

```javascript
const UPDATE_CONFIG = {
    CHECK_INTERVAL: 24 * 60 * 60 * 1000, // Verificar a cada 24 horas
    AUTO_DOWNLOAD: false, // Não baixar automaticamente
    AUTO_INSTALL_ON_APP_QUIT: true // Instalar ao fechar
};
```

### Configurações Disponíveis

- `AUTO_DOWNLOAD`: Se `true`, baixa automaticamente quando encontra atualização
- `AUTO_INSTALL_ON_APP_QUIT`: Se `true`, instala automaticamente ao fechar o app
- `CHECK_INTERVAL`: Intervalo entre verificações (em milissegundos)

## 🐛 Solução de Problemas

### Erro: "Cannot find module 'electron-updater'"

```bash
npm install electron-updater --save
```

### Erro: "No update available"

- Verifique se a versão no `package.json` é menor que a versão da release
- Confirme se a release foi publicada corretamente no GitHub
- Verifique se o token GitHub tem as permissões corretas

### Erro: "Failed to check for updates"

- Verifique sua conexão com a internet
- Confirme se a URL do repositório está correta
- Verifique se o repositório é público ou se o token tem acesso

### Atualização não aparece

1. Verifique se a nova versão é maior que a atual
2. Confirme se os arquivos foram enviados para a release
3. Aguarde alguns minutos (pode haver cache)

## 📝 Logs e Debug

### Habilitar Logs Detalhados

Para debug, você pode adicionar logs no console:

```javascript
// No main.js
autoUpdater.logger = require('electron-log');
autoUpdater.logger.transports.file.level = 'debug';
```

### Verificar Logs

Os logs aparecem no console do Electron (F12 → Console) e incluem:
- Status da verificação
- Progresso do download
- Erros encontrados
- Informações da versão

## 🔒 Segurança

### Assinatura de Código

Para produção, configure a assinatura de código no `electron-builder.json`:

```json
{
  "win": {
    "certificateFile": "path/to/certificate.p12",
    "certificatePassword": "password"
  },
  "mac": {
    "identity": "Developer ID Application: Your Name"
  }
}
```

### Verificação de Integridade

O electron-updater verifica automaticamente:
- Assinatura digital dos arquivos
- Integridade dos downloads
- Compatibilidade da versão

## 📚 Recursos Adicionais

- [Documentação electron-updater](https://www.electron.build/auto-update)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)
- [Electron Builder](https://www.electron.build/)

## 🎉 Conclusão

O sistema de atualizações está configurado e pronto para uso! 

**Próximos passos:**
1. Configure seu repositório GitHub
2. Atualize as URLs nos arquivos de configuração
3. Faça o primeiro build e release
4. Teste o sistema de atualizações

Para qualquer dúvida ou problema, consulte os logs do console ou a documentação oficial do electron-updater.
