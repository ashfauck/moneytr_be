# Kite Connect SDK - Step-by-Step Integration Guide

## Overview
This guide explains how to use the Zerodha Kite Connect SDK for placing orders, getting data, and managing a trading account.

---

## 🔑 Step 1: Setup & Authentication

### 1.1 Get Kite Connect Credentials
1. **Create Kite Connect App** at https://developers.kite.trade/
2. Get your `API_KEY` and `API_SECRET`
3. Add to your `.env.dev`:
```env
KITE_API_KEY=your_api_key_here
KITE_API_SECRET=your_api_secret_here
```

### 1.2 OAuth Authentication Flow
```typescript
// User visits this URL to login to Zerodha
const loginUrl = `https://kite.zerodha.com/connect/login?api_key=${API_KEY}&v=3`;

// After login, Kite redirects with request_token:
// https://yourdomain.com/kite/redirect?request_token=xyz&action=login&status=success
```

### 1.3 Exchange Request Token for Access Token
```typescript
// Your /api/kite/redirect endpoint handles this
const kiteService = new KiteService();
const session = await kiteService.generateSession(requestToken);

// Returns:
// {
//   userId: "ABC123", 
//   accessToken: "eyJhbGci...",
//   refreshToken: "refresh_token_here"
// }
```

---

## 📊 Step 2: Get Market Data

### 2.1 Get Live Quotes
```typescript
// Get real-time quotes for symbols
const userId = "ABC123";
const symbols = ["NSE:RELIANCE", "NSE:INFY", "NSE:TCS"];

const quotes = await kiteService.getQuote(userId, symbols);

// Response:
// {
//   "NSE:RELIANCE": {
//     "instrument_token": 738561,
//     "last_price": 2500.75,
//     "volume": 1234567,
//     "change": 25.50,
//     "ohlc": {
//       "open": 2480.00,
//       "high": 2510.00,
//       "low": 2475.00,
//       "close": 2475.25
//     }
//   }
// }
```

### 2.2 Get Historical Data (for AI analysis)
```typescript
// Note: Historical data requires WebSocket or separate API calls
// Use this for AI signal generation
const historicalData = await kite.getHistoricalData(
  instrument_token,
  "day",        // interval: minute, day, etc.
  from_date,    // "2023-01-01"
  to_date,      // "2023-12-31"
  continuous    // true/false
);
```

---

## 🛒 Step 3: Place Orders

### 3.1 Market Order (Buy/Sell immediately)
```typescript
const orderParams = {
  exchange: "NSE",
  tradingsymbol: "RELIANCE",
  transaction_type: "BUY",
  quantity: 10,
  order_type: "MARKET",
  product: "CNC",        // CNC=delivery, MIS=intraday, NRML=normal
  tag: "myapp"           // optional tag for tracking
};

const result = await kiteService.placeOrder(userId, orderParams);
// Returns: { order_id: "240127000123456" }
```

### 3.2 Limit Order (Buy/Sell at specific price)
```typescript
const orderParams = {
  exchange: "NSE",
  tradingsymbol: "INFY",
  transaction_type: "SELL",
  quantity: 5,
  order_type: "LIMIT",
  price: 1500.00,       // Target price
  product: "MIS",
  validity: "DAY",      // DAY or IOC (Immediate or Cancel)
  tag: "ai_signal_123"
};

const result = await kiteService.placeOrder(userId, orderParams);
```

### 3.3 Stop Loss Order
```typescript
const stopLossParams = {
  exchange: "NSE",
  tradingsymbol: "TCS",
  transaction_type: "SELL",
  quantity: 8,
  order_type: "SL-M",        // Stop Loss Market
  trigger_price: 3500.00,    // Stop loss trigger price
  product: "CNC"
};

const result = await kiteService.placeOrder(userId, stopLossParams);
```

### 3.4 Complete AI Trading Example
```typescript
// AI generates a signal
const signal = await aiTradingService.generateSignal("RELIANCE", marketData);

