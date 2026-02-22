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
      className={`bg-white rounded-xl shadow-sm border p-6 hover:shadow-md transition-all duration-300 ${
        highlighted
          ? 'border-finzen-green border-2'
          : 'border-finzen-gray/20'
      } ${className}`}
    >
      {children}
    </div>
  );
}
