import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { InlineLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { LogIn, UserPlus, Zap, Key } from 'lucide-react';
import logoPath from '@assets/buyapolloleadsfavicon_1755799627906.png';

interface AuthData {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Set page title
  useEffect(() => {
    document.title = 'Sign In - QuickApolloLeads';
  }, []);
  const [loginData, setLoginData] = useState<AuthData>({
    email: '',
    password: '',
  });
  const [registerData, setRegisterData] = useState<AuthData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const [resetEmail, setResetEmail] = useState('');
  const [showResetForm, setShowResetForm] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async (data: AuthData) => {
      const response = await apiRequest('POST', '/api/login', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      return response.json();
    },
    onSuccess: (user) => {
      toast({
        title: "Welcome back!",
        description: `Logged in as ${user.firstName || user.email}`,
      });
      queryClient.setQueryData(['/api/user'], user);
      setLocation('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: AuthData) => {
      const response = await apiRequest('POST', '/api/register', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      return response.json();
    },
    onSuccess: (user) => {
      toast({
        title: "Welcome to BuyApolloLeads!",
        description: `Account created for ${user.firstName}. You can now start purchasing credits.`,
      });
      queryClient.setQueryData(['/api/user'], user);
      setLocation('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const passwordResetMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest('POST', '/api/forgot-password', { email });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Password reset failed');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reset Email Sent",
        description: "Check your email for password reset instructions",
      });
      setShowResetForm(false);
      setResetEmail('');
    },
    onError: (error: Error) => {
      toast({
        title: "Reset Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate(loginData);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerData.email || !registerData.password || !registerData.firstName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    registerMutation.mutate(registerData);
  };

  const handlePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast({
        title: "Missing Email",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }
    passwordResetMutation.mutate(resetEmail);
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      <AnimatedBackground />
      
      <div className="min-h-screen flex items-center justify-center px-6 py-12">
        <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Hero Section */}
          <div className="space-y-8">
            <div>
              {/* Apollo Logo */}
              <div className="flex justify-center lg:justify-start mb-6">
                <img src={logoPath} alt="QuickApolloLeads Logo" className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-2xl" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent text-center lg:text-left">
                QuickApolloLeads
              </h1>
              <p className="text-xl text-gray-400 mb-8">
                Scale your lead generation beyond Apollo's limits. Get bulk exports of 5K to 1M contacts with wholesale pricing.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Bypass Apollo Limits</h3>
                  <p className="text-gray-400">Export 5K-1M contacts instead of 25 at a time</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Wholesale Pricing</h3>
                  <p className="text-gray-400">Pay per lead with bulk discounts</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Fast Delivery</h3>
                  <p className="text-gray-400">Get your leads via CSV or Google Sheets</p>
                </div>
              </div>
            </div>
          </div>

          {/* Auth Forms */}
          <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/10">
            <CardHeader className="text-center">
              <CardTitle className="text-white text-2xl">Get Started</CardTitle>
              <CardDescription className="text-gray-400">
                Create an account or sign in to start generating leads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 bg-white/10">
                  <TabsTrigger value="login" className="text-white data-[state=active]:bg-white/20">
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger value="register" className="text-white data-[state=active]:bg-white/20">
                    Register
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-email" className="text-gray-300">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        value={loginData.email}
                        onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                        className="bg-white/5 border-white/10 text-white placeholder-gray-400"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="login-password" className="text-gray-300">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        value={loginData.password}
                        onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                        className="bg-white/5 border-white/10 text-white placeholder-gray-400"
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <InlineLoader />
                          Signing In...
                        </div>
                      ) : (
                        <>
                          <LogIn className="w-4 h-4 mr-2" />
                          Sign In
                        </>
                      )}
                    </Button>
                    
                    {/* Forgot Password Link */}
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setShowResetForm(!showResetForm)}
                        className="text-sm text-blue-400 hover:text-blue-300 underline"
                      >
                        Forgot your password?
                      </button>
                    </div>

                  </form>

                  {/* Password Reset Form - Outside the login form to avoid nesting */}
                  {showResetForm && (
                    <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                      <h3 className="text-white text-sm font-medium mb-3">Reset Your Password</h3>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="reset-email" className="text-gray-300 text-sm">Email Address</Label>
                          <Input
                            id="reset-email"
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            className="bg-white/5 border-white/10 text-white placeholder-gray-400"
                            placeholder="Enter your email address"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handlePasswordReset(e);
                              }
                            }}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={handlePasswordReset}
                            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                            disabled={passwordResetMutation.isPending}
                          >
                            {passwordResetMutation.isPending ? (
                              <div className="flex items-center gap-2">
                                <InlineLoader size="sm" />
                                Sending...
                              </div>
                            ) : (
                              <>
                                <Key className="w-3 h-3 mr-1" />
                                Send Reset Email
                              </>
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setShowResetForm(false)}
                            className="border-white/10 text-gray-300 hover:bg-white/10"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="register">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="register-firstName" className="text-gray-300">First Name *</Label>
                        <Input
                          id="register-firstName"
                          value={registerData.firstName}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, firstName: e.target.value }))}
                          className="bg-white/5 border-white/10 text-white placeholder-gray-400"
                          placeholder="John"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="register-lastName" className="text-gray-300">Last Name</Label>
                        <Input
                          id="register-lastName"
                          value={registerData.lastName}
                          onChange={(e) => setRegisterData(prev => ({ ...prev, lastName: e.target.value }))}
                          className="bg-white/5 border-white/10 text-white placeholder-gray-400"
                          placeholder="Doe"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="register-email" className="text-gray-300">Email *</Label>
                      <Input
                        id="register-email"
                        type="email"
                        value={registerData.email}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                        className="bg-white/5 border-white/10 text-white placeholder-gray-400"
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="register-password" className="text-gray-300">Password *</Label>
                      <Input
                        id="register-password"
                        type="password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                        className="bg-white/5 border-white/10 text-white placeholder-gray-400"
                        placeholder="Create a secure password"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <InlineLoader />
                          Creating Account...
                        </div>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Create Account
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}