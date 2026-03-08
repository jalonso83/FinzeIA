interface CardProps {
  children: React.ReactNode;
  className?: string;
  highlighted?: boolean;
}

export default function Card({
  children,
  className = '',
  highlighted = false,
}: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 transform ${
        highlighted
          ? 'border-finzen-green border-2 animate-glow'
          : 'border-finzen-gray/20 hover:border-finzen-green/30'
      } ${className}`}
    >
      {children}
    </div>
  );
}
