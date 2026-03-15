import React from 'react';
import { 
  Star, 
  Heart, 
  Settings, 
  User, 
  Mail,
  Phone,
  MapPin,
  Calendar,
  Clock,
  ThumbsUp 
} from 'lucide-react';
import Icon from '@/components/ui/Icon';

/**
 * IconShowcase - Componente de demostración para todas las variantes de iconos disponibles
 * 
 * Variantes disponibles:
 * - default: Sin decoración, solo el icono
 * - gradient: Fondo gradiente con borde sutil
 * - outlined: Borde sólido con hover effect
 * - filled: Fondo sólido del color del icono
 * - subtle: Fondo gris claro con hover
 */

const IconShowcase = () => {
  const sampleIcons = [
    { icon: Star, color: 'text-finzen-green' },
    { icon: Heart, color: 'text-finzen-red' },
    { icon: Settings, color: 'text-finzen-blue' },
    { icon: User, color: 'text-finzen-gray' },
    { icon: Mail, color: 'text-finzen-green' },
    { icon: Phone, color: 'text-finzen-blue' },
    { icon: MapPin, color: 'text-finzen-red' },
    { icon: Calendar, color: 'text-finzen-green' },
    { icon: Clock, color: 'text-finzen-blue' },
    { icon: ThumbsUp, color: 'text-finzen-green' }
  ];

  const variants: Array<'default' | 'gradient' | 'outlined' | 'filled' | 'subtle'> = [
    'default', 'gradient', 'outlined', 'filled', 'subtle'
  ];

  return (
    <div className="p-8 bg-white rounded-xl shadow-lg max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-finzen-black mb-6 text-center">
        Sistema de Iconografía Mejorado
      </h2>
      
      <div className="space-y-8">
            {variants.slice(0, 5).map((variant) => (
              <div key={variant} className="space-y-4">
                <h3 className="text-lg font-semibold text-finzen-blue capitalize">
                  Variante: {variant}
                </h3>
                
                <div className="grid grid-cols-5 gap-6">
                  {sampleIcons.slice(0, 5).map((item, index) => (
                    <div key={index} className="flex flex-col items-center space-y-2">
                      <Icon
                        icon={item.icon}
                        color={item.color}
                        variant={variant as any}
                        animate={variant === 'gradient' || variant === 'outlined'}
                        size={24}
                      />
                  <span className="text-xs text-finzen-gray text-center">
                    {item.icon.name}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="text-sm text-finzen-gray border-l-4 border-finzen-green/20 pl-4 py-2 bg-finzen-green/5 rounded">
              <strong>Uso recomendado:</strong> {getUsageRecommendation(variant)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-finzen-blue/5 rounded-lg">
        <h4 className="font-semibold text-finzen-black mb-2">Ejemplo de Uso:</h4>
        <pre className="text-sm text-finzen-gray overflow-x-auto">
{`<Icon 
  icon={Star} 
  color="text-finzen-green" 
  variant="gradient"
  animate={true}
  size={32}
  className="additional-classes"
/>`}
        </pre>
      </div>
    </div>
  );
};

function getUsageRecommendation(variant: string): string {
  switch (variant) {
    case 'default':
      return 'Para iconos simples sin decoración especial. Ideal para navegación y elementos básicos.';
    case 'gradient':
      return 'Para destacar iconos importantes con fondo elegante. Perfecto para features y características.';
    case 'outlined':
      return 'Para iconos interactivos con borde. Excelente para botones y acciones principales.';
    case 'filled':
      return 'Para iconos con máximo contraste. Ideal para estados activos e indicadores.';
    case 'subtle':
      return 'Para iconos secundarios con fondo neutro. Perfecto para herramientas y opciones.';
    default:
      return '';
  }
}

export default IconShowcase;