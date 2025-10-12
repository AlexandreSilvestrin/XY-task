# Instruções de Instalação - Programa Empresa

## Problema Resolvido ✅

O problema do "servidor Python não encontrado" foi corrigido! O programa agora detecta automaticamente se está rodando em um build empacotado ou em desenvolvimento e usa os caminhos corretos para o Python.

## O que foi corrigido:

1. **Detecção automática de ambiente**: O programa agora verifica se está rodando em um build empacotado usando `app.isPackaged`
2. **Caminhos corretos do Python**: 
   - Em desenvolvimento: `__dirname/backend/python/python.exe`
   - Em build empacotado: `process.resourcesPath/backend/python/python.exe`
3. **Verificações de arquivos**: O programa agora verifica se todos os arquivos necessários existem antes de tentar executá-los
4. **Logs detalhados**: Adicionei logs para facilitar o debug

## Como testar:

1. **Instale o programa** usando o arquivo `dist/Programa Empresa Setup 1.0.0.exe`
2. **Execute o programa** - ele deve iniciar automaticamente o servidor Python
3. **Verifique os logs** no console para confirmar que o Python foi encontrado

## Estrutura do build:

```
dist/win-unpacked/
├── Programa Empresa.exe
└── resources/
    ├── app/                    # Código da aplicação
    └── backend/                # Backend Python (extraResource)
        ├── app.py
        ├── func/
        └── python/             # Python empacotado
            ├── python.exe
            ├── python3.dll
            └── Lib/            # Bibliotecas Python
```

## Logs esperados:

Quando o programa iniciar, você deve ver logs como:
```
🐍 Caminho do Python: C:\Program Files\Programa Empresa\resources\backend\python\python.exe
🐍 Diretório do backend: C:\Program Files\Programa Empresa\resources\backend
✅ Todos os arquivos necessários foram encontrados
🐍 Iniciando servidor Python...
✅ Servidor Python iniciado com sucesso!
```

## Se ainda houver problemas:

1. Verifique se o antivírus não está bloqueando o Python
2. Execute como administrador se necessário
3. Verifique os logs de erro no console
4. Confirme que o Python está na pasta `resources/backend/python/`

## Arquivos importantes:

- **Instalador**: `dist/Programa Empresa Setup 1.0.0.exe`
- **Executável direto**: `dist/win-unpacked/Programa Empresa.exe`
- **Python empacotado**: `dist/win-unpacked/resources/backend/python/python.exe`
