import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * Calendario que se abre DENTRO del formulario (display "inline"), con botón
 * "Listo" para cerrarlo.
 *
 * Por qué existe: el selector "default" de iOS abre un calendario flotante. Si
 * el selector se desmonta al elegir el día (lo que hacíamos), el calendario
 * flotante queda huérfano y la pantalla sigue con el teclado y los toques a
 * medias hasta cambiar de pestaña. El calendario en línea no flota: se puede
 * quitar de la pantalla sin dejar nada colgado.
 *
 * No se cierra solo al tocar un día porque cambiar mes/año también avisa un
 * cambio: se cerraría a mitad de elegir.
 *
 * "Listo" guarda la fecha que se ve: iOS no avisa cuando se toca el día que ya
 * está marcado, y con el campo vacío ese día (hoy, por ejemplo) no se guardaba.
 */
interface Props {
  visible: boolean;
  value: Date;
  onChange: (fecha: Date) => void;
  onListo: () => void;
  minimumDate?: Date;
  maximumDate?: Date;
}

export default function CalendarioEnLinea({ visible, value, onChange, onListo, minimumDate, maximumDate }: Props) {
  if (!visible) return null;
  return (
    <View style={styles.contenedor}>
      <DateTimePicker
        value={value}
        mode="date"
        display="inline"
        locale="es-ES"
        themeVariant="light"
        onChange={(_event, fecha) => { if (fecha) onChange(fecha); }}
        minimumDate={minimumDate}
        maximumDate={maximumDate}
      />
      <TouchableOpacity style={styles.listo} onPress={() => { onChange(value); onListo(); }} activeOpacity={0.7}>
        <Text style={styles.listoTexto}>Listo</Text>
      </TouchableOpacity>
    </View>
  );
}

/** "DD-MM-YYYY", el formato que muestran los formularios. */
export function aTextoDeFecha(fecha: Date): string {
  const dd = String(fecha.getDate()).padStart(2, '0');
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${fecha.getFullYear()}`;
}

const styles = StyleSheet.create({
  contenedor: {
    marginTop: 8,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  listo: {
    alignSelf: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  listoTexto: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '600',
  },
});
