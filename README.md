# ATZ Store - Telegram E-Commerce & Hyperlocal Delivery Platform

## 🎯 Overview

A production-ready Telegram-based e-commerce platform with hyperlocal delivery capabilities. Complete shopping experience inside Telegram chat with real-time payments, order tracking, and delivery management.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ATZ Store Architecture                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐  │
│  │   Telegram   │    │   Razorpay   │    │      Admin Panel (React)     │  │
│  │   Bot API    │    │   Webhooks   │    │                              │  │
│  └──────┬───────┘    └──────┬───────┘    └──────────────┬───────────────┘  │
│         │                   │                           │                   │
│         ▼                   ▼                           ▼                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     API Gateway (Express.js)                          │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐ │  │
│  │  │ Bot Handler │ │Payment Hook │ │  REST APIs  │ │ WebSocket Live  │ │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘ │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                        │
│         ┌──────────────────────────┼──────────────────────────┐            │
│         ▼                          ▼                          ▼            │
│  ┌──────────────┐    ┌──────────────────────┐    ┌──────────────────────┐  │
│  │   MongoDB    │    │   Redis (Bull Queue)  │    │   Background Jobs   │  │
│  │  - Users     │    │   - Order Timers      │    │   - Auto Cancel     │  │
│  │  - Products  │    │   - Session Cache     │    │   - Delivery Match  │  │
│  │  - Orders    │    │   - Rate Limiting     │    │   - Notifications   │  │
│  │  - Partners  │    └──────────────────────┘    └──────────────────────┘  │
│  └──────────────┘                                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
Telegram/
├── backend/                    # Node.js + Express Backend
│   ├── src/
│   │   ├── config/            # Configuration files
│   │   ├── controllers/       # Request handlers
│   │   ├── middleware/        # Auth, rate limiting
│   │   ├── models/            # MongoDB schemas
│   │   ├── routes/            # API routes
│   │   ├── services/          # Business logic
│   │   ├── bot/               # Telegram bot handlers
│   │   ├── jobs/              # Background workers
│   │   ├── utils/             # Utilities
│   │   └── app.js             # Express app
│   ├── package.json
│   └── .env.example
├── admin/                      # React Admin Panel
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Page components
│   │   ├── services/          # API services
│   │   └── App.jsx
│   └── package.json
├── docs/                       # Documentation
│   ├── api.md                 # API Documentation
│   ├── bot-flows.md           # Bot conversation flows
│   └── deployment.md          # Deployment guide
└── docker-compose.yml          # Docker setup
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB
- Redis
- Telegram Bot Token (from @BotFather)
- Razorpay Account

### Installation

```bash
# Clone and install backend
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials

# Start backend
npm run dev

# Install admin panel
cd ../admin
npm install
npm run dev
```

## 🔑 Environment Variables

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook/telegram

# MongoDB
MONGODB_URI=mongodb://localhost:27017/atz_store

# Redis
REDIS_URL=redis://localhost:6379

# Razorpay
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret

# JWT
JWT_SECRET=your_jwt_secret

# Google Maps
GOOGLE_MAPS_API_KEY=your_maps_key
```

## 📱 Features

### Customer (Telegram Bot)
- ✅ Browse products by category
- ✅ View product details with images
- ✅ Add to cart
- ✅ Checkout with address
- ✅ Razorpay & COD payments
- ✅ Real-time order tracking
- ✅ 15-minute auto-cancel for unpaid orders

### Admin Panel
- ✅ Product management
- ✅ Order management
- ✅ Delivery partner management
- ✅ Analytics dashboard
- ✅ Payment tracking

### Delivery Partner
- ✅ Accept/reject orders
- ✅ Navigation links
- ✅ Earnings tracking
- ✅ Online/offline toggle

## 📄 License

MIT License
