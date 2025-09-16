import nodemailer from 'nodemailer';
import { randomBytes } from 'crypto';

export function generateVerificationToken(): string {
  return randomBytes(32).toString('hex');
}

export function generatePasswordResetToken(): string {
  return randomBytes(32).toString('hex');
}

// Create email transporter based on environment variables
function createEmailTransporter() {
  // Check for different email service configurations
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Custom SMTP configuration
    const port = parseInt(process.env.SMTP_PORT || '587');
    const secure = process.env.SMTP_SECURE === 'true';
    
    // Special handling for PostMark SMTP
    if (process.env.SMTP_HOST?.includes('postmarkapp.com')) {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: 587,
        secure: false, // PostMark uses STARTTLS on port 587
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          ciphers: 'SSLv3'
        }
      });
    }
    
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: port,
      secure: secure, // true for 465, false for other ports
      requireTLS: !secure, // Use STARTTLS if not using SSL
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false // Accept self-signed certificates
      }
    });
  } else if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    // Gmail configuration
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return null;
}

// Helper function to get the correct base URL for email links
function getBaseUrl(): string {
  // In production, use the custom domain
  if (process.env.NODE_ENV === 'production') {
    return 'https://quickapolloleads.com';
  }
  
  // In development, use the actual Replit domain from environment
  if (process.env.REPLIT_DOMAINS) {
    return `https://${process.env.REPLIT_DOMAINS}`;
  }
  
  // Fallback for development
  return 'https://quickapolloleads.app.replit.com';
}

export async function sendVerificationEmail(email: string, firstName: string, token: string): Promise<void> {
  const baseUrl = getBaseUrl();
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
  const transporter = createEmailTransporter();
  
  if (!transporter) {
    // Development mode - log to console
    console.log('\n=== EMAIL VERIFICATION (DEV MODE) ===');
    console.log(`To: ${email}`);
    console.log(`Subject: Verify your QuickApolloLeads account`);
    console.log(`\nHi ${firstName},`);
    console.log(``);
    console.log(`Thanks for signing up with QuickApolloLeads!`);
    console.log(``);
    console.log(`Please verify your email address to unlock your dashboard.`);
    console.log(``);
    console.log(`${verificationUrl}`);
    console.log(``);
    console.log(`If you didn't create this account, you can safely ignore this email.`);
    console.log(``);
    console.log(`— QuickApolloLeads Team`);
    console.log('\n📧 To send real emails, configure email environment variables in Secrets');
    console.log('===================================\n');
    return;
  }

  // Plain text email content - one sentence per line with blank lines between
  const emailContent = `Hi ${firstName},

Thanks for signing up with QuickApolloLeads!

Please verify your email address to unlock your dashboard.

${verificationUrl}

If you didn't create this account, you can safely ignore this email.

— QuickApolloLeads Team`;

  try {
    const result = await transporter.sendMail({
      from: 'notifications@quickapolloleads.com',
      to: email,
      subject: 'Verify your QuickApolloLeads account',
      text: emailContent,
      headers: {
        'X-PM-Message-Stream': 'outbound'
      }
    });
    console.log(`✅ Verification email sent to ${email}`);
    console.log(`📧 PostMark Message ID: ${result.messageId}`);
    console.log(`📧 Response: ${result.response}`);
  } catch (error) {
    console.error('Failed to send verification email:', error);
    // Don't throw error - let registration continue even if email fails
    console.log('Email sending failed, but registration will continue');
  }
}



export async function sendOrderCompletedEmail(email: string, firstName: string, creditsUsed: number): Promise<void> {
  const transporter = createEmailTransporter();
  
  if (!transporter) {
    console.log('\n=== ORDER COMPLETED EMAIL (DEV MODE) ===');
    console.log(`To: ${email}`);
    console.log(`Subject: Your QuickApolloLeads order is completed`);
    console.log(`\nHi ${firstName},\n`);
    console.log(`Your order for ${creditsUsed} leads has been successfully processed.\n`);
    console.log(`You can now log in to your QuickApolloLeads portal to download your lead list.\n`);
    console.log(`— QuickApolloLeads Team`);
    console.log('===========================================\n');
    return;
  }

  // Plain text email content
  const emailContent = `Hi ${firstName},

Your order for ${creditsUsed} leads has been successfully processed.

You can now log in to your QuickApolloLeads portal to download your lead list.

— QuickApolloLeads Team`;

  try {
    const result = await transporter.sendMail({
      from: 'notifications@quickapolloleads.com',
      to: email,
      subject: 'Your QuickApolloLeads order is completed',
      text: emailContent,
      headers: {
        'X-PM-Message-Stream': 'outbound'
      }
    });
    console.log(`✅ Order completion email sent to ${email}`);
    console.log(`📧 PostMark Message ID: ${result.messageId}`);
    console.log(`📧 Response: ${result.response}`);
  } catch (error) {
    console.error('Failed to send order completion email:', error);
    throw new Error('Failed to send order completion email');
  }
}

