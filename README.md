# QuickApolloLeads

## Overview
QuickApolloLeads is a comprehensive affiliate commission management system with automated monthly billing capabilities.

## Features
- 🔄 Automatic commission grouping by earning month (1st-31st)  
- 💰 Bulk payment processing by 5th of following month
- 📧 Complete email notification system
- 💳 Stripe payment integration with 15% commission rate
- 🔐 Secure authentication and session management
- 📊 Real-time order tracking and fulfillment dashboard

## Recent Updates
- Fixed React JSX and TypeScript errors in affiliate components
- Implemented automatic commission grouping by earning month
- Added bulk payment processing capabilities
- Resolved database array operations using inArray() instead of ANY()
- Fixed date formatting to display proper month names
- Synchronized database schema between development and production
- Integrated comprehensive email notification system

## Tech Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript + Drizzle ORM
- **Database**: PostgreSQL (Neon)
- **Payments**: Stripe
- **Authentication**: Passport.js + bcrypt
- **Email**: PostMark SMTP

## Getting Started
```bash
npm install
npm run db:push
npm run dev
```

Built with ❤️ for efficient affiliate commission management.