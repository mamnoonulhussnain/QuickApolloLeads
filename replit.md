# QuickApolloLeads

## Overview

QuickApolloLeads is a full-stack web application that allows users to purchase Apollo lead credits and place orders for bulk lead exports. The platform solves Apollo's export limitations (25 contacts at a time, 10K monthly cap) by offering wholesale pricing on bulk lead packages ranging from 5K to 1M contacts. Users can authenticate via email/password, purchase credit packages through Stripe, and submit orders with Apollo URLs for lead extraction.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The client is built with **React 18** and **TypeScript**, using **Vite** as the build tool. The UI is implemented with **shadcn/ui components** built on top of **Radix UI primitives** for accessibility and **Tailwind CSS** for styling. State management is handled through **React Query (TanStack Query)** for server state and standard React hooks for local state. The application uses **Wouter** for client-side routing and includes a dark theme design with animated gradients and backgrounds.

### Backend Architecture
The server runs on **Express.js** with **TypeScript** in an ESM environment. The architecture follows a layered pattern with route handlers, storage abstraction, and database access layers. The codebase is organized into three main directories: `server/` for backend logic, `client/` for frontend code, and `shared/` for common schemas and types.

### Authentication System
The platform implements **two authentication layers**:
- **Client Authentication**: Uses **email/password authentication** with **bcrypt password hashing** and **Passport.js** local strategy for customer accounts. Users can register and login with email/password through a dedicated auth page. Includes **password reset functionality** with secure token-based reset links.
- **Team Authentication**: Simple password-based system for team members to access the fulfillment dashboard (requires both secure passwords to match exactly for access)

Sessions are managed with **express-session** using a PostgreSQL store (`connect-pg-simple`). The user schema includes email, password (hashed), firstName, lastName, and credit tracking fields.

### Database Design
The application uses **PostgreSQL** as the primary database with **Drizzle ORM** for type-safe database operations. The schema includes:
- **sessions table** for session storage (required for Passport.js sessions)
- **users table** with email/password authentication, email verification, password reset tokens, Stripe customer info, and credit balances
- **creditPurchases table** tracking credit package purchases with Stripe integration
- **orders table** managing lead export requests with status tracking, delivery URLs, fulfillment notes, and assignment tracking

### Order Management System
**Complete workflow implemented**:
1. **Client Dashboard** (`/dashboard`) - Customers place orders and download completed lead files
2. **Team Dashboard** (`/team`) - Separate secure panel for order fulfillment with password protection
3. **Order Lifecycle**: pending → processing → completed with CSV/Google Sheets delivery
4. **Real-time Updates**: Orders appear instantly in team dashboard for fulfillment

### Payment Processing
**Stripe** is integrated for secure payment processing of credit packages. The system creates checkout sessions, handles webhook verification, and automatically updates user credit balances upon successful payment. Credit packages range from $10 (5K credits) to $1,400 (1M credits) with volume discounts. Popup blocker handling ensures payments work across all browsers.

### Email Notification System
**Complete email system implemented with 5 notification types**:
1. **Email Verification** - Sent during user registration with verification links
2. **Credit Purchase Confirmation** - Sent only for Stripe purchases (not team assignments)
3. **Order Completion** - Sent to customers when orders are fulfilled 
4. **Password Reset** - Secure token-based reset links with 30-minute expiry
5. **New Order Notifications** - Sent to mamnoon@buyapolloleads.com when clients place orders

All emails use PostMark SMTP with proper HTML formatting and exact spacing requirements. Email links use `quickapolloleads.com` domain in production and `quickapolloleads.app.replit.com` for development environment.

### User Experience Improvements
**Comprehensive loading states implemented**:
- **Global App Loading**: Full-screen loader during authentication check
- **Page Loading**: Individual page loaders for dashboards and forms
- **Form Loading**: Inline loading spinners for all submit buttons
- **Data Loading**: Loading states for order lists, credit packages, and user data
- **Browser Titles**: Proper page titles for all routes (Dashboard, Team Dashboard, Sign In, etc.)

### Development Setup
The project uses a **monorepo structure** with shared TypeScript configuration. Development includes hot module replacement via Vite, automatic TypeScript checking, and database schema management through Drizzle migrations. The build process compiles both frontend and backend, with the server bundled using esbuild for production deployment.

## External Dependencies

### Core Technologies
- **Neon Database** (@neondatabase/serverless) - Serverless PostgreSQL database
- **Stripe** (@stripe/stripe-js, @stripe/react-stripe-js) - Payment processing
- **Passport.js** - Authentication middleware for local email/password strategy

### UI and Styling
- **Radix UI** - Headless UI components for accessibility
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library
- **shadcn/ui** - Pre-built component library

### Development Tools
- **Drizzle ORM** - Type-safe database toolkit
- **Zod** - Schema validation
- **React Query** - Server state management
- **React Hook Form** - Form handling
- **Wouter** - Lightweight routing

### Backend Services
- **Express.js** - Web application framework
- **Passport.js** - Authentication middleware
- **openid-client** - OpenID Connect client
- **ws** - WebSocket support for Neon