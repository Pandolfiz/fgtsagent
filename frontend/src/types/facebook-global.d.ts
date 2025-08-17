declare global {
  interface Window {
    FB: {
      init: (config: any) => void;
      login: (callback: (response: any) => void, options?: any) => void;
      getLoginStatus: (callback: (response: any) => void) => void;
    };
    fbAsyncInit: () => void;
  }
}

export {};
