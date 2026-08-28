const ROLE_ROUTES = {
  USER: '/citizen',
  DRIVER: '/dispatch',
  ADMIN: '/admin',
  OPERATOR: '/alerts',
};

export function getDefaultRoute(role) {
  return ROLE_ROUTES[role] || '/citizen';
}

export function getRoleLabel(role) {
  const labels = {
    USER: 'User',
    DRIVER: 'Driver & Collector',
    ADMIN: 'Municipal Admin',
    OPERATOR: 'System Operator',
  };
  return labels[role] || role;
}
