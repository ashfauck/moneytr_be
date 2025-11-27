# MoneyTR AI Trading System APIs

## Overview
Complete AI-powered trading system integrated with Zerodha Kite Connect API, built on top of phone number-based authentication.

## Architecture

### Two Trading Modes
1. **SUGGEST_ONLY** - AI generates signals, user manually approves trades
2. **AUTO_TRADE** - AI automatically executes trades within risk limits
3. **DISABLED** - Trading system is turned off

### Security Model
- ✅ API secrets stored server-side only (never exposed to mobile app)
- ✅ Checksum verification for all Kite webhooks (SHA-256)
- ✅ JWT-based authentication required for all endpoints
- ✅ Complete audit trail for SEBI compliance

---

## API Endpoints

### Base URL
```
Development: http://localhost:3001/api
Production: TBD
```

### Authentication
All trading endpoints require:
- Header: `Authorization: Bearer <access_token>`
- User must be verified (phone verified)

---

## 1. AI Signals

### Get AI Trading Signals
```http
GET /api/trading/signals?limit=20&onlyActive=true
```

**Query Parameters:**
- `limit` (optional) - Number of signals to return (default: 20)
- `onlyActive` (optional) - Show only active signals (default: true)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "signal-uuid",
      "symbol": "RELIANCE",
      "signalType": "BUY",
      "confidence": 85.5,
      "entryPrice": 2500.00,
      "stopLoss": 2450.00,
      "targetPrice": 2625.00,
      "reasoning": "Strong bullish momentum with RSI oversold",
      "indicators": {
        "rsi": 28.5,
        "sma50": 2480.00,
        "sma200": 2350.00
      },
      "modelVersion": "1.0.0",
      "status": "ACTIVE",
      "createdAt": "2025-11-28T03:00:00.000Z"
    }
  ]
}
```

---

## 2. Trading Mode Management

### Get Current Trading Mode
```http
GET /api/trading/mode
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mode": "SUGGEST_ONLY",
    "updatedAt": "2025-11-28T03:00:00.000Z"
  }
}
```

### Update Trading Mode
```http
PUT /api/trading/mode
```

**Request Body:**
```json
{
  "mode": "AUTO_TRADE"
}
```

**Valid modes:** `SUGGEST_ONLY`, `AUTO_TRADE`, `DISABLED`

**Response:**
```json
{
  "success": true,
  "data": {
    "mode": "AUTO_TRADE",
    "message": "Trading mode updated successfully"
  }
}
```

---

## 3. Risk Settings

### Update Risk Settings
```http
PUT /api/trading/risk-settings
```

**Request Body:**
```json
{
  "maxDailyLoss": 5000.00,
  "maxPositionSize": 50000.00,
  "riskPerTrade": 1.5,
  "stopLossPercent": 2.0,
  "takeProfitPercent": 5.0
}
```

**Field Descriptions:**
- `maxDailyLoss` - Maximum loss allowed per day (in ₹)
- `maxPositionSize` - Maximum single position size (in ₹)
- `riskPerTrade` - Risk per trade as % of account balance
- `stopLossPercent` - Stop loss percentage
- `takeProfitPercent` - Take profit percentage

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Risk settings updated successfully",
    "settings": {
      "maxDailyLoss": 5000.00,
      "maxPositionSize": 50000.00,
      "riskPerTrade": 1.5,
      "stopLossPercent": 2.0,
      "takeProfitPercent": 5.0
    }
  }
}
```

---

## 4. Positions

### Get Open Positions
```http
GET /api/trading/positions?status=OPEN
```

**Query Parameters:**
- `status` (optional) - Filter by status: `OPEN`, `CLOSED`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "position-uuid",
      "symbol": "INFY",
      "exchange": "NSE",
      "quantity": 50,
      "averagePrice": 1450.00,
      "currentPrice": 1475.00,
      "stopLoss": 1420.00,
      "takeProfit": 1523.00,
      "pnl": 1250.00,
      "pnlPercent": 1.72,
      "status": "OPEN",
      "openedAt": "2025-11-27T09:30:00.000Z"
    }
  ]
}
```

---

## 5. Orders

### Get Order History
```http
GET /api/trading/orders?limit=50&status=COMPLETE
```

**Query Parameters:**
- `limit` (optional) - Number of orders to return (default: 50)
- `status` (optional) - Filter by status: `PENDING`, `COMPLETE`, `CANCELLED`, `REJECTED`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "order-uuid",
      "kiteOrderId": "240127000123456",
      "symbol": "TCS",
      "exchange": "NSE",
      "orderType": "BUY",
      "quantity": 25,
      "price": 3650.00,
      "status": "COMPLETE",
      "pnl": 0,
      "aiSignalId": "signal-uuid",
      "createdAt": "2025-11-28T10:15:00.000Z",
      "executedAt": "2025-11-28T10:15:03.000Z"
    }
  ]
}
```

