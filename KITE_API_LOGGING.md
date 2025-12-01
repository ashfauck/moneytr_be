# Kite Connect API Logging & Mirroring System

## Overview

This system provides comprehensive logging and database mirroring for all Kite Connect API interactions. Every request to Kite API is:
1. **Stored in the database FIRST** (before sending to Kite)
2. **Logged with full request/response details**
3. **Mirrored in dedicated tables** for audit and recovery

## Database Schema

### 1. `kite_connections`
Stores Kite Connect authentication details for each user.

**Fields:**
- `user_id` - Link to your app's user
- `kite_user_id` - User ID from Kite
- `access_token` - Encrypted access token
- `refresh_token` - Encrypted refresh token
- `is_active` - Connection status
- `connected_at` - When user connected
- `last_used_at` - Last API call timestamp

### 2. `kite_api_logs`
Logs every single API request and response.

**Fields:**
- `endpoint` - API endpoint called (e.g., `/orders`, `/positions`)
- `method` - HTTP method (GET, POST, DELETE, etc.)
- `request_payload` - Full request data sent to Kite
- `response_payload` - Full response received from Kite
- `status_code` - HTTP status code
- `status` - SUCCESS/ERROR/TIMEOUT/PENDING
- `error_message` - Error details if failed
- `response_time` - API call duration in milliseconds
- `ip_address` - Client IP
- `user_agent` - Client browser/app

### 3. `kite_order_mirrors`
Stores ALL orders BEFORE sending to Kite API.

**Purpose:** Audit trail and recovery if Kite API fails

**Fields:**
- `kite_order_id` - Populated after Kite response
- `exchange`, `tradingsymbol`, `transaction_type`, `quantity`, etc.
- `status` - PENDING → SENT → COMPLETE/CANCELLED/REJECTED
- `kite_response` - Full response from Kite
- `sent_to_kite_at` - When sent to Kite
- `received_from_kite_at` - When response received

**Flow:**
```
1. User places order
2. Store in kite_order_mirrors with status=PENDING
3. Send to Kite API
4. Update mirror with kite_order_id and status=SENT
5. Kite confirms → Update status=COMPLETE
```

### 4. `kite_position_mirrors`
Stores positions fetched from Kite API.

**Purpose:** Historical tracking and offline access

**Fields:**
- All position fields from Kite (quantity, average_price, pnl, m2m, etc.)
- `kite_response` - Full JSON from Kite
- `fetched_at` - When data was synced

### 5. `kite_holding_mirrors`
Stores holdings fetched from Kite API.

**Purpose:** Long-term portfolio tracking

**Fields:**
- All holding fields from Kite
- `kite_response` - Full JSON from Kite
- `fetched_at` - When data was synced

## API Endpoints

### Audit & Monitoring Endpoints

#### 1. Get API Logs
```http
GET /api/kite/logs
```

**Query Parameters:**
- `endpoint` - Filter by endpoint (e.g., "/orders")
- `status` - Filter by status (SUCCESS/ERROR)
- `limit` - Number of records (default: 100)
- `startDate` - Filter from date
- `endDate` - Filter to date

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "uuid",
        "endpoint": "/orders/regular",
        "method": "POST",
        "status": "SUCCESS",
        "statusCode": 200,
        "responseTime": 234,
        "createdAt": "2025-11-28T10:00:00Z"
      }
    ],
    "count": 50
  }
}
```

#### 2. Get API Statistics
```http
GET /api/kite/logs/stats?period=day
```

**Periods:** day | week | month

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRequests": 150,
    "successfulRequests": 145,
    "failedRequests": 5,
    "averageResponseTime": 234.5,
    "endpointBreakdown": {
      "/orders": 50,
      "/positions": 30,
      "/quote": 70
    }
  }
}
```

#### 3. Get Order Mirrors
```http
GET /api/kite/order-mirrors
```

**Query Parameters:**
- `status` - PENDING/SENT/COMPLETE/CANCELLED/REJECTED
- `limit` - Number of records
- `startDate` - Filter from date
- `endDate` - Filter to date

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "mirror-uuid",
        "kiteOrderId": "241128000123456",
        "tradingsymbol": "RELIANCE",
        "transactionType": "BUY",
        "quantity": 10,
        "price": 2450.50,
        "status": "COMPLETE",
        "sentToKiteAt": "2025-11-28T10:00:00Z",
        "receivedFromKiteAt": "2025-11-28T10:00:01Z",
        "kiteResponse": { /* full Kite response */ }
      }
    ],
    "count": 25
  }
}
```

#### 4. Get Position Mirrors
```http
GET /api/kite/position-mirrors
```

**Response:**
```json
{
  "success": true,
  "data": {
    "positions": [
      {
        "tradingsymbol": "RELIANCE",
        "quantity": 10,
        "averagePrice": 2450.50,
        "lastPrice": 2460.00,
        "pnl": 95.00,
        "fetchedAt": "2025-11-28T10:00:00Z"
      }
    ]
  }
}
```

#### 5. Get Holding Mirrors
```http
GET /api/kite/holding-mirrors
```

Similar structure to position mirrors.

#### 6. Get Kite Connection Status
```http
GET /api/kite/connection
```

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "connection": {
      "kiteUserId": "ABC123",
      "kiteUserName": "John Doe",
      "isActive": true,
      "connectedAt": "2025-11-28T09:00:00Z",
      "lastUsedAt": "2025-11-28T10:00:00Z"
    }
  }
}
```

