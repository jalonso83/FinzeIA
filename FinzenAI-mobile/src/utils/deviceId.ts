import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_ID_KEY = '@finzen_device_id';

/**
 * Identificador de esta instalación de la app.
 *
 * Lo usa el candado anti-abuso del trial: una prueba por dispositivo. Vive aquí
 * y no en cada pantalla porque el REGISTRO y la activación manual del trial
 * tienen que mandar exactamente el mismo valor — si cada uno generara el suyo,
 * el backend vería dos dispositivos distintos y el candado no serviría de nada.
 *
 * Qué NO es: no identifica un teléfono. Es un número al azar guardado en
 * AsyncStorage, así que borrar la app lo borra. Identifica una instalación.
 * Frena el caso casual (borro mi cuenta y me registro con otro correo), no a
 * quien se propone saltárselo.
 */
export const getDeviceId = async (): Promise<string> => {
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      deviceId = `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch (error) {
    // Si AsyncStorage falla, se devuelve uno nuevo SIN guardarlo. Es a
    // propósito: vale más dejar pasar un trial que romper el registro.
    return `${Platform.OS}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
};
