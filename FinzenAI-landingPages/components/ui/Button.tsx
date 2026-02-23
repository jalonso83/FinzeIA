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
    'bg-finzen-green text-white rounded-xl font-rubik font-semibold hover:opacity-90 transition-all duration-300',
  secondary:
    'border-2 border-finzen-blue text-finzen-blue rounded-xl font-rubik font-semibold hover:bg-finzen-blue hover:text-white transition-all duration-300',
  'outline-white':
    'border-2 border-white text-white rounded-xl font-rubik font-semibold hover:bg-white hover:text-finzen-blue transition-all duration-300',
  ghost:
    'text-finzen-blue font-rubik font-semibold hover:underline transition-all duration-300',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
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
  const classes = `inline-flex items-center justify-center gap-2 whitespace-nowrap ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

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
