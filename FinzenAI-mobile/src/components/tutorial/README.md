# 🎓 Sistema de Tutoriales - FinZen AI

Sistema completo de tutoriales estilo Instagram Stories con iconos animados, diseñado para complementar el onboarding con Zenio.

## ✅ Lo que está implementado

- ✅ TutorialModal (estilo Instagram Stories)
- ✅ TutorialSlide con iconos animados y efectos
- ✅ ProgressBar animada
- ✅ TutorialCard para galería
- ✅ HelpCenterScreen completo
- ✅ Store con AsyncStorage para persistencia
- ✅ Hooks personalizados (useTutorial, useCoachMarks)
- ✅ 7 tutoriales completos con contenido

## 📦 Archivos Creados

```
src/
├── components/tutorial/
│   ├── TutorialModal.tsx           ← Modal principal estilo Stories
│   ├── TutorialSlide.tsx           ← Slides con iconos animados
│   ├── ProgressBar.tsx             ← Barra de progreso animada
│   ├── TutorialCard.tsx            ← Card para galería
│   └── README.md                   ← Esta documentación
│
├── data/tutorials/
│   ├── types.ts                    ← Interfaces TypeScript
│   └── index.ts                    ← 7 tutoriales completos
│
├── screens/
│   └── HelpCenterScreen.tsx        ← Centro de ayuda
│
├── stores/
│   └── tutorialStore.ts            ← AsyncStorage persistence
│
└── hooks/
    └── useTutorial.ts              ← Hooks personalizados
```

---

## 🚀 Cómo Usar

### 1. Agregar HelpCenterScreen a la Navegación

```typescript
// En tu navigator (ej: TabNavigator o DrawerNavigator)
import HelpCenterScreen from './src/screens/HelpCenterScreen';

<Tab.Screen
  name="HelpCenter"
  component={HelpCenterScreen}
  options={{
    tabBarLabel: 'Ayuda',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="help-circle" size={size} color={color} />
    ),
  }}
/>
```

### 2. Agregar Botón de Ayuda en Cualquier Pantalla

```typescript
// Ejemplo: En TransactionsScreen.tsx
import React, { useState } from 'react';
import TutorialModal from '../components/tutorial/TutorialModal';
import { getTutorialByScreen } from '../data/tutorials';

export default function TransactionsScreen() {
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <SafeAreaView>
      {/* Header con botón de ayuda */}
      <View style={styles.header}>
        <Text style={styles.title}>Transacciones</Text>

        <TouchableOpacity onPress={() => setShowTutorial(true)}>
          <Ionicons name="help-circle-outline" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Contenido de la pantalla */}

      {/* Modal de tutorial */}
      {showTutorial && (
        <TutorialModal
          visible={showTutorial}
          tutorial={getTutorialByScreen('Transactions')!}
          onComplete={() => setShowTutorial(false)}
          onSkip={() => setShowTutorial(false)}
        />
      )}
    </SafeAreaView>
  );
}
```

### 3. Usar Hook para Persistencia

```typescript
import { useTutorial } from '../hooks/useTutorial';

export default function MyScreen() {
  const { isCompleted, markAsCompleted } = useTutorial('zenio-advanced');

  const handleTutorialComplete = async () => {
    await markAsCompleted();
    // Hacer algo después de completar
  };

  return (
    <View>
      {!isCompleted && (
        <Text>¡Completa el tutorial de Zenio!</Text>
      )}
    </View>
  );
}
```

---

## 🎨 Agregar un Nuevo Tutorial

### Paso 1: Define el Tutorial

```typescript
// En src/data/tutorials/index.ts

export const TUTORIALS: Tutorial[] = [
  // ... tutoriales existentes

  {
    id: 'mi-nuevo-tutorial',
    name: 'Título del Tutorial',
    category: 'Funcionalidades', // o 'Primeros Pasos', 'Asistente IA', 'Herramientas'
    icon: 'star', // Nombre del icono de Ionicons
    color: '#2563EB', // Color principal (hex)
    screen: 'MiPantalla', // Opcional: nombre de la pantalla relacionada
    duration: 30, // Duración estimada en segundos
    lastUpdated: '2025-01-15',
    tags: ['etiqueta1', 'etiqueta2'],
    slides: [
      {
        id: '1',
        title: 'Título del Slide 1',
        description: 'Descripción clara y concisa del concepto',
        icon: 'rocket', // Icono de Ionicons
        backgroundColor: '#2563EB', // Color de fondo inicial
        gradientEnd: '#1e40af', // Color de fondo final (gradiente)
      },
      {
        id: '2',
        title: 'Título del Slide 2',
        description: 'Otra explicación útil',
        icon: 'checkmark-circle',
        backgroundColor: '#10B981',
        gradientEnd: '#059669',
      },
      // ... más slides (máximo 5 recomendado)
    ],
  },
];
```

### Paso 2: El Tutorial Aparecerá Automáticamente

El nuevo tutorial aparecerá automáticamente en:
- ✅ HelpCenterScreen (en la categoría correspondiente)
- ✅ Búsqueda por nombre o tags
- ✅ Estadísticas de progreso

---

## 🎯 Ejemplos de Uso Avanzado

### Auto-avance de Slides

```typescript
<TutorialModal
  visible={visible}
  tutorial={tutorial}
  autoAdvance={true}           // ← Activar auto-avance
  autoAdvanceDelay={5000}      // ← 5 segundos por slide
  onComplete={handleComplete}
  onSkip={handleSkip}
/>
```