if (signal.signalType === "BUY" && signal.confidence > 75) {
  // Calculate position size based on risk
  const positionSize = aiTradingService.calculatePositionSize(
    accountBalance,
    riskPercent,
    signal.entryPrice,
    signal.stopLoss
  );
  
  // Place main order
  const mainOrder = await kiteService.placeOrder(userId, {
    exchange: "NSE",
    tradingsymbol: "RELIANCE",
    transaction_type: "BUY",
    quantity: positionSize,
    order_type: "LIMIT",
    price: signal.entryPrice,
    product: "MIS"
  });
  
  // Place stop loss order
  const stopLossOrder = await kiteService.placeOrder(userId, {
    exchange: "NSE", 
    tradingsymbol: "RELIANCE",
    transaction_type: "SELL",
    quantity: positionSize,
    order_type: "SL-M",
    trigger_price: signal.stopLoss,
    product: "MIS"
  });
}
```

---

## 📈 Step 4: Monitor Orders & Positions

### 4.1 Get All Orders
```typescript
const orders = await kiteService.getOrders(userId);

// Response array:
// [
//   {
//     "order_id": "240127000123456",
//     "status": "COMPLETE",
//     "tradingsymbol": "RELIANCE",
//     "transaction_type": "BUY",
//     "quantity": 10,
//     "filled_quantity": 10,
//     "pending_quantity": 0,
//     "price": 0,
//     "average_price": 2501.25,
//     "order_timestamp": "2024-01-27 09:30:15",
//     "exchange_timestamp": "2024-01-27 09:30:15"
//   }
// ]
```

### 4.2 Get Specific Order
```typescript
const order = await kiteService.getOrder(userId, "240127000123456");
```

### 4.3 Get Current Positions
```typescript
const positions = await kiteService.getPositions(userId);

// Response:
// {
//   "net": [
//     {
//       "tradingsymbol": "RELIANCE",
//       "exchange": "NSE",
//       "quantity": 10,
//       "average_price": 2501.25,
//       "last_price": 2515.50,
//       "pnl": 142.50,
//       "product": "MIS"
//     }
//   ],
//   "day": [ ... ]  // Intraday positions
// }
```

### 4.4 Get Portfolio Holdings
```typescript
const holdings = await kiteService.getHoldings(userId);

// Response:
// [
//   {
//     "tradingsymbol": "INFY",
//     "exchange": "NSE",
//     "quantity": 50,
//     "average_price": 1450.00,
//     "last_price": 1475.25,
//     "pnl": 1262.50,
//     "product": "CNC"
//   }
// ]
```

---

## ❌ Step 5: Cancel Orders

### 5.1 Cancel Order
```typescript
const orderId = "240127000123456";
await kiteService.cancelOrder(userId, orderId);

// For different order varieties:
await kiteService.cancelOrder(userId, orderId, "regular");  // Regular orders
await kiteService.cancelOrder(userId, orderId, "co");       // Cover orders
await kiteService.cancelOrder(userId, orderId, "amo");      // After market orders
```

---

## 🔄 Step 6: Order Status Tracking (Webhooks)

### 6.1 Webhook Integration
Your `/api/kite/postback` endpoint receives these updates:

```typescript
// Webhook payload from Kite Connect
{
  "order_id": "240127000123456",
  "status": "COMPLETE",           // PENDING, COMPLETE, CANCELLED, REJECTED
  "filled_quantity": 10,
  "average_price": 2501.25,
  "order_timestamp": "2024-01-27 09:30:15",
  "checksum": "sha256_hash_here"  // For security validation
}

