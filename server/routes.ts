import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./emailAuth";
import { sendOrderCompletedEmail, sendPasswordResetEmail, sendCreditsPurchaseEmail, sendNewOrderNotificationEmail, generatePasswordResetToken } from "./emailService";
import { hashPassword } from "./emailAuth";
import { insertCreditPurchaseSchema, insertOrderSchema } from "@shared/schema";
import { z } from "zod";

// Stripe initialization with development test keys or production keys
let stripe: Stripe | null = null;
const isDevelopment = process.env.NODE_ENV === 'development';

// Use test keys in development, production keys in production
const stripeSecretKey = isDevelopment 
  ? process.env.STRIPE_SECRET_TEST 
  : process.env.STRIPE_SECRET_KEY;

if (stripeSecretKey) {
  stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2025-07-30.basil",
  });
  console.log(`Stripe initialized in ${isDevelopment ? 'development' : 'production'} mode`);
}

// Credit packages configuration
const CREDIT_PACKAGES = {
  '5000': { credits: 5000, price: 10.00 },
  '10000': { credits: 10000, price: 19.00 },
  '50000': { credits: 50000, price: 90.00 },
  '100000': { credits: 100000, price: 170.00 },
  '500000': { credits: 500000, price: 750.00 },
  '1000000': { credits: 1000000, price: 1400.00 },
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // User route is handled by emailAuth.ts

  // Stripe checkout session route for popup payments
  app.post("/api/create-checkout-session", isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Payment processing not configured. Please contact support." });
      }
      
      const { packageId } = req.body;
      const userId = req.user.id;
      
      const packageInfo = CREDIT_PACKAGES[packageId as keyof typeof CREDIT_PACKAGES];
      if (!packageInfo) {
        return res.status(400).json({ message: "Invalid package" });
      }

      // Verify user exists before creating session
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }
      
      console.log(`Creating Stripe session for user ${userId} (${user.email})`);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `${packageInfo.credits.toLocaleString()} Lead Credits`,
                description: `Purchase ${packageInfo.credits.toLocaleString()} Apollo lead credits`,
              },
              unit_amount: Math.round(packageInfo.price * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${req.get('origin')}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${req.get('origin')}/checkout`,
        metadata: {
          userId,
          packageId,
          credits: packageInfo.credits.toString(),
        },
      });

      // Create pending credit purchase record
      await storage.createCreditPurchase({
        userId,
        amount: packageInfo.price.toString(),
        credits: packageInfo.credits,
        stripePaymentIntentId: session.id,
        status: "pending",
      });

      res.json({ sessionId: session.id, url: session.url });
      
      // Note: Credits will be added automatically via webhook when payment completes
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ message: "Error creating checkout session: " + error.message });
    }
  });

  // Manual credit addition endpoint (for development/admin use)
  app.post("/api/add-credits", isAuthenticated, async (req: any, res) => {
    try {
      const { credits } = req.body;
      const userId = req.user.id;
      
      if (!credits || credits <= 0) {
        return res.status(400).json({ message: "Invalid credit amount" });
      }
      
      const updatedUser = await storage.addCredits(userId, credits);
      res.json({ message: `Added ${credits} credits`, user: updatedUser });
    } catch (error: any) {
      console.error("Error adding credits:", error);
      res.status(500).json({ message: "Error adding credits: " + error.message });
    }
  });

  // Credit purchase routes (keeping for backwards compatibility)
  app.post("/api/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Payment processing not configured. Please contact support." });
      }
      
      const { packageId } = req.body;
      const userId = req.user.id;
      
      const packageInfo = CREDIT_PACKAGES[packageId as keyof typeof CREDIT_PACKAGES];
      if (!packageInfo) {
        return res.status(400).json({ message: "Invalid package" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(packageInfo.price * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId,
          packageId,
          credits: packageInfo.credits.toString(),
        },
      });

      // Create pending credit purchase record
      await storage.createCreditPurchase({
        userId,
        amount: packageInfo.price.toString(),
        credits: packageInfo.credits,
        stripePaymentIntentId: paymentIntent.id,
        status: "pending",
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Stripe webhook for payment confirmation
  app.post("/api/stripe-webhook", async (req, res) => {
    // Use test webhook secret in development, production webhook secret in production
    const webhookSecret = isDevelopment 
      ? process.env.WEBHOOK_TEST 
      : process.env.STRIPE_WEBHOOK_SECRET;
    
    console.log('Webhook received:', {
      headers: req.headers,
      hasStripe: !!stripe,
      hasWebhookSecret: !!webhookSecret,
      environment: isDevelopment ? 'development' : 'production',
      bodyType: typeof req.body,
      bodyLength: req.body?.length
    });

    if (!stripe) {
      return res.status(500).json({ message: "Payment processing not configured" });
    }
    
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig!, webhookSecret!);
      console.log('Webhook event verified:', event.type, event.id);
    } catch (err: any) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle Payment Intents (for inline payment forms)
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { userId, credits } = paymentIntent.metadata;

      console.log(`Processing payment_intent.succeeded for user ${userId}, adding ${credits} credits`);

      try {
        // Update purchase status
        await storage.updateCreditPurchaseStatus(paymentIntent.id, "completed");
        
        // Add credits to user account
        const updatedUser = await storage.addCredits(userId, parseInt(credits));
        console.log(`Successfully added ${credits} credits to user ${userId}. New balance: ${updatedUser.credits}`);
        
        // Send purchase confirmation email
        try {
          const amountPaid = (paymentIntent.amount || 0) / 100; // Convert from cents
          await sendCreditsPurchaseEmail(updatedUser.email, updatedUser.firstName, parseInt(credits), amountPaid);
        } catch (emailError) {
          console.error('Failed to send purchase confirmation email:', emailError);
          // Don't fail the entire operation if email fails
        }
      } catch (error) {
        console.error("Error processing payment intent success:", error);
      }
    }

    // Handle Checkout Sessions (for new window payments) - THIS IS WHAT YOU NEED
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (!session.metadata || !session.metadata.userId || !session.metadata.credits) {
        console.error('Missing metadata in checkout session:', session.id, session.metadata);
        res.json({ received: true });
        return;
      }
      
      const { userId, credits } = session.metadata;
      console.log(`Processing checkout.session.completed for user ${userId}, adding ${credits} credits`);

      try {
        // Check if user exists first
        const existingUser = await storage.getUser(userId);
        if (!existingUser) {
          console.error(`User ${userId} not found in database`);
          // Let's also check if there are any users in the database
          console.log(`Checking database connection and user count...`);
          res.json({ received: true });
          return;
        }
        
        console.log(`Found user: ${existingUser.email}, current credits: ${existingUser.credits}`);
        
        // Add credits to user account
        const updatedUser = await storage.addCredits(userId, parseInt(credits));
        console.log(`Successfully added ${credits} credits to user ${userId}. New balance: ${updatedUser.credits}`);
        
        // Create credit purchase record for this transaction
        let purchaseId = session.id;
        try {
          const purchase = await storage.createCreditPurchase({
            id: session.id,
            userId,
            amount: ((session.amount_total || 0) / 100).toString(),
            credits: parseInt(credits),
            status: 'completed'
          });
          purchaseId = purchase.id;
        } catch (purchaseError) {
          console.log('Credit purchase record may already exist, continuing...');
        }

        // Create affiliate commission if user was referred
        if (updatedUser.referredBy) {
          try {
            const amountPaid = (session.amount_total || 0) / 100;
            const commissionAmount = Math.round(amountPaid * 0.15 * 100) / 100; // 15% commission
            const currentDate = new Date();
            const paymentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
            
            await storage.createAffiliateCommission({
              affiliateUserId: updatedUser.referredBy,
              referredUserId: updatedUser.id,
              purchaseId: purchaseId,
              saleAmount: amountPaid.toString(),
              commissionAmount: commissionAmount.toString(),
              paymentMonth: paymentMonth,
              status: 'pending',
            });
            
            console.log(`Created affiliate commission: $${commissionAmount} for user ${updatedUser.referredBy}`);
          } catch (commissionError) {
            console.error('Failed to create affiliate commission:', commissionError);
          }
        }
        
        // Send purchase confirmation email
        try {
          const amountPaid = (session.amount_total || 0) / 100; // Convert from cents
          await sendCreditsPurchaseEmail(updatedUser.email, updatedUser.firstName, parseInt(credits), amountPaid);
        } catch (emailError) {
          console.error('Failed to send purchase confirmation email:', emailError);
          // Don't fail the entire operation if email fails
        }
      } catch (error) {
        console.error("Error processing checkout session completion:", error);
      }
    }

    res.json({ received: true });
  });

  // Order routes
  app.post("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const orderData = insertOrderSchema.parse({
        ...req.body,
        userId,
      });

      // Check if user has enough credits
      const user = await storage.getUser(userId);
      if (!user || (user.credits || 0) < orderData.creditsUsed) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // Deduct credits and create order
      await storage.deductCredits(userId, orderData.creditsUsed);
      const order = await storage.createOrder(orderData);

      // Send new order notification email to admin
      try {
        await sendNewOrderNotificationEmail({
          orderId: order.id,
          customerEmail: user.email,
          customerName: `${user.firstName} ${user.lastName}`.trim() || user.email,
          apolloUrl: orderData.apolloUrl,
          creditsUsed: orderData.creditsUsed
        });
      } catch (emailError) {
        console.error('Failed to send new order notification email:', emailError);
        // Don't fail the entire operation if email fails
      }

      res.json(order);
    } catch (error: any) {
      console.error("Error creating order:", error);
      res.status(500).json({ message: "Error creating order: " + error.message });
    }
  });

  app.get("/api/orders", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const orders = await storage.getUserOrders(userId);
      res.json(orders);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Error fetching orders: " + error.message });
    }
  });

  app.get("/api/orders/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const order = await storage.getOrderById(id);
      if (!order || order.userId !== userId) {
        return res.status(404).json({ message: "Order not found" });
      }

      res.json(order);
    } catch (error: any) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Error fetching order: " + error.message });
    }
  });

  // Team Dashboard Routes
  
  // Get all orders for team dashboard
  app.get("/api/team/orders", async (req, res) => {
    try {
      const allOrders = await storage.getAllOrders();
      res.json(allOrders);
    } catch (error: any) {
      console.error("Error fetching team orders:", error);
      res.status(500).json({ message: "Error fetching team orders: " + error.message });
    }
  });

  // Fulfill an order (team action)
  app.put("/api/team/orders/:orderId/fulfill", async (req, res) => {
    const { orderId } = req.params;
    const { deliveryType, csvUrl, notes } = req.body;

    if (!csvUrl) {
      return res.status(400).json({ message: "CSV URL is required" });
    }

    try {
      const updatedOrder = await storage.fulfillOrder(orderId, {
        deliveryType,
        csvUrl,
        notes,
        status: 'completed',
        completedAt: new Date(),
      });
      
      // Get user info to send completion email
      const user = await storage.getUser(updatedOrder.userId);
      if (user) {
        try {
          await sendOrderCompletedEmail(user.email, user.firstName, updatedOrder.creditsUsed);
        } catch (emailError) {
          console.error('Failed to send order completion email:', emailError);
          // Don't fail the entire operation if email fails
        }
      }
      
      res.json(updatedOrder);
    } catch (error: any) {
      console.error("Error fulfilling order:", error);
      res.status(500).json({ message: "Error fulfilling order: " + error.message });
    }
  });

  // Assign free credits to a user by email (team action)
  app.post("/api/team/assign-credits", async (req, res) => {
    try {
      const { email, credits } = req.body;
      
      if (!email || !credits || credits <= 0) {
        return res.status(400).json({ message: "Email and positive credit amount required" });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found with this email address" });
      }

      // Add credits to user account
      const updatedUser = await storage.addCredits(user.id, parseInt(credits));
      
      console.log(`Team assigned ${credits} free credits to user ${email}. New balance: ${updatedUser.credits}`);
      
      res.json({ 
        success: true, 
        message: `Successfully assigned ${credits} credits to ${email}`,
        newBalance: updatedUser.credits,
        userInfo: {
          name: `${user.firstName} ${user.lastName}`.trim(),
          email: user.email
        }
      });
    } catch (error: any) {
      console.error("Error assigning credits:", error);
      res.status(500).json({ message: "Error assigning credits: " + error.message });
    }
  });

  // Password reset routes
  
  // Request password reset
  app.post("/api/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return res.json({ message: "If an account with that email exists, we've sent a password reset link." });
      }

      const resetToken = generatePasswordResetToken();
      const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      await storage.setPasswordResetToken(email, resetToken, expires);
      
      try {
        await sendPasswordResetEmail(user.email, user.firstName, resetToken);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        return res.status(500).json({ message: "Failed to send password reset email" });
      }

      res.json({ message: "If an account with that email exists, we've sent a password reset link." });
    } catch (error: any) {
      console.error("Error in forgot password:", error);
      res.status(500).json({ message: "Error processing password reset request" });
    }
  });

  // Reset password with token
  app.post("/api/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
      }

      const user = await storage.getUserByPasswordResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      const hashedPassword = await hashPassword(newPassword);
      const updatedUser = await storage.resetPassword(token, hashedPassword);
      
      if (!updatedUser) {
        return res.status(400).json({ message: "Failed to reset password" });
      }

      res.json({ message: "Password has been reset successfully" });
    } catch (error: any) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Error resetting password" });
    }
  });

  // Get credit packages
  app.get("/api/credit-packages", async (req, res) => {
    res.json(CREDIT_PACKAGES);
  });

  // Credit purchases history route
  app.get("/api/credit-purchases", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const purchases = await storage.getUserCreditPurchases(userId);
      res.json(purchases);
    } catch (error: any) {
      console.error("Error fetching credit purchases:", error);
      res.status(500).json({ message: "Error fetching credit purchases: " + error.message });
    }
  });

  // Affiliate tracking route (public)
  app.get("/ref/:affiliateCode", async (req, res) => {
    try {
      const { affiliateCode } = req.params;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      const referrerUrl = req.get('Referer');

      // Track the click
      await storage.trackAffiliateClick(affiliateCode, ipAddress, userAgent, referrerUrl);

      // Store affiliate code in session for later use during registration
      if (req.session) {
        req.session.affiliateCode = affiliateCode;
      }

      // Redirect to landing page
      res.redirect('/');
    } catch (error: any) {
      console.error("Error tracking affiliate click:", error);
      res.redirect('/');
    }
  });

  // Affiliate API routes (authenticated)
  app.post("/api/affiliate/generate-code", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.generateAffiliateCode(userId);
      res.json({ affiliateCode: user.affiliateCode });
    } catch (error: any) {
      console.error("Error generating affiliate code:", error);
      res.status(500).json({ message: "Error generating affiliate code: " + error.message });
    }
  });

  app.post("/api/affiliate/update-paypal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { paypalEmail } = req.body;
      
      if (!paypalEmail) {
        return res.status(400).json({ message: "PayPal email is required" });
      }

      const user = await storage.updatePaypalEmail(userId, paypalEmail);
      res.json({ paypalEmail: user.paypalEmail });
    } catch (error: any) {
      console.error("Error updating PayPal email:", error);
      res.status(500).json({ message: "Error updating PayPal email: " + error.message });
    }
  });

  app.get("/api/affiliate/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const stats = await storage.getUserAffiliateStats(userId);
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching affiliate stats:", error);
      res.status(500).json({ message: "Error fetching affiliate stats: " + error.message });
    }
  });

  app.get("/api/affiliate/referred-users", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const referredUsers = await storage.getReferredUsers(userId);
      res.json(referredUsers);
    } catch (error: any) {
      console.error("Error fetching referred users:", error);
      res.status(500).json({ message: "Error fetching referred users: " + error.message });
    }
  });

  app.get("/api/affiliate/sales", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sales = await storage.getAffiliateSales(userId);
      res.json(sales);
    } catch (error: any) {
      console.error("Error fetching affiliate sales:", error);
      res.status(500).json({ message: "Error fetching affiliate sales: " + error.message });
    }
  });

  // Team affiliate admin routes
  app.post("/api/team/affiliate/auth", async (req, res) => {
    const { password } = req.body;
    
    if (password === "02392msdjew2i842llwqe!##29230") {
      if (req.session) {
        req.session.affiliateAdminAuth = true;
      }
      res.json({ success: true });
    } else {
      res.status(401).json({ message: "Invalid password" });
    }
  });

  app.get("/api/team/affiliate/pending-commissions", async (req, res) => {
    try {
      // Check if admin is authenticated
      if (!req.session?.affiliateAdminAuth) {
        return res.status(401).json({ message: "Affiliate admin authentication required" });
      }

      const pendingCommissions = await storage.getAllPendingCommissions();
      res.json(pendingCommissions);
    } catch (error: any) {
      console.error("Error fetching pending commissions:", error);
      res.status(500).json({ message: "Error fetching pending commissions: " + error.message });
    }
  });

  app.post("/api/team/affiliate/mark-paid", async (req, res) => {
    try {
      // Check if admin is authenticated
      if (!req.session?.affiliateAdminAuth) {
        return res.status(401).json({ message: "Affiliate admin authentication required" });
      }

      const { commissionIds, paymentMonth } = req.body;
      
      if (!commissionIds || !Array.isArray(commissionIds) || !paymentMonth) {
        return res.status(400).json({ message: "Commission IDs and payment month are required" });
      }

      await storage.markCommissionsPaid(commissionIds, paymentMonth);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error marking commissions as paid:", error);
      res.status(500).json({ message: "Error marking commissions as paid: " + error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
