# Solução para Erro de Ícone no Build

## 🚨 Problema Identificado

O erro ocorre porque o NSIS (instalador do Windows) não aceita arquivos PNG como ícones. Ele precisa de arquivos `.ico` específicos.

## ✅ Soluções Disponíveis

### **Opção 1: Build Sem Ícone (Temporário)**

Já removi as referências ao ícone do `electron-builder.json`. Agora você pode fazer o build:

```bash
npm run dist
```

### **Opção 2: Converter PNG para ICO (Recomendado)**

Para ter ícones no instalador, você precisa converter o PNG para ICO:

#### **Método 1: Online (Mais Fácil)**
1. Acesse: https://convertio.co/pt/png-ico/
2. Faça upload do `assets/icon_pg.png`
3. Baixe o arquivo `.ico` gerado
4. Salve como `assets/icon_pg.ico`

#### **Método 2: Usando PowerShell (Windows)**
```powershell
# Instalar módulo (se necessário)
Install-Module -Name ImageMagick -Force

# Converter PNG para ICO
magick assets/icon_pg.png -resize 256x256 assets/icon_pg.ico
```

#### **Método 3: Usando Python**
```python
from PIL import Image
import os

# Converter PNG para ICO
img = Image.open('assets/icon_pg.png')
img.save('assets/icon_pg.ico', format='ICO', sizes=[(16,16), (32,32), (48,48), (64,64), (128,128), (256,256)])
```

### **Opção 3: Usar Ícone Padrão do Electron**

Se não quiser usar ícone personalizado, pode remover completamente as referências.

## 🔧 Após Converter para ICO

Quando tiver o arquivo `.ico`, atualize o `electron-builder.json`:

```json
{
  "win": {
    "target": "nsis",
    "icon": "assets/icon_pg.ico",
    "publisherName": "Alexandre Silvestrin"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "installerIcon": "assets/icon_pg.ico",
    "uninstallerIcon": "assets/icon_pg.ico"
  }
}
```

## 🚀 Comandos de Build

### **Build Local (Sem Publicar)**
```bash
npm run dist
```

### **Build e Publicar (Quando Configurado)**
```bash
npm run build -- --publish=always
```

## 📋 Checklist de Build

- [ ] ✅ Remover referências ao PNG (já feito)
- [ ] 🔄 Converter PNG para ICO (opcional)
- [ ] 🔄 Atualizar electron-builder.json com ICO (se converter)
- [ ] 🔄 Executar `npm run dist`
- [ ] 🔄 Testar o instalador gerado

## 🎯 Próximos Passos

1. **Teste o build atual**: `npm run dist`
2. **Se funcionar**: Instalador será criado em `dist/`
3. **Se quiser ícones**: Converta PNG para ICO e atualize a configuração
4. **Para produção**: Configure o GitHub e publique releases

## 📁 Arquivos Gerados

Após o build bem-sucedido, você terá:
- `dist/XY-task Setup 1.0.0.exe` - Instalador
- `dist/win-unpacked/` - Aplicação descompactada
- `dist/builder-effective-config.yaml` - Configuração efetiva

## 🔍 Verificação

Para verificar se o build funcionou:
1. Execute o instalador gerado
2. Verifique se a aplicação inicia corretamente
3. Teste o sistema de atualizações
4. Confirme se a notificação de versão aparece

---

**Status Atual**: ✅ Erro do ícone resolvido temporariamente
**Próximo**: 🔄 Testar build sem ícone
