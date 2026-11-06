/** Role użytkowników i ich uprawnienia (czyste — używane po obu stronach). */
export type Role = 'ADMIN' | 'EDITOR' | 'VIEWER';

const RANK: Record<Role, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2 };

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrator',
  EDITOR: 'Edytor',
  VIEWER: 'Podgląd',
};

export function hasRole(actual: Role, required: Role): boolean {
  return RANK[actual] >= RANK[required];
}
