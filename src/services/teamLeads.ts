/**
 * Team-lead (admin) allowlist, mirroring the reference app's TEAM_LEAD_EMAILS
 * gate on team creation.
 *
 * The allowlist is configured as SHA-256 hashes (VITE_TEAM_LEAD_HASHES), so the
 * plaintext addresses never appear in the source or the built bundle — at
 * runtime the signed-in user's email is hashed and compared. Identity itself is
 * proven by Firebase Auth; a hash match alone grants nothing without a
 * successful sign-in as that address.
 */

const TEAM_LEAD_HASHES = (import.meta.env.VITE_TEAM_LEAD_HASHES ?? '')
  .split(',')
  .map((h: string) => h.trim().toLowerCase())
  .filter(Boolean)

/** True when an allowlist is configured and team creation is restricted. */
export const teamCreationRestricted = TEAM_LEAD_HASHES.length > 0

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function isAuthorizedTeamLead(email: string): Promise<boolean> {
  if (!teamCreationRestricted) return true
  const hash = await sha256Hex(email.trim().toLowerCase())
  return TEAM_LEAD_HASHES.includes(hash)
}

/**
 * Same check but strict: false when no allowlist is configured. Used to grant
 * admin recognition (e.g. after Google SSO) only to explicitly listed leads.
 */
export async function isListedTeamLead(email: string): Promise<boolean> {
  if (TEAM_LEAD_HASHES.length === 0) return false
  const hash = await sha256Hex(email.trim().toLowerCase())
  return TEAM_LEAD_HASHES.includes(hash)
}

const ALLOWED_DOMAINS = (import.meta.env.VITE_ALLOWED_DOMAINS ?? '')
  .split(',')
  .map((d: string) => d.trim().toLowerCase())
  .filter(Boolean)

/** True when sign-in is restricted to specific email domains. */
export const domainRestricted = ALLOWED_DOMAINS.length > 0

export function isAllowedDomain(email: string): boolean {
  if (!domainRestricted) return true
  const domain = email.trim().toLowerCase().split('@')[1] ?? ''
  return ALLOWED_DOMAINS.includes(domain)
}

export function allowedDomainsLabel(): string {
  return ALLOWED_DOMAINS.join(' or ')
}
