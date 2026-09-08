import { Amplify } from "aws-amplify";

function required(name: string, value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

export function configureCognito(): void {
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_USER_SUB) return;

  const userPoolId = required("VITE_COGNITO_USER_POOL_ID", import.meta.env.VITE_COGNITO_USER_POOL_ID);
  const userPoolClientId = required("VITE_COGNITO_CLIENT_ID", import.meta.env.VITE_COGNITO_CLIENT_ID);
  const domain = required("VITE_COGNITO_DOMAIN", import.meta.env.VITE_COGNITO_DOMAIN)
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  const redirectSignIn = String(import.meta.env.VITE_COGNITO_REDIRECT_SIGN_IN ?? window.location.origin);
  const redirectSignOut = String(import.meta.env.VITE_COGNITO_REDIRECT_SIGN_OUT ?? window.location.origin);

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          oauth: {
            domain,
            scopes: ["openid", "email", "profile"],
            redirectSignIn: [redirectSignIn],
            redirectSignOut: [redirectSignOut],
            responseType: "code"
          }
        }
      }
    }
  });
}
