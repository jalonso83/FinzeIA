import React from 'react';
import { InputAccessoryView, Keyboard, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Botón azul con palomita blanca arriba del teclado, para cerrar los teclados
 * numéricos (en iPhone no traen tecla de confirmar). Imita la tecla de
 * confirmar del teclado de texto de iOS 26 para que ambos se vean iguales.
 *
 * Uso: el campo lleva `inputAccessoryViewID="kb-algo"` y este botón va JUSTO
 * después del campo con el mismo `nativeID`.
 *
 * Por qué uno por campo y pegado a él: con la arquitectura nueva (Fabric) la
 * barra se engancha a UN solo campo (el primero con ese ID) y solo cuando la
 * barra aparece en pantalla. Si se comparte el ID, los demás campos se quedan
 * sin botón; si el campo aparece después que la barra, tampoco lo tiene.
 *
 * Es un InputAccessoryView, no un <Modal>: se puede usar dentro de los
 * formularios que ya son Modal.
 */
export default function KeyboardDoneButton({ nativeID }: { nativeID: string }) {
  if (Platform.OS !== 'ios') return null;

  return (
    <InputAccessoryView nativeID={nativeID} backgroundColor="transparent">
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => Keyboard.dismiss()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Listo"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="checkmark" size={24} color="white" />
        </TouchableOpacity>
      </View>
    </InputAccessoryView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
