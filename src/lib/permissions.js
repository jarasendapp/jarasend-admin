// Maps each admin role to the routes it's allowed to access. Dashboard
// is available to every role (general overview, nothing sensitive).
// super_admin always has full access, checked separately below rather
// than listed here, so it never needs updating when new routes are added.
//
// This mapping is a reasonable starting default, not a fixed spec —
// adjust freely as the team's actual workflow becomes clearer.
export const ROLE_PERMISSIONS = {
  finance_admin: ['/', '/analytics', '/transactions', '/claim-codes', '/cash-pickup', '/wallets', '/settlement', '/commission'],
  support: ['/', '/personal-accounts', '/agent-accounts', '/cash-pickup', '/claim-codes', '/support', '/notifications'],
  compliance: ['/', '/personal-accounts', '/agent-accounts', '/kyc', '/fraud-monitoring', '/security-center', '/audit-logs'],
  operations: ['/', '/analytics', '/cash-pickup', '/claim-codes', '/wallets', '/settlement', '/api-monitoring', '/system-settings'],
}

export function canAccess(role, path) {
  if (role === 'super_admin') return true
  return ROLE_PERMISSIONS[role]?.includes(path) ?? false
}
