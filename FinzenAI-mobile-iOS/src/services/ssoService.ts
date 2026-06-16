import * as AppleAuthentication from 'expo-apple-authentication';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI, saveToken, SSOAuthResponse } from '../utils/api';
import { useAuthStore } from '../stores/auth';
import { logger } from '../utils/logger';

// Web Client ID del proyecto Google Cloud "finzen-ai".
// Coincide con el aud que el backend verifica en los idTokens de Google.
const GOOGLE_WEB_CLIENT_ID = '736460729278-e5hk2dvr5fu6vtp2mv4mt16aiqqicabc.apps.googleusercontent.com';
const GOOGLE_IOS_CLIENT_ID = '736460729278-edd38kc44617nnmcq8on0fjijdpbuhos.apps.googleusercontent.com';

let googleConfigured = false;
function configureGoogleSignIn() {
  if (googleConfigured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
  });
  googleConfigured = true;
}

export class SSOCancelledError extends Error {
  constructor() {
    super('SSO_CANCELLED');
    this.name = 'SSOCancelledError';
  }
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

async function persistSSOAuth(response: SSOAuthResponse): Promise<void> {
  await saveToken(response.token);
  await useAuthStore.getState().login(response.user as any, response.token);
}

async function getPendingReferralCode(): Promise<string | undefined> {
  try {
    const code = await AsyncStorage.getItem('pendingReferralCode');
    return code || undefined;
  } catch {
    return undefined;
  }
}

async function clearPendingReferralCode(): Promise<void> {
  try {
    await AsyncStorage.removeItem('pendingReferralCode');
  } catch {
    // best-effort
  }
}

/**
 * Lee la región y locale del device (configurados por el user en Settings).
 * Se pasan al backend para inferir país y moneda al crear users SSO nuevos.
 * Si el SDK falla por cualquier razón, retorna {} y el backend usa fallback GeoIP.
 */
function getDeviceLocaleHints(): { deviceCountry?: string; deviceLocale?: string } {
  try {
    const region = Localization.getLocales()[0]?.regionCode ?? null;
    const locale = Localization.getLocales()[0]?.languageTag ?? null;
    return {
      deviceCountry: region || undefined,
      deviceLocale: locale || undefined,
    };
  } catch (err) {
    logger.warn('[SSO] No se pudo leer device locale:', err);
    return {};
  }
}

/**
 * Sign in with Apple — flujo nativo iOS.
 * Lanza SSOCancelledError si el user cancela. Cualquier otro error se propaga.
 */
export async function signInWithApple(): Promise<SSOAuthResponse> {
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
  } catch (err: any) {
    // Apple devuelve un error con code ERR_REQUEST_CANCELED cuando el user cancela.
    if (err?.code === 'ERR_REQUEST_CANCELED' || err?.code === 'ERR_CANCELED') {
      throw new SSOCancelledError();
    }
    logger.error('[SSO/Apple] SDK error:', err);
    throw err;
  }

  if (!credential.identityToken) {
    throw new Error('Apple no devolvió identityToken');
  }

  // Apple solo manda nombre en el PRIMER sign-in.
  const name = credential.fullName?.givenName ?? undefined;
  const lastName = credential.fullName?.familyName ?? undefined;
  const referralCode = await getPendingReferralCode();

  const { data } = await authAPI.appleSignIn({
    identityToken: credential.identityToken,
    name,
    lastName,
    referralCode,
    ...getDeviceLocaleHints(),
  });

  await persistSSOAuth(data);
  if (data.isNewUser) await clearPendingReferralCode();
  return data;
}

/**
 * Sign in with Google — flujo nativo via @react-native-google-signin.
 * Lanza SSOCancelledError si el user cancela. Cualquier otro error se propaga.
 */
export async function signInWithGoogle(): Promise<SSOAuthResponse> {
  configureGoogleSignIn();

  let idToken: string | null = null;
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await GoogleSignin.signIn();
    // El SDK devuelve la estructura { type: 'success', data: { idToken, user, ... } }
    // o { type: 'cancelled' } según versión. Soportamos ambos shapes.
    idToken = (result as any)?.data?.idToken ?? (result as any)?.idToken ?? null;

    if ((result as any)?.type === 'cancelled') {
      throw new SSOCancelledError();
    }
  } catch (err: any) {
    if (err instanceof SSOCancelledError) throw err;
    const code = err?.code;
    if (code === statusCodes.SIGN_IN_CANCELLED) {
      throw new SSOCancelledError();
    }
    logger.error('[SSO/Google] SDK error:', err);
    throw err;
  }

  if (!idToken) {
    throw new Error('Google no devolvió idToken');
  }

  const referralCode = await getPendingReferralCode();
  const { data } = await authAPI.googleSignIn({
    idToken,
    referralCode,
    ...getDeviceLocaleHints(),
  });

  await persistSSOAuth(data);
  if (data.isNewUser) await clearPendingReferralCode();
  return data;
}
