/**
 * Logger Utility para React Native
 *
 * Reemplaza console.log/error/warn para controlar output en produccion.
 * En produccion (__DEV__ = false): solo se muestran errores criticos.
 * En desarrollo (__DEV__ = true): se muestran todos los logs.
 *
 * USO:
 * import { logger } from '../utils/logger';
 * logger.log('mensaje');      // Solo en desarrollo
 * logger.error('error');      // Siempre (errores criticos)
 * logger.warn('advertencia'); // Solo en desarrollo
 */

const isDev = __DEV__;

type LogArgs = any[];

export const logger = {
  /**
   * Log general - solo en desarrollo
   */
  log: (...args: LogArgs): void => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Info - solo en desarrollo
   */
  info: (...args: LogArgs): void => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * Debug - solo en desarrollo
   */
  debug: (...args: LogArgs): void => {
    if (isDev) {
      console.debug(...args);
    }
  },

  /**
   * Warn - solo en desarrollo
   */
  warn: (...args: LogArgs): void => {
    if (isDev) {
      console.warn(...args);
    }
  },

  /**
   * Error - SIEMPRE se muestra (errores criticos)
   */
  error: (...args: LogArgs): void => {
    console.error(...args);
  },
};

export default logger;
