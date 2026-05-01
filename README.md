# 💼 Smart GST Billing System

A modern, cloud-synced GST billing web app built for small Indian businesses. Create professional invoices in seconds, manage multiple businesses, and access everything from your phone like a native app.

🔗 **Live App:** [billingsystem1.vercel.app](https://billingsystem1.vercel.app)

---

## ✨ Feature Highlights

### 🧾 Invoicing
- **Auto-incrementing invoice numbers** — INV-001, INV-002, … generated automatically
- **Category-based billing** — each bill type (retail, wholesale, etc.) has its own HSN code and MRP toggle
- **Smart item autocomplete** — type a few letters and fuzzy search instantly suggests matching products
- **Arrow key navigation** — use ↑ / ↓ to browse suggestions, Enter to select, Escape to dismiss
- **Per-item discounts** — both percentage (%) and flat rupee (₹) discount supported on every line
- **Overall invoice discount** — additional percentage or flat discount on the whole bill
- **Free items column** — track promotional free quantities separately
- **Tax-inclusive & exclusive modes** — toggle GST (5% = 2.5% CGST + 2.5% SGST) per invoice
- **Grand Total rounding** — automatically rounded to nearest whole rupee (≥0.5 rounds up)
- **Amount in Words** — auto-generated in Indian numbering system, reflects the rounded total
- **Edit existing invoices** — load any past invoice back into the form and save as overwrite or new

### 🖨️ Printing
- **A4 full-page format** (>5 items) and **half-page format** (≤5 items, prints 2 per sheet)
- **Terms & Conditions box** on every invoice — editable per business profile
- **Bank details** printed in footer including any custom extra fields (e.g. FSSAI No.)
- **Authorized signatory** section with signature gap
- Toast/notification overlays are always hidden from print output

### 📦 Product Management
- **Searchable list view** with Fuse.js fuzzy search — find any product by name even with typos
- **Category filter chips** — filter by bill category instantly
- **Inline editing** — edit name, rate, MRP, HSN, category directly in the list row
- **MRP support** — optional MRP column shown on bills when enabled per category

### 🏢 Multi-Business Support
- Create and manage **multiple business profiles** under one account
- Switch active business — all invoices, products, and settings follow the active business
- Each business has: name, address, GSTIN, phone, email, bank details
- **Custom extra fields** per business (e.g. FSSAI, Drug Licence, MSME No.) — appear in invoice footer
- **Terms & Conditions** are configurable per business and shown on every invoice

### 👥 Customer Management
- Auto-suggest existing customers by name as you type
- Customer details (address, GSTIN, phone) auto-fill from history
- All customers linked to your account and synced in the cloud

### 📊 Dashboard & Analytics
- Revenue summary: today, this week, this month
- Total invoices, customers, products at a glance
- Revenue trend chart (Chart.js)
- Recent invoices list

### 📜 Invoice History
- Search by invoice number or customer name
- Filter by date range and bill category
- Payment status tracking: Paid / Partial / Unpaid
- Reprint any past invoice instantly
- Edit or delete with confirmation overlay (no browser popups)

### 🤖 AI Chatbot Assistant
- Built-in AI assistant to answer billing questions
- Import order images (WhatsApp screenshots, handwritten orders) via the **📷 Import Order** button
- AI reads the image and auto-populates the invoice items

---

## 📱 Mobile-First Design

The app is fully optimized for mobile use — add it to your home screen for a native app experience:

- **Bottom navigation bar** (Dashboard / Invoice / Products / History / Settings) — reachable with one thumb
- **No horizontal scrolling** — all forms and lists adapt to small screens
- **PWA-ready meta tags** — `apple-mobile-web-app-capable`, `mobile-web-app-capable`
- **Sticky Grand Total** visible while scrolling through invoice items

### Adding to Home Screen
**Android (Chrome):** Menu → "Add to Home Screen"  
**iPhone (Safari):** Share → "Add to Home Screen"

---

## ☁️ Cloud & Authentication

| Feature | Status |
|---|---|
| Google OAuth login | ✅ Live |
| NeonDB (PostgreSQL) via Supabase client | ✅ Live |
| Row Level Security — users see only their own data | ✅ Live |
| Expert cache (in-memory + localStorage) | ✅ Live |
| Multi-device sync | ✅ Live |
| Invoice draft auto-saved to localStorage | ✅ Live |
| Offline mode (Service Worker / PWA shell caching) | 🔜 Planned |

Data is synced in real-time using the Supabase JS client connected to a NeonDB PostgreSQL database. An expert cache layer shows stale data instantly while fresh data loads silently in the background (SWR pattern).

---

## 🗄️ Database Schema

See [`supabase-schema.sql`](./supabase-schema.sql) for the full schema and [`multi-business-migration.sql`](./multi-business-migration.sql) for the multi-business migration.

**Core tables:**
- `user_profiles` — auth user metadata
- `businesses` — one or more business profiles per user
- `customers` — per-user customer directory
- `product_rates` — product price book (linked to business via category)
- `categories` — bill categories with HSN code, MRP toggle
- `invoices` — invoice header records
- `invoice_items` — line items for each invoice

---

## 🚀 Quick Start

1. Open [billingsystem1.vercel.app](https://billingsystem1.vercel.app)
2. Sign in with Google
3. Go to **Settings → My Businesses** and set up your business profile (name, address, GSTIN, bank details, terms)
4. Go to **Products** and add your product price list
5. Go to **Invoice**, select a category, fill customer details, add items, and hit **Save & Print**

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 (via CDN, no build step) |
| Styling | Tailwind CSS (CDN) + custom CSS |
| Charts | Chart.js |
| Fuzzy Search | Fuse.js |
| Database | NeonDB (PostgreSQL) |
| Auth & API | Supabase JS client |
| Hosting | Vercel |
| Fonts | Inter (Google Fonts) |

---

## 📋 Settings & Customization

### Business Profile
- Business name, address, GSTIN, phone, email
- Bank name, branch, account number, IFSC
- **Custom extra fields** — add any label/value pairs (e.g. `FSSAI No: 123456`)
- **Terms & Conditions** — multi-line text shown in every invoice footer

### Bill Categories
- Create categories like "Retail", "Wholesale", "GST Bill"
- Set default HSN code per category
- Toggle MRP column display per category

---

## 📄 License

MIT License — free to use for personal or commercial projects.

---

Made with ❤️ for small businesses by [Gauravguddeti](https://github.com/Gauravguddeti)
