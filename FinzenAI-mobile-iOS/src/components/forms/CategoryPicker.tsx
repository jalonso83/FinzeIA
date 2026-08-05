import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '../../utils/api';

// ─────────────────────────────────────────────────────────────────────────
// Selector de categorías (combobox) en DOS piezas:
//
//  1) CategoryPicker (default): el BOTÓN. Cerrado muestra la categoría elegida
//     (icono + nombre) o el placeholder "Seleccione una categoría". Al tocarlo
//     llama onPress (el formulario abre la hoja).
//
//  2) CategorySelectSheet: la LISTA como overlay a pantalla completa (un <View>
//     absoluto con fondo atenuado, NO <Modal> → seguro en iOS dentro de un
//     <Modal pageSheet>, mismo patrón que el conversor de moneda). Se renderiza
//     en la RAÍZ del modal del formulario, no dentro del ScrollView, para que
//     nunca se recorte (ni en Android ni en iOS).
//
// Ninguna pieza sabe de tipos (INCOME/EXPENSE): reciben la lista YA filtrada.
// Tampoco de snake/camel: exponen id; el formulario lo mapea a category_id o
// categoryId al enviar.
// ─────────────────────────────────────────────────────────────────────────

interface CategoryPickerProps {
  categories: Category[];
  value: string;                 // categoryId seleccionado ('' = ninguno)
  onPress: () => void;           // abre la hoja de selección
  placeholder?: string;
  loading?: boolean;
  disabled?: boolean;
}

const CategoryPicker: React.FC<CategoryPickerProps> = ({
  categories,
  value,
  onPress,
  placeholder = 'Seleccione una categoría',
  loading = false,
  disabled = false,
}) => {
  const selected = categories.find((c) => c.id === value) || null;

  return (
    <TouchableOpacity
      style={[styles.trigger, (disabled || loading) && styles.triggerDisabled]}
      onPress={() => { if (!disabled && !loading) onPress(); }}
      activeOpacity={0.7}
    >
      {selected ? (
        <View style={styles.triggerContent}>
          <Text style={styles.triggerIcon}>{selected.icon}</Text>
          <Text style={styles.triggerText} numberOfLines={1}>{selected.name}</Text>
        </View>
      ) : (
        <Text style={styles.placeholder}>{loading ? 'Cargando categorías…' : placeholder}</Text>
      )}
      <Ionicons name="chevron-down" size={20} color="#64748b" />
    </TouchableOpacity>
  );
};

interface CategorySelectSheetProps {
  visible: boolean;
  categories: Category[];
  value: string;
  onSelect: (categoryId: string) => void;
  onClose: () => void;
  title?: string;
  // Si se define, agrega una opción arriba (ej. "Todas las categorías") que
  // selecciona '' (sin categoría). Útil para FILTROS; no se usa en formularios,
  // donde la categoría es obligatoria.
  clearLabel?: string;
}

export const CategorySelectSheet: React.FC<CategorySelectSheetProps> = ({
  visible,
  categories,
  value,
  onSelect,
  onClose,
  title = 'Elige una categoría',
  clearLabel,
}) => {
  if (!visible) return null;
  return (
    <View style={styles.sheetOverlay}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.sheetClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color="#64748b" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.sheetList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
          {clearLabel && (
            <TouchableOpacity
              style={[styles.option, !value && styles.optionActive]}
              onPress={() => onSelect('')}
              activeOpacity={0.7}
            >
              <Ionicons name="albums-outline" size={20} color="#64748b" style={{ marginRight: 14 }} />
              <Text style={[styles.optionText, !value && styles.optionTextActive]} numberOfLines={1}>{clearLabel}</Text>
              {!value && <Ionicons name="checkmark" size={18} color="#2563EB" />}
            </TouchableOpacity>
          )}
          {categories.length === 0 ? (
            <Text style={styles.empty}>No hay categorías disponibles</Text>
          ) : (
            categories.map((cat) => {
              const active = cat.id === value;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.option, active && styles.optionActive]}
                  onPress={() => onSelect(cat.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionIcon}>{cat.icon}</Text>
                  <Text style={[styles.optionText, active && styles.optionTextActive]} numberOfLines={1}>
                    {cat.name}
                  </Text>
                  {active && <Ionicons name="checkmark" size={18} color="#2563EB" />}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // ── Botón (trigger) ──
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  triggerDisabled: {
    backgroundColor: '#f8fafc',
    opacity: 0.7,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  triggerIcon: {
    fontSize: 22,
    marginRight: 10,
  },
  triggerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    flexShrink: 1,
  },
  placeholder: {
    fontSize: 15,
    color: '#9ca3af',
    flex: 1,
  },

  // ── Hoja (overlay a pantalla completa) ──
  sheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
    zIndex: 999,
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '75%',
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  sheetClose: {
    padding: 4,
  },
  sheetList: {
    paddingHorizontal: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  optionActive: {
    backgroundColor: '#eff6ff',
  },
  optionIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  optionText: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  optionTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  empty: {
    padding: 20,
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default CategoryPicker;
