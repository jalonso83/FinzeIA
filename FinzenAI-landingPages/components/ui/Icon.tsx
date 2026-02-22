import { LucideIcon } from 'lucide-react';

interface IconProps {
  icon: LucideIcon;
  size?: number;
  color?: string;
  className?: string;
}

export default function Icon({
  icon: LucideIcon,
  size = 32,
  color,
  className = '',
}: IconProps) {
  return (
    <LucideIcon
      size={size}
      strokeWidth={1.5}
      className={`${color || 'text-finzen-blue'} ${className}`}
    />
  );
}
