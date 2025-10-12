# 🔄 Sistema de Atualizações Automáticas - XY-task

## 📋 Configuração Completa

### ✅ **O que foi configurado:**

1. **electron-updater** - Biblioteca para atualizações automáticas
2. **GitHub Actions** - Build e release automático
3. **Interface de usuário** - Controles de atualização na aplicação
4. **Configuração do electron-builder** - Para publicação no GitHub

---

## 🚀 **Como usar o sistema de atualizações:**

### **1. Para Desenvolvedores:**

#### **Criar uma nova versão:**
```bash
# 1. Atualizar a versão no package.json
npm version patch  # ou minor, major

# 2. Fazer push da tag para o GitHub
git push origin v1.0.1

# 3. O GitHub Actions irá automaticamente:
#    - Fazer build para Windows, macOS e Linux
#    - Criar um release no GitHub
#    - Disponibilizar os arquivos para download
```

#### **Build manual:**
```bash
# Build local (sem publicar)
npm run dist

# Build e publicar no GitHub
npm run release
```

### **2. Para Usuários:**

#### **Atualização Automática:**
- A aplicação verifica atualizações automaticamente a cada 24 horas
- Quando uma atualização está disponível, aparece uma notificação discreta
- O usuário pode escolher baixar e instalar quando quiser

#### **Atualização Manual:**
1. Vá para a aba "⚙️ Configurações"
2. Na seção "🔄 Atualizações do Sistema"
3. Clique em "🔍 Verificar Atualizações"
4. Se houver atualização, clique em "📥 Baixar Atualização"
5. Após o download, clique em "🔄 Instalar e Reiniciar"

---

## 🔧 **Configurações Avançadas:**

### **Alterar frequência de verificação:**
No arquivo `main.js`, linha 22:
```javascript
CHECK_INTERVAL: 24 * 60 * 60 * 1000, // 24 horas (em milissegundos)
```

### **Habilitar download automático:**
No arquivo `main.js`, linha 24:
```javascript
AUTO_DOWNLOAD: true, // true = baixa automaticamente, false = apenas notifica
```

### **Alterar servidor de atualizações:**
No arquivo `main.js`, linha 21:
```javascript
UPDATE_SERVER_URL: 'https://github.com/AlexandreSilvestrin/XY-task/releases/latest',
```

---

## 📁 **Arquivos Modificados:**

### **Configuração:**
- `package.json` - Scripts de build e release
- `electron-builder.json` - Configuração de publicação
- `.github/workflows/build-and-release.yml` - GitHub Actions

### **Código:**
- `main.js` - Lógica de atualização automática
- `preload.js` - APIs expostas para o frontend
- `frontend/renderer.js` - Interface de atualização
- `frontend/index.html` - Elementos da interface

---

## 🐛 **Solução de Problemas:**

### **Erro: "Cannot find module 'electron-updater'"**
```bash
npm install electron-updater
```

### **Erro: "GitHub token not found"**
1. Vá para GitHub → Settings → Developer settings → Personal access tokens
2. Crie um token com permissões de `repo`
3. Adicione como secret no repositório: `GITHUB_TOKEN`

### **Erro: "Release not found"**
- Verifique se o repositório está configurado corretamente no `electron-builder.json`
- Confirme se o owner e repo estão corretos

### **Atualização não aparece:**
- Verifique se a versão no `package.json` é maior que a atual
- Confirme se o release foi criado no GitHub
- Verifique os logs no console da aplicação

---

## 🔒 **Segurança:**

### **Verificação de integridade:**
- Os arquivos são assinados digitalmente
- Verificação automática de checksums
- Download apenas de releases oficiais

### **Permissões necessárias:**
- `repo` - Para criar releases
- `write:packages` - Para publicar artefatos

---

## 📊 **Monitoramento:**

### **Logs de atualização:**
- Console do Electron (F12)
- Logs do sistema operacional
- GitHub Actions logs

### **Status da aplicação:**
- Versão atual sempre visível na interface
- Status de atualização em tempo real
- Notificações discretas de progresso

---

## 🎯 **Próximos Passos:**

1. **Testar o sistema** criando uma versão de teste
2. **Configurar notificações** para releases
3. **Implementar rollback** em caso de problemas
4. **Adicionar métricas** de uso das atualizações

---

## 📞 **Suporte:**

Para problemas ou dúvidas:
1. Verifique os logs da aplicação
2. Consulte a documentação do electron-updater
3. Abra uma issue no GitHub

---

**✅ Sistema de atualizações configurado com sucesso!**