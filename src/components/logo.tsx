import { Spade } from 'lucide-react';

interface LogoProps {
  size?: number;
  className?: string;
}

export function Logo({ size = 24, className }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Spade size={size} className="text-primary" />
      <span className={`font-semibold text-xl`} style={{ fontSize: `${size * 0.8}px` }}>
        PokerConnect
      </span>
    </div>
  );
}
