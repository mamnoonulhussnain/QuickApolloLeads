import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Shield, DollarSign, Users, CheckCircle2, Lock, ArrowLeft, Eye } from 'lucide-react';
import { InlineLoader } from '@/components/ui/loader';

interface PendingCommission {
  id: string;
  affiliateUserId: string;
  referredUserId: string;
  saleAmount: number;
  commissionAmount: number;
  paymentMonth: string;
  status: string;
  createdAt: string;
  affiliate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    paypalEmail: string | null;
  };
  referred: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export function AffiliateAdmin() {
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string | null>(null);

  // Authenticate with affiliate admin password
  const authMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await apiRequest('POST', '/api/team/affiliate/auth', { password });
      return response.json();
    },
    onSuccess: () => {
      setIsAuthenticated(true);
      toast({
        title: "Authentication Successful",
        description: "Access granted to affiliate admin panel",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Authentication Failed",
        description: "Invalid password",
        variant: "destructive",
      });
    },
  });

  // Fetch pending commissions
  const { data: pendingCommissions, isLoading: commissionsLoading, refetch } = useQuery<PendingCommission[]>({
    queryKey: ['/api/team/affiliate/pending-commissions'],
    enabled: isAuthenticated,
  });

  // Mark commissions as paid
  const markPaidMutation = useMutation({
    mutationFn: async ({ commissionIds, paymentMonth }: { commissionIds: string[]; paymentMonth: string }) => {
      const response = await apiRequest('POST', '/api/team/affiliate/mark-paid', { commissionIds, paymentMonth });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Commissions Updated",
        description: "Selected commissions have been marked as paid",
      });
      setSelectedCommissions([]);
      setSelectedMonth(null);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAuth = () => {
    authMutation.mutate(password);
  };

  const handleCommissionSelect = (commissionId: string, checked: boolean) => {
    if (checked) {
      setSelectedCommissions([...selectedCommissions, commissionId]);
    } else {
      setSelectedCommissions(selectedCommissions.filter(id => id !== commissionId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && pendingCommissions) {
      setSelectedCommissions(pendingCommissions.map(c => c.id));
    } else {
      setSelectedCommissions([]);
    }
  };

  const handleMarkPaid = (monthToPayFor: string) => {
    if (selectedCommissions.length === 0) {
      toast({
        title: "No Commissions Selected",
        description: "Please select commissions to mark as paid",
        variant: "destructive",
      });
      return;
    }

    // Use current month as payment month (when payment is processed)
    const currentDate = new Date();
    const paymentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    markPaidMutation.mutate({ commissionIds: selectedCommissions, paymentMonth });
  };

  const getTotalSelectedCommissions = () => {
    if (!pendingCommissions) return 0;
    return pendingCommissions
      .filter(c => selectedCommissions.includes(c.id))
      .reduce((sum, c) => sum + parseFloat(c.commissionAmount.toString()), 0);
  };

  // Group commissions by month they were earned
  const getMonthlyBills = () => {
    if (!pendingCommissions) return [];
    
    const grouped = pendingCommissions.reduce((acc, commission) => {
      const commissionDate = new Date(commission.createdAt);
      const monthKey = `${commissionDate.getFullYear()}-${String(commissionDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          monthName: commissionDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
          totalCommissions: 0,
          totalSales: 0,
          transactionCount: 0,
          commissionIds: [],
          affiliates: {} as Record<string, any>
        };
      }
      
      // Update monthly totals
      acc[monthKey].totalCommissions += parseFloat(commission.commissionAmount.toString());
      acc[monthKey].totalSales += parseFloat(commission.saleAmount.toString());
      acc[monthKey].transactionCount += 1;
      acc[monthKey].commissionIds.push(commission.id);
      
      // Group by affiliate within the month
      const affiliateId = commission.affiliate.id;
      if (!acc[monthKey].affiliates[affiliateId]) {
        acc[monthKey].affiliates[affiliateId] = {
          affiliate: commission.affiliate,
          totalCommissions: 0,
          totalSales: 0,
          transactionCount: 0,
          commissionIds: []
        };
      }
      
      acc[monthKey].affiliates[affiliateId].totalCommissions += parseFloat(commission.commissionAmount.toString());
      acc[monthKey].affiliates[affiliateId].totalSales += parseFloat(commission.saleAmount.toString());
      acc[monthKey].affiliates[affiliateId].transactionCount += 1;
      acc[monthKey].affiliates[affiliateId].commissionIds.push(commission.id);
      
      return acc;
    }, {} as Record<string, any>);
    
    return Object.values(grouped).sort((a: any, b: any) => b.month.localeCompare(a.month));
  };
  
  // Get affiliates for selected month
  const getAffiliatesForMonth = (month: string) => {
    const monthlyBills = getMonthlyBills();
    const selectedMonthData = monthlyBills.find(bill => bill.month === month);
    return selectedMonthData ? Object.values(selectedMonthData.affiliates) : [] as any[];
  };

  // Get commissions for selected affiliate
  const getSelectedAffiliateCommissions = () => {
    if (!pendingCommissions || !selectedAffiliateId) return [];
    return pendingCommissions.filter(c => c.affiliate.id === selectedAffiliateId);
  };

  if (!isAuthenticated) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-white">Affiliate Admin</h2>
          <p className="text-gray-400">Enter the admin password to access affiliate management</p>
        </div>

        <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10 max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-white flex items-center justify-center gap-2">
              <Lock className="w-5 h-5" />
              Secure Access
            </CardTitle>
            <CardDescription className="text-gray-400">
              Admin authentication required
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-gray-300">Admin Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                className="bg-white/5 border-white/10 text-white"
                onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
              />
            </div>
            <Button
              onClick={handleAuth}
              disabled={authMutation.isPending || !password.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {authMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <InlineLoader />
                  Authenticating...
                </div>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Authenticate
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white">Affiliate Admin Panel</h2>
        <p className="text-gray-400">Manage affiliate commissions and payouts</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Pending Commissions</p>
                <p className="text-2xl font-bold text-white">{pendingCommissions?.length || 0}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Pending Amount</p>
                <p className="text-2xl font-bold text-white">
                  ${pendingCommissions?.reduce((sum, c) => sum + parseFloat(c.commissionAmount.toString()), 0).toFixed(2) || '0.00'}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Selected Amount</p>
                <p className="text-2xl font-bold text-white">${getTotalSelectedCommissions().toFixed(2)}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Payment Action */}
      {selectedCommissions.length > 0 && (
        <Card className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">
                  {selectedCommissions.length} commission{selectedCommissions.length > 1 ? 's' : ''} selected
                </p>
                <p className="text-sm text-gray-400">
                  Total: ${getTotalSelectedCommissions().toFixed(2)}
                </p>
              </div>
              <Button
                onClick={() => handleMarkPaid('')}
                disabled={markPaidMutation.isPending}
                className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
              >
                {markPaidMutation.isPending ? (
                  <InlineLoader />
                ) : (
                  `Mark as Paid`
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Commissions */}
      <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-3">
            {(selectedAffiliateId || selectedMonth) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedAffiliateId(null);
                  setSelectedMonth(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            {selectedAffiliateId ? 'Individual Transactions' : selectedMonth ? `${getMonthlyBills().find(b => b.month === selectedMonth)?.monthName} - Affiliate Breakdown` : 'Monthly Commission Bills'}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {selectedAffiliateId 
              ? 'Detailed commission transactions for selected affiliate'
              : selectedMonth 
                ? 'Affiliates who earned commissions this month'
                : 'Monthly bills ready for payment by the 5th of following month'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {commissionsLoading ? (
            <div className="flex justify-center py-8">
              <InlineLoader />
            </div>
          ) : pendingCommissions && pendingCommissions.length > 0 ? (
            <div>
              {selectedAffiliateId ? (
                // Individual transactions view
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead className="text-gray-300">
                        <Checkbox
                          checked={selectedCommissions.length === getSelectedAffiliateCommissions().length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCommissions(getSelectedAffiliateCommissions().map(c => c.id));
                            } else {
                              setSelectedCommissions([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="text-gray-300">Referred User</TableHead>
                      <TableHead className="text-gray-300">Sale Amount</TableHead>
                      <TableHead className="text-gray-300">Commission</TableHead>
                      <TableHead className="text-gray-300">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getSelectedAffiliateCommissions().map((commission) => (
                      <TableRow key={commission.id} className="border-white/10 hover:bg-white/5">
                        <TableCell>
                          <Checkbox
                            checked={selectedCommissions.includes(commission.id)}
                            onCheckedChange={(checked) => handleCommissionSelect(commission.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="text-white">
                          <div>
                            <div className="font-medium">{commission.referred.firstName} {commission.referred.lastName}</div>
                            <div className="text-sm text-gray-400">{commission.referred.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-white">${parseFloat(commission.saleAmount.toString()).toFixed(2)}</TableCell>
                        <TableCell className="text-green-400 font-semibold">${parseFloat(commission.commissionAmount.toString()).toFixed(2)}</TableCell>
                        <TableCell className="text-gray-300">
                          {new Date(commission.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : selectedMonth ? (
                // Affiliate breakdown for selected month
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead className="text-gray-300">Affiliate</TableHead>
                      <TableHead className="text-gray-300">PayPal Email</TableHead>
                      <TableHead className="text-gray-300">Transactions</TableHead>
                      <TableHead className="text-gray-300">Total Sales</TableHead>
                      <TableHead className="text-gray-300">Total Commission</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getAffiliatesForMonth(selectedMonth).map((affiliateSummary: any) => (
                      <TableRow key={affiliateSummary.affiliate.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-white">
                          <div>
                            <div className="font-medium">{affiliateSummary.affiliate.firstName} {affiliateSummary.affiliate.lastName}</div>
                            <div className="text-sm text-gray-400">{affiliateSummary.affiliate.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {affiliateSummary.affiliate.paypalEmail ? (
                            <Badge variant="default" className="bg-green-500/20 text-green-400">
                              {affiliateSummary.affiliate.paypalEmail}
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-500/20 text-red-400">
                              No PayPal Email
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-white">
                          <Badge variant="outline" className="text-white border-white/20">
                            {affiliateSummary.transactionCount} transactions
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white">${affiliateSummary.totalSales.toFixed(2)}</TableCell>
                        <TableCell className="text-green-400 font-semibold">${affiliateSummary.totalCommissions.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAffiliateId(affiliateSummary.affiliate.id)}
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedCommissions(affiliateSummary.commissionIds);
                                toast({
                                  title: "Commissions Selected",
                                  description: `Selected ${affiliateSummary.transactionCount} commissions for ${affiliateSummary.affiliate.firstName}`,
                                });
                              }}
                              className="border-green-500/20 text-green-400 hover:bg-green-500/10"
                            >
                              Select All
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                // Monthly bills view
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead className="text-gray-300">Commission Month</TableHead>
                      <TableHead className="text-gray-300">Affiliates</TableHead>
                      <TableHead className="text-gray-300">Transactions</TableHead>
                      <TableHead className="text-gray-300">Total Sales</TableHead>
                      <TableHead className="text-gray-300">Total Commission</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getMonthlyBills().map((monthlyBill: any) => (
                      <TableRow key={monthlyBill.month} className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-white">
                          <div className="font-medium">{monthlyBill.monthName}</div>
                          <div className="text-sm text-gray-400">Pay by: {new Date(new Date(monthlyBill.month + '-01').getFullYear(), new Date(monthlyBill.month + '-01').getMonth() + 1, 5).toLocaleDateString()}</div>
                        </TableCell>
                        <TableCell className="text-white">
                          <Badge variant="outline" className="text-white border-white/20">
                            {Object.keys(monthlyBill.affiliates).length} affiliates
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white">
                          <Badge variant="outline" className="text-white border-white/20">
                            {monthlyBill.transactionCount} transactions
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white">${monthlyBill.totalSales.toFixed(2)}</TableCell>
                        <TableCell className="text-green-400 font-semibold">${monthlyBill.totalCommissions.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedMonth(monthlyBill.month)}
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Bill
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedCommissions(monthlyBill.commissionIds);
                                toast({
                                  title: "Monthly Bill Selected",
                                  description: `Selected all commissions for ${monthlyBill.monthName}`,
                                });
                              }}
                              className="border-green-500/20 text-green-400 hover:bg-green-500/10"
                            >
                              Pay All ${monthlyBill.totalCommissions.toFixed(2)}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">💰</div>
              <p className="text-gray-400">No pending commissions found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}