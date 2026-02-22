type Background = 'white' | 'blue' | 'light';

interface SectionWrapperProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  background?: Background;
}

const bgStyles: Record<Background, string> = {
  white: 'bg-white',
  blue: 'bg-finzen-blue text-white',
  light: 'bg-finzen-white',
};

export default function SectionWrapper({
  children,
  className = '',
  id,
  background = 'light',
}: SectionWrapperProps) {
  return (
    <section id={id} className={`${bgStyles[background]} ${className}`}>
      <div className="py-16 md:py-24 px-4 md:px-8 max-w-7xl mx-auto">
        {children}
      </div>
    </section>
  );
}
