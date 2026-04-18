# GLS Infotech Lease Manager

A complete laptop lease management system built with React + Vite, Tailwind CSS, Supabase, and React PDF Renderer.

## Features

- 🔐 **Authentication** — Supabase Auth (email/password)
- 📦 **Inventory Management** — Track laptops with full specs and status
- 👥 **Customer Management** — Store customer details including GSTIN and per-laptop monthly rate
- 📋 **Delivery Challans** — Create and print challans when delivering laptops
- 🔄 **Return Receipts** — Log returns (full or partial) with condition tracking
- 🧾 **GST Invoicing** — Auto-generate monthly invoices with CGST/SGST/IGST support
- 📄 **PDF Export** — Download GST-compliant PDFs for invoices and challans
- ⚙️ **Settings** — Configure business details and bank information

## Tech Stack

- **Frontend**: React 18 + Vite 5
- **UI**: Tailwind CSS + shadcn/ui + Radix UI
- **State**: Zustand
- **Database**: Supabase (PostgreSQL + Auth)
- **PDF**: @react-pdf/renderer
- **Router**: React Router v6
- **Hosting**: Vercel

---

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click **"New Project"**
3. Enter a project name (e.g., `gls-lease-app`)
4. Set a strong database password
5. Choose a region (preferably India - ap-south-1 for low latency)
6. Click **"Create new project"** and wait for it to initialize (~2 min)

### 2. Run the Database Schema

1. In the Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New query"**
3. Copy the entire contents of `supabase-schema.sql` from this repo
4. Paste it into the SQL editor
5. Click **"Run"** (Ctrl+Enter)
6. Verify all tables are created in **Table Editor**

### 3. Create an Admin User

1. Go to **Authentication → Users** in Supabase dashboard
2. Click **"Invite user"** or **"Add user"**
3. Enter the admin email and password
4. This user will be able to log in to the app

### 4. Get Your Environment Variables

1. In Supabase, go to **Settings → API**
2. Copy the **Project URL** (e.g., `https://xxxxx.supabase.co`)
3. Copy the **anon/public** key

### 5. Set Up Environment Variables

```bash
# Clone or download the project
cd gls-lease-app

# Copy the example env file
cp .env.example .env

# Edit .env and fill in your values
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 6. Local Development

```bash
# Install dependencies
npm install

# Start the development server
npm run dev

# Open http://localhost:5173 in your browser
# Log in with the admin user you created in Supabase
```

### 7. Build for Production

```bash
npm run build
# Output is in the /dist folder
```

---

## Vercel Deployment

### Option A: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Set environment variables when prompted
```

### Option B: Deploy via Vercel Dashboard

