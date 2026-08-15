# 📖 Complete Guide: Shop Onboarding, Admin Panel Login & Prime Subscription Management

Is guide me aapko puri jankari milegi ki kaise aap alag-alag dukandaron (Shopkeepers) ko **onboard** karenge, **Admin Panel login** kaise kaam karta hai, **Prime Plan expiry & renewal** kaise manage hota hai, aur **15-Minute Auto-Backup / Google Sheets Sync** kaise chalta hai.

---

## 📌 1. Super Admin Panel Login aur Dukandar Onboarding (दुकानदार ऑनबोर्डिंग)

### 🔑 Step 1: Admin Panel me Login Karein
1. Top-right account menu ya Login screen par click karein.
2. Select role **Super Admin** (`super_admin`).
3. Super Admin credentials use karke login karein (e.g., `admin@enterprise-erp.com` / `admin123`).
4. Super Admin ke paas pooray system ka full access hota hai, jisme sabhi onboarded shops aur subscription settings dikhti hain.

### 🏪 Step 2: Nayi Dukan Onboard Karein (New Shop Onboarding)
1. Left navigation menu me **"Users & Workspaces" (स्टाफ एवं दुकान प्रबंधन)** par click karein.
2. Sabse upar **`➕ Onboard New Shop Workspace`** button par click karein.
3. Form me dukandar ki details bharein:
   - **Shop / Business Name:** (e.g. *Radhe Krishna General Store*)
   - **Legal Name & GSTIN:** (Optional/If applicable)
   - **Owner Name & Phone Number:** (Dukandar ka naam aur mobile number)
   - **Owner Email & Password:** (Dukandar ka login ID aur password)
   - **UPI ID & QR Details:** (Shop ka direct payment UPI ID e.g. `shop@upi`)
   - **Subscription Plan & Validity:**
     - Select Plan: **👑 Prime Plan - 1 Year** (ya Trial / Starter Plan)
     - Select Validity Duration: **12 Months** (1 Saal), 6 Months, ya 36 Months.
4. **"Onboard Shop & Activate Plan"** button par click karein.
5. System automatiquement:
   - Dukandar ki apni isolated **Shop Workspace** create kar dega.
   - Dukandar ke liye **`owner`** account credentials generate kar dega.
   - Prime Plan ki expiry date calculate karke set kar dega.

---

## 🔒 2. Dukandar (Owner) Category & Access Restrictions (केवल काम की चीज़ें)

### 👤 Dukandar Login
- Dukandar apne registered Email aur Password se login karta hai.
- Login karte hi uski role **`owner`** (दुकान मालिक) set hoti hai.

### 🎯 Strict Access Control (कोई फालतू चीज़ नहीं):
- **Isolated Data:** Dukandar ko **KEWAL USKI DUKAN** ka data (Sales, Purchases, Inventory, Khata, GST, Expenses) dikhta hai. Kisi doosre dukandar ka data aapas me mix nahi hota.
- **Relevant Tools Only:** Dukandar ko POS Billing, Barcode Scanner, Udhar Recovery, Stock Adjustments, GST Reports, aur QR Code Payment collection jaisi kam ki chije hi milti hain.
- **Restricted Menus:** System Architecture, Global App Settings, aur Doosre Shops ka Management tab Dukandar ke menu se hidden rehta hai.
- **Staff Permission Control:** Dukandar apni dukan ke Cashier, Manager, ya Stock Keeper ke liye alag permissions toggle kar sakta hai.

---

## 👑 3. Prime Subscription Expiry & Renewal Management (प्राइम सदस्यता प्रबंधन)

### ⏳ Prime Expiry Tracking
- Har shop workspace ki **Subscription Plan** aur **Expiry Date** (`subscriptionExpiresAt`) backend me track hoti hai.
- App header aur dashboard me Prime Status badge dikhta hai:
  - **🟢 Active:** Valid subscription running.
  - **⚠️ Expiring Soon (15 Din Pehle):** Screen ke top par notification banner aane lagta hai: *"Aapka Prime Subscription X din me expire ho raha hai"*.
  - **🔴 Expired:** Subscription khatam hone par top par **High-Priority Expiry Alert Banner** dikhta hai jo billing & features ke liye renewal ka clear instruction deta hai.

### 🔄 Prime Plan Extend / Renew Kaise Karein
1. **Admin Panel Se (Super Admin):**
   - **Users & Workspaces** tab par jayein.
   - Onboarded Shop card par **`Renew / Extend`** button par click karein.
   - Extension period select karein (e.g., **+12 Months / 1 Year**) aur **"Confirm Prime Renewal"** dabayein.
2. **Shopkeeper Self-Renewal / One-Click Renew:**
   - Expiry banner par **`Renew 1-Year Prime Plan`** button par click karke dukandar 1-Click me subscription extension request approve kar sakta hai.

---

## ⚡ 4. Office Work, 15-Minute Auto Backup & Google Sheets Sync

### 🏢 Office Work & Offline Mode
- App fully **IndexedDB Local Storage** aur **PWA Service Worker (`syncWorker.js`)** par chalti hai.
- Agar office ya dukan me internet slow hai ya chala jata hai, tab bhi **POS Billing, Purchase entry, Khata ledger, aur Stock update BINA RUKAYAT chalte rehte hain**.

### ⏰ 15-Minute Auto Background Sync & Cloud Backup
- Background sync engine har **15 minute me automatiquement** pending local bills aur transactions ko check karta hai.
- Jaise hi internet connection milta hai, ye data background me Supabase cloud database par 100% safely backup kar deta hai.

### 📊 Google Sheets Backup
- Left Menu me **"Google Sheets Sync"** option diya gaya hai.
- Dukandar ya Admin wahan se **1-Click CSV Export** karke apne Google Drive / Google Sheets me backup le sakte hain.
- Google Apps Script Webhook Paste karke **Automated Direct Sheet Sync** bhi enable kar sakte hain.

---

## 🛠️ Summary Table for Admin & Shopkeeper

| Feature | Super Admin (`super_admin`) | Dukandar / Shop Owner (`owner`) | Staff (`cashier`/`manager`) |
| :--- | :--- | :--- | :--- |
| **All Shops Access** | ✅ Yes (Full Global View) | ❌ No (Only Own Shop) | ❌ No (Only Assigned Shop) |
| **Onboard New Shop** | ✅ Yes | ❌ No | ❌ No |
| **Renew Prime Plan** | ✅ Yes (All Shops) | ⚠️ Own Shop Request / Alert | ❌ No |
| **POS Billing & Khata** | ✅ Yes | ✅ Yes | ✅ Yes (Per Permissions) |
| **Google Sheets Backup**| ✅ Yes | ✅ Yes | ❌ No |
| **15-Min Cloud Auto Backup**| ✅ Automatic | ✅ Automatic | ✅ Automatic |

---
*Enterprise ERP - Onboarding & Admin Management System Complete.*
