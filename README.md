# TimeTrack — Controle Automático de Horas por Projeto

Aplicativo desktop para Windows desenvolvido para controlar automaticamente as horas trabalhadas por projeto, com rastreamento de aplicativos, sugestões inteligentes e sincronização centralizada.

## 📋 Visão Geral

TimeTrack é uma ferramenta interna de controle de tempo que:

- **Detecta automaticamente** aplicativos em uso no Windows
- **Sugere projetos inteligentemente** baseado no histórico de uso
- **Rastreia tempo automaticamente** com pausa por inatividade
- **Sincroniza com servidor centralizado** (VPS) para gestores visualizarem dados da equipe
- **Funciona offline** com sincronização automática quando a rede retornar
- **Interface profissional** com tema dark e usabilidade otimizada

---

## 🎯 Funcionalidades Principais

### ✅ Milestone 1 - Motor de Rastreamento Local (Implementado)
- [x] Detecção de processo ativo no Windows (PowerShell + GetForegroundWindow)
- [x] Monitoramento de inatividade via idle time do sistema
- [x] Banco de dados SQLite local para cache offline
- [x] Sistema de projetos com estrutura "Projeto › Subprojeto"
- [x] Importação CSV/TXT/XLSX de projetos existentes
- [x] Configurações personalizáveis (tempo de inatividade, delay do popup, etc.)

### 🚧 Milestone 2 - Servidor e Multi-Usuário (Próximo)
- [ ] API Node.js + PostgreSQL na VPS
- [ ] Sincronização em tempo real (15 usuários simultâneos)
- [ ] Permissões de gestor com audit log
- [ ] Dashboard centralizado para gestores

### 🚧 Milestone 3 - Dashboard e Distribuição (Próximo)
- [ ] Popup inteligente com sugestão de projeto
- [ ] Histórico diário detalhado
- [ ] Exportação CSV compatível com Excel
- [ ] System tray integration
- [ ] Instalador Windows (.exe)

---

## 🛠️ Stack Tecnológica

| Componente | Tecnologia |
|------------|------------|
| **Desktop Client** | Electron 41 + React 19 + TypeScript 6 |
| **Database Local** | SQLite (better-sqlite3) |
| **Build** | Vite 8 + TypeScript Compiler |
| **Server (VPS)** | Node.js + PostgreSQL (Milestone 2) |
| **Windows Integration** | PowerShell + Win32 API |

---

## 📦 Instalação e Desenvolvimento

### Pré-requisitos

- Node.js 20+ (verificar com `node --version`)
- npm 10+ (verificar com `npm --version`)
- Windows 10/11 (para funcionalidades de detecção de processo)

### 1. Clone o Repositório

```bash
git clone <repository-url>
cd TimeTrack
```

### 2. Instale as Dependências

```bash
npm install
```

### 3. Compile o Código TypeScript (Main Process)

```bash
npx tsc --project tsconfig.node.json
```

### 4. Execute em Modo Desenvolvimento

```bash
npm run dev
```

Isso irá:
1. Iniciar o Vite dev server na porta 5173
2. Aguardar o servidor estar pronto
3. Abrir o Electron com hot-reload ativado

### 5. Build para Produção

```bash
# Build completo (renderer + main)
npm run build

# Build Windows installer
npm run build:win
```

O instalador será gerado em `/release/TimeTrack Setup X.X.X.exe`

---

## 📁 Estrutura do Projeto

```
TimeTrack/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.ts              # Entry point principal
│   │   ├── preload.ts           # Bridge IPC seguro
│   │   └── services/
│   │       ├── database.ts      # Serviço SQLite
│   │       ├── windowMonitor.ts # Detecção de janela ativa
│   │       └── activityMonitor.ts # Detecção de inatividade
│   ├── renderer/                # React app (UI)
│   │   ├── App.tsx              # Componente raiz
│   │   ├── main.tsx             # Entry point renderer
│   │   ├── components/          # Componentes reutilizáveis
│   │   │   ├── TitleBar.tsx
│   │   │   └── Sidebar.tsx
│   │   └── views/               # Views principais
│   │       ├── Dashboard.tsx
│   │       ├── PopupDemo.tsx
│   │       ├── History.tsx
│   │       ├── Configuration.tsx
│   │       └── Management.tsx
│   └── shared/
│       └── types.ts             # Tipos compartilhados
├── dist/                        # Build do renderer (Vite)
├── dist-electron/               # Build do main process (TSC)
├── public/                      # Assets estáticos
├── package.json
├── tsconfig.json                # Config TS (renderer)
├── tsconfig.node.json           # Config TS (main)
├── vite.config.ts               # Config Vite
└── README.md
```

