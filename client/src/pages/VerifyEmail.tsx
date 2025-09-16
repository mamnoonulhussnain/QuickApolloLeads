import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { InlineLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Mail } from 'lucide-react';
import logoPath from '@assets/buyapolloleadsfavicon_1755799627906.png';

export default function VerifyEmail() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'success' | 'error' | 'expired'>('verifying');

  // Set page title
  useEffect(() => {
    document.title = 'Verify Email - QuickApolloLeads';
  }, []);

  // Get token from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const verifyEmailMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await apiRequest('POST', '/api/verify-email', { token });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Email verification failed');
      }
      return response.json();
    },
    onSuccess: (user) => {
      setVerificationStatus('success');
      toast({
        title: "Email Verified Successfully",
        description: "Your email has been verified. You can now access your dashboard.",
      });
      // Update user data in cache
      queryClient.setQueryData(['/api/user'], user);
    },
    onError: (error: Error) => {
      if (error.message.includes('expired')) {
        setVerificationStatus('expired');
      } else {
        setVerificationStatus('error');
      }
      toast({
        title: "Email Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Auto-verify when component mounts if token exists
  useEffect(() => {
    if (token && verificationStatus === 'verifying') {
      verifyEmailMutation.mutate(token);
    } else if (!token) {
      setVerificationStatus('error');
    }
  }, [token]);

  const handleGoToDashboard = () => {
    setLocation('/dashboard');
  };

  const handleGoToAuth = () => {
    setLocation('/auth');
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-dark-900 text-white">
        <AnimatedBackground />
        
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
          <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/10 max-w-md w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-white text-2xl">Invalid Verification Link</CardTitle>
              <CardDescription className="text-gray-400">
                This email verification link is invalid or malformed.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleGoToAuth}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Back to Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'verifying') {
    return (
      <div className="min-h-screen bg-dark-900 text-white">
        <AnimatedBackground />
        
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
          <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/10 max-w-md w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <img src={logoPath} alt="QuickApolloLeads Logo" className="w-16 h-16 object-contain drop-shadow-2xl" />
              </div>
              <CardTitle className="text-white text-2xl">Verifying Your Email</CardTitle>
              <CardDescription className="text-gray-400">
                Please wait while we verify your email address...
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <InlineLoader />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'success') {
    return (
      <div className="min-h-screen bg-dark-900 text-white">
        <AnimatedBackground />
        
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
          <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/10 max-w-md w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-white text-2xl">Email Verified Successfully</CardTitle>
              <CardDescription className="text-gray-400">
                Your email address has been verified. Welcome to QuickApolloLeads!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleGoToDashboard}
                className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                Access Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (verificationStatus === 'expired') {
    return (
      <div className="min-h-screen bg-dark-900 text-white">
        <AnimatedBackground />
        
        <div className="min-h-screen flex items-center justify-center px-6 py-12">
          <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/10 max-w-md w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-white text-2xl">Verification Link Expired</CardTitle>
              <CardDescription className="text-gray-400">
                This verification link has expired. Please sign in and request a new verification email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleGoToAuth}
                className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
              >
                Sign In & Resend Verification
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-dark-900 text-white">
      <AnimatedBackground />
      
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/10 max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-white text-2xl">Verification Failed</CardTitle>
            <CardDescription className="text-gray-400">
              We couldn't verify your email address. The link may be invalid or expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleGoToAuth}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Back to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}