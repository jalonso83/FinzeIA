type BadgeVariant = 'default' | 'highlight' | 'subtle';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'bg-finzen-green/10 text-finzen-green text-sm font-rubik font-semibold px-3 py-1 rounded-full',
  highlight:
    'bg-finzen-green text-white text-sm font-rubik font-semibold px-3 py-1 rounded-full',
  subtle:
    'bg-finzen-gray/20 text-finzen-black text-sm font-rubik px-3 py-1 rounded-full',
};

export default function Badge({
  children,
  variant = 'default',
  className = '',
}: BadgeProps) {
  return (
    <span className={`inline-block ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
}
