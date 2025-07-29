function getAdminConfig() {
  return {
    secretCodes: process.env.ADMIN_SECRET_CODES,
    authorizedEmails: process.env.ADMIN_EMAILS,
  };
}

export default { getAdminConfig };
