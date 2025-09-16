import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const handleSignIn = () => {
    window.location.href = '/api/login';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md backdrop-blur-sm bg-slate-900/95 border-white/20 text-white">
        <DialogHeader>
          <DialogTitle>Sign in to BuyApolloLeads</DialogTitle>
          <DialogDescription className="text-gray-300">
            Access your dashboard and purchase Apollo lead credits
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4">
          <Button 
            onClick={handleSignIn}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            <LogIn className="h-4 w-4 mr-2" />
            Sign in with Replit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}