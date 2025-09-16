import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { Navigation } from '@/components/ui/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Link } from 'wouter';

const CheckoutForm = ({ selectedPackage, packageInfo }: { selectedPackage: string, packageInfo: any }) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ packageId: selectedPackage }),
      });
      
      if (!response.ok) {
        throw new Error(`Checkout session failed: ${response.status}`);
      }
      
      const { url } = await response.json();
      
      // Try to open in new window, fallback to current window if blocked
      const newWindow = window.open(url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
      
      if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
        // Popup was blocked, redirect in current window
        toast({
          title: "Redirecting to Payment",
          description: "Opening secure payment page...",
        });
        
        setTimeout(() => {
          window.location.href = url;
        }, 1000);
      } else {
        toast({
          title: "Payment Window Opened",
          description: "Complete your payment in the new window. You'll be redirected back here when done.",
        });
      }
      
    } catch (error: any) {
      toast({
        title: "Payment Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
    setIsProcessing(false);
  };

  const savings = selectedPackage === '5000' ? 0 : 
                selectedPackage === '10000' ? 5 :
                selectedPackage === '50000' ? 10 :
                selectedPackage === '100000' ? 15 :
                selectedPackage === '500000' ? 25 : 30;

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Package:</span>
              <div className="text-right">
                <div className="text-white font-semibold">{packageInfo.credits.toLocaleString()} Credits</div>
                {savings > 0 && (
                  <Badge className="bg-green-500 text-white text-xs">SAVE {savings}%</Badge>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Price:</span>
              <span className="text-white font-semibold">${packageInfo.price.toFixed(2)}</span>
            </div>
            <div className="border-t border-white/10 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-white font-bold">Total:</span>
                <span className="text-white font-bold text-xl">${packageInfo.price.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Button */}
      <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-semibold text-white">Secure Payment with Stripe</h3>
            <p className="text-gray-400">
              Click below to proceed to Stripe's secure payment page. If popups are blocked, you'll be redirected in the current window.
            </p>
            <Button 
              onClick={handlePayment}
              disabled={isProcessing} 
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 text-lg"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Opening Payment Window...
                </>
              ) : (
                `Pay $${packageInfo.price.toFixed(2)} Securely`
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function Checkout() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [selectedPackage, setSelectedPackage] = useState('10000');

  const { data: creditPackages } = useQuery<Record<string, any>>({
    queryKey: ['/api/credit-packages'],
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-dark-900 text-white">
        <AnimatedBackground />
        <Navigation isAuthenticated={false} />
        <div className="pt-24 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-20">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-400">Loading...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-900 text-white">
        <AnimatedBackground />
        <Navigation isAuthenticated={false} />
        <div className="pt-24 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-20">
              <h1 className="text-4xl font-bold mb-4 text-red-400">Access Denied</h1>
              <p className="text-gray-400 mb-8">You need to be logged in to access checkout.</p>
              <Button className="bg-purple-600 hover:bg-purple-700">
                Login to Continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!creditPackages) {
    return (
      <div className="min-h-screen bg-dark-900 text-white">
        <AnimatedBackground />
        <Navigation isAuthenticated={true} user={user} />
        <div className="pt-24 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-20">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-400">Loading credit packages...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const packageInfo = creditPackages[selectedPackage];

  return (
    <div className="min-h-screen bg-dark-900 text-white">
      <AnimatedBackground />
      <Navigation isAuthenticated={true} user={user} />
      
      <div className="pt-24 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-12">
            <Link href="/dashboard">
              <Button variant="ghost" className="mb-6 text-gray-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Purchase Credits
            </h1>
            <p className="text-xl text-gray-400">
              Add credits to your account to continue generating leads
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Package Selection */}
            <div>
              <h2 className="text-2xl font-bold mb-6 text-white">Select Credit Package</h2>
              <div className="space-y-4 mb-8">
                {Object.entries(creditPackages).map(([packageId, packageInfo]: [string, any]) => {
                  const savings = packageId === '5000' ? 0 : 
                                packageId === '10000' ? 5 :
                                packageId === '50000' ? 10 :
                                packageId === '100000' ? 15 :
                                packageId === '500000' ? 25 : 30;
                  
                  const tier = packageId === '5000' ? 'STARTER' :
                              packageId === '10000' ? 'BUSINESS' :
                              packageId === '50000' ? 'GROWTH' :
                              packageId === '100000' ? 'PRO' :
                              packageId === '500000' ? 'SCALE' : 'ENTERPRISE';

                  return (
                    <Card 
                      key={packageId}
                      className={`cursor-pointer transition-all duration-300 ${
                        selectedPackage === packageId 
                          ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/50' 
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                      onClick={() => setSelectedPackage(packageId)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-medium text-gray-400">{tier}</span>
                              {savings > 0 && (
                                <Badge className="bg-green-500 text-white text-xs">SAVE {savings}%</Badge>
                              )}
                            </div>
                            <div className="text-2xl font-bold text-white mb-1">
                              {packageInfo.credits.toLocaleString()} Credits
                            </div>
                            <div className="text-3xl font-bold text-blue-400">
                              ${packageInfo.price.toFixed(2)}
                            </div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 ${
                            selectedPackage === packageId 
                              ? 'bg-blue-500 border-blue-500' 
                              : 'border-gray-400'
                          }`}>
                            {selectedPackage === packageId && (
                              <CheckCircle className="w-6 h-6 text-white" />
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Payment Form */}
            <div>
              <h2 className="text-2xl font-bold mb-6 text-white">Complete Purchase</h2>
              <CheckoutForm selectedPackage={selectedPackage} packageInfo={packageInfo} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}