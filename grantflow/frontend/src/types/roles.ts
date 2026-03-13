export type UserRole =
  | 'platform_admin'
  | 'program_officer'
  | 'grant_reviewer'
  | 'finance_officer'
  | 'applicant';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  badge?: number;
}

export interface NavGroup {
  section: string;
  items: NavItem[];
}

export const NAV_CONFIG: Record<UserRole, NavGroup[]> = {
  platform_admin: [
    {
      section: 'Overview',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: '◈' },
        { label: 'Grant Programmes', path: '/grants', icon: '◎' },
      ],
    },
    {
      section: 'Pipeline',
      items: [
        { label: 'All Applications', path: '/applications', icon: '◧' },
        { label: 'Screening Queue', path: '/screening', icon: '◎' },
        { label: 'Review Queue', path: '/review', icon: '◉' },
      ],
    },
    {
      section: 'Grants',
      items: [
        { label: 'Awards & Agreements', path: '/awards', icon: '◈' },
        { label: 'Disbursements', path: '/finance', icon: '◧' },
        { label: 'Compliance', path: '/compliance', icon: '◉' },
      ],
    },
    {
      section: 'System',
      items: [
        { label: 'Messages', path: '/messages', icon: '◎' },
        { label: 'User Management', path: '/admin/users', icon: '◈' },
        { label: 'Audit Log', path: '/admin/audit', icon: '◧' },
        { label: 'Templates', path: '/admin/templates', icon: '◉' },
        { label: 'Programmes', path: '/admin/programmes', icon: '◎' },
      ],
    },
  ],

  program_officer: [
    {
      section: 'Overview',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: '◈' },
        { label: 'Grant Programmes', path: '/grants', icon: '◎' },
      ],
    },
    {
      section: 'Pipeline',
      items: [
        { label: 'All Applications', path: '/applications', icon: '◧' },
        { label: 'AI Screening', path: '/screening', icon: '◎' },
        { label: 'Review Queue', path: '/review', icon: '◉' },
      ],
    },
    {
      section: 'Grants',
      items: [
        { label: 'Awards & Agreements', path: '/awards', icon: '◈' },
        { label: 'Compliance Reports', path: '/compliance', icon: '◉' },
      ],
    },
    {
      section: 'Communicate',
      items: [
        { label: 'Messages', path: '/messages', icon: '◎' },
      ],
    },
  ],

  grant_reviewer: [
    {
      section: 'Overview',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: '◈' },
      ],
    },
    {
      section: 'My Work',
      items: [
        { label: 'Review Queue', path: '/review', icon: '◉' },
        { label: 'Completed Reviews', path: '/review/completed', icon: '◧' },
      ],
    },
  ],

  finance_officer: [
    {
      section: 'Overview',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: '◈' },
      ],
    },
    {
      section: 'Finance',
      items: [
        { label: 'Disbursements', path: '/finance', icon: '◧' },
        { label: 'Expenditure Records', path: '/finance/expenditure', icon: '◉' },
        { label: 'Fund Utilisation', path: '/finance/utilisation', icon: '◎' },
      ],
    },
    {
      section: 'Alerts',
      items: [
        { label: 'Compliance Holds', path: '/finance/holds', icon: '◈' },
      ],
    },
  ],

  applicant: [
    {
      section: 'Discover',
      items: [
        { label: 'Grant Programmes', path: '/grants', icon: '◎' },
      ],
    },
    {
      section: 'My Portal',
      items: [
        { label: 'My Dashboard', path: '/portal', icon: '◈' },
        { label: 'Apply for Grant', path: '/portal/apply', icon: '◧' },
        { label: 'My Applications', path: '/portal/applications', icon: '◉' },
      ],
    },
    {
      section: 'Active Grants',
      items: [
        { label: 'Submit Reports', path: '/portal/reports', icon: '◧' },
        { label: 'Expenditure Records', path: '/portal/expenditure', icon: '◉' },
      ],
    },
    {
      section: 'Account',
      items: [
        { label: 'Messages', path: '/portal/messages', icon: '◎' },
        { label: 'Document Vault', path: '/portal/documents', icon: '◈' },
        { label: 'Organisation Profile', path: '/portal/profile', icon: '◧' },
      ],
    },
  ],
};

export const ROLE_LABELS: Record<UserRole, string> = {
  platform_admin: 'Platform Admin',
  program_officer: 'Program Officer',
  grant_reviewer: 'Grant Reviewer',
  finance_officer: 'Finance Officer',
  applicant: 'Applicant',
};

export const ROLE_INITIALS: Record<UserRole, string> = {
  platform_admin: 'PA',
  program_officer: 'PO',
  grant_reviewer: 'GR',
  finance_officer: 'FO',
  applicant: 'AP',
};