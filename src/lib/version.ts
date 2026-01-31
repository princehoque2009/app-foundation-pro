// Prangon App Version
export const APP_VERSION = "1.5.0";
export const APP_NAME = "Prangon";
export const COPYRIGHT_YEAR = new Date().getFullYear();

export const getVersionInfo = () => ({
  version: APP_VERSION,
  name: APP_NAME,
  year: COPYRIGHT_YEAR,
  fullVersion: `${APP_NAME} v${APP_VERSION}`,
  copyright: `© ${COPYRIGHT_YEAR} ${APP_NAME}. All rights reserved.`,
});
