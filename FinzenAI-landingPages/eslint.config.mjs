import nextVitals from 'eslint-config-next/core-web-vitals';

const config = [
  ...nextVitals,
  {
    // Reglas nuevas del plugin de hooks (llegaron con Next 16). Marcan patrones
    // que ya existían y funcionan en React 19; se dejan como aviso para
    // corregirlos con calma, no como error.
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
    },
  },
  { ignores: ['.next/**', 'node_modules/**', 'out/**', 'next-env.d.ts'] },
];

export default config;
