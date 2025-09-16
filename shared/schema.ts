import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  decimal,
  text,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (for email/password auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey(),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name"),
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: varchar("email_verification_token"),
  passwordResetToken: varchar("password_reset_token"),
  passwordResetExpires: timestamp("password_reset_expires"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  credits: integer("credits").default(0),
  // Affiliate fields
  affiliateCode: varchar("affiliate_code").unique(),
  paypalEmail: varchar("paypal_email"),
  referredBy: varchar("referred_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Credit purchases table
export const creditPurchases = pgTable("credit_purchases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  credits: integer("credits").notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id"),
  status: varchar("status").default("pending"), // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
});

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  apolloUrl: text("apollo_url").notNull(),
  creditsUsed: integer("credits_used").notNull(),
  estimatedLeads: integer("estimated_leads"),
  deliveryEmail: varchar("delivery_email").notNull(),
  status: varchar("status").default("pending"), // pending, processing, completed, failed
  csvUrl: varchar("csv_url"),
  deliveryType: varchar("delivery_type"), // csv_file, google_sheets
  notes: text("notes"), // Team notes about the order
  assignedTo: varchar("assigned_to"), // Team member handling this order
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertCreditPurchase = typeof creditPurchases.$inferInsert;
export type CreditPurchase = typeof creditPurchases.$inferSelect;

export type InsertOrder = typeof orders.$inferInsert;
export type Order = typeof orders.$inferSelect;

export const insertCreditPurchaseSchema = createInsertSchema(creditPurchases).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

// Affiliate clicks tracking table
export const affiliateClicks = pgTable("affiliate_clicks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateCode: varchar("affiliate_code").references(() => users.affiliateCode).notNull(),
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  referrerUrl: text("referrer_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Affiliate commissions table
export const affiliateCommissions = pgTable("affiliate_commissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateUserId: varchar("affiliate_user_id").references(() => users.id).notNull(),
  referredUserId: varchar("referred_user_id").references(() => users.id).notNull(),
  purchaseId: varchar("purchase_id").references(() => creditPurchases.id).notNull(),
  saleAmount: decimal("sale_amount", { precision: 10, scale: 2 }).notNull(),
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 4 }).default("0.1500"), // 15%
  status: varchar("status").default("pending"), // pending, paid
  paymentMonth: varchar("payment_month"), // YYYY-MM format
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type InsertAffiliateClick = typeof affiliateClicks.$inferInsert;
export type AffiliateClick = typeof affiliateClicks.$inferSelect;

export type InsertAffiliateCommission = typeof affiliateCommissions.$inferInsert;
export type AffiliateCommission = typeof affiliateCommissions.$inferSelect;

export const insertAffiliateClickSchema = createInsertSchema(affiliateClicks).omit({
  id: true,
  createdAt: true,
});

export const insertAffiliateCommissionSchema = createInsertSchema(affiliateCommissions).omit({
  id: true,
  createdAt: true,
});
