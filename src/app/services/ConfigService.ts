export interface AppConfig {
  apiUrl: string;
  wsUrl: string;
  userPoolId: string;
  userPoolClientId: string;
  region: string;
  isCustom: boolean;
}

export function getAppConfig(): AppConfig {
  const customApiUrl = localStorage.getItem('notecognition:custom_api_url');
  const customWsUrl = localStorage.getItem('notecognition:custom_ws_url');
  const customUserPoolId = localStorage.getItem('notecognition:custom_user_pool_id');
  const customUserPoolClientId = localStorage.getItem('notecognition:custom_user_pool_client_id');
  const customRegion = localStorage.getItem('notecognition:custom_region');

  if (customUserPoolId && customUserPoolClientId) {
    return {
      apiUrl: customApiUrl || '',
      wsUrl: customWsUrl || '',
      userPoolId: customUserPoolId,
      userPoolClientId: customUserPoolClientId,
      region: customRegion || '',
      isCustom: true,
    };
  }

  // Fallback to dev/environment variables configured at build time
  return {
    apiUrl: import.meta.env.VITE_API_URL || '',
    wsUrl: import.meta.env.VITE_WS_URL || '',
    userPoolId: import.meta.env.VITE_USER_POOL_ID || '',
    userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || '',
    region: import.meta.env.VITE_REGION || '',
    isCustom: false,
  };
}

export function saveCustomConfig(config: Omit<AppConfig, 'isCustom'>) {
  localStorage.setItem('notecognition:custom_api_url', config.apiUrl);
  localStorage.setItem('notecognition:custom_ws_url', config.wsUrl);
  localStorage.setItem('notecognition:custom_user_pool_id', config.userPoolId);
  localStorage.setItem('notecognition:custom_user_pool_client_id', config.userPoolClientId);
  localStorage.setItem('notecognition:custom_region', config.region);
}

export function clearCustomConfig() {
  localStorage.removeItem('notecognition:custom_api_url');
  localStorage.removeItem('notecognition:custom_ws_url');
  localStorage.removeItem('notecognition:custom_user_pool_id');
  localStorage.removeItem('notecognition:custom_user_pool_client_id');
  localStorage.removeItem('notecognition:custom_region');
}
