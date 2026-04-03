export const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
export const assetBaseUrl = new URL(apiBaseUrl).origin;

export function resolveAssetUrl(url: string | null | undefined) {
  if (!url) {
    return "";
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${assetBaseUrl}${url.startsWith("/") ? url : `/${url}`}`;
}
