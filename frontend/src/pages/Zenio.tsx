import React from 'react';
import Navigation from '../components/Navigation';

const Zenio = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Zenio - Asistente IA
          </h1>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600">
              Chat con Zenio en desarrollo...
            </p>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-2">Próximamente:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Chat en tiempo real con Zenio</li>
                <li>• Consultas sobre finanzas personales</li>
                <li>• Recomendaciones personalizadas</li>
                <li>• Análisis de gastos</li>
                <li>• Consejos de ahorro</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Zenio; 