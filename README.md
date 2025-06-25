# 🚚 ParcelSwift Server – Backend for Parcel Delivery Platform

This is the backend server for **ParcelSwift**, a parcel delivery web application. It provides RESTful APIs to manage parcel orders, user roles, delivery payments, and admin operations. Built with Express.js and MongoDB, the server ensures secure and scalable delivery service management.

## 📦 Key Features

- 🔐 **JWT Authentication:** Secure role-based access using Firebase Auth and JWT tokens.
- 📬 **Parcel Management:** Create, retrieve, and update parcel delivery data.
- 💳 **Stripe Payment Integration:** Create payment intents, confirm payments, and mark parcels as paid.
- 📁 **Payment History Storage:** Payments are stored in a dedicated `paymentHistory` collection with transaction ID, payment method, and ISO date.
- 🛡️ **Security & Validation:** Uses `cors`, `dotenv`, and protected routes for secure data handling.
- 📊 **Admin Utilities:** Admins can view all parcels and payments, sorted by most recent.

## 🛠️ Tech Stack

- **Server Framework:** Express.js
- **Database:** MongoDB (native driver)
- **Authentication:** Firebase Auth + JWT
- **Payment:** Stripe
- **Utilities:**  
  - `cors` – Cross-Origin Resource Sharing  
  - `dotenv` – Environment variable management  
  - `express-async-handler` – Simplified async route handling  
  - `body-parser` – Request parsing

## 📂 Project Structure


## 🔐 API Security

- All protected routes require a valid Firebase JWT token.
- Admin routes require elevated permissions (e.g., role checks).

## 🧪 Sample Endpoints

### Create Parcel
`POST /api/parcels`  
Body: Parcel, sender, and receiver info

### Update Payment Status
`PATCH /api/parcels/:id/pay`  
Action: Mark a parcel's `payment_status` as `"paid"`

### Add Payment Record
`POST /api/payments`  
Body: `{ transactionId, paymentMethod, dateISO, parcelId }`

### Get Payment History (Admin)
`GET /api/payments`  
Returns: All payments, sorted by newest first

## 🚀 Getting Started

```bash
git clone https://github.com/islamemon59/zap-shift-server.git
cd parcel-server
npm install
npm run dev