---

## 6. Analytics

### Get Trading Analytics
```http
GET /api/trading/analytics?days=30
```

**Query Parameters:**
- `days` (optional) - Number of days to analyze (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTrades": 145,
    "winningTrades": 98,
    "losingTrades": 47,
    "winRate": 67.6,
    "totalPnL": 45250.00,
    "averagePnL": 312.07,
    "bestTrade": 3500.00,
    "worstTrade": -1200.00,
    "currentDrawdown": -850.00,
    "sharpeRatio": 1.85,
    "period": {
      "from": "2025-10-29T00:00:00.000Z",
      "to": "2025-11-28T00:00:00.000Z"
    }
  }
}
```

---

## 7. Execute Trade

### Execute Trade (Manual or Auto)
```http
POST /api/trading/execute
```

**Request Body:**
```json
{
  "signalId": "signal-uuid",
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "orderType": "BUY",
  "quantity": 10,
  "price": 2500.00,
  "stopLoss": 2450.00,
  "takeProfit": 2625.00
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "order-uuid",
    "kiteOrderId": "240127000789012",
    "status": "PENDING",
    "message": "Order placed successfully"
  }
}
```

**Error Response (Risk Limit):**
```json
{
  "success": false,
  "error": {
    "code": "RISK_LIMIT_EXCEEDED",
    "message": "Daily loss limit reached"
  }
}
```

---

## 8. Kite Connect Integration

### OAuth Redirect (One-time setup)
```http
GET /api/kite/redirect?request_token=<token>&user_id=<user_id>
```

**Purpose:** Exchange request_token for access_token after OAuth

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Kite Connect linked successfully",
    "userId": "ABC123",
    "expiresAt": "2025-11-28T23:59:59.000Z"
  }
}
```

### Postback Webhook (Kite → Server)
```http
POST /api/kite/postback
```

**Purpose:** Receive order status updates from Kite Connect

**Payload (from Kite):**
```json
{
  "order_id": "240127000123456",
  "order_timestamp": "2025-11-28 10:15:03",
  "status": "COMPLETE",
  "filled_quantity": 10,
  "average_price": 2501.50,
  "checksum": "sha256-hash"
}
```

**Security:** Webhook validates checksum = SHA-256(order_id + order_timestamp + api_secret)

---

## Database Models

### TradingSettings
```typescript
{
  id: string
  userId: string
  tradingMode: "SUGGEST_ONLY" | "AUTO_TRADE" | "DISABLED"
  maxDailyLoss: number
  maxPositionSize: number
  riskPerTrade: number
  stopLossPercent: number
  takeProfitPercent: number
  createdAt: DateTime
  updatedAt: DateTime
}
```

### Order
```typescript
{
  id: string
  userId: string
  kiteOrderId?: string
  symbol: string
  exchange: string
  orderType: "BUY" | "SELL"
  quantity: number
  price: number
  status: "PENDING" | "COMPLETE" | "CANCELLED" | "REJECTED"
  pnl: number
  aiSignalId?: string
  createdAt: DateTime
  executedAt?: DateTime
}
```

### Position
```typescript
{
  id: string
  userId: string
  symbol: string
  exchange: string
  quantity: number
  averagePrice: number
  currentPrice: number
  stopLoss: number
  takeProfit: number
  pnl: number
  pnlPercent: number
  status: "OPEN" | "CLOSED"
  openedAt: DateTime
  closedAt?: DateTime
}
```

### AISignal
```typescript
{
  id: string
  userId: string
  symbol: string
  signalType: "BUY" | "SELL" | "HOLD"
  confidence: number
  entryPrice?: number
  stopLoss?: number
  targetPrice?: number
  reasoning: string
  indicators?: JSON
  modelVersion: string
  status: "ACTIVE" | "EXPIRED" | "EXECUTED"
  createdAt: DateTime
  expiresAt?: DateTime
}
```

### TradeLog (Audit Trail)
```typescript
{
  id: string
  userId: string
  action: string
  orderId?: string
  details: JSON
  timestamp: DateTime
}
```

---

## Services

### AI Trading Service
**File:** `src/services/aiTradingService.ts`

**Key Methods:**
- `generateSignal(symbol, marketData, historicalData)` - Generate AI trading signals
- `analyzeWithTechnicalIndicators()` - Technical analysis (RSI, SMA, etc.)
- `calculateRSI()` - Calculate Relative Strength Index
- `calculateSMA()` - Calculate Simple Moving Average
- `validateSignal()` - Validate signal against risk parameters
- `calculatePositionSize()` - Calculate position size based on risk

**AI Model Options:**
1. External AI API (OpenAI, Claude, etc.)
2. Local ML model (TensorFlow.js, ONNX)
3. Rule-based trading strategy
4. Technical indicators combination

### Kite Service
**File:** `src/services/kiteService.ts`

