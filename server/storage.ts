import {
  users,
  creditPurchases,
  orders,
  affiliateClicks,
  affiliateCommissions,
  type User,
  type UpsertUser,
  type InsertCreditPurchase,
  type CreditPurchase,
  type InsertOrder,
  type Order,
  type InsertAffiliateClick,
  type AffiliateClick,
  type InsertAffiliateCommission,
  type AffiliateCommission,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (email/password auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByAffiliateCode(affiliateCode: string): Promise<User | undefined>;
  getUserByVerificationToken(token: string): Promise<User | undefined>;
  getUserByPasswordResetToken(token: string): Promise<User | undefined>;
  createUser(user: UpsertUser): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  verifyUserEmail(userId: string): Promise<User>;
  setPasswordResetToken(email: string, token: string, expires: Date): Promise<User | null>;
  resetPassword(token: string, newPassword: string): Promise<User | null>;
  updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User>;
  
  // Credit operations
  addCredits(userId: string, credits: number): Promise<User>;
  deductCredits(userId: string, credits: number): Promise<User>;
  createCreditPurchase(purchase: InsertCreditPurchase): Promise<CreditPurchase>;
  updateCreditPurchaseStatus(id: string, status: string): Promise<CreditPurchase>;
  
  // Order operations
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string, csvUrl?: string, errorMessage?: string): Promise<Order>;
  getUserOrders(userId: string): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;
  fulfillOrder(id: string, fulfillmentData: { deliveryType?: string; csvUrl: string; notes?: string; status: string; completedAt: Date }): Promise<Order>;
  
  // Affiliate operations
  generateAffiliateCode(userId: string): Promise<User>;
  updatePaypalEmail(userId: string, paypalEmail: string): Promise<User>;
  trackAffiliateClick(affiliateCode: string, ipAddress?: string, userAgent?: string, referrerUrl?: string): Promise<AffiliateClick>;
  createAffiliateCommission(commission: InsertAffiliateCommission): Promise<AffiliateCommission>;
  getUserAffiliateStats(userId: string): Promise<{
    totalClicks: number;
    totalReferrals: number;
    totalSales: number;
    totalCommissions: number;
    pendingCommissions: number;
    monthlyCommissions: { month: string; amount: number; status: string }[];
  }>;
  getReferredUsers(affiliateUserId: string): Promise<{ firstName: string; createdAt: Date }[]>;
  getAllPendingCommissions(): Promise<Array<AffiliateCommission & { affiliate: User; referred: User }>>;
  markCommissionsPaid(commissionIds: string[], paymentMonth: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByAffiliateCode(affiliateCode: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.affiliateCode, affiliateCode));
    return user;
  }

  async getUserByVerificationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.emailVerificationToken, token));
    return user;
  }

  async getUserByPasswordResetToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(
      and(
        eq(users.passwordResetToken, token),
        sql`${users.passwordResetExpires} > NOW()`
      )
    );
    return user;
  }

  async createUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async verifyUserEmail(userId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async setPasswordResetToken(email: string, token: string, expires: Date): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({
        passwordResetToken: token,
        passwordResetExpires: expires,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email))
      .returning();
    return user || null;
  }

  async resetPassword(token: string, newPassword: string): Promise<User | null> {
    const [user] = await db
      .update(users)
      .set({
        password: newPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(users.passwordResetToken, token),
          sql`${users.passwordResetExpires} > NOW()`
        )
      )
      .returning();
    return user || null;
  }

  async updateUserStripeInfo(userId: string, stripeCustomerId: string, stripeSubscriptionId?: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        stripeCustomerId,
        stripeSubscriptionId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Credit operations
  async addCredits(userId: string, credits: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        credits: sql`${users.credits} + ${credits}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deductCredits(userId: string, credits: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        credits: sql`${users.credits} - ${credits}`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createCreditPurchase(purchase: InsertCreditPurchase): Promise<CreditPurchase> {
    const [creditPurchase] = await db
      .insert(creditPurchases)
      .values(purchase)
      .returning();
    return creditPurchase;
  }

  async updateCreditPurchaseStatus(id: string, status: string): Promise<CreditPurchase> {
    const [purchase] = await db
      .update(creditPurchases)
      .set({ status })
      .where(eq(creditPurchases.id, id))
      .returning();
    return purchase;
  }

  // Order operations
  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db
      .insert(orders)
      .values(order)
      .returning();
    return newOrder;
  }

  async updateOrderStatus(id: string, status: string, csvUrl?: string, errorMessage?: string): Promise<Order> {
    const updateData: any = { status };
    if (csvUrl) updateData.csvUrl = csvUrl;
    if (errorMessage) updateData.errorMessage = errorMessage;
    if (status === 'completed') updateData.completedAt = new Date();

    const [order] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id));
    return order;
  }

  async getAllOrders(): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt));
  }

  async fulfillOrder(id: string, fulfillmentData: { deliveryType?: string; csvUrl: string; notes?: string; status: string; completedAt: Date }): Promise<Order> {
    const [order] = await db
      .update(orders)
      .set({
        csvUrl: fulfillmentData.csvUrl,
        deliveryType: fulfillmentData.deliveryType,
        notes: fulfillmentData.notes,
        status: fulfillmentData.status,
        completedAt: fulfillmentData.completedAt,
      })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  // Affiliate operations
  async generateAffiliateCode(userId: string): Promise<User> {
    // Generate a unique affiliate code (6-8 characters)
    const affiliateCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const [user] = await db
      .update(users)
      .set({
        affiliateCode,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updatePaypalEmail(userId: string, paypalEmail: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        paypalEmail,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async trackAffiliateClick(affiliateCode: string, ipAddress?: string, userAgent?: string, referrerUrl?: string): Promise<AffiliateClick> {
    const [click] = await db
      .insert(affiliateClicks)
      .values({
        affiliateCode,
        ipAddress,
        userAgent,
        referrerUrl,
      })
      .returning();
    return click;
  }

  async createAffiliateCommission(commission: InsertAffiliateCommission): Promise<AffiliateCommission> {
    const [newCommission] = await db
      .insert(affiliateCommissions)
      .values(commission)
      .returning();
    return newCommission;
  }

  async getUserAffiliateStats(userId: string): Promise<{
    totalClicks: number;
    totalReferrals: number;
    totalSales: number;
    totalCommissions: number;
    pendingCommissions: number;
    monthlyCommissions: { month: string; amount: number; status: string }[];
  }> {
    // Get user's affiliate code
    const user = await this.getUser(userId);
    if (!user?.affiliateCode) {
      return {
        totalClicks: 0,
        totalReferrals: 0,
        totalSales: 0,
        totalCommissions: 0,
        pendingCommissions: 0,
        monthlyCommissions: [],
      };
    }

    // Get total clicks
    const [clicksResult] = await db
      .select({ count: sql`COUNT(*)` })
      .from(affiliateClicks)
      .where(eq(affiliateClicks.affiliateCode, user.affiliateCode));

    // Get total referrals
    const [referralsResult] = await db
      .select({ count: sql`COUNT(*)` })
      .from(users)
      .where(eq(users.referredBy, userId));

    // Get commission stats
    const [commissionsResult] = await db
      .select({
        totalCommissions: sql`COALESCE(SUM(${affiliateCommissions.commissionAmount}), 0)`,
        pendingCommissions: sql`COALESCE(SUM(CASE WHEN ${affiliateCommissions.status} = 'pending' THEN ${affiliateCommissions.commissionAmount} ELSE 0 END), 0)`,
        totalSales: sql`COALESCE(SUM(${affiliateCommissions.saleAmount}), 0)`,
      })
      .from(affiliateCommissions)
      .where(eq(affiliateCommissions.affiliateUserId, userId));

    // Get monthly commissions
    const monthlyCommissions = await db
      .select({
        month: affiliateCommissions.paymentMonth,
        amount: sql`SUM(${affiliateCommissions.commissionAmount})`,
        status: affiliateCommissions.status,
      })
      .from(affiliateCommissions)
      .where(eq(affiliateCommissions.affiliateUserId, userId))
      .groupBy(affiliateCommissions.paymentMonth, affiliateCommissions.status)
      .orderBy(desc(affiliateCommissions.paymentMonth));

    return {
      totalClicks: Number(clicksResult?.count || 0),
      totalReferrals: Number(referralsResult?.count || 0),
      totalSales: Number(commissionsResult?.totalSales || 0),
      totalCommissions: Number(commissionsResult?.totalCommissions || 0),
      pendingCommissions: Number(commissionsResult?.pendingCommissions || 0),
      monthlyCommissions: monthlyCommissions.map(m => ({
        month: m.month || '',
        amount: Number(m.amount || 0),
        status: m.status || 'pending',
      })),
    };
  }

  async getReferredUsers(affiliateUserId: string): Promise<{ firstName: string; createdAt: Date }[]> {
    const referredUsers = await db
      .select({
        firstName: users.firstName,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.referredBy, affiliateUserId))
      .orderBy(desc(users.createdAt));

    return referredUsers.map(user => ({
      firstName: user.firstName,
      createdAt: user.createdAt || new Date(),
    }));
  }

  async getAffiliateSales(userId: string): Promise<Array<{
    id: string;
    saleAmount: string;
    commissionAmount: string;
    status: string;
    createdAt: Date | null;
    referredUserName: string;
    purchaseId: string;
  }>> {
    const sales = await db
      .select({
        id: affiliateCommissions.id,
        saleAmount: affiliateCommissions.saleAmount,
        commissionAmount: affiliateCommissions.commissionAmount,
        status: affiliateCommissions.status,
        createdAt: affiliateCommissions.createdAt,
        purchaseId: affiliateCommissions.purchaseId,
        referredUserId: affiliateCommissions.referredUserId,
      })
      .from(affiliateCommissions)
      .where(eq(affiliateCommissions.affiliateUserId, userId))
      .orderBy(desc(affiliateCommissions.createdAt));

    // Get referred user names
    const salesWithNames = [];
    for (const sale of sales) {
      const referredUser = await this.getUser(sale.referredUserId);
      salesWithNames.push({
        ...sale,
        referredUserName: referredUser?.firstName || 'Unknown',
      });
    }

    return salesWithNames;
  }

  async getUserCreditPurchases(userId: string): Promise<CreditPurchase[]> {
    const purchases = await db
      .select()
      .from(creditPurchases)
      .where(eq(creditPurchases.userId, userId))
      .orderBy(desc(creditPurchases.createdAt));

    return purchases;
  }

  async getAllPendingCommissions(): Promise<Array<AffiliateCommission & { affiliate: User; referred: User }>> {
    const pendingCommissions = await db
      .select({
        commission: affiliateCommissions,
        affiliate: users,
      })
      .from(affiliateCommissions)
      .leftJoin(users, eq(affiliateCommissions.affiliateUserId, users.id))
      .where(eq(affiliateCommissions.status, 'pending'))
      .orderBy(desc(affiliateCommissions.createdAt));

    const results = [];
    for (const item of pendingCommissions) {
      if (item.commission.referredUserId) {
        const referredUser = await this.getUser(item.commission.referredUserId);
        if (referredUser && item.affiliate) {
          results.push({
            ...item.commission,
            affiliate: item.affiliate,
            referred: referredUser,
          });
        }
      }
    }

    return results;
  }

  async markCommissionsPaid(commissionIds: string[], paymentMonth: string): Promise<void> {
    await db
      .update(affiliateCommissions)
      .set({
        status: 'paid',
        paymentMonth,
        paidAt: new Date(),
      })
      .where(inArray(affiliateCommissions.id, commissionIds));
  }
}

export const storage = new DatabaseStorage();