---

## 🔧 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Inicia desenvolvimento com hot-reload |
| `npm run dev:vite` | Apenas Vite dev server |
| `npm run dev:electron` | Apenas Electron (aguarda Vite) |
| `npm run build` | Build completo (renderer + main) |
| `npm run build:win` | Build + instalador Windows |
| `npm run typecheck` | Verificação de tipos TypeScript |
| `npm run preview` | Preview do build Vite |

---

## 🔐 Segurança e Transparência

### Dados Coletados
- ✅ Nome do processo ativo (ex: `Code.exe`, `chrome.exe`)
- ✅ Título da janela (para contexto)
- ✅ Timestamps de início/fim de atividade
- ✅ Projeto vinculado pelo usuário
- ✅ ID do usuário (para multi-usuário)

### O que NÃO é coletado
- ❌ Capturas de tela
- ❌ Teclas digitadas (keystroke logging)
- ❌ Conteúdo de arquivos
- ❌ Dados de navegação (URLs, histórico)
- ❌ Comunicação com servidores terceiros

### Comunicação de Rede
- ✅ **Único endpoint**: VPS configurada pelo cliente (Milestone 2)
- ✅ **Protocolo**: HTTPS com autenticação
- ✅ **Dados**: Apenas time entries, projetos e configurações
- ❌ **Nenhuma telemetria** enviada para servidores externos

### Permissões Locais Necessárias
- ✅ Leitura de processo ativo (`Get-Process` PowerShell)
- ✅ Leitura de idle time do sistema (`GetLastInputInfo`)
- ✅ Acesso ao banco de dados local (SQLite em `userData`)
- ❌ **Não requer** permissões de administrador

---

## 📊 Como Funciona

### 1. Detecção de Aplicativo Ativo
```
PowerShell (polling 1s) → Get-Process com MainWindowTitle
→ Detecta mudança de janela ativa
→ Verifica se o processo está na lista de apps monitorados
```

### 2. Popup Inteligente (Após 2 minutos de uso contínuo)
```
App monitorado em foco por 2 min
→ Busca sugestão (último projeto usado neste app)
→ Exibe popup com sugestão + busca de projetos
→ Usuário confirma ou seleciona outro projeto
→ Inicia rastreamento de tempo
```

### 3. Pausa por Inatividade
```
Polling do sistema idle time (5s)
→ Se idle > 5 min (configurável)
→ Pausa rastreamento automático
→ Quando usuário volta: resume automaticamente
```

### 4. Sincronização com VPS (Milestone 2)
```
Time entry criado/atualizado localmente (SQLite)
→ Queue de sincronização
→ POST /api/sync/entries para VPS
→ Se offline: mantém em queue local
→ Quando online: sincroniza automaticamente
```

---

## 🤝 Suporte e Contribuição

### Build Issues
Se encontrar problemas ao compilar:

```bash
# Limpe caches e reinstale
rm -rf node_modules dist dist-electron
npm install
npx tsc --project tsconfig.node.json
npm run build
```

### Desenvolvimento em Linux/Mac
O projeto funciona parcialmente em ambientes não-Windows para desenvolvimento da UI. A detecção de processos retornará mocks para permitir testes.

Para funcionalidade completa, execute em Windows 10/11.

---

## 📄 Licença

MIT License - Este é um projeto interno desenvolvido sob contrato.

**Entregáveis**:
- ✅ Código-fonte completo (este repositório)
- ✅ Instruções de build e deployment
- ✅ Documentação de arquitetura
- 🔄 Instalador Windows (Milestone 3)
- 🔄 Deploy VPS (Milestone 2)

---

**Desenvolvido com ❤️ usando Electron, React e TypeScript**
