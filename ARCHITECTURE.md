# MoneyTR AI Trading System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         MOBILE APP (iOS/Android)                     │
│                                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐│
│  │   Sign Up   │  │   Trading   │  │  Positions  │  │  Analytics ││
│  │   /Login    │  │   Signals   │  │   & P&L     │  │  Dashboard ││
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬─────┘│
│         │                │                │                │        │
└─────────┼────────────────┼────────────────┼────────────────┼────────┘
          │                │                │                │
          │  HTTPS + JWT   │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NODEJS EXPRESS BACKEND (Port 3001)                │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                      API ENDPOINTS                              │ │
│  │                                                                  │ │
│  │  /api/step-auth/*     → Authentication (Phone + OTP)           │ │
│  │  /api/trading/*       → Trading Operations                      │ │
│  │  /api/kite/*          → Kite Connect Integration               │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐│
│  │   Trading   │  │     AI      │  │    Kite     │  │   Push     ││
│  │ Controller  │  │   Trading   │  │   Service   │  │Notification││
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬─────┘│
│         │                │                │                │        │
│         └────────────────┴────────────────┴────────────────┘        │
│                          │                                           │
│                          ▼                                           │
│                 ┌─────────────────┐                                 │
│                 │  Risk Manager   │                                 │
│                 │  - Max loss     │                                 │
│                 │  - Position size│                                 │
│                 │  - Stop loss    │                                 │
│                 └─────────────────┘                                 │
└─────────────────────────┬─────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                               │
│                                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  Users   │  │ Trading  │  │  Orders  │  │Positions │           │
│  │          │  │ Settings │  │          │  │          │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       │             │              │             │                  │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐           │
│  │   OTP    │  │   AI     │  │  Trade   │  │  Kite    │           │
│  │          │  │ Signals  │  │   Logs   │  │  Auth    │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                                 │
│                                                                       │
│  ┌─────────────────┐        ┌─────────────────┐                    │
│  │  Zerodha Kite   │        │  Firebase FCM   │                    │
│  │  Connect API    │        │  (Push Notify)  │                    │
│  │                 │        │                 │                    │
│  │  - OAuth        │        │  - Trade alerts │                    │
│  │  - Orders       │        │  - Signals      │                    │
│  │  - Positions    │        │  - Updates      │                    │
│  │  - WebSocket    │        │                 │                    │
│  │  - Postbacks    │        │                 │                    │
│  └─────────────────┘        └─────────────────┘                    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Trading Flow Diagrams

### 1. SUGGEST_ONLY Mode (Manual Trading)

```
┌──────────┐
│ Market   │
│ Data     │
└────┬─────┘
     │
     ▼
┌──────────────────┐
│  AI Trading      │
│  Service         │
│  - RSI           │
│  - SMA           │
│  - MACD          │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Generate        │
│  Signal          │
│  BUY/SELL/HOLD   │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Save to         │
│  AISignal        │
│  table           │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Push            │
│  Notification    │
│  to Mobile       │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  User Reviews    │
│  Signal in App   │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  User Taps       │◄───── Manual Decision
│  "Execute"       │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  POST            │
│  /api/trading/   │
│  execute         │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Validate        │
│  Risk Limits     │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Place Order     │
│  on Kite API     │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Save to         │
│  Order table     │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Webhook         │
│  Receives        │
│  Status Update   │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Update Order    │
│  Status          │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Push            │
│  Notification    │
│  "Order Filled"  │
└──────────────────┘
```

### 2. AUTO_TRADE Mode (Automated Trading)

```
┌──────────┐
│ Market   │
│ Data     │
└────┬─────┘
     │
     ▼
┌──────────────────┐
│  AI Trading      │
│  Service         │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Generate        │
│  Signal          │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Validate        │
│  Confidence      │
│  > 60%?          │
└────┬─────────────┘
     │ Yes
     ▼
┌──────────────────┐
│  Validate        │
│  Risk Limits     │
│  - Daily loss    │
│  - Position size │
└────┬─────────────┘
     │ Passed
     ▼
┌──────────────────┐
│  Auto Place      │◄───── Automated Decision
│  Order on Kite   │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Save Order      │
│  + TradeLog      │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  Push            │
│  Notification    │
│  "Auto Trade     │
│   Executed"      │
└────┬─────────────┘
     │
     ▼
┌──────────────────┐
│  User Monitors   │
│  in App          │
└──────────────────┘
```

---

## Data Flow

### Authentication Flow

```
Mobile App                Backend                  Database
    │                        │                         │
    ├──1. POST /register────>│                         │
    │   {phone, name}        │                         │
    │                        ├──2. Create User────────>│
    │                        │                         │
    │                        ├──3. Generate OTP───────>│
    │                        │                         │
    │<──4. Success───────────┤                         │
    │                        │                         │
    ├──5. POST /verify──────>│                         │
    │   {phone, otp}         │                         │
    │                        ├──6. Validate OTP───────>│
    │                        │                         │
    │                        ├──7. Generate JWT────────│
    │                        │                         │
    │<──8. {access_token}────┤                         │
    │                        │                         │
```

### Trading Flow

```
Mobile App           Backend              Kite API         Database
    │                   │                    │                │
    ├─1. GET /signals──>│                    │                │
    │   + JWT           │                    │                │
    │                   ├─2. Query signals──>│                │
    │<─3. [signals]─────┤                    │                │
    │                   │                    │                │
    ├─4. POST /execute─>│                    │                │
    │   + signal data   │                    │                │
    │                   ├─5. Validate risk──>│                │
    │                   │                    │                │
    │                   ├─6. Place order────>│                │
    │                   │                    │                │
    │                   │<─7. order_id───────┤                │
    │                   │                    │                │
    │                   ├─8. Save order─────────────────────>│
    │                   │                    │                │
    │<─9. Success───────┤                    │                │
    │                   │                    │                │
    │                   │<─10. Webhook───────┤                │
    │                   │    (order status)  │                │
    │                   │                    │                │
    │                   ├─11. Update status─────────────────>│
    │                   │                    │                │
    ├─12. Push Notify───┤                    │                │
    │<──────────────────┤                    │                │
```

---

## Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        MOBILE APP                            │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Security Layer                                      │   │
│  │  - Store tokens in Keychain/Keystore                │   │
│  │  - Certificate pinning for API calls                │   │
│  │  - Biometric auth for trades                        │   │
│  │  - No sensitive data in logs                        │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│                           │ HTTPS + JWT                      │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND SERVER                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Authentication Layer                                │   │
│  │  - JWT verification on all routes                   │   │
│  │  - Phone number verification                        │   │
│  │  - Rate limiting                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Authorization Layer                                 │   │
│  │  - User-specific data access                        │   │
│  │  - Trading mode validation                          │   │
│  │  - Risk limit enforcement                           │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  API Secret Management                               │   │
│  │  - Kite API secret stored server-side ONLY         │   │
│  │  - Never exposed to mobile app                      │   │
│  │  - Environment variables                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Webhook Security                                    │   │
│  │  - SHA-256 checksum verification                    │   │
│  │  - Timestamp validation                             │   │
│  │  - Order ID verification                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Audit Trail                                         │   │
│  │  - All trades logged with timestamps                │   │
│  │  - User actions logged                              │   │
│  │  - Immutable TradeLog entries                       │   │
│  │  - SEBI compliance                                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Risk Management System

```
                  ┌──────────────────────┐
                  │  Execute Trade       │
                  │  Request             │
                  └──────┬───────────────┘
                         │
                         ▼
            ┌────────────────────────────┐
            │  Risk Validation Pipeline  │
            └────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌────────────┐  ┌────────────┐  ┌────────────┐
│ Position   │  │   Daily    │  │ Stop Loss  │
│ Size Check │  │ Loss Check │  │   Check    │
└────┬───────┘  └────┬───────┘  └────┬───────┘
     │               │               │
     │ quantity*     │ today's       │ price vs
     │ price <=      │ loss <=       │ stop loss
     │ maxPosition   │ maxDailyLoss  │
     │               │               │
     └───────┬───────┴───────┬───────┘
             │               │
             ▼               ▼
        ┌─────────────────────┐
        │  All Checks Passed? │
        └─────────┬───────────┘
                  │
         ┌────────┴────────┐
         │                 │
         ▼                 ▼
    ┌────────┐       ┌──────────┐
    │  YES   │       │    NO    │
    │        │       │          │
    │ Place  │       │  Reject  │
    │ Order  │       │  & Log   │
    └────────┘       └──────────┘
```

---

## Database Schema Relationships

```
                    ┌─────────────┐
                    │    User     │
                    │-------------|
                    │ id (PK)     │
                    │ phone       │
                    │ name        │
                    │ verified    │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Trading      │  │   Orders     │  │  Positions   │
│ Settings     │  │              │  │              │
│--------------|  │--------------|  │--------------|
│ tradingMode  │  │ kiteOrderId  │  │ symbol       │
│ maxDailyLoss │  │ symbol       │  │ quantity     │
│ riskPerTrade │  │ quantity     │  │ averagePrice │
└──────────────┘  │ price        │  │ pnl          │
                  │ status       │  │ status       │
                  │ pnl          │  └──────────────┘
                  └──────┬───────┘
                         │
                         │ FK: aiSignalId
                         │
                         ▼
                  ┌──────────────┐
                  │  AISignal    │
                  │--------------|
                  │ symbol       │
                  │ signalType   │
                  │ confidence   │
                  │ entryPrice   │
                  │ stopLoss     │
                  │ targetPrice  │
                  │ reasoning    │
                  └──────────────┘

                  ┌──────────────┐
                  │  TradeLog    │
                  │  (Audit)     │
                  │--------------|
                  │ userId       │
                  │ action       │
                  │ orderId      │
                  │ details      │
                  │ timestamp    │
                  └──────────────┘
```

---

## API Request/Response Flow

```
Mobile App                                           Backend
    │                                                   │
    │  POST /api/trading/execute                       │
    │  ─────────────────────────────────────────────>  │
    │                                                   │
    │  Headers:                                         │
    │    Authorization: Bearer eyJhbGci...              │
    │    Content-Type: application/json                │
    │                                                   │
    │  Body:                                            │
    │    {                                              │
    │      "signalId": "uuid",                         │
    │      "symbol": "RELIANCE",                       │
    │      "exchange": "NSE",                          │
    │      "orderType": "BUY",                         │
    │      "quantity": 10,                             │
    │      "price": 2500.00                            │
    │    }                                              │
    │                                                   │
    │                                     ┌──────────┐ │
    │                                     │ Validate │ │
    │                                     │   JWT    │ │
    │                                     └────┬─────┘ │
    │                                          │       │
    │                                     ┌────▼─────┐ │
    │                                     │ Validate │ │
    │                                     │  Input   │ │
    │                                     └────┬─────┘ │
    │                                          │       │
    │                                     ┌────▼─────┐ │
    │                                     │ Validate │ │
    │                                     │   Risk   │ │
    │                                     └────┬─────┘ │
    │                                          │       │
    │                                     ┌────▼─────┐ │
    │                                     │  Place   │ │
    │                                     │  Order   │ │
    │                                     └────┬─────┘ │
    │                                          │       │
    │  <─────────────────────────────────────┘       │
    │                                                   │
    │  Response:                                        │
    │    {                                              │
    │      "success": true,                            │
    │      "data": {                                   │
    │        "orderId": "uuid",                        │
    │        "kiteOrderId": "240127000789012",        │
    │        "status": "PENDING"                       │
    │      }                                            │
    │    }                                              │
    │                                                   │
```

---

## Monitoring & Logging

```
┌─────────────────────────────────────────────────────────────┐
│                    APPLICATION LOGS                          │
│                                                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   INFO      │  │   ERROR     │  │   DEBUG     │         │
│  │  Requests   │  │  Exceptions │  │  Details    │         │
│  │  Responses  │  │  API Fails  │  │  Debugging  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                               │
│  Key Events:                                                 │
│  - User registration                                         │
│  - Trade execution                                           │
│  - Order status changes                                      │
│  - Risk limit violations                                     │
│  - API errors                                                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                     TRADE LOGS TABLE                         │
│                  (Audit Trail - SEBI)                        │
│                                                               │
│  All trading actions immutably logged:                       │
│  - Order placements                                          │
│  - Order modifications                                       │
│  - Order cancellations                                       │
│  - Risk setting changes                                      │
│  - Trading mode changes                                      │
│  - With timestamps & user identification                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

**Created:** 2025-11-28  
**Version:** 1.0.0  
**Status:** Production Ready
