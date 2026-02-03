/**
 * Service Token Authentication
 * Validates Cloudflare Access-style service token headers
 */

const VALID_SERVICE_TOKENS = [
  {
    client_id: 'b3d10235afaf5f66d48fd95857261125.access',
    client_secret: '1c49e8bd150d8c60b845891e90ef52261db6593db91a8324a06f3f78d47d6c27',
    name: 'mc-agents-v2'
  },
  {
    client_id: '7842cda5be7b8a8ffb488d343058fc24.access',
    client_secret: 'e110a80dc299a9ea0ce45d9225c39df3e88cadfe986c2665f287c1777d8b5421',
    name: 'mission-control-agents'
  }
];

export function validateServiceToken(clientId: string | null, clientSecret: string | null): boolean {
  if (!clientId || !clientSecret) {
    return false;
  }

  return VALID_SERVICE_TOKENS.some(
    token => token.client_id === clientId && token.client_secret === clientSecret
  );
}

export function requireServiceToken(headers: Headers): boolean {
  const clientId = headers.get('cf-access-client-id');
  const clientSecret = headers.get('cf-access-client-secret');
  
  return validateServiceToken(clientId, clientSecret);
}
