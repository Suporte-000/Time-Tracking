/**
 * TimeTrack - Internationalization (i18n)
 * Supports: English (en), Spanish (es), Portuguese-Brazil (pt-BR)
 */

export type Language = 'en' | 'es' | 'pt-BR';

export const LANGUAGE_LABELS: Record<Language, string> = {
  'en': 'English',
  'es': 'Español',
  'pt-BR': 'Português (BR)',
};

const translations = {
  // === TitleBar ===
  'titlebar.title': {
    'en': 'TimeTrack — Project Hours Control',
    'es': 'TimeTrack — Control de Horas por Proyecto',
    'pt-BR': 'TimeTrack — Controle de Horas por Projeto',
  },
  'titlebar.tracking': {
    'en': 'Tracking',
    'es': 'Rastreando',
    'pt-BR': 'Rastreando',
  },
  'titlebar.paused': {
    'en': 'Paused',
    'es': 'Pausado',
    'pt-BR': 'Pausado',
  },

  // === Sidebar ===
  'sidebar.main': {
    'en': 'Main',
    'es': 'Principal',
    'pt-BR': 'Principal',
  },
  'sidebar.dashboard': {
    'en': 'Dashboard',
    'es': 'Dashboard',
    'pt-BR': 'Dashboard',
  },
  'sidebar.popupDemo': {
    'en': 'Popup Demo',
    'es': 'Demo del Popup',
    'pt-BR': 'Popup Demo',
  },
  'sidebar.history': {
    'en': 'History',
    'es': 'Historial',
    'pt-BR': 'Histórico',
  },
  'sidebar.system': {
    'en': 'System',
    'es': 'Sistema',
    'pt-BR': 'Sistema',
  },
  'sidebar.settings': {
    'en': 'Settings',
    'es': 'Configuración',
    'pt-BR': 'Configurações',
  },
  'sidebar.management': {
    'en': 'Management',
    'es': 'Gestión',
    'pt-BR': 'Gestão',
  },
  'sidebar.developer': {
    'en': 'Developer',
    'es': 'Desarrollador',
    'pt-BR': 'Desenvolvedor',
  },

  // === Dashboard ===
  'dashboard.title': {
    'en': 'Dashboard',
    'es': 'Dashboard',
    'pt-BR': 'Dashboard',
  },
  'dashboard.today': {
    'en': 'Today',
    'es': 'Hoy',
    'pt-BR': 'Hoje',
  },
  'dashboard.exportCsv': {
    'en': 'Export CSV',
    'es': 'Exportar CSV',
    'pt-BR': 'Exportar CSV',
  },
  'dashboard.newProject': {
    'en': '+ New Business',
    'es': '+ Nuevo Negocio',
    'pt-BR': '+ Novo Negócio',
  },
  'dashboard.loading': {
    'en': 'Loading...',
    'es': 'Cargando...',
    'pt-BR': 'Carregando...',
  },

  // New Project Modal
  'project.new': {
    'en': 'New Business',
    'es': 'Nuevo Negocio',
    'pt-BR': 'Novo Negócio',
  },
  'project.name': {
    'en': 'Business Name *',
    'es': 'Nombre del Negocio *',
    'pt-BR': 'Nome do Negócio *',
  },
  'project.namePlaceholder': {
    'en': 'Ex: Business A',
    'es': 'Ej: Negocio A',
    'pt-BR': 'Ex: Negócio A',
  },
  'project.subproject': {
    'en': 'Subproject (optional)',
    'es': 'Subproyecto (opcional)',
    'pt-BR': 'Subprojeto (opcional)',
  },
  'project.subPlaceholder': {
    'en': 'Ex: Electrical',
    'es': 'Ej: Eléctrica',
    'pt-BR': 'Ex: Elétrica',
  },
  'project.create': {
    'en': 'Create Business',
    'es': 'Crear Negocio',
    'pt-BR': 'Criar Negócio',
  },
  'project.createError': {
    'en': 'Error creating business',
    'es': 'Error al crear negocio',
    'pt-BR': 'Erro ao criar negócio',
  },
  'project.none': {
    'en': 'No project',
    'es': 'Sin proyecto',
    'pt-BR': 'Sem projeto',
  },
  'project.registered': {
    'en': 'Registered Businesses',
    'es': 'Negocios Registrados',
    'pt-BR': 'Negócios Cadastrados',
  },
  'project.noneYet': {
    'en': 'No businesses registered yet',
    'es': 'Ningún negocio registrado aún',
    'pt-BR': 'Nenhum negócio cadastrado ainda',
  },
  'project.noneCreateFirst': {
    'en': 'No businesses registered. Create a business first.',
    'es': 'Ningún negocio registrado. Cree un negocio primero.',
    'pt-BR': 'Nenhum negócio cadastrado. Crie um negócio primeiro.',
  },

  // Timer
  'timer.start': {
    'en': 'Start Timer',
    'es': 'Iniciar Timer',
    'pt-BR': 'Iniciar Timer',
  },
  'timer.stop': {
    'en': 'Stop',
    'es': 'Parar',
    'pt-BR': 'Parar',
  },
  'timer.stopAll': {
    'en': 'Stop All',
    'es': 'Parar Todos',
    'pt-BR': 'Parar Todos',
  },
  'timer.addTimer': {
    'en': '+ Add Timer',
    'es': '+ Agregar Timer',
    'pt-BR': '+ Adicionar Timer',
  },
  'timer.trackingNow': {
    'en': 'Tracking now',
    'es': 'Rastreando ahora',
    'pt-BR': 'Rastreando agora',
  },
  'timer.startedAt': {
    'en': 'Started at',
    'es': 'Iniciado a las',
    'pt-BR': 'Iniciado às',
  },
  'timer.inUse': {
    'en': 'In use',
    'es': 'En uso',
    'pt-BR': 'Em uso',
  },
  'timer.appInFocus': {
    'en': 'App in focus now',
    'es': 'App en foco ahora',
    'pt-BR': 'App em foco agora',
  },
  'timer.trackingStarted': {
    'en': '→ Tracking system started',
    'es': '→ Sistema de rastreo iniciado',
    'pt-BR': '→ Sistema de rastreamento iniciado',
  },
  'timer.waitingLink': {
    'en': 'waiting for link',
    'es': 'esperando vinculación',
    'pt-BR': 'aguardando vinculação',
  },

  // App selector
  'app.label': {
    'en': 'Application',
    'es': 'Aplicación',
    'pt-BR': 'Aplicativo',
  },
  'app.select': {
    'en': 'Select an application...',
    'es': 'Seleccione una aplicación...',
    'pt-BR': 'Selecione um aplicativo...',
  },
  'app.other': {
    'en': 'Other (type name)...',
    'es': 'Otro (escribir nombre)...',
    'pt-BR': 'Outro (digitar nome)...',
  },
  'app.namePlaceholder': {
    'en': 'Ex: AutoCAD, Excel, Revit...',
    'es': 'Ej: AutoCAD, Excel, Revit...',
    'pt-BR': 'Ex: AutoCAD, Excel, Revit...',
  },
  'app.nameLabel': {
    'en': 'Application name',
    'es': 'Nombre de la aplicación',
    'pt-BR': 'Nome do aplicativo',
  },

  // KPIs
  'kpi.totalToday': {
    'en': 'Total Today',
    'es': 'Total Hoy',
    'pt-BR': 'Total Hoje',
  },
  'kpi.goal': {
    'en': 'goal: 8h',
    'es': 'meta: 8h',
    'pt-BR': 'meta: 8h',
  },
  'kpi.activeProjects': {
    'en': 'Active Projects',
    'es': 'Proyectos Activos',
    'pt-BR': 'Projetos Ativos',
  },
  'kpi.registered': {
    'en': 'registered',
    'es': 'registrados',
    'pt-BR': 'cadastrados',
  },
  'kpi.breaks': {
    'en': 'Breaks',
    'es': 'Pausas',
    'pt-BR': 'Pausas',
  },
  'kpi.noBreaks': {
    'en': 'no breaks',
    'es': 'sin pausas',
    'pt-BR': 'sem pausas',
  },
  'kpi.noProject': {
    'en': 'No Project',
    'es': 'Sin Proyecto',
    'pt-BR': 'Sem Projeto',
  },
  'kpi.unlinked': {
    'en': 'unlinked',
    'es': 'no vinculado',
    'pt-BR': 'não vinculado',
  },

  // Common
  'common.cancel': {
    'en': 'Cancel',
    'es': 'Cancelar',
    'pt-BR': 'Cancelar',
  },
  'common.project': {
    'en': 'Project',
    'es': 'Proyecto',
    'pt-BR': 'Projeto',
  },

  // === History ===
  'history.title': {
    'en': 'Detailed History',
    'es': 'Historial Detallado',
    'pt-BR': 'Histórico Detalhado',
  },
  'history.loading': {
    'en': 'Loading history...',
    'es': 'Cargando historial...',
    'pt-BR': 'Carregando histórico...',
  },
  'history.exportCsv': {
    'en': 'Export CSV',
    'es': 'Exportar CSV',
    'pt-BR': 'Exportar CSV',
  },
  'history.totalTime': {
    'en': 'Total Time',
    'es': 'Tiempo Total',
    'pt-BR': 'Tempo Total',
  },
  'history.projects': {
    'en': 'Projects',
    'es': 'Proyectos',
    'pt-BR': 'Projetos',
  },
  'history.entries': {
    'en': 'Entries',
    'es': 'Entradas',
    'pt-BR': 'Entradas',
  },
  'history.noProject': {
    'en': 'No Project',
    'es': 'Sin Proyecto',
    'pt-BR': 'Sem Projeto',
  },
  'history.timeEntries': {
    'en': 'Time Entries',
    'es': 'Entradas de Tiempo',
    'pt-BR': 'Entradas de Tempo',
  },
  'history.noEntries': {
    'en': 'No time entries for this date',
    'es': 'Sin entradas de tiempo para esta fecha',
    'pt-BR': 'Nenhuma entrada de tempo para esta data',
  },
  'history.ongoing': {
    'en': 'Ongoing',
    'es': 'En curso',
    'pt-BR': 'Em andamento',
  },
  'history.delete': {
    'en': 'Delete',
    'es': 'Eliminar',
    'pt-BR': 'Excluir',
  },
  'history.deleteConfirm': {
    'en': 'Delete this entry?',
    'es': '¿Eliminar esta entrada?',
    'pt-BR': 'Excluir esta entrada?',
  },
  'history.deleteAll': {
    'en': 'Delete All',
    'es': 'Eliminar Todo',
    'pt-BR': 'Excluir Tudo',
  },
  'history.deleteAllConfirm': {
    'en': 'Delete all entries for this date?',
    'es': '¿Eliminar todas las entradas de esta fecha?',
    'pt-BR': 'Excluir todas as entradas desta data?',
  },

  // === Configuration ===
  'config.title': {
    'en': 'Settings',
    'es': 'Configuración',
    'pt-BR': 'Configurações',
  },
  'config.monitoredApps': {
    'en': 'Monitored apps',
    'es': 'Apps monitoreadas',
    'pt-BR': 'Apps monitorados',
  },
  'config.inactivity': {
    'en': 'Inactivity timeout',
    'es': 'Tiempo de inactividad',
    'pt-BR': 'Tempo de inatividade',
  },
  'config.minutes': {
    'en': 'minutes',
    'es': 'minutos',
    'pt-BR': 'minutos',
  },
  'config.popupDelay': {
    'en': 'Popup delay',
    'es': 'Atraso del popup',
    'pt-BR': 'Atraso do popup',
  },
  'config.language': {
    'en': 'Language',
    'es': 'Idioma',
    'pt-BR': 'Idioma',
  },

  // === Management ===
  'management.title': {
    'en': 'Team Management',
    'es': 'Gestión del Equipo',
    'pt-BR': 'Gestão da Equipe',
  },
  'management.description': {
    'en': 'Manager-only access - View data from the entire team.',
    'es': 'Acceso exclusivo para gestores - Visualice datos de todo el equipo.',
    'pt-BR': 'Acesso exclusivo para gestores - Visualize dados de toda a equipe.',
  },
  'management.warning': {
    'en': '⚠️ This feature requires manager permissions',
    'es': '⚠️ Esta funcionalidad requiere permisos de gestor',
    'pt-BR': '⚠️ Esta funcionalidade requer permissões de gestor',
  },

  // === Popup Demo ===
  'popupDemo.title': {
    'en': 'Linking Popup',
    'es': 'Popup de Vinculación',
    'pt-BR': 'Popup de Vinculação',
  },
  'popupDemo.description': {
    'en': 'Appears when a monitored app comes into focus.',
    'es': 'Aparece cuando una app monitorada entra en foco.',
    'pt-BR': 'Aparece quando um app monitorado entra em foco.',
  },
  'popupDemo.howTitle': {
    'en': 'HOW IT WORKS',
    'es': 'CÓMO FUNCIONA',
    'pt-BR': 'COMO FUNCIONA',
  },
  'popupDemo.step1': {
    'en': 'User opens or switches to a monitored app (e.g. VS Code, Figma)',
    'es': 'El usuario abre o cambia a una app monitorada (ej: VS Code, Figma)',
    'pt-BR': 'Usuário abre ou troca para um app monitorado (ex: VS Code, Figma)',
  },
  'popupDemo.step2': {
    'en': 'System detects the process and shows the popup below',
    'es': 'El sistema detecta el proceso y muestra el popup abajo',
    'pt-BR': 'Sistema detecta o processo e exibe o popup abaixo',
  },
  'popupDemo.step3': {
    'en': 'Smart suggestion — shows the last business used in this app',
    'es': 'Sugerencia inteligente — muestra el último negocio usado en esta app',
    'pt-BR': 'Sugestão inteligente — exibe o último negócio usado nesse app',
  },
  'popupDemo.step4': {
    'en': 'One click confirms — popup closes and time tracking begins',
    'es': 'Un clic confirma — el popup desaparece y el conteo inicia',
    'pt-BR': 'Um clique confirma — popup desaparece e contagem inicia',
  },
  'popupDemo.step5': {
    'en': 'No response in 30s → popup closes, time stays as "unlinked"',
    'es': 'Sin respuesta en 30s → popup cierra, tiempo queda como "no vinculado"',
    'pt-BR': 'Sem resposta por 30s → popup fecha, tempo fica em "não vinculado"',
  },
  'popupDemo.instruction': {
    'en': 'Click the button below to open the popup and link your time to a project.',
    'es': 'Haga clic en el botón para abrir el popup y vincular su tiempo a un proyecto.',
    'pt-BR': 'Clique no botão abaixo para abrir o popup e vincular seu tempo a um projeto.',
  },
  'popupDemo.openPopup': {
    'en': 'Open Linking Popup',
    'es': 'Abrir Popup de Vinculación',
    'pt-BR': 'Abrir Popup de Vinculação',
  },
  'popupDemo.success': {
    'en': 'Tracking started successfully!',
    'es': '¡Rastreo iniciado con éxito!',
    'pt-BR': 'Rastreamento iniciado com sucesso!',
  },

  // === ProjectPopup ===
  'popup.linkProject': {
    'en': 'Link Project',
    'es': 'Vincular Proyecto',
    'pt-BR': 'Vincular Projeto',
  },
  'popup.detected': {
    'en': 'Detected',
    'es': 'Detectado',
    'pt-BR': 'Detectado',
  },
  'popup.autoClose': {
    'en': 'Auto-closes in',
    'es': 'Se cierra en',
    'pt-BR': 'Auto-fecha em',
  },
  'popup.suggestion': {
    'en': 'Suggestion',
    'es': 'Sugerencia',
    'pt-BR': 'Sugestão',
  },
  'popup.usedTimes': {
    'en': 'Used {count}× in this app',
    'es': 'Usado {count}× en esta app',
    'pt-BR': 'Usado {count}× neste app',
  },
  'popup.search': {
    'en': 'Search project...',
    'es': 'Buscar proyecto...',
    'pt-BR': 'Buscar projeto...',
  },
  'popup.noResults': {
    'en': 'No projects found',
    'es': 'Ningún proyecto encontrado',
    'pt-BR': 'Nenhum projeto encontrado',
  },
  'popup.startTracking': {
    'en': 'Start Tracking',
    'es': 'Iniciar Rastreo',
    'pt-BR': 'Iniciar Rastreamento',
  },
  'popup.appDetected': {
    'en': 'APP DETECTED',
    'es': 'APP DETECTADA',
    'pt-BR': 'APP DETECTADO',
  },
  'popup.lastUsed': {
    'en': 'Last used in this app',
    'es': 'Último usado en esta app',
    'pt-BR': 'Último usado neste app',
  },
  'popup.skip': {
    'en': 'Skip',
    'es': 'Saltar',
    'pt-BR': 'Pular',
  },
  'popup.confirm': {
    'en': '✓ Confirm Business',
    'es': '✓ Confirmar Negocio',
    'pt-BR': '✓ Confirmar Projeto',
  },
  'popup.orSelect': {
    'en': '— or select another business —',
    'es': '— o selecciona otro negocio —',
    'pt-BR': '— ou selecione outro negócio —',
  },

  // === PopupApp ===
  'popupApp.unknownApp': {
    'en': 'Unknown Application',
    'es': 'Aplicación Desconocida',
    'pt-BR': 'Aplicativo Desconhecido',
  },

  // CSV Headers
  'csv.date': { 'en': 'Date', 'es': 'Fecha', 'pt-BR': 'Data' },
  'csv.start': { 'en': 'Start', 'es': 'Inicio', 'pt-BR': 'Início' },
  'csv.end': { 'en': 'End', 'es': 'Fin', 'pt-BR': 'Fim' },
  'csv.duration': { 'en': 'Duration', 'es': 'Duración', 'pt-BR': 'Duração' },
  'csv.project': { 'en': 'Project', 'es': 'Proyecto', 'pt-BR': 'Projeto' },
  'csv.subproject': { 'en': 'Subproject', 'es': 'Subproyecto', 'pt-BR': 'Subprojeto' },
  'csv.app': { 'en': 'Application', 'es': 'Aplicación', 'pt-BR': 'Aplicativo' },
  'csv.status': { 'en': 'Status', 'es': 'Estado', 'pt-BR': 'Status' },
} as const;

export type TranslationKey = keyof typeof translations;

const STORAGE_KEY = 'timetrack_language';

export function getLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && (stored === 'en' || stored === 'es' || stored === 'pt-BR')) {
    return stored as Language;
  }
  return 'pt-BR';
}

export function setLanguage(lang: Language) {
  localStorage.setItem(STORAGE_KEY, lang);
}

export function t(key: TranslationKey, lang?: Language): string {
  const l = lang || getLanguage();
  return translations[key]?.[l] || translations[key]?.['en'] || key;
}
