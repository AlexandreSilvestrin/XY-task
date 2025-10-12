# Programa Empresa - Electron + Python

## 📋 Descrição
Aplicação desktop desenvolvida com Electron + Python para transformação de arquivos, oferecendo uma interface moderna e intuitiva.

## 🚀 Funcionalidades
- ✅ Seleção de arquivos e pastas com interface nativa
- ✅ Processamento de arquivos via servidor Python Flask
- ✅ Interface moderna e responsiva
- ✅ Feedback visual em tempo real
- ✅ Comunicação segura entre frontend e backend
- ✅ Gerenciamento automático do servidor Python

## 🛠️ Tecnologias
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Desktop**: Electron
- **Backend**: Python + Flask
- **Comunicação**: HTTP REST API

## 📁 Estrutura do Projeto
```
programa-empresa/
├── frontend/           # Interface do usuário
│   ├── index.html     # Página principal
│   ├── styles.css     # Estilos CSS
│   └── renderer.js    # Lógica JavaScript
├── backend/           # Servidor Python
│   └── app.py         # API Flask
├── main.js            # Processo principal do Electron
├── preload.js         # Script de segurança
├── package.json       # Configurações Node.js
└── requirements.txt   # Dependências Python
```

## 🔧 Instalação e Configuração

### Pré-requisitos
- Node.js (versão 16 ou superior)
- Python (versão 3.7 ou superior)
- npm ou yarn

### Passo 1: Instalar dependências Node.js
```bash
npm install
```

### Passo 2: Instalar dependências Python
```bash
pip install -r requirements.txt
```

### Passo 3: Executar em modo desenvolvimento
```bash
npm run dev
```

### Passo 4: Executar aplicação
```bash
npm start
```

## 📦 Empacotamento

### Gerar executável
```bash
npm run build
```

### Gerar instalador
```bash
npm run dist
```

## 🔄 Como Funciona

1. **Inicialização**: O Electron inicia automaticamente o servidor Python Flask
2. **Interface**: O usuário seleciona arquivos e pastas através de diálogos nativos
3. **Processamento**: O frontend envia requisições HTTP para o backend Python
4. **Resultado**: O backend processa os arquivos e retorna o resultado
5. **Feedback**: A interface exibe o status e resultado do processamento

## 🎯 Uso da Aplicação

1. **Selecionar Arquivo**: Clique em "Selecionar Arquivo" para escolher o arquivo de entrada
2. **Selecionar Pasta**: Clique em "Selecionar Pasta" para escolher onde salvar o resultado
3. **Escolher Operação**: Selecione o tipo de transformação desejada
4. **Processar**: Clique em "Processar Arquivo" para iniciar a transformação
5. **Acompanhar**: Monitore o progresso e resultado na interface

## 🔧 Personalização

### Modificar Processamento
Edite o arquivo `backend/app.py` na função `process_file_logic()` para implementar sua lógica específica de transformação.

### Personalizar Interface
Modifique os arquivos em `frontend/` para alterar a aparência e comportamento da interface.

### Adicionar Novas Operações
1. Adicione novas opções no `<select>` do HTML
2. Implemente a lógica correspondente no backend Python
3. Atualize o frontend para lidar com as novas operações

## 🐛 Solução de Problemas

### Servidor Python não inicia
- Verifique se o Python está instalado e no PATH
- Confirme se as dependências estão instaladas: `pip install -r requirements.txt`
- Verifique se a porta 5000 está disponível

### Erro de comunicação
- Confirme se o servidor Python está rodando
- Verifique se não há firewall bloqueando a porta 5000
- Teste manualmente: `curl http://127.0.0.1:5000/health`

### Problemas de interface
- Abra o DevTools (F12) para ver erros no console
- Verifique se todos os arquivos frontend estão presentes
- Confirme se o preload.js está configurado corretamente

## 📝 Logs e Debug

### Logs do Electron
Os logs aparecem no terminal onde você executou `npm start`

### Logs do Python
Os logs do servidor Flask aparecem no console do Electron

### DevTools
Pressione F12 para abrir as ferramentas de desenvolvedor

## 🔒 Segurança

- O preload.js expõe apenas APIs necessárias
- Context isolation está habilitado
- Node integration está desabilitado no renderer
- Comunicação entre processos é segura via IPC

## 📈 Próximos Passos

- [ ] Implementar autoatualização com electron-updater
- [ ] Adicionar mais tipos de transformação
- [ ] Implementar histórico de operações
- [ ] Adicionar configurações do usuário
- [ ] Melhorar tratamento de erros
- [ ] Adicionar testes automatizados

## 📞 Suporte

Para dúvidas ou problemas, verifique:
1. Os logs de erro no console
2. A documentação do Electron
3. A documentação do Flask
4. Os issues do projeto

---

**Desenvolvido com ❤️ usando Electron + Python**
