import { Loader2 } from 'lucide-react';
import { AnimatedBackground } from './animated-background';

interface LoaderProps {
  text?: string;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Loader({ text = "Loading...", fullScreen = false, size = 'md' }: LoaderProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  const containerClasses = fullScreen 
    ? "fixed inset-0 bg-dark-900 flex items-center justify-center z-50"
    : "flex items-center justify-center py-8";

  return (
    <div className={containerClasses}>
      {fullScreen && <AnimatedBackground />}
      <div className="flex flex-col items-center gap-4 relative z-10">
        <Loader2 className={`${sizeClasses[size]} animate-spin text-blue-400`} />
        {text && (
          <p className="text-white text-sm font-medium">{text}</p>
        )}
      </div>
    </div>
  );
}

// Quick inline loader for buttons
export function InlineLoader({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5'
  };
  
  return (
    <Loader2 className={`${sizeClasses[size]} animate-spin`} />
  );
}