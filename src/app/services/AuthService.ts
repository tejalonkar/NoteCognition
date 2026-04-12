import { 
  CognitoUserPool, 
  CognitoUserAttribute, 
  CognitoUser, 
  AuthenticationDetails 
} from 'amazon-cognito-identity-js';

// Configuration placeholders (to be filled from CloudFormation outputs)
const poolData = {
  UserPoolId: import.meta.env.VITE_USER_POOL_ID || '', 
  ClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || ''
};

let userPool: CognitoUserPool;
try {
  userPool = new CognitoUserPool(poolData);
} catch (e) {
  userPool = { getCurrentUser: () => null } as any;
}

export class AuthService {
  signUp(email: string, password: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const attributeList = [new CognitoUserAttribute({ Name: 'email', Value: email })];
      userPool.signUp(email, password, attributeList, [], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  confirmSignUp(email: string, code: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const userData = { Username: email, Pool: userPool };
      const cognitoUser = new CognitoUser(userData);
      cognitoUser.confirmRegistration(code, true, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  signIn(email: string, password: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const authenticationData = { Username: email, Password: password };
      const authenticationDetails = new AuthenticationDetails(authenticationData);
      const userData = { Username: email, Pool: userPool };
      const cognitoUser = new CognitoUser(userData);
      cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: (result) => resolve(result),
        onFailure: (err) => reject(err),
      });
    });
  }

  getSession(): Promise<any> {
    return new Promise((resolve, reject) => {
      const user = userPool.getCurrentUser();
      if (!user) return reject('No user logged in');
      user.getSession((err: any, session: any) => {
        if (err) return reject(err);
        resolve(session);
      });
    });
  }

  signOut() {
    const user = userPool.getCurrentUser();
    if (user) {
      user.signOut();
      window.location.reload();
    }
  }
}

export const authService = new AuthService();
