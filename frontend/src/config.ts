type AppConfig = {
  API_BASE_URL?: string;
  WS_BASE_URL?: string;
};

declare global {
  interface Window {
    __APP_CONFIG__?: AppConfig;
  }
}

const runtimeConfig = window.__APP_CONFIG__ ?? {};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const envApiUrl = import.meta.env.VITE_API_URL;

export const apiBaseUrl = trimTrailingSlash(
  runtimeConfig.API_BASE_URL || envApiUrl,
);

const envWsUrl = import.meta.env.VITE_API_URL?.replace("https", "wss").replace(
  "http",
  "ws",
);

const defaultWsBaseUrl = (() => {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/api/ws`;
})();

export const wsBaseUrl = trimTrailingSlash(
  runtimeConfig.WS_BASE_URL || envWsUrl || defaultWsBaseUrl,
);
