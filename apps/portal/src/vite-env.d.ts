/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_COGNITO_USER_POOL_ID?: string;
  readonly VITE_COGNITO_CLIENT_ID?: string;
  readonly VITE_COGNITO_DOMAIN?: string;
  readonly VITE_COGNITO_REDIRECT_SIGN_IN?: string;
  readonly VITE_COGNITO_REDIRECT_SIGN_OUT?: string;
  readonly VITE_DEV_ACCESS_TOKEN?: string;
  readonly VITE_DEV_USER_SUB?: string;
  readonly VITE_DEV_USER_GROUPS?: string;
  readonly VITE_DEV_USER_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
