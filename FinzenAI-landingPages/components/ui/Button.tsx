import Link from 'next/link';

type ButtonVariant = 'primary' | 'secondary' | 'outline-white' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-finzen-green text-white rounded-xl font-rubik font-bold hover:opacity-90 hover:scale-105 hover:shadow-lg transition-all duration-300 transform',
  secondary:
    'border-2 border-finzen-blue text-finzen-blue rounded-xl font-rubik font-bold hover:bg-finzen-blue hover:text-white hover:scale-105 hover:shadow-lg transition-all duration-300 transform',
  'outline-white':
    'border-2 border-white text-white rounded-xl font-rubik font-bold hover:bg-white hover:text-finzen-blue hover:scale-105 hover:shadow-lg transition-all duration-300 transform',
  ghost:
    'text-finzen-blue font-rubik font-semibold hover:underline hover:scale-105 transition-all duration-300 transform tracking-wide',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm tracking-wide',
  md: 'px-6 py-3 text-base tracking-normal',
  lg: 'px-8 py-4 text-lg tracking-wide',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  href,
  icon,
  className = '',
  onClick,
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-2 whitespace-nowrap ${variantStyles[variant]} ${sizeStyles[size]} ${className} focus:outline-none focus:ring-2 focus:ring-finzen-green/50 focus:ring-offset-2`;

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {icon && <span className="shrink-0">{icon}</span>}
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} onClick={onClick}>
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