### Detectar Cambio de Slide

```typescript
<TutorialModal
  visible={visible}
  tutorial={tutorial}
  onSlideChange={(index) => {
    console.log(`Usuario está en slide ${index + 1}`);
    // Enviar a analytics, etc.
  }}
  onComplete={handleComplete}
  onSkip={handleSkip}
/>
```

### Verificar Progreso de Múltiples Tutoriales

```typescript
import { useCompletedTutorials } from '../hooks/useTutorial';

export default function ProfileScreen() {
  const { completedIds, isCompleted } = useCompletedTutorials();

  const tutorialsCompleted = completedIds.length;
  const hasSeenZenio = isCompleted('zenio-advanced');

  return (
    <View>
      <Text>Has completado {tutorialsCompleted} tutoriales</Text>
      {!hasSeenZenio && (
        <Text>¡Aprende a usar Zenio!</Text>
      )}
    </View>
  );
}
```

---

## 🛠️ Testing y Debug

### Resetear Todo el Progreso

```typescript
import { tutorialStore } from '../stores/tutorialStore';

// En un botón de debug o settings
const handleReset = async () => {
  await tutorialStore.resetAll();
  console.log('Todo el progreso reseteado');
};
```

### Ver Qué Tutoriales Han Sido Completados

```typescript
const completed = await tutorialStore.getAllCompletedTutorials();
console.log('Tutoriales completados:', completed);
```

### Verificar Estado de Coach Marks

```typescript
const hasSeen = await tutorialStore.hasSeenCoachMarks('Dashboard');
console.log('¿Ya vio coach marks de Dashboard?', hasSeen);
```

---

## 🎨 Personalización de Colores

Los colores de cada tutorial se definen en el objeto Tutorial:

```typescript
{
  color: '#2563EB',        // Color principal del card
  slides: [
    {
      backgroundColor: '#2563EB',  // Color inicial del gradiente
      gradientEnd: '#1e40af',      // Color final del gradiente
    }
  ]
}
```

### Paleta de Colores Recomendada

```typescript
const COLORS = {
  blue: { start: '#2563EB', end: '#1e40af' },
  purple: { start: '#7C3AED', end: '#6D28D9' },
  green: { start: '#10B981', end: '#059669' },
  red: { start: '#DC2626', end: '#B91C1C' },
  orange: { start: '#F59E0B', end: '#D97706' },
  teal: { start: '#14B8A6', end: '#0D9488' },
};
```

---

## 📱 Responsive Design

Todos los componentes están diseñados para funcionar en:
- ✅ iPhone (todas las versiones)
- ✅ Android (todas las versiones)
- ✅ Tablets
- ✅ Diferentes orientaciones

---

## 🔄 Próximos Pasos (Fase 2 - Con Imágenes)

Cuando quieras agregar imágenes reales:

### 1. Agrega el campo image al slide:

```typescript
slides: [
  {
    id: '1',
    title: 'Título',
    description: 'Descripción',
    icon: 'rocket',
    image: require('../../assets/tutorials/zenio-1.png'), // ← Nueva propiedad
    backgroundColor: '#2563EB',
    gradientEnd: '#1e40af',
  }
]
```

### 2. Modifica TutorialSlide.tsx:

```typescript
// En TutorialSlide.tsx, agrega:
{slide.image && (
  <Image
    source={slide.image}
    style={styles.slideImage}
    resizeMode="contain"
  />
)}
```

### 3. Las imágenes reemplazarán o complementarán los iconos

---

## 📚 Recursos de Iconos

Todos los iconos vienen de **Ionicons**:
- 📖 [Catálogo completo](https://ionic.io/ionicons)
- 🔍 Busca iconos por nombre
- ✅ Ya incluido en Expo

Ejemplos de iconos útiles:
```
rocket, star, trophy, flag, heart, bulb, flash,
chatbubbles, wallet, cash, card, calculator,
trending-up, trending-down, stats-chart, pie-chart,
checkmark-circle, close-circle, alert-circle,
time, calendar, notifications, settings, help-circle
```

---

## ⚡ Performance Tips

1. **Lazy Loading**: Los tutoriales solo se cargan cuando se necesitan
2. **Persistencia eficiente**: AsyncStorage se usa solo para guardar progreso
3. **Animaciones optimizadas**: Todas usan `useNativeDriver` donde es posible
4. **Imágenes optimizadas**: Si agregas imágenes, usa formato WebP y compresión

---

## 🐛 Troubleshooting

### El modal no se muestra

```typescript
// Asegúrate de que visible={true}
<TutorialModal
  visible={true}  // ← Debe ser true
  tutorial={myTutorial}
  // ...
/>
```

### Los iconos no aparecen

```typescript
// Verifica que el nombre del icono existe en Ionicons
icon: 'rocket'  // ✅ Correcto
icon: 'rocket-icon'  // ❌ No existe
```

### AsyncStorage no guarda

```typescript
// Verifica que instalaste la dependencia
npm install @react-native-async-storage/async-storage
```

---

## 📞 Soporte

Si tienes problemas o preguntas:
1. Revisa esta documentación
2. Verifica la implementación en HelpCenterScreen.tsx (ejemplo completo)
3. Consulta los hooks en useTutorial.ts

---

**Versión:** 1.0
**Última actualización:** 2025-01-15
**Estado:** ✅ Completamente funcional con iconos
