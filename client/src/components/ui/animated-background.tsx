import { cn } from "@/lib/utils";

interface AnimatedBackgroundProps {
  children?: React.ReactNode;
  className?: string;
}

export function AnimatedBackground({ children, className }: AnimatedBackgroundProps) {
  return (
    <div className={cn(
      "fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900",
      "bg-[length:400%_400%] animate-gradient-x -z-10",
      className
    )}>
      {children}
    </div>
  );
}