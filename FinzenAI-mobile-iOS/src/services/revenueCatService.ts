import { Platform } from 'react-native';
import Purchases, {
  PurchasesOfferings,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { logger } from '../utils/logger';

// API Key pública de RevenueCat para iOS
// IMPORTANTE: Esta es la key PÚBLICA (no la secret). Es seguro tenerla en el código del cliente.
const REVENUECAT_IOS_API_KEY = 'appl_kKvFMlbIzfgwuYFvxiVsCLXFlnk';

class RevenueCatMobileService {
  private initialized = false;

  /**
   * Inicializar RevenueCat SDK con el userId de nuestra app
   */
  async initialize(userId: string): Promise<void> {
    if (this.initialized) {
      logger.log('[RevenueCat] Ya inicializado, haciendo login con userId:', userId);
      await this.login(userId);
      return;
    }

    try {
      if (Platform.OS !== 'ios') {
        logger.log('[RevenueCat] No es iOS, saltando inicialización');
        return;
      }

      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      Purchases.configure({
        apiKey: REVENUECAT_IOS_API_KEY,
        appUserID: userId,
      });

      this.initialized = true;
      logger.log('[RevenueCat] SDK inicializado para userId:', userId);
    } catch (error) {
      logger.error('[RevenueCat] Error inicializando SDK:', error);
    }
  }

  /**
   * Identificar usuario en RevenueCat (al hacer login)
   */
  async login(userId: string): Promise<CustomerInfo | null> {
    try {
      const { customerInfo } = await Purchases.logIn(userId);
      logger.log('[RevenueCat] Login exitoso para:', userId);
      return customerInfo;
    } catch (error) {
      logger.error('[RevenueCat] Error en login:', error);
      return null;
    }
  }

  /**
   * Desloguear usuario de RevenueCat
   */
  async logout(): Promise<void> {
    try {
      await Purchases.logOut();
      this.initialized = false;
      logger.log('[RevenueCat] Logout exitoso');
    } catch (error) {
      logger.error('[RevenueCat] Error en logout:', error);
    }
  }

  /**
   * Obtener offerings (productos disponibles con precios de App Store)
   */
  async getOfferings(): Promise<PurchasesOfferings | null> {
    try {
      const offerings = await Purchases.getOfferings();
      logger.log('[RevenueCat] Offerings obtenidos:', Object.keys(offerings.all));
      return offerings;
    } catch (error) {
      logger.error('[RevenueCat] Error obteniendo offerings:', error);
      return null;
    }
  }

  /**
   * Comprar un package (muestra sheet nativo de Apple)
   */
  async purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo | null> {
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      logger.log('[RevenueCat] Compra exitosa:', pkg.identifier);
      return customerInfo;
    } catch (error: any) {
      if (error.userCancelled) {
        logger.log('[RevenueCat] Compra cancelada por el usuario');
        return null;
      }
      logger.error('[RevenueCat] Error en compra:', error);
      throw error;
    }
  }

  /**
   * Restaurar compras anteriores
   */
  async restorePurchases(): Promise<CustomerInfo | null> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      logger.log('[RevenueCat] Compras restauradas');
      return customerInfo;
    } catch (error) {
      logger.error('[RevenueCat] Error restaurando compras:', error);
      throw error;
    }
  }

  /**
   * Obtener info actual del customer
   */
  async getCustomerInfo(): Promise<CustomerInfo | null> {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo;
    } catch (error) {
      logger.error('[RevenueCat] Error obteniendo customer info:', error);
      return null;
    }
  }
}

export const revenueCatMobileService = new RevenueCatMobileService();