export async function sendPasswordResetEmail(email: string, firstName: string, resetToken: string, expiryMinutes: number = 30): Promise<void> {
  const transporter = createEmailTransporter();
  const baseUrl = getBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  const expiryTime = `${expiryMinutes} minutes`;
  
  if (!transporter) {
    console.log('\n=== PASSWORD RESET EMAIL (DEV MODE) ===');
    console.log(`To: ${email}`);
    console.log(`Subject: Reset your QuickApolloLeads password`);
    console.log(`Hi ${firstName},`);
    console.log(``);
    console.log(`We received a request to reset your QuickApolloLeads password.`);
    console.log(``);
    console.log(`Reset My Password: ${resetUrl}`);
    console.log(``);
    console.log(`This link will expire in ${expiryTime} for your security.`);
    console.log(``);
    console.log(`If you didn't request a password reset, you can safely ignore this email.`);
    console.log(``);
    console.log(`— QuickApolloLeads Team`);
    console.log('=============================================\n');
    return;
  }

  // Plain text email content with proper line breaks
  const emailContent = `Hi ${firstName},

We received a request to reset your QuickApolloLeads password.

Reset your password by clicking this link: ${resetUrl}

This link will expire in ${expiryTime} for your security.

If you didn't request a password reset, you can safely ignore this email.

— QuickApolloLeads Team`;

  try {
    const result = await transporter.sendMail({
      from: 'notifications@quickapolloleads.com',
      to: email,
      subject: 'Reset your QuickApolloLeads password',
      text: emailContent,
      headers: {
        'X-PM-Message-Stream': 'outbound'
      }
    });
    console.log(`✅ Password reset email sent to ${email}`);
    console.log(`📧 PostMark Message ID: ${result.messageId}`);
    console.log(`📧 Response: ${result.response}`);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}

export async function sendCreditsPurchaseEmail(email: string, firstName: string, creditsPurchased: number, amountPaid: number): Promise<void> {
  const transporter = createEmailTransporter();
  
  if (!transporter) {
    console.log('\n=== CREDITS PURCHASE EMAIL (DEV MODE) ===');
    console.log(`To: ${email}`);
    console.log(`Subject: Your QuickApolloLeads credit purchase is confirmed`);
    console.log(`Hi ${firstName},`);
    console.log(``);
    console.log(`Thank you for your purchase!`);
    console.log(``);
    console.log(`${creditsPurchased} credits have been added to your account.`);
    console.log(``);
    console.log(`Amount paid: $${amountPaid.toFixed(2)}`);
    console.log(``);
    console.log(`You can now log in and start using your credits right away.`);
    console.log(``);
    console.log(`— QuickApolloLeads Team`);
    console.log('===============================================\n');
    return;
  }

  // Plain text email content with proper spacing
  const emailContent = `Hi ${firstName},

Thank you for your purchase! 

${creditsPurchased} credits have been added to your account.

Amount paid: $${amountPaid.toFixed(2)}

You can now log in and start using your credits right away.

— QuickApolloLeads Team`;

  try {
    const result = await transporter.sendMail({
      from: 'notifications@quickapolloleads.com',
      to: email,
      subject: 'Your QuickApolloLeads credit purchase is confirmed',
      text: emailContent,
      headers: {
        'X-PM-Message-Stream': 'outbound'
      }
    });
    console.log(`✅ Credit purchase confirmation email sent to ${email}`);
    console.log(`📧 PostMark Message ID: ${result.messageId}`);
    console.log(`📧 Response: ${result.response}`);
  } catch (error) {
    console.error('Failed to send credit purchase confirmation email:', error);
    throw new Error('Failed to send credit purchase confirmation email');
  }
}

export async function sendNewOrderNotificationEmail(orderDetails: {
  orderId: string;
  customerEmail: string;
  customerName: string;
  apolloUrl: string;
  creditsUsed: number;
}): Promise<void> {
  const transporter = createEmailTransporter();
  
  const adminEmail = 'mamnoon@buyapolloleads.com';
  
  if (!transporter) {
    console.log('\n=== NEW ORDER NOTIFICATION EMAIL (DEV MODE) ===');
    console.log(`To: ${adminEmail}`);
    console.log(`Subject: New order received - ${orderDetails.orderId}`);
    console.log(`A new order has been placed:`);
    console.log(``);
    console.log(`Order ID: ${orderDetails.orderId}`);
    console.log(`Customer: ${orderDetails.customerName} (${orderDetails.customerEmail})`);
    console.log(`Apollo URL: ${orderDetails.apolloUrl}`);
    console.log(`Credits Used: ${orderDetails.creditsUsed}`);
    console.log(``);
    console.log(`Please process this order in the team dashboard.`);
    console.log('=======================================================\n');
    return;
  }

  const emailContent = `A new order has been placed:

Order ID: ${orderDetails.orderId}

Customer: ${orderDetails.customerName} (${orderDetails.customerEmail})

Apollo URL: ${orderDetails.apolloUrl}

Credits Used: ${orderDetails.creditsUsed}

Please process this order in the team dashboard.`;

  try {
    const result = await transporter.sendMail({
      from: 'notifications@quickapolloleads.com',
      to: adminEmail,
      subject: `New order received - ${orderDetails.orderId}`,
      text: emailContent,
      headers: {
        'X-PM-Message-Stream': 'outbound'
      }
    });
    console.log(`✅ New order notification email sent to ${adminEmail}`);
    console.log(`📧 PostMark Message ID: ${result.messageId}`);
    console.log(`📧 Response: ${result.response}`);
  } catch (error) {
    console.error('Failed to send new order notification email:', error);
    throw new Error('Failed to send new order notification email');
  }
}