## Service Usage

### Enhanced Kite Service

Use `EnhancedKiteService` instead of `KiteService` for automatic logging and mirroring.

#### Example: Place Order with Logging

```typescript
import { enhancedKiteService } from './services/enhancedKiteService';

// Place order - automatically stored in DB first, then sent to Kite
const result = await enhancedKiteService.placeOrder(
  userId,
  {
    exchange: 'NSE',
    tradingsymbol: 'RELIANCE',
    transaction_type: 'BUY',
    quantity: 10,
    order_type: 'LIMIT',
    product: 'CNC',
    price: 2450.50,
  },
  {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  }
);

// Result contains both Kite order ID and database mirror ID
console.log(result.order_id);    // Kite order ID
console.log(result.mirrorId);    // Database mirror ID for audit
```

#### Example: Get Positions with Logging

```typescript
// Fetches from Kite AND stores in database
const positions = await enhancedKiteService.getPositions(
  userId,
  {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  }
);

// Positions are now available in both:
// 1. Return value (live from Kite)
// 2. kite_position_mirrors table (for historical tracking)
```

#### Example: Get Orders with Sync

```typescript
// Fetches from Kite AND syncs with order mirrors
const orders = await enhancedKiteService.getOrders(
  userId,
  {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  }
);

// All order statuses are automatically updated in kite_order_mirrors
```

## Direct API Logger Usage

For custom API calls not covered by Enhanced Kite Service:

```typescript
import { KiteApiLogger } from './services/kiteApiLogger';

// Manual logging
const logId = await KiteApiLogger.logRequest({
  userId,
  endpoint: '/custom-endpoint',
  method: 'POST',
  requestPayload: { /* your data */ },
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});

try {
  // Your API call
  const response = await someApiCall();
  
  // Log success
  await KiteApiLogger.logResponse({
    logId,
    responsePayload: response,
    statusCode: 200,
    status: 'SUCCESS',
    responseTime: 234,
  });
} catch (error) {
  // Log error
  await KiteApiLogger.logResponse({
    logId,
    statusCode: 500,
    status: 'ERROR',
    errorMessage: error.message,
    responseTime: 234,
  });
}
```

## Benefits

### 1. **Complete Audit Trail**
- Every API call is logged with full request/response
- Track exactly when and how orders were placed
- Investigate issues with complete context

### 2. **Order Recovery**
- Orders stored BEFORE sending to Kite
- If Kite API fails, orders are still in database
- Can retry failed orders from database

### 3. **Performance Monitoring**
- Track response times for each endpoint
- Identify slow or failing API calls
- Optimize based on statistics

### 4. **Historical Data**
- Positions and holdings tracked over time
- Analyze portfolio changes
- Generate reports from historical data

### 5. **Debugging**
- Full request/response payloads stored
- Easy to reproduce issues
- Compare expected vs actual behavior

### 6. **Compliance**
- Complete audit trail for regulatory requirements
- Prove when and how orders were placed
- Track all trading activity

## Migration

Run the Prisma migration:

```bash
npx prisma migrate dev --name add_kite_api_logging
```

This creates all necessary tables:
- kite_connections
- kite_api_logs  
- kite_order_mirrors
- kite_position_mirrors
- kite_holding_mirrors

## Environment Variables

No additional environment variables needed. Uses existing:
- `KITE_API_KEY`
- `KITE_API_SECRET`
- `DATABASE_URL`

## Best Practices

1. **Always use EnhancedKiteService** instead of direct Kite SDK calls
2. **Pass request context** (IP, user agent) for better audit trails
3. **Regularly review API logs** for errors and performance issues
4. **Archive old logs** after 6-12 months (implement cleanup job)
5. **Monitor database size** as logs can grow large
6. **Use filters** when querying logs to avoid loading too much data

## Database Maintenance

### Clean up old logs (recommended monthly)

```sql
-- Delete logs older than 6 months
DELETE FROM kite_api_logs WHERE created_at < NOW() - INTERVAL '6 months';

-- Archive old order mirrors to separate table (optional)
INSERT INTO kite_order_mirrors_archive 
SELECT * FROM kite_order_mirrors WHERE created_at < NOW() - INTERVAL '1 year';

DELETE FROM kite_order_mirrors WHERE created_at < NOW() - INTERVAL '1 year';
```

### Index maintenance

All necessary indexes are included in the migration:
- User ID indexes for fast user queries
- Endpoint indexes for filtering logs
- Date indexes for time-range queries
- Status indexes for filtering by status

## Security Considerations

1. **Access tokens are stored** - Ensure database is properly secured
2. **Full request/response payloads** - May contain sensitive data
3. **Limit who can access audit endpoints** - Use proper authentication
4. **Consider encrypting** sensitive fields in production
5. **Implement rate limiting** on audit endpoints

## Next Steps

1. **Implement encryption** for access_token and refresh_token fields
2. **Add automated cleanup job** for old logs
3. **Create dashboard** to visualize API statistics
4. **Set up alerts** for failed API calls
5. **Implement retry logic** for failed orders using mirrors
