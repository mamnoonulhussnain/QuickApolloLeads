import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { cn } from "@/lib/utils";
import logoPath from '@assets/buyapolloleadsfavicon_1755799627906.png';

interface NavigationProps {
  user?: any;
  onSignOut?: () => void;
  onLogin?: () => void;
  onRegister?: () => void;
  isAuthenticated?: boolean;
  className?: string;
}

export function Navigation({ user, onSignOut, onLogin, onRegister, isAuthenticated, className }: NavigationProps) {
  return (
    <nav className={cn(
      "flex items-center justify-between p-4 backdrop-blur-sm bg-white/10 border-b border-white/20",
      className
    )}>
      <div className="flex items-center space-x-3">
        <img src={logoPath} alt="QuickApolloLeads" className="w-8 h-8 object-contain" />
        <h1 className="text-2xl font-bold text-white">QuickApolloLeads</h1>
      </div>
      
      {user && isAuthenticated ? (
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-white">
            <User className="h-4 w-4" />
            <span>{user.firstName || user.email}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="text-white hover:bg-white/20"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      ) : (
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogin}
            className="text-white hover:bg-white/20"
          >
            Sign In
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRegister}
            className="text-white hover:bg-white/20"
          >
            Get Started
          </Button>
        </div>
      )}
    </nav>
  );
}