**Key Methods:**
- `generateSession(requestToken)` - Exchange request token for access token
- `placeOrder(userId, params)` - Place order on Kite Connect
- `getOrder(userId, orderId)` - Get order details
- `getOrders(userId)` - Get all orders
- `getPositions(userId)` - Get current positions
- `getQuote(userId, symbols)` - Get real-time quotes
- `cancelOrder(userId, orderId)` - Cancel order
- `getHoldings(userId)` - Get user holdings

---

## Risk Management

### Built-in Risk Limits
1. **Daily Loss Limit** - Trading stops when max daily loss reached
2. **Position Size Limit** - Maximum amount per trade
3. **Risk Per Trade** - Percentage of account balance risked per trade
4. **Stop Loss** - Automatic stop loss on all positions
5. **Take Profit** - Automatic profit booking

### Risk Validation (Before Trade Execution)
```typescript
function validateRiskLimits(userId, quantity, price) {
  // 1. Check position size
  if (positionValue > settings.maxPositionSize) {
    return { allowed: false, reason: 'Position size too large' }
  }
  
  // 2. Check daily loss limit
  if (todayLoss >= settings.maxDailyLoss) {
    return { allowed: false, reason: 'Daily loss limit reached' }
  }
  
  return { allowed: true }
}
```

---

## Compliance (SEBI Regulations)

### Audit Trail
All trading actions logged in `TradeLog` model:
- Order placements
- Order modifications
- Order cancellations
- Risk setting changes
- Trading mode changes

### Required for Algo Trading
- ✅ Complete trade history
- ✅ Timestamps for all actions
- ✅ User identification
- ✅ Order details with reasoning
- ✅ Risk management logs

---

## WebSocket Integration (TODO)

### Live Market Data Streaming
```typescript
// Future implementation
import KiteTicker from 'kiteconnect';

const ticker = new KiteTicker({
  api_key: API_KEY,
  access_token: ACCESS_TOKEN
});

ticker.on('ticks', (ticks) => {
  // Update current prices
  // Trigger AI analysis
  // Send push notifications
});

ticker.connect();
ticker.subscribe([symbolToken]);
```

---

## Mobile App Integration Guide

### 1. User Authentication Flow
```
1. User signs up with phone number
2. OTP verification
3. User receives JWT access + refresh tokens
4. Store tokens securely in mobile app
```

### 2. Kite Connect Linking
```
1. User taps "Connect Trading Account"
2. App opens Kite OAuth URL in WebView
3. User logs in to Zerodha
4. Kite redirects to /api/kite/redirect with request_token
5. Server exchanges token and stores access_token
6. User can now trade
```

### 3. Trading Flow

#### Suggest-Only Mode
```
1. App polls GET /api/trading/signals
2. Display signals to user with confidence scores
3. User reviews and taps "Execute"
4. App calls POST /api/trading/execute
5. Server validates and places order on Kite
6. Webhook updates order status
7. Push notification sent to user
```

#### Auto-Trade Mode
```
1. AI generates signal (server-side)
2. Server validates risk limits
3. Server automatically places order on Kite
4. Push notification sent to user
5. User can view in GET /api/trading/orders
```

### 4. Real-time Updates
```
- WebSocket connection for live prices
- Push notifications for trade executions
- Periodic polling for positions and P&L
```

---

## Testing Endpoints

### Postback Test
```http
GET /api/kite/postback/test
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Kite Connect postback endpoint is active",
    "configured": true,
    "endpoint": "/api/kite/postback",
    "method": "POST"
  }
}
```

---

## Environment Variables

```env
# Kite Connect API
KITE_API_KEY=your_api_key_here
KITE_API_SECRET=your_api_secret_here

# Database
DATABASE_URL=postgresql://admin:password@localhost:5432/moneytr?schema=public

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

---

## Next Steps for Implementation

### High Priority
1. ✅ Trading controller (DONE)
2. ✅ Trading routes (DONE)
3. ✅ Database schema (DONE)
4. ✅ AI service skeleton (DONE)
5. ✅ Kite service skeleton (DONE)
6. ⏳ Implement AI signal generation logic
7. ⏳ Test Kite API integration with real credentials
8. ⏳ WebSocket service for real-time data
9. ⏳ Push notifications for trade alerts

### Medium Priority
- Risk management testing
- Performance optimization
- Rate limiting for trading endpoints
- Caching for market data
- Error handling improvements

### Low Priority
- Advanced AI models (ML/DL)
- Backtesting framework
- Paper trading mode
- Strategy builder UI
- Multi-exchange support

---

## Support

For issues or questions:
- Check logs in development console
- Review Kite Connect API docs: https://kite.trade/docs/connect/v3/
- Review Prisma docs: https://www.prisma.io/docs/

---

**Last Updated:** 2025-11-28
**Version:** 1.0.0
**Status:** Development
