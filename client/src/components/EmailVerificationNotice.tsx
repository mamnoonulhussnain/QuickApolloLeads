import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, CheckCircle, RefreshCw } from 'lucide-react';

interface EmailVerificationNoticeProps {
  user: {
    email: string;
    firstName: string;
    emailVerified: boolean;
  };
}

export function EmailVerificationNotice({ user }: EmailVerificationNoticeProps) {
  const { toast } = useToast();
  const [emailSent, setEmailSent] = useState(false);

  const resendEmailMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/resend-verification');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to resend verification email');
      }
      return response.json();
    },
    onSuccess: () => {
      setEmailSent(true);
      toast({
        title: "Verification Email Sent!",
        description: "Please check your email for the verification link.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send Email",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (user.emailVerified) {
    return null;
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white flex items-center justify-center px-6">
      <Card className="max-w-md w-full bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/10">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-white text-2xl">Verify Your Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-300 mb-4">
              Hi {user.firstName}! We've sent a verification email to:
            </p>
            <p className="text-blue-400 font-semibold text-lg">{user.email}</p>
            <p className="text-gray-400 text-sm mt-2">
              Please check your email and click the verification link to access your dashboard.
            </p>
          </div>

          {emailSent && (
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-400">
                Verification email sent! Check your inbox and spam folder.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <Button
              onClick={() => resendEmailMutation.mutate()}
              disabled={resendEmailMutation.isPending || emailSent}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {resendEmailMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending...
                </div>
              ) : emailSent ? (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Email Sent
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Resend Verification Email
                </div>
              )}
            </Button>

            <div className="text-center text-sm text-gray-400">
              <p>Didn't receive the email? Check your spam folder or try resending.</p>
              <p className="mt-2">
                Wrong email address?{' '}
                <a href="/auth" className="text-blue-400 hover:text-blue-300">
                  Create a new account
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}