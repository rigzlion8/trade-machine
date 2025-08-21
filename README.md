# Trade Machine - Crypto Trading Bot Platform

A modern, mobile-first crypto trading bot platform designed for the Kenyan market with plans for global expansion.

## 🚀 Features (MVP)

- **Google SSO Authentication** - Secure login with Google accounts
- **Mobile-First Design** - Optimized for mobile trading on the go
- **Real-time Dashboard** - Live bot performance and market data
- **Kenyan Market Focus** - Local currency (KES) support and timezone
- **Risk Management** - Built-in position sizing and stop-loss logic
- **WebSocket Integration** - Real-time price updates and notifications
- **Mobile Wallet System** - Send/receive money between users
- **P2P Transfers** - Peer-to-peer money transfers via phone number
- **Bank Integration** - Transfer to local bank accounts
- **Paystack Integration** - Secure payment processing with M-Pesa support

## 🏗️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **MongoDB** - Document database for user data and bot configs
- **Redis** - Caching and session management
- **Celery** - Background task processing
- **WebSockets** - Real-time communication

### Frontend
- **React 18** - Modern UI library
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **TypeScript** - Type safety
- **Zustand** - Lightweight state management

### Infrastructure
- **Railway** - Backend hosting
- **Vercel** - Frontend hosting
- **Resend** - Email notifications
- **Paystack** - Payment processing & mobile money
- **Docker** - Local development

## 💰 Mobile Wallet Features

### Core Wallet Functions
- **Wallet Creation** - Automatic wallet setup for new users
- **Balance Management** - KES and USDT balances
- **PIN Security** - 4-digit PIN for wallet access
- **Transaction History** - Complete transfer records

### Transfer Options
- **P2P Transfers** - Send money to other users via phone number
- **Bank Transfers** - Transfer to local bank accounts
- **M-Pesa Integration** - Via Paystack for mobile money
- **Airtel Money** - Alternative mobile money option

### Security & Limits
- **Daily Limits** - 100K KES daily transfer limit
- **Monthly Limits** - 1M KES monthly transfer limit
- **Transfer Count Limits** - Max 10 transfers per day
- **PIN Verification** - Required for all transfers

## 🛠️ Local Development Setup

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ and npm
- Python 3.11+

### 1. Clone and Setup
```bash
git clone <your-repo>
cd trade-machine
cp .env.example .env
# Edit .env with your API keys
```

### 2. Start Services
```bash
# Start all services (MongoDB, Redis, Backend, Frontend)
docker-compose up -d

# Or start individual services
docker-compose up mongodb redis -d
docker-compose up backend -d
docker-compose up frontend -d
```

### 3. Install Dependencies
```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### 4. Run Development Servers
```bash
# Backend (FastAPI)
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend (Vite)
cd frontend
npm run dev
```

## 🌐 Access Points

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

## 📱 Mobile-First Design

The platform is designed with mobile users in mind:
- Responsive design that works on all screen sizes
- Touch-friendly interface elements
- Optimized for mobile trading scenarios
- Fast loading on slower connections

## 🇰🇪 Kenyan Market Features

- **Local Currency**: KES (Kenyan Shillings) support
- **Timezone**: Africa/Nairobi timezone handling
- **Phone Numbers**: +254 format support
- **Local Regulations**: Compliance with Kenyan financial regulations
- **Mobile Money**: Integration with M-Pesa via Paystack
- **Bank Integration**: Support for local banks
- **P2P Transfers**: Send money to friends and family

## 🔐 Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
# Required for development
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
BINANCE_API_KEY=your-binance-api-key
BINANCE_SECRET_KEY=your-binance-secret-key

# Payment Gateway (Paystack)
PAYSTACK_SECRET_KEY=your-paystack-secret-key
PAYSTACK_PUBLIC_KEY=your-paystack-public-key
PAYSTACK_WEBHOOK_SECRET=your-paystack-webhook-secret

# Optional for MVP
RESEND_API_KEY=your-resend-api-key
EXCHANGE_RATE_API_KEY=your-exchange-rate-api-key
```

## 🚀 Deployment

### Backend (Railway)
1. Push to GitHub
2. Connect Railway to your repo
3. Set environment variables in Railway dashboard
4. Deploy automatically on push

### Frontend (Vercel)
1. Push to GitHub
2. Connect Vercel to your repo
3. Set environment variables in Vercel dashboard
4. Deploy automatically on push

## 📊 Project Structure

```
trade-machine/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/routes/     # API endpoints
│   │   │   ├── auth.py     # Authentication
│   │   │   ├── wallet.py   # Mobile wallet
│   │   │   ├── payments.py # Paystack integration
│   │   │   └── ...
│   │   ├── core/           # Configuration & security
│   │   ├── models/         # Database models
│   │   │   ├── user.py     # User model with wallet
│   │   │   ├── wallet.py   # Wallet & transaction models
│   │   │   └── ...
│   │   └── services/       # Business logic
│   │       ├── wallet_service.py    # Wallet operations
│   │       ├── paystack_service.py  # Payment processing
│   │       └── ...
│   └── requirements.txt
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API calls
│   │   └── store/          # State management
│   └── package.json
├── docker-compose.yml      # Local development
├── railway.json            # Railway configuration
└── README.md
```

## 💳 Payment Integration

### Paystack Features
- **Card Payments** - Credit/debit card processing
- **Bank Transfers** - Direct bank account transfers
- **Mobile Money** - M-Pesa, Airtel Money integration
- **USSD** - Phone-based payments
- **QR Codes** - Scan and pay functionality

### Transaction Types
- **Deposits** - Add money to wallet
- **Withdrawals** - Remove money from wallet
- **P2P Transfers** - Send to other users
- **Bank Transfers** - Send to bank accounts
- **Trading Fees** - Bot trading costs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support, email support@trademachine.com or create an issue in the repository.

---

**Built with ❤️ for the Kenyan crypto community**
