/**
 * Tijdelijke vaste gebruiker zolang er nog geen authenticatie is. Alle portfolio-requests
 * horen bij deze gebruiker; de auth-stap vervangt dit door de gebruiker uit de JWT.
 */
export const DEMO_USER = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'demo@fintrack.local',
  displayName: 'Demo',
} as const;
