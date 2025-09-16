import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AffiliateAdmin } from "@/components/ui/affiliate-admin";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InlineLoader, Loader } from "@/components/ui/loader";
import { Users, ShoppingCart, CreditCard, TrendingUp, Clock, CheckCircle, XCircle, FileText, ExternalLink, DollarSign } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import type { Order } from "@shared/schema";

interface FulfillOrderData {
  deliveryType: 'google_sheets';
  csvUrl: string;
  notes: string;
}

// Credit Assignment Form Component
function CreditAssignmentForm() {
  const [email, setEmail] = useState('');
  const [credits, setCredits] = useState('');
  const { toast } = useToast();

  const assignCreditsMutation = useMutation({
    mutationFn: async ({ email, credits }: { email: string; credits: number }) => {
      const response = await apiRequest('POST', '/api/team/assign-credits', { email, credits });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Credits Assigned Successfully",
        description: `${credits} credits assigned to ${data.userInfo.name || email}. New balance: ${data.newBalance}`,
      });
      setEmail('');
      setCredits('');
    },
    onError: (error: any) => {
      toast({
        title: "Assignment Failed",
        description: error.message || "Failed to assign credits",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !credits) {
      toast({
        title: "Missing Information",
        description: "Please enter both email and credit amount",
        variant: "destructive",
      });
      return;
    }

    const creditAmount = parseInt(credits);
    if (isNaN(creditAmount) || creditAmount <= 0) {
      toast({
        title: "Invalid Credits",
        description: "Please enter a valid positive number of credits",
        variant: "destructive",
      });
      return;
    }

    assignCreditsMutation.mutate({ email, credits: creditAmount });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="clientEmail" className="text-gray-300">Client Email Address *</Label>
          <Input
            id="clientEmail"
            type="email"
            placeholder="client@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 bg-white/5 border-white/10 text-white placeholder-gray-400 focus:border-blue-500"
            disabled={assignCreditsMutation.isPending}
          />
        </div>

        <div>
          <Label htmlFor="creditsAmount" className="text-gray-300">Credits to Assign *</Label>
          <Input
            id="creditsAmount"
            type="number"
            placeholder="1000"
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            className="mt-2 bg-white/5 border-white/10 text-white placeholder-gray-400 focus:border-blue-500"
            disabled={assignCreditsMutation.isPending}
            min="1"
          />
        </div>
      </div>

      <Button 
        type="submit" 
        className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
        disabled={assignCreditsMutation.isPending}
      >
        {assignCreditsMutation.isPending ? (
          <div className="flex items-center gap-2">
            <InlineLoader size="sm" />
            Assigning...
          </div>
        ) : (
          'Assign Credits'
        )}
      </Button>
    </form>
  );
}

export default function TeamDashboard() {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [fulfillmentData, setFulfillmentData] = useState<FulfillOrderData>({
    deliveryType: 'google_sheets',
    csvUrl: '',
    notes: '',
  });

  // Fetch all orders for team dashboard - must be at top level
  const { data: orders = [], refetch: refetchOrders } = useQuery<Order[]>({
    queryKey: ['/api/team/orders'],
    queryFn: () => apiRequest('GET', '/api/team/orders').then(res => res.json()),
    enabled: isAuthenticated, // Only fetch when authenticated
  });

  // Fulfill order mutation - must be at top level
  const fulfillOrderMutation = useMutation({
    mutationFn: async ({ orderId, data }: { orderId: string; data: FulfillOrderData }) => {
      const response = await apiRequest('PUT', `/api/team/orders/${orderId}/fulfill`, data);
      if (!response.ok) {
        throw new Error('Failed to fulfill order');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Order Fulfilled",
        description: "Order has been marked as completed and customer notified.",
      });
      refetchOrders();
      setIsDialogOpen(false);
      setSelectedOrder(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set page title
  useEffect(() => {
    document.title = 'Team Dashboard - QuickApolloLeads';
  }, []);

  // Simple team authentication - in production, use proper auth
  useEffect(() => {
    const teamAuth = localStorage.getItem('team_authenticated');
    if (teamAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleTeamLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Dual password authentication - both passwords must match exactly
    const correctPassword1 = 'JAk23202wekwlweo2392102132#!$222092933';
    const correctPassword2 = 'kwoeo2030k2maddemow0)#(@*#(@jkpelwem';
    
    if (password1 === correctPassword1 && password2 === correctPassword2) {
      localStorage.setItem('team_authenticated', 'true');
      setIsAuthenticated(true);
      toast({
        title: "Access Granted",
        description: "Welcome to the team dashboard",
      });
    } else {
      toast({
        title: "Access Denied",
        description: "Both passwords must be correct to access the dashboard",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('team_authenticated');
    setIsAuthenticated(false);
    setPassword1('');
    setPassword2('');
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'processing': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'processing': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'completed': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'failed': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const handleFulfillOrder = (data: FulfillOrderData) => {
    if (!selectedOrder) return;
    fulfillOrderMutation.mutate({ 
      orderId: selectedOrder.id, 
      data 
    });
  };

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/10 w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-white text-2xl">Team Access</CardTitle>
            <CardDescription className="text-gray-400">
              Enter both team passwords to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleTeamLogin} className="space-y-4">
              <div>
                <Label htmlFor="password1" className="text-gray-300">Team Password 1</Label>
                <Input
                  id="password1"
                  type="password"
                  value={password1}
                  onChange={(e) => setPassword1(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="Enter first team password"
                  required
                />
              </div>
              <div>
                <Label htmlFor="password2" className="text-gray-300">Team Password 2</Label>
                <Input
                  id="password2"
                  type="password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="Enter second team password"
                  required
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Access Dashboard
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingOrders = orders.filter(order => order.status === 'pending');
  const processingOrders = orders.filter(order => order.status === 'processing');
  const completedOrders = orders.filter(order => order.status === 'completed');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">QuickApolloLeads - Team Dashboard</h1>
            <p className="text-gray-400">Fulfill customer orders and manage lead delivery</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="border-white/20 text-white hover:bg-white/10"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Orders</p>
                  <p className="text-2xl font-bold text-white">{orders.length}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Pending</p>
                  <p className="text-2xl font-bold text-yellow-400">{pendingOrders.length}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Processing</p>
                  <p className="text-2xl font-bold text-blue-400">{processingOrders.length}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Completed</p>
                  <p className="text-2xl font-bold text-green-400">{completedOrders.length}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Credit Assignment Section */}
        <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/10 mb-8">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Assign Free Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CreditAssignmentForm />
          </CardContent>
        </Card>

        {/* Orders Tabs */}
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="bg-white/10 border-white/20">
            <TabsTrigger value="pending" className="text-white data-[state=active]:bg-white/20">
              Pending ({pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="processing" className="text-white data-[state=active]:bg-white/20">
              Processing ({processingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="text-white data-[state=active]:bg-white/20">
              Completed ({completedOrders.length})
            </TabsTrigger>
            <TabsTrigger value="affiliate" className="text-white data-[state=active]:bg-white/20">
              Affiliate Admin
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <div className="grid gap-4">
              {pendingOrders.map((order) => (
                <Card key={order.id} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/10">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1 capitalize">{order.status}</span>
                          </Badge>
                        </div>
                        <p className="text-white font-medium">
                          {order.estimatedLeads?.toLocaleString()} leads • {order.creditsUsed} credits
                        </p>
                        <p className="text-gray-400 text-sm">
                          Customer: {order.deliveryEmail}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Ordered: {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Unknown'}
                        </p>
                        <div className="text-gray-400 text-sm max-w-md">
                          <p className="font-medium">Apollo URL:</p>
                          <p className="break-all">{order.apolloUrl}</p>
                        </div>
                      </div>
                      <Dialog open={isDialogOpen && selectedOrder?.id === order.id} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                            onClick={() => setSelectedOrder(order)}
                          >
                            Fulfill Order
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-gradient-to-br from-slate-900 to-purple-900 border-white/20 text-white">
                          <DialogHeader>
                            <DialogTitle>Fulfill Order</DialogTitle>
                            <DialogDescription className="text-gray-400">
                              Upload the CSV file or provide a Google Sheets link for this order.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="deliveryType" className="text-gray-300">Delivery Type</Label>
                              <Select 
                                value={fulfillmentData.deliveryType} 
                                onValueChange={(value: 'google_sheets') => 
                                  setFulfillmentData(prev => ({ ...prev, deliveryType: value }))
                                }
                              >
                                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="google_sheets">Google Sheets</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label htmlFor="csvUrl" className="text-gray-300">
                                Google Sheets URL
                              </Label>
                              <Input
                                id="csvUrl"
                                value={fulfillmentData.csvUrl}
                                onChange={(e) => setFulfillmentData(prev => ({ ...prev, csvUrl: e.target.value }))}
                                placeholder="https://docs.google.com/spreadsheets/..."
                                className="bg-white/5 border-white/10 text-white"
                              />
                            </div>

                            <div>
                              <Label htmlFor="notes" className="text-gray-300">Notes (Optional)</Label>
                              <Textarea
                                id="notes"
                                value={fulfillmentData.notes}
                                onChange={(e) => setFulfillmentData(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Any additional notes for the customer..."
                                className="bg-white/5 border-white/10 text-white"
                              />
                            </div>
                          </div>

                          <DialogFooter>
                            <Button
                              onClick={() => handleFulfillOrder(fulfillmentData)}
                              disabled={!fulfillmentData.csvUrl || fulfillOrderMutation.isPending}
                              className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                            >
                              {fulfillOrderMutation.isPending ? 'Processing...' : 'Complete Order'}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {pendingOrders.length === 0 && (
                <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/10">
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                    <p className="text-white text-lg">No pending orders</p>
                    <p className="text-gray-400">All orders are up to date!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="processing">
            <div className="grid gap-4">
              {processingOrders.map((order) => (
                <Card key={order.id} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/10">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1 capitalize">{order.status}</span>
                          </Badge>
                        </div>
                        <p className="text-white font-medium">
                          {order.estimatedLeads?.toLocaleString()} leads • {order.creditsUsed} credits
                        </p>
                        <p className="text-gray-400 text-sm">
                          Customer: {order.deliveryEmail || 'Unknown'}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Started: {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Unknown'}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-blue-400 border-blue-400">
                        In Progress
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {processingOrders.length === 0 && (
                <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/10">
                  <CardContent className="p-8 text-center">
                    <Clock className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                    <p className="text-white text-lg">No orders in progress</p>
                    <p className="text-gray-400">Start working on pending orders!</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed">
            <div className="grid gap-4">
              {completedOrders.map((order) => (
                <Card key={order.id} className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/10">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1 capitalize">{order.status}</span>
                          </Badge>
                        </div>
                        <p className="text-white font-medium">
                          {order.estimatedLeads?.toLocaleString()} leads • {order.creditsUsed} credits
                        </p>
                        <p className="text-gray-400 text-sm">
                          Customer: {order.deliveryEmail || 'Unknown'}
                        </p>
                        <p className="text-gray-400 text-sm">
                          Completed: {order.completedAt ? new Date(order.completedAt).toLocaleDateString() : 'N/A'}
                        </p>
                        {order.notes && (
                          <p className="text-gray-400 text-sm">
                            Notes: {order.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {order.csvUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-white/20 text-white hover:bg-white/10"
                            onClick={() => order.csvUrl && window.open(order.csvUrl, '_blank')}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View File
                          </Button>
                        )}
                        <Badge variant="outline" className="text-green-400 border-green-400">
                          Delivered
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {completedOrders.length === 0 && (
                <Card className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border-white/10">
                  <CardContent className="p-8 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-white text-lg">No completed orders yet</p>
                    <p className="text-gray-400">Completed orders will appear here.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="affiliate">
            <AffiliateAdmin />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}