# Guia de Obra Inteligente - Complexo Villa Rica

Aplicativo (PWA) offline do guia de obra. Publicado pelo GitHub Pages.

- Abrir no celular e instalar: iPhone (Safari > Compartilhar > Adicionar à Tela de Início); Android (Chrome > Instalar app).
- Funciona sem internet depois do primeiro acesso. Pranchas: botão "Baixar pranchas desta obra".
- Sem valores em texto aberto. Área financeira cifrada (AES-GCM + PBKDF2). Nenhuma senha no código.
- `api.js` é a camada única de dados: hoje grava no aparelho (IndexedDB); a integração com o sistema deve implementar `API.enviar()`.
- `fonte/`: arquivos de origem do build.
