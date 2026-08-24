export type AdminIdentity = {
  userId: string;
  email: string;
};

export type AdminConfig = {
  userIds: string;
  emails: string;
  development?: boolean;
};

export function isAuthorizedAdmin(
  user: AdminIdentity,
  config: AdminConfig,
): boolean {
  const allowedIds = splitValues(config.userIds);
  const allowedEmails = splitValues(config.emails).map((email) => email.toLowerCase());

  if (allowedIds.includes(user.userId)) return true;
  if (allowedEmails.includes(user.email.toLowerCase())) return true;

  return Boolean(
    config.development && user.email.toLowerCase().endsWith('@sites.test'),
  );
}

function splitValues(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
