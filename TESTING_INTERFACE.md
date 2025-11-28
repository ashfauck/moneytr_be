# Kite Connect Trading Test Interface

## Quick Start

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Open the test interface:**
   ```
   http://localhost:3000/test
   ```

3. **Follow the 3-step process:**
   - **Step 1:** Authenticate with phone number
   - **Step 2:** Test market data
   - **Step 3:** Place test orders

## Features

### 🔐 Authentication Flow
- Phone-based authentication with OTP
- Kite Connect OAuth integration
- Real-time connection status

### 📊 Market Data Testing
- Live quotes for multiple symbols
- Auto-refresh functionality
- Real-time price updates with charts

### 🛒 Order Management
- Place Market/Limit/Stop Loss orders
- Real-time order tracking
- Cancel orders functionality
- Account information display

### 🧪 Testing Tools
- Quick test order buttons
- Mock data for development
- API response logging
- Error handling demonstrations

## Configuration

### Environment Variables
```bash
# .env.dev
KITE_API_KEY=your_kite_api_key_here
KITE_API_SECRET=your_kite_api_secret_here
PORT=3000
```

### Kite Connect Setup
1. Create account at https://developers.kite.trade/
2. Create new app
3. Set redirect URL: `http://localhost:3000/api/kite/redirect`
4. Get API Key and Secret
5. Update .env.dev file

## API Endpoints Used

### Authentication
- `POST /api/auth/initiate` - Send OTP
- `POST /api/auth/verify` - Verify OTP

### Kite Connect
- `GET /api/kite/login` - Get login URL
- `POST /api/kite/redirect` - Process auth
- `POST /api/kite/quote` - Get market data
- `GET /api/kite/status` - Check connection

### Trading
- `POST /api/trading/place-order` - Place order
- `GET /api/trading/orders` - Get orders
- `GET /api/trading/positions` - Get positions
- `DELETE /api/trading/cancel-order/:id` - Cancel order
- `GET /api/trading/account-info` - Account info

## Testing Flow

### 1. Authentication Test
```javascript
// Test phone auth
POST /api/auth/initiate
{
  "phoneNumber": "+919876543210"
}

// Verify OTP (use 123456 for testing)
POST /api/auth/verify
{
  "phoneNumber": "+919876543210",
  "otp": "123456"
}
```

### 2. Market Data Test
```javascript
// Get quotes
POST /api/kite/quote
{
  "symbols": ["NSE:RELIANCE", "NSE:INFY"]
}
```

### 3. Order Placement Test
```javascript
// Place market order
POST /api/trading/place-order
{
  "exchange": "NSE",
  "tradingsymbol": "RELIANCE",
  "transaction_type": "BUY",
  "quantity": 1,
  "order_type": "MARKET",
  "product": "MIS"
}
```

## Mock Data

The test interface uses mock data when Kite Connect is not configured:

- **Quotes:** Random price movements
- **Orders:** Simulated order placement
- **Positions:** Mock portfolio data
- **Account:** Sample balance information

## Security Notes

⚠️ **This is for testing only!**

- Uses placeholder OTP (123456)
- Mock Kite Connect responses
- No real money transactions
- Logs all API calls for debugging

## Troubleshooting

### Common Issues

1. **"Disconnected" Status**
   - Check if server is running on port 3000
   - Verify .env.dev configuration

2. **Authentication Fails**
   - Use test phone number: +919876543210
   - Use test OTP: 123456

3. **Orders Don't Work**
   - Complete authentication first
   - Check browser console for errors

4. **Kite Connect Issues**
   - Verify API key configuration
   - Check redirect URL in Kite app settings

## Next Steps

1. **Production Setup:**
   - Add real Kite Connect credentials
   - Implement actual OTP service
   - Add proper error handling

2. **Enhanced Features:**
   - WebSocket for real-time updates
   - Advanced charting
   - Portfolio analytics
   - Risk management tools

## Support

For issues or questions:
- Check browser console logs
- Review API response logs
- Verify environment configuration
- Test with mock data first