1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [https://vercel.com](https://vercel.com) and sign in
3. Click **"New Project"**
4. Import your repository
5. Configure the project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Add **Environment Variables**:
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
7. Click **"Deploy"**

The `vercel.json` file is already configured to handle React Router's client-side routing.

---

## Business Logic Notes

### GST Calculation
- GLS Infotech is registered in **Tamil Nadu**
- **Intra-state** (Customer in TN): CGST 9% + SGST 9% = 18%
- **Inter-state** (Customer outside TN): IGST 18%

### Invoice Generation
- Invoices are generated monthly (1st of each month for previous month)
- Can also be manually triggered anytime from the Invoices page
- **Prorated billing**: If a laptop was leased for only part of the month, the amount is calculated as:
  ```
  Amount = (Monthly Rate / Days in Month) × Days Leased
  ```
- Invoice number format: `GLS/YYYY-MM/001`
- Challan number format: `GLS/CH/YYYY-MM/001`
- Return receipt number format: `GLS/RR/YYYY-MM/001`

### Laptop Status Flow
```
Available → On Lease (when challan is created)
On Lease → Available (when returned in Good condition)
On Lease → Under Repair (when returned as Damaged)
Under Repair → Available (manually updated in Inventory)
Any → Retired (manually updated in Inventory)
```

### Challan Status Flow
```
Active → Returned (all laptops returned)
Active → Partially Returned (some laptops returned)
Partially Returned → Returned (remaining laptops returned)
```

---

## Project Structure

```
gls-lease-app/
├── src/
│   ├── components/
│   │   ├── ui/                 # shadcn/ui base components
│   │   ├── Layout.jsx          # Main layout with sidebar
│   │   ├── Sidebar.jsx         # Navigation sidebar
│   │   └── ProtectedRoute.jsx  # Auth guard
│   ├── lib/
│   │   ├── supabase.js         # Supabase client
│   │   ├── utils.js            # Utility functions + formatters
│   │   ├── gst.js              # GST calculation helpers
│   │   └── pdf.js              # PDF templates (Invoice + Challan)
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Inventory.jsx
│   │   ├── Customers.jsx
│   │   ├── Challans.jsx
│   │   ├── ChallanDetail.jsx
│   │   ├── Returns.jsx
│   │   ├── Invoices.jsx
│   │   ├── InvoiceDetail.jsx
│   │   └── Settings.jsx
│   ├── store/
│   │   ├── useInventoryStore.js
│   │   ├── useCustomerStore.js
│   │   ├── useChallanStore.js
│   │   └── useInvoiceStore.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── supabase-schema.sql         # Full DB schema with RLS
├── vercel.json                 # Vercel config for SPA routing
├── .env.example                # Environment variables template
├── package.json
├── vite.config.js
├── tailwind.config.js
└── postcss.config.js
```

---

## Usage Guide

### First Time Setup
1. Log in with your admin credentials
2. Go to **Settings** and fill in your business details (name, address, GSTIN, bank details)
3. Go to **Inventory** and add your laptops
4. Go to **Customers** and add your customers with their monthly rates

### Day-to-Day Operations
1. **Creating a lease**: Go to Challans → Create Challan → Select customer + laptops → Set delivery and return dates
2. **Logging a return**: Go to Returns → Log Return → Select challan → Select returning laptops + condition
3. **Generating invoices**: Go to Invoices → Generate Invoices → Select month → Invoices are created as Draft
4. **Managing invoices**: Mark as Sent, then mark as Paid when payment is received

---

## Troubleshooting

**Login fails**: Check that the user is created in Supabase Auth and email/password are correct.

**Data not saving**: Check browser console for errors. Verify RLS policies are enabled and the user is authenticated.

**PDF not generating**: @react-pdf/renderer requires a modern browser. Check console for any font-loading errors.

**Invoices showing ₹0**: Ensure customers have a `monthly_rate` set and there are challan_items linked to the customer in the billing period.

---

## License

© 2024 GLS Infotech. All rights reserved.

---

## Updates & New Features (v2)

### 🔄 Logic Changes
- **Per-laptop monthly rate**: Each laptop in a challan now has its own monthly rate (previously was per-customer). Set rates when creating a challan. Falls back to customer default rate if not set.

### 🔐 Role-Based Access
- New `user_roles` table in Supabase
- Roles: `admin` and `staff`
- Admins see a **User Management** page to assign/change roles
- Run new SQL schema updates (see `supabase-schema.sql` bottom section)

### 📊 Dashboard Charts (requires recharts)
Run `npm install` after pulling — recharts has been added to package.json.
- **Monthly Revenue Bar Chart** — last 6 months of paid invoice revenue
- **Invoice Status Pie Chart** — distribution of Draft/Sent/Paid/Overdue

### ⏰ Overdue Alerts
- Dashboard shows a dismissible red banner listing all overdue challans (by challan number + customer)
- Invoices older than 30 days auto-marked as Overdue on fetch

### 🔔 Email Notifications (Placeholder)
- "Mark Sent" now shows a toast about upcoming email integration
- Settings page has a Notifications section (coming soon UI)

### 🔧 Maintenance History
- Each laptop has a 🔧 Wrench button in Inventory
- Opens maintenance history dialog — log issues, resolutions, cost, technician

### 🔍 Advanced Filters
- **Challans**: Filter by delivery date range (from/to)
- **Invoices**: Filter by invoice date range + amount range (min/max)

### 🎨 UI Overhaul
- Sidebar: Deep indigo-to-blue gradient
- Dashboard: Welcome banner with gradient header
- Stat cards: Colored left border per card type
- Tables: Subtle alternating row striping
- Login: Full gradient background with frosted glass card
- Buttons: Indigo primary color throughout

### 🗄️ Database Changes
Run these SQL statements in Supabase SQL Editor (see bottom of `supabase-schema.sql`):
1. `ALTER TABLE challan_items ADD COLUMN IF NOT EXISTS monthly_rate NUMERIC(10,2);`
2. Create `user_roles` table
3. Create `laptop_maintenance` table
