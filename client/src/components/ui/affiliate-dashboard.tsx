import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Copy, DollarSign, MousePointer, Users, TrendingUp, Calendar, Mail } from 'lucide-react';
import { InlineLoader } from '@/components/ui/loader';

interface AffiliateStats {
  totalClicks: number;
  totalReferrals: number;
  totalSales: number;
  totalCommissions: number;
  pendingCommissions: number;
  monthlyCommissions: { month: string; amount: number; status: string }[];
}

interface ReferredUser {
  firstName: string;
  createdAt: string;
}

interface AffiliateSale {
  id: string;
  saleAmount: string;
  commissionAmount: string;
  status: string;
  createdAt: string;
  referredUserName: string;
  purchaseId: string;
}

export function AffiliateDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [paypalEmail, setPaypalEmail] = useState(user?.paypalEmail || '');
  const [affiliateUrl, setAffiliateUrl] = useState('');

  // Don't render if no user
  if (!user) {
    return null;
  }

  // Update affiliate URL when user has a code
  useEffect(() => {
    if (user?.affiliateCode) {
      const baseUrl = window.location.origin;
      setAffiliateUrl(`${baseUrl}/ref/${user.affiliateCode}`);
    }
  }, [user?.affiliateCode]);

  // Update paypal email when user data changes
  useEffect(() => {
    setPaypalEmail(user?.paypalEmail || '');
  }, [user?.paypalEmail]);

  // Fetch affiliate stats with automatic updates every 30 seconds
  const { data: stats, isLoading: statsLoading } = useQuery<AffiliateStats>({
    queryKey: ['/api/affiliate/stats'],
    enabled: !!user?.affiliateCode,
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true, // Continue refreshing even when tab is not active
  });

  // Fetch referred users with automatic updates every 30 seconds
  const { data: referredUsers, isLoading: usersLoading } = useQuery<ReferredUser[]>({
    queryKey: ['/api/affiliate/referred-users'],
    enabled: !!user?.affiliateCode,
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true, // Continue refreshing even when tab is not active
  });

  // Fetch affiliate sales with automatic updates every 30 seconds
  const { data: sales, isLoading: salesLoading } = useQuery<AffiliateSale[]>({
    queryKey: ['/api/affiliate/sales'],
    enabled: !!user?.affiliateCode,
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchIntervalInBackground: true, // Continue refreshing even when tab is not active
  });

  // Generate affiliate code mutation
  const generateCodeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/affiliate/generate-code');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Affiliate Link Generated",
        description: "Your unique affiliate link has been created successfully!",
      });
      // Force refetch the user data by invalidating and refetching
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.refetchQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update PayPal email mutation
  const updatePaypalMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest('POST', '/api/affiliate/update-paypal', { paypalEmail: email });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "PayPal Email Updated",
        description: "Your PayPal email has been updated successfully!",
      });
      // Force refetch the user data by invalidating and refetching
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.refetchQueries({ queryKey: ['/api/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Affiliate URL copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleGenerateCode = () => {
    generateCodeMutation.mutate();
  };

  const handleUpdatePaypal = () => {
    if (!paypalEmail.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid PayPal email",
        variant: "destructive",
      });
      return;
    }
    updatePaypalMutation.mutate(paypalEmail);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white">Affiliate Program</h2>
        <p className="text-gray-400">
          Earn 15% commission on all sales from your referrals. Share your unique link and start earning!
        </p>
      </div>

      {!user.affiliateCode ? (
        <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10">
          <CardHeader className="text-center">
            <CardTitle className="text-white text-xl">Join Our Affiliate Program</CardTitle>
            <CardDescription className="text-gray-400">
              Get started by generating your unique affiliate link
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={handleGenerateCode}
              disabled={generateCodeMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {generateCodeMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <InlineLoader />
                  Generating...
                </div>
              ) : (
                'Generate Affiliate Link'
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white/5 border-white/10">
            <TabsTrigger value="overview" className="text-white data-[state=active]:bg-white/10">Overview</TabsTrigger>
            <TabsTrigger value="link" className="text-white data-[state=active]:bg-white/10">Your Link</TabsTrigger>
            <TabsTrigger value="sales" className="text-white data-[state=active]:bg-white/10">Sales</TabsTrigger>
            <TabsTrigger value="referrals" className="text-white data-[state=active]:bg-white/10">Referrals</TabsTrigger>
            <TabsTrigger value="payouts" className="text-white data-[state=active]:bg-white/10">Payouts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Performance Overview</h3>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>Live Updates</span>
              </div>
            </div>
            {statsLoading ? (
              <div className="flex justify-center py-8">
                <InlineLoader />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Total Clicks</p>
                        <p className="text-2xl font-bold text-white">{stats?.totalClicks || 0}</p>
                      </div>
                      <MousePointer className="w-8 h-8 text-blue-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Referrals</p>
                        <p className="text-2xl font-bold text-white">{stats?.totalReferrals || 0}</p>
                      </div>
                      <Users className="w-8 h-8 text-green-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Total Sales</p>
                        <p className="text-2xl font-bold text-white">${stats?.totalSales || 0}</p>
                      </div>
                      <TrendingUp className="w-8 h-8 text-purple-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/20">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-400">Total Earned</p>
                        <p className="text-2xl font-bold text-white">${stats?.totalCommissions || 0}</p>
                      </div>
                      <DollarSign className="w-8 h-8 text-yellow-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Monthly Commissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.monthlyCommissions && stats.monthlyCommissions.length > 0 ? (
                  <div className="space-y-2">
                    {stats.monthlyCommissions.map((commission, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                        <span className="text-gray-300">
                          {new Date(commission.month + '-01').toLocaleDateString('en-US', { 
                            month: 'long', 
                            year: 'numeric' 
                          }).toUpperCase()}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">${commission.amount}</span>
                          <Badge variant={commission.status === 'paid' ? 'default' : 'secondary'}>
                            {commission.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-4">No commissions yet</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="link" className="space-y-6">
            <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white">Your Affiliate Link</CardTitle>
                <CardDescription className="text-gray-400">
                  Share this unique link to earn 15% commission on all sales
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    value={affiliateUrl}
                    readOnly
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <Button
                    onClick={() => copyToClipboard(affiliateUrl)}
                    variant="outline"
                    className="border-white/10 text-white hover:bg-white/10"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <h4 className="text-blue-400 font-semibold mb-2">How it works:</h4>
                  <ul className="text-gray-300 space-y-1 text-sm">
                    <li>• Share your unique affiliate link with potential customers</li>
                    <li>• When someone clicks your link and registers, they become your referral</li>
                    <li>• You earn 15% commission on all their credit purchases</li>
                    <li>• Commissions are paid monthly via PayPal</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Sales from Referrals</CardTitle>
                    <CardDescription className="text-gray-400">
                      All purchases made by people you referred
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Live</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {salesLoading ? (
                  <div className="flex justify-center py-8">
                    <InlineLoader />
                  </div>
                ) : sales && sales.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableHead className="text-gray-300">Referral</TableHead>
                        <TableHead className="text-gray-300">Sale Amount</TableHead>
                        <TableHead className="text-gray-300">Your Commission</TableHead>
                        <TableHead className="text-gray-300">Status</TableHead>
                        <TableHead className="text-gray-300">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sales.map((sale) => (
                        <TableRow key={sale.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-white font-medium">{sale.referredUserName}</TableCell>
                          <TableCell className="text-green-400 font-semibold">${parseFloat(sale.saleAmount).toFixed(2)}</TableCell>
                          <TableCell className="text-blue-400 font-semibold">${parseFloat(sale.commissionAmount).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge className={sale.status === 'pending' ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white'}>
                              {sale.status === 'pending' ? 'Pending' : 'Paid'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {new Date(sale.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-400 text-center py-8">No sales yet. Keep sharing your affiliate link!</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="referrals" className="space-y-6">
            <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Your Referrals</CardTitle>
                    <CardDescription className="text-gray-400">
                      People who signed up using your affiliate link
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Live</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8">
                    <InlineLoader />
                  </div>
                ) : referredUsers && referredUsers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableHead className="text-gray-300">Name</TableHead>
                        <TableHead className="text-gray-300">Joined Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referredUsers.map((user, index) => (
                        <TableRow key={index} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-white">{user.firstName}</TableCell>
                          <TableCell className="text-gray-300">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-400 text-center py-8">No referrals yet. Start sharing your link!</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payouts" className="space-y-6">
            <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  PayPal Email
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Add your PayPal email to receive commission payments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paypal-email" className="text-gray-300">PayPal Email</Label>
                  <div className="flex gap-2">
                    <Input
                      id="paypal-email"
                      type="email"
                      value={paypalEmail}
                      onChange={(e) => setPaypalEmail(e.target.value)}
                      placeholder="your-email@example.com"
                      className="bg-white/5 border-white/10 text-white"
                    />
                    <Button
                      onClick={handleUpdatePaypal}
                      disabled={updatePaypalMutation.isPending}
                      className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                    >
                      {updatePaypalMutation.isPending ? (
                        <InlineLoader />
                      ) : (
                        'Update'
                      )}
                    </Button>
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div className="space-y-3">
                  <h4 className="text-white font-semibold">Payout Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-gray-400 text-sm">Pending Commission</p>
                      <p className="text-2xl font-bold text-yellow-400">${stats?.pendingCommissions || 0}</p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-gray-400 text-sm">Commission Rate</p>
                      <p className="text-2xl font-bold text-green-400">15%</p>
                    </div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                    <h5 className="text-blue-400 font-semibold mb-2">Payment Schedule:</h5>
                    <ul className="text-gray-300 space-y-1 text-sm">
                      <li>• Commissions are calculated monthly (1st to 30th/31st)</li>
                      <li>• Payments are processed by the 5th of the following month</li>
                      <li>• Payments are sent to your registered PayPal email</li>
                      <li>• Minimum payout threshold: $10</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}