// Your webhook handler updates database:
const order = await prisma.order.update({
  where: { kiteOrderId: order_id },
  data: {
    status: "COMPLETE",
    executedAt: new Date(order_timestamp),
    pnl: (average_price - original_price) * filled_quantity
  }
});
```

---

## 🎯 Step 7: Complete Trading Flow

### 7.1 Full Trading Workflow

```typescript
class TradingWorkflow {
  async executeTrade(userId: string, signal: AISignal) {
    try {
      // 1. Validate user has active Kite session
      const accessToken = kiteService.getAccessToken(userId);
      if (!accessToken) {
        throw new Error("User not connected to Kite");
      }
      
      // 2. Get current market price
      const quote = await kiteService.getQuote(userId, [`NSE:${signal.symbol}`]);
      const currentPrice = quote[`NSE:${signal.symbol}`].last_price;
      
      // 3. Validate signal is still valid
      if (Math.abs(currentPrice - signal.entryPrice) > signal.entryPrice * 0.02) {
        throw new Error("Price moved too much since signal generation");
      }
      
      // 4. Check risk limits
      const riskCheck = await validateRiskLimits(userId, signal.quantity, currentPrice);
      if (!riskCheck.allowed) {
        throw new Error(riskCheck.reason);
      }
      
      // 5. Place the order
      const order = await kiteService.placeOrder(userId, {
        exchange: "NSE",
        tradingsymbol: signal.symbol,
        transaction_type: signal.signalType, // BUY or SELL
        quantity: signal.quantity,
        order_type: "LIMIT",
        price: signal.entryPrice,
        product: "MIS"
      });
      
      // 6. Save to database
      await prisma.order.create({
        data: {
          userId,
          kiteOrderId: order.order_id,
          symbol: signal.symbol,
          orderType: signal.signalType,
          quantity: signal.quantity,
          price: signal.entryPrice,
          status: "PENDING",
          aiSignalId: signal.id
        }
      });
      
      // 7. Place stop loss order
      if (signal.stopLoss) {
        const stopLossOrder = await kiteService.placeOrder(userId, {
          exchange: "NSE",
          tradingsymbol: signal.symbol,
          transaction_type: signal.signalType === "BUY" ? "SELL" : "BUY",
          quantity: signal.quantity,
          order_type: "SL-M",
          trigger_price: signal.stopLoss,
          product: "MIS"
        });
      }
      
      // 8. Send notification
      await pushNotificationService.sendNotification(userId, {
        title: "Order Placed",
        body: `${signal.signalType} ${signal.quantity} ${signal.symbol} @ ₹${signal.entryPrice}`
      });
      
      return { success: true, orderId: order.order_id };
      
    } catch (error) {
      logger.error("Trade execution failed:", error);
      throw error;
    }
  }
}
```

### 7.2 Auto Trading Loop (AUTO_TRADE mode)

```typescript
class AutoTradingService {
  async startAutoTrading(userId: string) {
    while (true) {
      try {
        // 1. Check if auto trading is enabled
        const settings = await prisma.tradingSettings.findUnique({
          where: { userId }
        });
        
        if (settings?.tradingMode !== "AUTO_TRADE") {
          await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s
          continue;
        }
        
        // 2. Get watchlist symbols
        const watchlist = ["RELIANCE", "INFY", "TCS", "HDFCBANK"];
        
        for (const symbol of watchlist) {
          // 3. Get current market data
          const quote = await kiteService.getQuote(userId, [`NSE:${symbol}`]);
          const marketData = this.formatMarketData(quote[`NSE:${symbol}`]);
          
          // 4. Generate AI signal
          const signal = await aiTradingService.generateSignal(
            symbol,
            marketData,
            await this.getHistoricalData(symbol)
          );
          
          // 5. Execute if signal confidence > threshold
          if (signal.confidence > 70) {
            await this.executeTrade(userId, signal);
          }
        }
        
        // 6. Wait before next iteration
        await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
        
      } catch (error) {
        logger.error("Auto trading loop error:", error);
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }
  }
}
```

---

## ⚠️ Important Notes

### Error Handling
```typescript
try {
  const order = await kiteService.placeOrder(userId, params);
} catch (error) {
  if (error.message.includes("Insufficient funds")) {
    // Handle insufficient balance
  } else if (error.message.includes("Order rejected")) {
    // Handle order rejection
  } else {
    // Handle other errors
  }
}
```

### Rate Limits
- **Order APIs**: 10 requests/second
- **Market Data**: 3 requests/second
- **Portfolio**: 1 request/second

### Security Best Practices
1. **Never expose API secret** to frontend/mobile
2. **Validate checksums** on all webhook calls
3. **Implement rate limiting** on your endpoints
4. **Log all trading activities** for audit
5. **Use HTTPS only** in production

---

## 🚀 Quick Test

Test your integration:

```typescript
// 1. Test connection
const userId = "test_user";
const positions = await kiteService.getPositions(userId);
console.log("✅ Connected successfully");

// 2. Test market data
const quotes = await kiteService.getQuote(userId, ["NSE:RELIANCE"]);
console.log("✅ Market data working");

// 3. Test order placement (small quantity)
const testOrder = await kiteService.placeOrder(userId, {
  exchange: "NSE",
  tradingsymbol: "RELIANCE", 
  transaction_type: "BUY",
  quantity: 1,
  order_type: "LIMIT",
  price: quotes["NSE:RELIANCE"].last_price - 10, // Below market price
  product: "MIS"
});
console.log("✅ Order placement working");

// 4. Cancel test order
await kiteService.cancelOrder(userId, testOrder.order_id);
console.log("✅ Order cancellation working");
```

Your trading system is now ready! 🎉