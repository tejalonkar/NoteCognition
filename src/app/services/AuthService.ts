import { 
  CognitoUserPool, 
  CognitoUserAttribute, 
  CognitoUser, 
  AuthenticationDetails 
} from 'amazon-cognito-identity-js';
import { getAppConfig } from './ConfigService';

let cachedUserPool: CognitoUserPool | null = null;
let cachedUserPoolId = '';
let cachedClientId = '';

function getUserPool(): CognitoUserPool {
  const config = getAppConfig();
  const poolId = config.userPoolId;
  const clientId = config.userPoolClientId;

  const isConfigured = !!(poolId && clientId);
  if (!isConfigured) {
    return { getCurrentUser: () => null } as any;
  }

  if (cachedUserPool && cachedUserPoolId === poolId && cachedClientId === clientId) {
    return cachedUserPool;
  }

  try {
    cachedUserPool = new CognitoUserPool({
      UserPoolId: poolId,
      ClientId: clientId,
    });
    cachedUserPoolId = poolId;
    cachedClientId = clientId;
    return cachedUserPool;
  } catch (e) {
    console.error('Failed to initialize CognitoUserPool:', e);
    return { getCurrentUser: () => null } as any;
  }
}

export class AuthService {
  isConfigured(): boolean {
    const config = getAppConfig();
    return !!(config.userPoolId && config.userPoolClientId);
  }

  private checkConfiguration() {
    if (!this.isConfigured()) {
      throw new Error(
        "AWS Cognito is not configured. Please ensure VITE_USER_POOL_ID and VITE_USER_POOL_CLIENT_ID are set in your environment variables or custom settings."
      );
    }
  }

  signUp(email: string, password: string): Promise<any> {
    try {
      this.checkConfiguration();
    } catch (err: any) {
      return Promise.reject(err);
    }

    return new Promise((resolve, reject) => {
      const attributeList = [new CognitoUserAttribute({ Name: 'email', Value: email })];
      getUserPool().signUp(email, password, attributeList, [], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  confirmSignUp(email: string, code: string): Promise<any> {
    try {
      this.checkConfiguration();
    } catch (err: any) {
      return Promise.reject(err);
    }

    return new Promise((resolve, reject) => {
      const userData = { Username: email, Pool: getUserPool() };
      const cognitoUser = new CognitoUser(userData);
      cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  signIn(email: string, password: string): Promise<any> {
    try {
      this.checkConfiguration();
    } catch (err: any) {
      return Promise.reject(err);
    }

    return new Promise((resolve, reject) => {
      const authenticationData = { Username: email, Password: password };
      const authenticationDetails = new AuthenticationDetails(authenticationData);
      const userData = { Username: email, Pool: getUserPool() };
      const cognitoUser = new CognitoUser(userData);
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => resolve(result),
        onFailure: (err) => reject(err),
      });
    });
  }

  getSession(): Promise<any> {
    try {
      this.checkConfiguration();
    } catch (err: any) {
      return Promise.reject(err);
    }

    return new Promise((resolve, reject) => {
      const user = getUserPool().getCurrentUser();
      if (!user) return reject('No user logged in');
      user.getSession((err: any, session: any) => {
        if (err) return reject(err);
        resolve(session);
      });
    });
  }

  signOut() {
    if (!this.isConfigured()) return;
    const user = getUserPool().getCurrentUser();
    if (user) {
      user.signOut();
    }
  }
}

export const authService = new AuthService();
