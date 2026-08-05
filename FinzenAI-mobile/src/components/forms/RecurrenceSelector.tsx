import React from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { RecurrenceFrequency } from '../../utils/api';

// ─────────────────────────────────────────────────────────────────────────
// Selector de recurrencia del formulario de transacciones.
//
// Se renderiza como chips en línea, NO como picker en un <Modal>: el
// formulario ya vive dentro de un Modal y en iOS no se pueden anidar. De paso
// es menos fricción — un toque en vez de abrir/elegir/cerrar.
// ─────────────────────────────────────────────────────────────────────────

interface FrequencyOption {
  value: RecurrenceFrequency;
  label: string;
}

const FREQUENCIES: FrequencyOption[] = [
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'BIWEEKLY', label: 'Quincenal' },
  { value: 'MONTHLY', label: 'Mensual' },
];

interface RecurrenceSelectorProps {
  enabled: boolean;
  onToggle: (value: boolean) => void;
  frequency: RecurrenceFrequency;
  onSelectFrequency: (value: RecurrenceFrequency) => void;
  /** Fecha visible del formulario en DD-MM-YYYY, para explicar el día del mes. */
  displayDate: string;
  type: 'INCOME' | 'EXPENSE';
  disabled?: boolean;
}

/** Explica en palabras cuándo se va a repetir, para que no haya sorpresas. */
export function describeFrequency(
  frequency: RecurrenceFrequency,
  displayDate: string,
  type: 'INCOME' | 'EXPENSE'
): string {
  const movimiento = type === 'INCOME' ? 'ingreso' : 'gasto';

  switch (frequency) {
    case 'WEEKLY':
      return `Se registrará este ${movimiento} cada 7 días, el mismo día de la semana.`;
    case 'BIWEEKLY':
      return `Se registrará este ${movimiento} el día 15 y el último día de cada mes.`;
    case 'MONTHLY': {
      const day = parseInt(displayDate?.split('-')[0] ?? '', 10);
      if (!day || isNaN(day)) {
        return `Se registrará este ${movimiento} una vez al mes.`;
      }
      const aclaracion =
        day > 28 ? ' Si el mes no tiene ese día, será el último día del mes.' : '';
      return `Se registrará este ${movimiento} el día ${day} de cada mes.${aclaracion}`;
    }
    default:
      return '';
  }
}

const RecurrenceSelector: React.FC<RecurrenceSelectorProps> = ({
  enabled,
  onToggle,
  frequency,
  onSelectFrequency,
  displayDate,
  type,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Ionicons name="repeat" size={18} color="#2563EB" />
            <Text style={styles.title}>Repetir automáticamente</Text>
          </View>
          <Text style={styles.subtitle}>
            {type === 'INCOME'
              ? 'Para ingresos fijos, como tu sueldo'
              : 'Para pagos fijos, como el alquiler o Netflix'}
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          disabled={disabled}
          trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
          thumbColor={enabled ? '#2563EB' : '#f1f5f9'}
        />
      </View>

      {enabled && (
        <View style={styles.expanded}>
          <View style={styles.chipRow}>
            {FREQUENCIES.map(option => {
              const selected = option.value === frequency;
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => onSelectFrequency(option.value)}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.hintBox}>
            <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
            <Text style={styles.hintText}>
              {describeFrequency(frequency, displayDate, type)}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  expanded: {
    marginTop: 14,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  chipSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#eff6ff',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  chipTextSelected: {
    color: '#2563EB',
    fontWeight: '700',
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 2,
  },
  hintText: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
});

export default RecurrenceSelector;
