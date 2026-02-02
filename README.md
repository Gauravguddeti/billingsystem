# Smart GST Billing System

A modern, cloud-based GST billing system with multi-user support, automatic data sync, and professional invoice generation.

## 🚀 Features

### Core Functionality
- ✅ **Search & Delete** - Search invoices by number or customer name, delete unwanted invoices
- ✅ **Auto-incrementing Invoice Numbers** - Sequential INV-001, INV-002, etc.
- ✅ **Smart Autocomplete** - Customer and product suggestions
- ✅ **HSN Code** - Pre-configured to 33074100 for all products
- ✅ **Tax Modes** - Toggle between tax-inclusive and tax-exclusive pricing
- ✅ **Discount System** - Per-item and overall invoice discounts
- ✅ **Free Items Column** - Track promotional/free items
- ✅ **Product Rate List** - Master list of products with rates for quick billing
- ✅ **Professional Print** - A4-optimized invoice format
- ✅ **Date Range Export** - Export all invoices in a date range

## 📋 Quick Start (Current LocalStorage Version)

**This version works completely offline with browser storage:**

1. Open `index.html` in your browser
2. Start creating invoices immediately
3. Data saved in browser localStorage
4. No setup required!

## ☁️ Cloud Version (Supabase - Coming Soon)

For multi-user, cloud-synced version, see `supabase-schema.sql` for database setup.

Benefits of cloud version:
- 🔐 Secure authentication
- ☁️ Data synced across devices
- 👥 Multiple users with isolated data
- 💾 Automatic cloud backup

## 📱 Usage

### Creating an Invoice
1. Click "Invoice" tab
2. Enter customer details (autocomplete suggests existing customers)
3. Add items (autocomplete suggests products with rates)
4. Apply discounts if needed
5. Toggle "Tax Included?" if prices already include GST
6. Click "Save & Print"

### Managing Products
1. Go to "Products" tab
2. Click "Add Product"
3. Enter product name and rate
4. Products auto-fill when creating invoices

### Viewing History
1. Go to "History" tab
2. Use search box to filter by invoice # or customer name
3. Filter by date range
4. Click "Reprint" to print again
5. Click delete (🗑) to remove invoice

## 🐛 Current Limitations

- Data stored in browser (clearing cache = data loss)
- Single user only
- No cloud backup
- No device sync

## 🚀 Upcoming: Cloud Version

We're working on a Supabase-integrated version with:
- Multi-user authentication
- Cloud data storage
- Cross-device sync
- Automatic backups
- Team collaboration

## 📄 License

MIT License - feel free to use for personal or commercial projects

---

Made with ❤️ for small businesses
