import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { Navigation } from '@/components/ui/navigation';
import { PricingCard } from '@/components/ui/pricing-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Zap, DollarSign, Repeat, Star } from 'lucide-react';
import logoPath from '@assets/buyapolloleadsfavicon_1755799627906.png';

export default function Landing() {
  const [, setLocation] = useLocation();

  // Set page title
  useEffect(() => {
    document.title = 'QuickApolloLeads';
  }, []);

  const { data: creditPackages } = useQuery<Record<string, any>>({
    queryKey: ['/api/credit-packages'],
  });

  const handleGetStarted = (mode: 'login' | 'register') => {
    setLocation('/auth');
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-dark-900 text-white overflow-x-hidden">
      <AnimatedBackground />
      
      <Navigation 
        onLogin={() => setLocation('/auth')}
        onRegister={() => setLocation('/auth')}
      />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="animate-fade-in">
            {/* Apollo Logo */}
            <div className="flex justify-center mb-8">
              <img src={logoPath} alt="QuickApolloLeads Logo" className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-2xl" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
              <span className="bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                Unlock Premium
              </span>
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Apollo Leads
              </span>
              <br />
              <span className="text-white">in Minutes</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
              Skip the export limits—get laser-targeted leads delivered straight to your inbox with our credit-based system
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Button 
                size="lg"
                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600 rounded-xl text-lg font-semibold shadow-lg shadow-purple-500/25 transform hover:scale-105 transition-all duration-300"
                onClick={() => scrollToSection('pricing')}
              >
                🚀 Order Leads Now
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="px-8 py-4 bg-white/10 backdrop-blur-sm border-white/20 rounded-xl text-lg font-semibold hover:bg-white/20 transition-all duration-300"
                onClick={() => handleGetStarted('register')}
              >
                📊 View Dashboard
              </Button>
            </div>
          </div>

          {/* Floating Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-slide-up">
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-300 animate-float">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">5M+</div>
                <div className="text-gray-300">Leads Delivered</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-300 animate-float-delayed">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">24/7</div>
                <div className="text-gray-300">Instant Delivery</div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-xl border-white/10 hover:bg-white/10 transition-all duration-300 animate-float-delayed-2">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">99%</div>
                <div className="text-gray-300">Verified Emails</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Why Choose Our Platform?
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Apollo limits you to 25 contacts at a time and caps at 10K per month. We leverage dedicated partnerships for bulk exports at wholesale pricing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">⚡ Faster</h3>
                <p className="text-gray-400 leading-relaxed">One link → bulk export. No more manual work or time-consuming processes.</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mb-6">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">💰 Cheaper</h3>
                <p className="text-gray-400 leading-relaxed">From just $10 per 5K verified emails with our credit system and bulk discounts.</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10 hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mb-6">
                  <Repeat className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-white">🔄 Flexible</h3>
                <p className="text-gray-400 leading-relaxed">Credit packages from 5K up to 1M contacts. Scale as you grow.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Credit Packages Pricing */}
      <section id="pricing" className="py-20 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Credit Packages
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Choose the perfect credit package for your lead generation needs. Higher packages include bigger savings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
            {creditPackages && Object.entries(creditPackages).map(([packageId, packageInfo]: [string, any]) => {
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
                <PricingCard
                  key={packageId}
                  packageId={packageId}
                  tier={tier}
                  credits={packageInfo.credits}
                  price={packageInfo.price}
                  savings={savings}
                  onSelect={() => handleGetStarted('register')}
                />
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              How It Works
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Simple 3-step process to get your Apollo leads delivered instantly
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl font-bold text-white">1</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Buy Credits</h3>
              <p className="text-gray-400 leading-relaxed">Choose a credit package that fits your campaign needs and budget</p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl font-bold text-white">2</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Paste Apollo URL</h3>
              <p className="text-gray-400 leading-relaxed">Provide your filtered Apollo search URL - we'll guide you through it</p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-blue-500 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl font-bold text-white">3</span>
              </div>
              <h3 className="text-2xl font-bold mb-4 text-white">Get Your CSV</h3>
              <p className="text-gray-400 leading-relaxed">Receive your verified leads via email within minutes</p>
            </div>
          </div>

          {/* Apollo URL Guide */}
          <Card className="mt-16 bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold mb-6 text-center text-white">📚 Need help getting your Apollo URL?</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  {[
                    { step: 1, title: "Sign in to Apollo", desc: "Use your business email for better results" },
                    { step: 2, title: "Click \"People\" menu", desc: "Find it in the top-left navigation" },
                    { step: 3, title: "Get Professional Trial", desc: "14-day free trial unlocks all filters" },
                    { step: 4, title: "Apply Your Filters", desc: "Industry, role, location, company size, etc." }
                  ].map((item) => (
                    <div key={item.step} className="flex items-start space-x-4">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white font-bold text-sm">{item.step}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                        <p className="text-gray-400 text-sm">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  {[
                    { step: 5, title: "Select \"Verified\" Emails", desc: "Only tick \"Verified\" in Email Status filter" },
                    { step: 6, title: "Wait for Results", desc: "Let Apollo load your filtered results" },
                    { step: 7, title: "Copy the Full URL", desc: "Copy entire page URL from your browser" }
                  ].map((item) => (
                    <div key={item.step} className="flex items-start space-x-4">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-white font-bold text-sm">{item.step}</span>
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">{item.title}</h4>
                        <p className="text-gray-400 text-sm">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              What Our Clients Say
            </h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Join thousands of satisfied customers who trust us with their lead generation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Alex J.",
                role: "Growth Marketer",
                review: "We received 50K verified leads in less than 24 hours—at 1/5th the cost of Apollo's own plan. Game changer for our sales team.",
                image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100"
              },
              {
                name: "Sarah M.",
                role: "Sales Director",
                review: "The credit system is brilliant. We can scale up and down based on our campaigns. Quality leads every time.",
                image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100&q=80"
              },
              {
                name: "Mike R.",
                role: "CEO, TechStart",
                review: "Finally, a service that delivers what it promises. Fast, reliable, and incredibly cost-effective.",
                image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=100&h=100"
              }
            ].map((testimonial, index) => (
              <Card key={index} className="bg-gradient-to-br from-white/5 to-white/1 backdrop-blur-xl border-white/10">
                <CardContent className="p-8">
                  <div className="flex items-center mb-6">
                    <div className="flex text-yellow-400">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-current" />
                      ))}
                    </div>
                  </div>
                  <blockquote className="text-gray-300 leading-relaxed mb-6">
                    "{testimonial.review}"
                  </blockquote>
                  <div className="flex items-center">
                    <img 
                      src={testimonial.image} 
                      alt={testimonial.name}
                      className="w-12 h-12 rounded-full mr-4 object-cover"
                    />
                    <div>
                      <div className="font-semibold text-white">{testimonial.name}</div>
                      <div className="text-gray-400 text-sm">{testimonial.role}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 bg-dark-800 border-t border-white/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <div className="flex items-center space-x-2 mb-6 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">QuickApolloLeads</span>
            </div>
            
            <div className="text-gray-400">
              <div className="text-sm mb-2">24 Market St, Suite 500, San Francisco, CA 94103, USA</div>
              <div className="text-sm mb-1">WhatsApp: <span className="text-blue-400">+1 646 269 7026</span></div>
              <div className="text-sm">Support: <span className="text-blue-400">support@quickapolloleads.com</span></div>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm mb-4 md:mb-0">
                © 2025 QuickApolloLeads. All rights reserved.
              </p>
              <div className="flex space-x-6">
                <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</a>
                <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</a>
                <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Support</a>
              </div>
            </div>
          </div>
        </div>
      </footer>


    </div>
  );
}
