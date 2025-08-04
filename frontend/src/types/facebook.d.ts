// Definições de tipos para Facebook SDK
declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export interface FacebookAuthResponse {
  authResponse: {
    accessToken: string;
    expiresIn: string;
    reauthorize_required_in: string;
    signedRequest: string;
    userID: string;
    code?: string;
  } | null;
  status: string;
}

export interface FacebookLoginOptions {
  config_id?: string;
  response_type?: string;
  override_default_response_type?: boolean;
  extras?: {
    setup?: {
      business_name?: string;
      email?: string;
    };
    featureType?: string;
    sessionInfoVersion?: string;
  };
} 