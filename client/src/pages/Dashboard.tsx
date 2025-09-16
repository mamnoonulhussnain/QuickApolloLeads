import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { EmailVerificationNotice } from '@/components/EmailVerificationNotice';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { Navigation } from '@/components/ui/navigation';
import { Loader, InlineLoader } from '@/components/ui/loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AffiliateDashboard } from '@/components/ui/affiliate-dashboard';
import { 
  DollarSign, 
  CheckCircle, 
  Users, 
  TrendingUp, 
  Clock,
  Download,
  AlertCircle,
  Zap 
} from 'lucide-react';
import { Link, useLocation } from 'wouter';

interface CreditPurchase {
  id: string;
  amount: string;
  credits: number;
  status: string;
  createdAt: string;
}

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [orderForm, setOrderForm] = useState({
    apolloUrl: '',
    creditsToUse: '',
  });

  // Set page title
  useEffect(() => {
    document.title = 'Dashboard - QuickApolloLeads';
  }, []);

  // Check for payment success in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      toast({
        title: "Payment Successful!",
        description: "Your credits have been purchased and will be added to your account shortly.",
      });
      // Clean up URL
      window.history.replaceState({}, '', '/dashboard');
      // Refresh user data to get updated credits
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    }
  }, [toast]);



  const { data: orders, isLoading: ordersLoading } = useQuery<any[]>({
    queryKey: ['/api/orders'],
    enabled: !!user,
  });

  const { data: creditPackages } = useQuery<Record<string, any>>({
    queryKey: ['/api/credit-packages'],
  });

  const { data: creditPurchases, isLoading: purchasesLoading } = useQuery<CreditPurchase[]>({
    queryKey: ['/api/credit-purchases'],
    enabled: !!user,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return await apiRequest('POST', '/api/orders', orderData);
    },
    onSuccess: () => {
      toast({
        title: "Order Placed Successfully",
        description: "Your lead generation order has been submitted. You'll receive your CSV via email soon.",
      });
      setOrderForm({
        apolloUrl: '',
        creditsToUse: '',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Order Failed",
        description: error.message || "Failed to place order",
        variant: "destructive",
      });
    },
  });

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orderForm.apolloUrl || !orderForm.creditsToUse) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const creditsToUse = parseInt(orderForm.creditsToUse);
    if (isNaN(creditsToUse) || creditsToUse <= 0) {
      toast({
        title: "Invalid Credits",
        description: "Please enter a valid number of credits",
        variant: "destructive",
      });
      return;
    }

    if (user && creditsToUse > (user.credits || 0)) {
      toast({
        title: "Insufficient Credits",
        description: "You don't have enough credits for this order",
        variant: "destructive",
      });
      return;
    }

    createOrderMutation.mutate({
      apolloUrl: orderForm.apolloUrl,
      creditsUsed: creditsToUse,
      estimatedLeads: creditsToUse, // 1:1 ratio for simplicity
      deliveryEmail: user?.email, // Use user's registered email
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-blue-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-yellow-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'processing': return <Clock className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (authLoading) {
    return <Loader fullScreen text="Loading your dashboard..." />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="text-gray-400 mb-6">Please log in to access your dashboard.</p>
          <Link href="/auth">
            <Button>Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Show email verification notice if email is not verified
  if (!user.emailVerified) {
    return <EmailVerificationNotice user={{
      email: user.email,
      firstName: user.firstName,
      emailVerified: user.emailVerified || false
    }} />;
  }

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      <AnimatedBackground />
      
      <Navigation 
        isAuthenticated={true}
        user={user}
        onSignOut={async () => {
          try {
            await apiRequest('POST', '/api/logout');
            queryClient.setQueryData(['/api/user'], null);
            setLocation('/');
          } catch (error) {
            console.error('Logout error:', error);
            setLocation('/');
          }
        }}
      />

      <div className="pt-24 px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Welcome back, {user?.firstName || 'User'}!
            </h1>
            <p className="text-xl text-gray-400">
              Monitor your credits, track orders, and manage your lead generation campaigns
            </p>
          </div>

          {/* Main Dashboard Tabs */}
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-white/5 border-white/10 mb-8">
              <TabsTrigger value="dashboard" className="text-white data-[state=active]:bg-white/10">Dashboard</TabsTrigger>
              <TabsTrigger value="affiliate" className="text-white data-[state=active]:bg-white/10">Affiliate Program</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-8">
              {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">{user?.credits?.toLocaleString() || 0}</div>
                <div className="text-gray-400">Available Credits</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {orders?.filter((order: any) => order.status === 'completed').length || 0}
                </div>
                <div className="text-gray-400">Completed Orders</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {orders?.reduce((sum: number, order: any) => sum + (order.estimatedLeads || 0), 0)?.toLocaleString() || 0}
                </div>
                <div className="text-gray-400">Total Leads Generated</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-white mb-2">
                  {orders?.filter((order: any) => order.status === 'pending' || order.status === 'processing').length || 0}
                </div>
                <div className="text-gray-400">Pending Orders</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Order Form */}
            <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-3xl font-bold text-white">Place New Order</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleOrderSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="apolloUrl" className="text-gray-300">Apollo Search URL *</Label>
                    <Textarea
                      id="apolloUrl"
                      placeholder="Paste your filtered Apollo URL here..."
                      value={orderForm.apolloUrl}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, apolloUrl: e.target.value }))}
                      className="mt-2 bg-white/5 border-white/10 text-white placeholder-gray-400 focus:border-blue-500"
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="creditsToUse" className="text-gray-300">Credits to Use *</Label>
                    <Input
                      id="creditsToUse"
                      type="number"
                      placeholder="Enter number of credits"
                      value={orderForm.creditsToUse}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, creditsToUse: e.target.value }))}
                      className="mt-2 bg-white/5 border-white/10 text-white placeholder-gray-400 focus:border-blue-500"
                    />
                  </div>

                  {/* Order Summary */}
                  {orderForm.creditsToUse && (
                    <Card className="bg-white/5 border-white/10">
                      <CardContent className="p-6">
                        <h4 className="font-semibold text-white mb-4">Order Summary</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Credits to use:</span>
                            <span className="text-white font-medium">{parseInt(orderForm.creditsToUse || '0').toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-400">Estimated leads:</span>
                            <span className="text-white font-medium">~{parseInt(orderForm.creditsToUse || '0').toLocaleString()}</span>
                          </div>
                          <Separator className="bg-white/10" />
                          <div className="flex justify-between items-center pt-2">
                            <span className="text-white font-semibold">Credits remaining after order:</span>
                            <span className="text-blue-400 font-bold">
                              {((user?.credits || 0) - parseInt(orderForm.creditsToUse || '0')).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Button
                    type="submit"
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 rounded-xl text-lg font-semibold shadow-xl shadow-purple-500/25 transform hover:scale-[1.02] transition-all duration-300"
                    disabled={createOrderMutation.isPending}
                  >
                    {createOrderMutation.isPending ? (
                      <div className="flex items-center gap-2">
                        <InlineLoader />
                        Placing Order...
                      </div>
                    ) : (
                      '🚀 Place Order'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Buy Credits & Recent Orders */}
            <div className="space-y-8">
              {/* Buy More Credits */}
              <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-white">Buy More Credits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center">
                    <div className="text-4xl mb-4">💳</div>
                    <p className="text-gray-400 mb-6">
                      Running low on credits? Purchase more to continue your lead generation campaigns.
                    </p>
                    <Link href="/checkout">
                      <Button className="bg-gradient-to-r from-green-600 to-blue-500 hover:from-green-700 hover:to-blue-600 font-semibold">
                        Purchase Credits
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Orders */}
              <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-white">Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                    <Loader text="Loading your orders..." />
                  ) : orders && orders.length > 0 ? (
                    <div className="space-y-4">
                      {orders.slice(0, 5).map((order: any) => (
                        <div key={order.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={`${getStatusColor(order.status)} text-white`}>
                                {getStatusIcon(order.status)}
                                <span className="ml-1 capitalize">{order.status}</span>
                              </Badge>
                            </div>
                            <span className="text-gray-400 text-sm">
                              {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-white font-medium mb-1">
                            {order.estimatedLeads?.toLocaleString()} leads
                          </div>
                          <div className="text-gray-400 text-sm">
                            {order.creditsUsed} credits used
                          </div>
                          {order.status === 'completed' && order.csvUrl && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 border-white/20 text-white hover:bg-white/10"
                              onClick={() => window.open(order.csvUrl, '_blank')}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Access Leads Sheet
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">📋</div>
                      <p className="text-gray-400">No orders yet. Place your first order above!</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Credit Purchase History */}
              <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-white">Credit Purchase History</CardTitle>
                </CardHeader>
                <CardContent>
                  {purchasesLoading ? (
                    <Loader text="Loading your purchases..." />
                  ) : creditPurchases && creditPurchases.length > 0 ? (
                    <div className="space-y-4">
                      {creditPurchases.slice(0, 5).map((purchase) => (
                        <div key={purchase.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className={purchase.status === 'completed' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'}>
                                <DollarSign className="w-3 h-3" />
                                <span className="ml-1 capitalize">{purchase.status}</span>
                              </Badge>
                            </div>
                            <span className="text-gray-400 text-sm">
                              {new Date(purchase.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-white font-medium mb-1">
                            {purchase.credits.toLocaleString()} credits purchased
                          </div>
                          <div className="text-gray-400 text-sm">
                            ${parseFloat(purchase.amount).toFixed(2)} paid
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-4">💳</div>
                      <p className="text-gray-400">No credit purchases yet. Buy your first credits above!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
            </TabsContent>

            <TabsContent value="affiliate" className="space-y-6">
              <AffiliateDashboard />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
