// dev/src/lib/capabilities.ts
// 能力点（capabilities）计算：用于“登录后界面随权限变化”的统一出口

export type PlatformRoleKey =
  | 'END_USER'
  | 'LAWYER'
  | 'ARBITRATOR'
  | 'MEDIATOR'
  | 'COURT'
  | 'NOTARY'
  | 'ADMIN'
  | 'OPS_ADMIN'
  | 'AUDITOR_READONLY'
  // 历史/兼容：逐步迁移为案件身份
  | 'APPLICANT'
  | 'RESPONDENT';

export type PersonaRole =
  | 'applicant'
  | 'respondent'
  | 'lawyer'
  | 'arbitrator'
  | 'mediator'
  | 'admin'
  | 'ops'
  | 'auditor'
  | 'court'
  | 'notary';

export type CapabilityNavKey =
  | 'dashboard'
  | 'cases'
  | 'documents'
  | 'hearings'
  | 'arbitrators'
  | 'mediation'
  | 'messages'
  | 'schedule'
  | 'ai-assistant'
  | 'reports'
  | 'ops';

export type CapabilityActionKey =
  | 'case:create'
  | 'case:view_all'
  | 'case:manage'
  | 'document:upload'
  | 'document:manage'
  | 'invitation:create'
  | 'invitation:respond'
  | 'consent:submit'
  | 'appointment:finalize'
  | 'mediation:room:join'
  | 'mediation:room:advance_stage'
  | 'rtc:hearing:create_room'
  | 'rtc:hearing:issue_join_token'
  | 'evidence:upload'
  | 'evidence:download'
  | 'ops:access'
  | 'audit:view';

export interface UserCapabilities {
  nav: CapabilityNavKey[];
  actions: CapabilityActionKey[];
  admin: {
    canAccessOps: boolean;
    canAccessAdmin: boolean;
  };
}

function hasRole(roles: PlatformRoleKey[], role: PlatformRoleKey): boolean {
  return roles.includes(role);
}

function hasAnyRole(roles: PlatformRoleKey[], anyOf: PlatformRoleKey[]): boolean {
  return anyOf.some((r) => roles.includes(r));
}

export function computeUserCapabilities(platformRoles: PlatformRoleKey[]): UserCapabilities {
  const nav = new Set<CapabilityNavKey>();
  const actions = new Set<CapabilityActionKey>();

  nav.add('dashboard');

  const canParty =
    hasAnyRole(platformRoles, ['END_USER', 'LAWYER', 'ADMIN', 'APPLICANT', 'RESPONDENT']);
  const canArbitrate = hasAnyRole(platformRoles, ['ARBITRATOR', 'ADMIN']);
  const canMediate = hasAnyRole(platformRoles, ['MEDIATOR', 'ADMIN']);
  const canCourt = hasRole(platformRoles, 'COURT');
  const canNotary = hasRole(platformRoles, 'NOTARY');
  const canOps = hasRole(platformRoles, 'OPS_ADMIN');
  const canAudit = hasRole(platformRoles, 'AUDITOR_READONLY');

  if (canParty) {
    nav.add('cases');
    nav.add('documents');
    nav.add('hearings');
    nav.add('arbitrators');
    nav.add('messages');
    nav.add('schedule');
    nav.add('mediation');
    nav.add('ai-assistant');

    actions.add('case:create');
    actions.add('document:upload');
    actions.add('evidence:upload');
    actions.add('evidence:download');
    actions.add('mediation:room:join');
    actions.add('consent:submit');
    actions.add('invitation:respond');
  }

  if (canArbitrate || canMediate) {
    nav.add('cases');
    nav.add('documents');
    nav.add('hearings');
    nav.add('arbitrators');
    nav.add('messages');
    nav.add('schedule');
    nav.add('mediation');
    nav.add('reports');

    actions.add('case:view_all');
    actions.add('case:manage');
    actions.add('document:manage');
    actions.add('invitation:create');
    actions.add('appointment:finalize');
    actions.add('rtc:hearing:create_room');
    actions.add('rtc:hearing:issue_join_token');
    actions.add('mediation:room:advance_stage');
  }

  if (canOps) {
    nav.add('ops');
    actions.add('ops:access');
    actions.add('audit:view');
  }

  if (canCourt || canNotary) {
    nav.add('cases');
    nav.add('documents');
    nav.add('reports');

    actions.add('evidence:download');
    actions.add('audit:view');
  }

  if (canAudit) {
    nav.add('reports');
    actions.add('audit:view');
  }

  return {
    nav: Array.from(nav),
    actions: Array.from(actions),
    admin: {
      canAccessOps: canOps,
      canAccessAdmin: hasRole(platformRoles, 'ADMIN') || canOps,
    },
  };
}

export function mapPlatformRolesToPersonas(platformRoles: PlatformRoleKey[]): PersonaRole[] {
  const personas = new Set<PersonaRole>();

  // 当事方/律师：允许以“申请人/被申请人/律师”视角进入（不代表授权事实，仅影响默认视图）
  if (hasAnyRole(platformRoles, ['END_USER', 'LAWYER', 'ADMIN', 'APPLICANT', 'RESPONDENT'])) {
    personas.add('applicant');
    personas.add('respondent');
    if (hasAnyRole(platformRoles, ['LAWYER', 'ADMIN'])) personas.add('lawyer');
    if (hasAnyRole(platformRoles, ['ADMIN'])) personas.add('admin');
  }

  if (hasAnyRole(platformRoles, ['ARBITRATOR', 'ADMIN'])) personas.add('arbitrator');
  if (hasAnyRole(platformRoles, ['MEDIATOR', 'ADMIN'])) personas.add('mediator');
  if (hasRole(platformRoles, 'OPS_ADMIN')) personas.add('ops');
  if (hasRole(platformRoles, 'AUDITOR_READONLY')) personas.add('auditor');
  if (hasRole(platformRoles, 'COURT')) personas.add('court');
  if (hasRole(platformRoles, 'NOTARY')) personas.add('notary');

  // 确保至少有一个可选身份，避免空白页
  if (personas.size === 0) personas.add('applicant');

  return Array.from(personas);
}

export function hasCapability(capabilities: UserCapabilities | null | undefined, action: CapabilityActionKey): boolean {
  if (!capabilities) return false;
  return capabilities.actions.includes(action);
}
