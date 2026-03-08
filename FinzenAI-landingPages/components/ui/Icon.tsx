import { LucideIcon } from 'lucide-react';

type IconVariant = 'default' | 'gradient' | 'outlined' | 'filled' | 'subtle';

interface IconProps {
  icon: LucideIcon;
  size?: number;
  color?: string;
  className?: string;
  variant?: IconVariant;
  animate?: boolean;
}

const variantStyles: Record<IconVariant, string> = {
  default: 'bg-transparent',
  gradient: 'p-3 bg-gradient-to-br from-finzen-green/10 to-finzen-blue/10 rounded-xl border border-finzen-green/20 shadow-sm hover:shadow-md transition-shadow duration-200',
  outlined: 'p-3 border-2 border-current rounded-lg hover:bg-current hover:text-white transition-all duration-300',
  filled: 'p-2 rounded-full shadow-sm hover:shadow-md transition-all duration-200',
  subtle: 'p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200'
};

export default function Icon({
  icon: LucideIcon,
  size = 32,
  color,
  className = '',
  variant = 'default',
  animate = false,
}: IconProps) {
  const getIconColor = () => {
    if (variant === 'filled') {
      return 'text-white';
    }
    return color || 'text-finzen-blue';
  };

  const getContainerClasses = () => {
    if (variant === 'filled') {
      const bgColor = color?.replace('text-', 'bg-') || 'bg-finzen-green';
      return `${bgColor} ${variantStyles[variant]}`;
    }
    return variantStyles[variant];
  };

  return (
    <div className={`inline-flex items-center justify-center transform transition-all duration-300 ${
      animate ? 'hover:scale-110' : 'hover:scale-105'
    } ${getContainerClasses()} ${className}`}>
      <LucideIcon
        size={size}
        strokeWidth={variant === 'filled' ? 2 : 1.5}
        className={`${getIconColor()} transition-all duration-300 ${animate ? 'hover:rotate-6' : ''}`}
      />
    </div>
  );
}
