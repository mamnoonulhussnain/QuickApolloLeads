import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { generateVerificationToken, sendVerificationEmail } from "./emailService";
import type { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      firstName: string;
      lastName: string | null;
      emailVerified: boolean | null;
      emailVerificationToken: string | null;
      stripeCustomerId: string | null;
      stripeSubscriptionId: string | null;
      credits: number | null;
      affiliateCode: string | null;
      paypalEmail: string | null;
      referredBy: string | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    }
  }
}

declare module "express-session" {
  interface SessionData {
    affiliateCode?: string;
    affiliateAdminAuth?: boolean;
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || 'dev-secret-key-12345',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: sessionTtl,
      sameSite: 'lax',
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: 'Invalid email or password' });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      done(null, false);
    }
  });

  // Register endpoint
  app.post('/api/register', async (req, res, next) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password || !firstName) {
        return res.status(400).json({ message: 'Email, password, and first name are required' });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }

      // Check for affiliate referral in session
      let referredBy: string | undefined = undefined;
      if (req.session?.affiliateCode) {
        try {
          // Find the user with this affiliate code
          const affiliateUser = await storage.getUserByAffiliateCode(req.session.affiliateCode);
          if (affiliateUser) {
            referredBy = affiliateUser.id;
            console.log(`User registered with affiliate code: ${req.session.affiliateCode} (referred by user ${referredBy})`);
          }
        } catch (error) {
          console.error('Error finding affiliate user:', error);
        }
      }

      // Hash password and create user with verification token
      const hashedPassword = await hashPassword(password);
      const verificationToken = generateVerificationToken();
      
      const user = await storage.createUser({
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email,
        password: hashedPassword,
        firstName,
        lastName: lastName || '',
        emailVerified: false,
        emailVerificationToken: verificationToken,
        credits: 0,
        referredBy,
      });

      // Send verification email (non-blocking - don't fail registration if email fails)
      try {
        await sendVerificationEmail(email, firstName, verificationToken);
        console.log(`✅ Verification email sent to ${email}`);
      } catch (emailError) {
        console.error('Failed to send verification email, but registration succeeded:', emailError);
        // Don't fail the registration if email fails
      }

      res.status(201).json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        credits: user.credits,
        message: 'Registration successful! Please check your email to verify your account.',
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  // Login endpoint
  app.post('/api/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || 'Login failed' });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        res.json({
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          emailVerified: user.emailVerified,
          credits: user.credits,
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post('/api/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Get current user
  app.get('/api/user', isAuthenticated, async (req, res) => {
    try {
      const sessionUser = req.user as User;
      // Fetch fresh user data from database to get latest affiliate code and other updates
      const user = await storage.getUser(sessionUser.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Prevent caching with multiple headers and ETag removal
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.removeHeader('ETag');
      res.removeHeader('Last-Modified');
      
      // Add timestamp to break any caching
      const responseData = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        credits: user.credits,
        affiliateCode: user.affiliateCode,
        paypalEmail: user.paypalEmail,
        _timestamp: Date.now(), // Add timestamp to ensure response is always different
      };
      
      console.log(`User API called for ${user.email}, affiliateCode: ${user.affiliateCode || 'none'}`);
      res.json(responseData);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Email verification route
  app.get('/verify-email', async (req, res) => {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>Invalid Verification Link</h2>
              <p>The verification link is invalid or missing.</p>
              <a href="/">Return to Homepage</a>
            </body>
          </html>
        `);
      }

      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>Invalid or Expired Token</h2>
              <p>The verification token is invalid or has expired.</p>
              <a href="/">Return to Homepage</a>
            </body>
          </html>
        `);
      }

      if (user.emailVerified) {
        return res.send(`
          <html>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2>Email Already Verified</h2>
              <p>Your email has already been verified!</p>
              <a href="/auth" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Sign In</a>
            </body>
          </html>
        `);
      }

      // Verify the email
      await storage.verifyUserEmail(user.id);

      res.send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>Email Verified Successfully!</h2>
            <p>Welcome to QuickApolloLeads, ${user.firstName}! Your account is now active.</p>
            <a href="/auth" style="background: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Sign In to Dashboard</a>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h2>Verification Error</h2>
            <p>An error occurred during verification. Please try again later.</p>
            <a href="/">Return to Homepage</a>
          </body>
        </html>
      `);
    }
  });

  // Resend verification email route
  app.post('/api/resend-verification', isAuthenticated, async (req, res) => {
    try {
      const user = req.user as User;
      
      if (user.emailVerified) {
        return res.status(400).json({ message: 'Email is already verified' });
      }

      // Generate new verification token
      const verificationToken = generateVerificationToken();
      
      // Update user with new token
      const { eq } = await import('drizzle-orm');
      const { db } = await import('./db');
      const { users } = await import('@shared/schema');
      
      await db
        .update(users)
        .set({ emailVerificationToken: verificationToken })
        .where(eq(users.id, user.id));

      // Send verification email
      await sendVerificationEmail(user.email, user.firstName, verificationToken);

      res.json({ message: 'Verification email sent successfully' });
    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({ message: 'Failed to send verification email' });
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};