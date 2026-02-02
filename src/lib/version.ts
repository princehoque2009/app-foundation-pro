// Prangon App Version
export const APP_VERSION = "1.6.0";
export const BUILD_NUMBER = "154";
export const APP_NAME = "Prangon";
export const RELEASE_DATE = "2026-02-02";
export const COPYRIGHT_YEAR = new Date().getFullYear();

export const getVersionInfo = () => ({
  version: APP_VERSION,
  build: BUILD_NUMBER,
  name: APP_NAME,
  releaseDate: RELEASE_DATE,
  year: COPYRIGHT_YEAR,
  fullVersion: `${APP_NAME} v${APP_VERSION} (Build ${BUILD_NUMBER})`,
  copyright: `© ${COPYRIGHT_YEAR} ${APP_NAME}. All rights reserved.`,
});
