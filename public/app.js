// Paper Trading Platform - Virtual Trading Simulation
class PaperTradingPlatform {
    constructor() {
        console.log('PaperTradingPlatform constructor called');
        this.baseURL = 'http://localhost:3000/api';
        this.token = localStorage.getItem('authToken');
        this.userId = localStorage.getItem('userId');
        this.autoRefreshInterval = null;
        
        // Paper Trading State
        this.paperPortfolio = this.loadPaperPortfolio();
        this.marketData = {};
        this.orders = [];
        this.positions = [];
        this.trades = [];
        
        console.log('Calling initializeEventListeners...');
        this.initializeEventListeners();
        this.initializePaperTrading();
        this.updateUI();
        this.checkAuthStatus();
        console.log('PaperTradingPlatform constructor completed');
    }

    // Initialize Paper Trading Portfolio
    loadPaperPortfolio() {
        const saved = localStorage.getItem('paperTradingPortfolio');
        if (saved) {
            return JSON.parse(saved);
        }
        
        // Default paper trading portfolio
        return {
            initialBalance: 100000,
            currentBalance: 100000,
            totalPnL: 0,
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            bestTrade: 0,
            worstTrade: 0,
            positions: {},
            orderHistory: [],
            startDate: new Date().toISOString()
        };
    }

    savePaperPortfolio() {
        localStorage.setItem('paperTradingPortfolio', JSON.stringify(this.paperPortfolio));
        this.updatePortfolioDisplay();
    }

    initializePaperTrading() {
        this.updatePortfolioDisplay();
        this.log('Paper Trading Platform initialized with virtual portfolio of ₹1,00,000', 'success');
        this.log('🚀 Start trading risk-free! All trades are simulated.', 'info');
        
        // Auto-enable trading buttons for paper trading
        this.enableTradingButtons();
        this.updateConnectionStatus('paper-trading');
    }

    initializeEventListeners() {
        console.log('Initializing event listeners...');
        
        // Paper Trading Account Setup - Use setTimeout to ensure DOM is ready
        setTimeout(() => {
            const startBtn = document.getElementById('start-auth-btn');
            console.log('Start button found:', startBtn);
            if (startBtn) {
                // Remove any existing listeners
                startBtn.replaceWith(startBtn.cloneNode(true));
                const newStartBtn = document.getElementById('start-auth-btn');
                
                newStartBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    console.log('Start button clicked!');
                    this.startPaperAccount();
                });
                console.log('Event listener attached to start button');
            } else {
                console.error('Start button not found!');
            }
        }, 100);
        
        const verifyBtn = document.getElementById('verify-otp-btn');
        if (verifyBtn) {
            verifyBtn.addEventListener('click', () => this.verifyPaperAccount());
        }

        // Market Data
        document.getElementById('get-quotes-btn')?.addEventListener('click', () => this.getQuotes());
        document.getElementById('auto-refresh-btn')?.addEventListener('click', () => this.toggleAutoRefresh());

        // Orders
        document.getElementById('place-order-btn')?.addEventListener('click', () => this.placePaperOrder());
        document.getElementById('get-orders-btn')?.addEventListener('click', () => this.getPaperOrders());
        document.getElementById('get-positions-btn')?.addEventListener('click', () => this.getPaperPositions());

        // Quick Actions
        document.getElementById('test-market-order-btn')?.addEventListener('click', () => this.testMarketOrder());
        document.getElementById('test-limit-order-btn')?.addEventListener('click', () => this.testLimitOrder());
        document.getElementById('cancel-all-orders-btn')?.addEventListener('click', () => this.cancelAllPaperOrders());

        // Paper Trading Specific
        document.getElementById('reset-portfolio-btn')?.addEventListener('click', () => this.resetPaperPortfolio());

        // Utils
        document.getElementById('clear-logs-btn')?.addEventListener('click', () => this.clearLogs());
        document.getElementById('order-order-type')?.addEventListener('change', () => this.updatePriceField());
    }

    async startPaperAccount() {
        console.log('startPaperAccount called!');
        this.setLoading('start-auth-btn', true);
        
        // Simulate account creation
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const otpSection = document.getElementById('otp-section');
        console.log('OTP section found:', otpSection);
        if (otpSection) {
            otpSection.classList.remove('hidden');
        }
        this.showStatus('Paper trading account ready! Enter any 6-digit code to activate.', 'success', 'auth-status');
        
        this.setLoading('start-auth-btn', false);
    }

    async verifyPaperAccount() {
        const otp = document.getElementById('otp-input').value.trim();
        
        if (!otp || otp.length !== 6) {
            this.showStatus('Please enter a 6-digit code', 'error', 'auth-status');
            return;
        }

        this.setLoading('verify-otp-btn', true);
        
        // Simulate verification
        await new Promise(resolve => setTimeout(resolve, 800));
        
        this.userId = 'paper_trader_' + Date.now();
        localStorage.setItem('userId', this.userId);
        
        this.updateConnectionStatus('paper-trading');
        document.getElementById('otp-section').classList.add('hidden');
        
        this.showStatus('Paper trading account activated! Start trading with virtual funds.', 'success', 'auth-status');
        this.log('Paper trading account activated successfully', 'success');
        
        this.setLoading('verify-otp-btn', false);
    }

    async checkAuthStatus() {
        // For paper trading, we don't need real authentication
        if (this.userId) {
            this.updateConnectionStatus('paper-trading');
            this.enableTradingButtons();
        }
    }

    async getQuotes() {
        this.setLoading('get-quotes-btn', true);
        
        try {
            const instruments = document.getElementById('quotes-instruments').value.trim();
            if (!instruments) {
                throw new Error('Please enter instrument symbols (e.g., RELIANCE, INFY, TCS)');
            }

            // Simulate market data for paper trading
            const symbols = instruments.split(',').map(s => s.trim().toUpperCase());
            const simulatedData = await this.generateSimulatedMarketData(symbols);

            this.marketData = simulatedData;
            this.displayQuotes(simulatedData);
            this.showStatus('Simulated market data generated successfully', 'success', 'quotes-status');
        } catch (error) {
            this.showStatus(`Error: ${error.message}`, 'error', 'quotes-status');
        } finally {
            this.setLoading('get-quotes-btn', false);
        }
    }

    async generateSimulatedMarketData(symbols) {
        const data = {};
        
        for (const symbol of symbols) {
            // Generate realistic price data
            const basePrice = this.getBasePriceForSymbol(symbol);
            const variation = (Math.random() - 0.5) * 0.05; // ±2.5% variation
            const ltp = basePrice * (1 + variation);
            const change = ltp - basePrice;
            const changePercent = (change / basePrice) * 100;

            data[symbol] = {
                instrument_token: symbol,
                last_price: parseFloat(ltp.toFixed(2)),
                open: parseFloat((basePrice * (1 + (Math.random() - 0.5) * 0.02)).toFixed(2)),
                high: parseFloat((ltp * 1.01).toFixed(2)),
                low: parseFloat((ltp * 0.99).toFixed(2)),
                close: basePrice,
                net_change: parseFloat(change.toFixed(2)),
                oi: Math.floor(Math.random() * 1000000),
                oi_day_high: Math.floor(Math.random() * 1200000),
                oi_day_low: Math.floor(Math.random() * 800000),
                timestamp: new Date().toISOString(),
                depth: this.generateMarketDepth(ltp),
                volume: Math.floor(Math.random() * 5000000),
                buy_quantity: Math.floor(Math.random() * 1000000),
                sell_quantity: Math.floor(Math.random() * 1000000),
                change_percent: parseFloat(changePercent.toFixed(2))
            };
        }

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return data;
    }

    getBasePriceForSymbol(symbol) {
        const basePrices = {
            'RELIANCE': 2450,
            'TCS': 3600,
            'INFY': 1450,
            'HDFCBANK': 1650,
            'ICICIBANK': 950,
            'ITC': 420,
            'BHARTIARTL': 850,
            'SBIN': 620,
            'LT': 2800,
            'MARUTI': 10200
        };
        
        return basePrices[symbol] || (Math.random() * 1000 + 100);
    }

    generateMarketDepth(price) {
        const depth = { buy: [], sell: [] };
        
        for (let i = 0; i < 5; i++) {
            depth.buy.push({
                price: parseFloat((price - (i + 1) * 0.5).toFixed(2)),
                quantity: Math.floor(Math.random() * 10000) + 1000,
                orders: Math.floor(Math.random() * 50) + 1
            });
            
            depth.sell.push({
                price: parseFloat((price + (i + 1) * 0.5).toFixed(2)),
                quantity: Math.floor(Math.random() * 10000) + 1000,
                orders: Math.floor(Math.random() * 50) + 1
            });
        }
        
        return depth;
    }

    async placePaperOrder() {
        this.setLoading('place-order-btn', true);
        
        try {
            const orderData = this.getOrderFormData();
            
            // Validate order
            const validation = this.validatePaperOrder(orderData);
            if (!validation.valid) {
                throw new Error(validation.message);
            }

            // Simulate order execution
            const order = await this.executePaperOrder(orderData);
            
            this.paperPortfolio.orderHistory.unshift(order);
            this.updatePositions(order);
            this.savePaperPortfolio();
            
            this.displayOrderResult(order);
            this.showStatus('Paper order executed successfully', 'success', 'order-status');
            this.log(`Paper Order ${order.order_id}: ${order.transaction_type} ${order.quantity} ${order.tradingsymbol} at ₹${order.price}`, 'success');
            
        } catch (error) {
            this.showStatus(`Error: ${error.message}`, 'error', 'order-status');
        } finally {
            this.setLoading('place-order-btn', false);
        }
    }

    validatePaperOrder(orderData) {
        // Check balance for buy orders
        if (orderData.transaction_type === 'BUY') {
            const requiredAmount = orderData.quantity * orderData.price;
            if (this.paperPortfolio.currentBalance < requiredAmount) {
                return {
                    valid: false,
                    message: `Insufficient balance. Required: ₹${requiredAmount.toFixed(2)}, Available: ₹${this.paperPortfolio.currentBalance.toFixed(2)}`
                };
            }
        } else {
            // Check position for sell orders
            const position = this.paperPortfolio.positions[orderData.tradingsymbol];
            if (!position || position.quantity < orderData.quantity) {
                return {
                    valid: false,
                    message: `Insufficient position. Available: ${position?.quantity || 0}, Required: ${orderData.quantity}`
                };
            }
        }

        return { valid: true };
    }

    async executePaperOrder(orderData) {
        // Simulate market execution
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const orderId = 'PO' + Date.now() + Math.floor(Math.random() * 1000);
        const executionPrice = this.getExecutionPrice(orderData);
        
        const order = {
            order_id: orderId,
            tradingsymbol: orderData.tradingsymbol,
            exchange: orderData.exchange,
            transaction_type: orderData.transaction_type,
            order_type: orderData.order_type,
            quantity: orderData.quantity,
            price: executionPrice,
            product: orderData.product,
            status: 'COMPLETE',
            order_timestamp: new Date().toISOString(),
            exchange_order_id: 'EX' + orderId,
            filled_quantity: orderData.quantity,
            pending_quantity: 0,
            average_price: executionPrice,
            tag: 'paper-trading'
        };

        return order;
    }

    getExecutionPrice(orderData) {
        if (orderData.order_type === 'MARKET') {
            const marketPrice = this.marketData[orderData.tradingsymbol]?.last_price || orderData.price;
            // Add slippage for market orders
            const slippage = (Math.random() - 0.5) * 0.002; // ±0.1%
            return parseFloat((marketPrice * (1 + slippage)).toFixed(2));
        }
        
        return orderData.price;
    }

    updatePositions(order) {
        const symbol = order.tradingsymbol;
        let position = this.paperPortfolio.positions[symbol] || {
            tradingsymbol: symbol,
            quantity: 0,
            average_price: 0,
            last_price: 0,
            pnl: 0,
            realised_pnl: 0,
            unrealised_pnl: 0,
            value: 0
        };

        const orderValue = order.quantity * order.price;

        if (order.transaction_type === 'BUY') {
            // Update balance
            this.paperPortfolio.currentBalance -= orderValue;
            
            // Update position
            const totalQuantity = position.quantity + order.quantity;
            const totalValue = (position.quantity * position.average_price) + orderValue;
            
            position.average_price = totalValue / totalQuantity;
            position.quantity = totalQuantity;
        } else {
            // SELL order
            this.paperPortfolio.currentBalance += orderValue;
            
            // Calculate realized P&L
            const realizedPnL = (order.price - position.average_price) * order.quantity;
            position.realised_pnl += realizedPnL;
            this.paperPortfolio.totalPnL += realizedPnL;
            
            // Update quantity
            position.quantity -= order.quantity;
            
            // Track trade statistics
            this.paperPortfolio.totalTrades++;
            if (realizedPnL > 0) {
                this.paperPortfolio.winningTrades++;
                if (realizedPnL > this.paperPortfolio.bestTrade) {
                    this.paperPortfolio.bestTrade = realizedPnL;
                }
            } else {
                this.paperPortfolio.losingTrades++;
                if (realizedPnL < this.paperPortfolio.worstTrade) {
                    this.paperPortfolio.worstTrade = realizedPnL;
                }
            }
        }

        // Update current market price
        position.last_price = this.marketData[symbol]?.last_price || order.price;
        
        // Calculate unrealized P&L
        if (position.quantity > 0) {
            position.unrealised_pnl = (position.last_price - position.average_price) * position.quantity;
            position.value = position.quantity * position.last_price;
        } else {
            position.unrealised_pnl = 0;
            position.value = 0;
        }

        position.pnl = position.realised_pnl + position.unrealised_pnl;

        // Store or remove position
        if (position.quantity > 0) {
            this.paperPortfolio.positions[symbol] = position;
        } else {
            delete this.paperPortfolio.positions[symbol];
        }
    }

    async getPaperOrders() {
        this.setLoading('get-orders-btn', true);
        
        try {
            // Get recent orders from paper portfolio
            const recentOrders = this.paperPortfolio.orderHistory.slice(0, 20);
            
            this.displayOrders(recentOrders);
            this.showStatus(`Retrieved ${recentOrders.length} paper orders`, 'success', 'orders-status');
            
        } catch (error) {
            this.showStatus(`Error: ${error.message}`, 'error', 'orders-status');
        } finally {
            this.setLoading('get-orders-btn', false);
        }
    }

    async getPaperPositions() {
        this.setLoading('get-positions-btn', true);
        
        try {
            const positions = Object.values(this.paperPortfolio.positions);
            
            // Update unrealized P&L with latest prices
            for (const position of positions) {
                if (this.marketData[position.tradingsymbol]) {
                    position.last_price = this.marketData[position.tradingsymbol].last_price;
                    position.unrealised_pnl = (position.last_price - position.average_price) * position.quantity;
                    position.value = position.quantity * position.last_price;
                    position.pnl = position.realised_pnl + position.unrealised_pnl;
                }
            }
            
            this.displayPositions(positions);
            this.showStatus(`Retrieved ${positions.length} positions`, 'success', 'positions-status');
            
        } catch (error) {
            this.showStatus(`Error: ${error.message}`, 'error', 'positions-status');
        } finally {
            this.setLoading('get-positions-btn', false);
        }
    }

    async cancelAllPaperOrders() {
        this.setLoading('cancel-all-orders-btn', true);
        
        try {
            // In paper trading, we don't have pending orders - simulate instant execution
            await new Promise(resolve => setTimeout(resolve, 500));
            
            this.showStatus('No pending orders to cancel in paper trading', 'info', 'orders-status');
            this.log('Paper trading: All orders execute instantly', 'info');
            
        } catch (error) {
            this.showStatus(`Error: ${error.message}`, 'error', 'orders-status');
        } finally {
            this.setLoading('cancel-all-orders-btn', false);
        }
    }

    resetPaperPortfolio() {
        if (confirm('Are you sure you want to reset your paper trading portfolio? This will clear all positions and reset balance to ₹1,00,000.')) {
            this.paperPortfolio = {
                initialBalance: 100000,
                currentBalance: 100000,
                totalPnL: 0,
                totalTrades: 0,
                winningTrades: 0,
                losingTrades: 0,
                bestTrade: 0,
                worstTrade: 0,
                positions: {},
                orderHistory: [],
                startDate: new Date().toISOString()
            };
            
            this.savePaperPortfolio();
            this.clearLogs();
    updatePortfolioDisplay() {
        // Update portfolio summary
        const totalValue = this.paperPortfolio.currentBalance + 
            Object.values(this.paperPortfolio.positions).reduce((sum, pos) => sum + pos.value, 0);
        
        const totalUnrealizedPnL = Object.values(this.paperPortfolio.positions)
            .reduce((sum, pos) => sum + pos.unrealised_pnl, 0);
        
        const winRate = this.paperPortfolio.totalTrades > 0 ? 
            (this.paperPortfolio.winningTrades / this.paperPortfolio.totalTrades * 100).toFixed(1) : 0;

        // Update portfolio stats in UI
        document.getElementById('portfolio-balance').textContent = `₹${this.paperPortfolio.currentBalance.toLocaleString()}`;
        document.getElementById('portfolio-value').textContent = `₹${totalValue.toLocaleString()}`;
        document.getElementById('portfolio-pnl').textContent = `₹${(this.paperPortfolio.totalPnL + totalUnrealizedPnL).toLocaleString()}`;
        document.getElementById('portfolio-trades').textContent = this.paperPortfolio.totalTrades;
        document.getElementById('portfolio-win-rate').textContent = `${winRate}%`;
        
        // Update P&L color
        const pnlElement = document.getElementById('portfolio-pnl');
        const totalPnL = this.paperPortfolio.totalPnL + totalUnrealizedPnL;
        pnlElement.className = totalPnL >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold';
    }
                
                // Load account info
                await this.loadAccountInfo();
            } else {
                this.showStatus(response.message || 'Kite authentication failed', 'error', 'auth-status');
            }
        } catch (error) {
            this.showStatus('Error processing Kite authentication', 'error', 'auth-status');
        }
    }

    async getQuotes() {
        const selectedSymbols = Array.from(document.querySelectorAll('.symbol-checkbox:checked'))
            .map(cb => cb.value);
        
        if (selectedSymbols.length === 0) {
            this.log('Please select at least one symbol', 'error');
            return;
        }

        this.setLoading('get-quotes-btn', true);
        
        try {
            const response = await this.apiCall('POST', '/kite/quote', {
                symbols: selectedSymbols
            });
            
            if (response.success) {
                this.displayQuotes(response.data.quotes);
                this.log('Market data retrieved successfully', 'success');
            } else {
                this.log('Failed to get quotes: ' + (response.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            this.log('Error getting quotes: ' + error.message, 'error');
        }
        
        this.setLoading('get-quotes-btn', false);
    }

    displayQuotes(quotes) {
        const quotesDisplay = document.getElementById('quotes-display');
        
        let html = '<div class="space-y-2">';
        
        for (const [symbol, quote] of Object.entries(quotes)) {
            const change = quote.net_change || 0;
            const changePercent = quote.change_percent || 0;
            const changeClass = change >= 0 ? 'text-green-600' : 'text-red-600';
            const changeIcon = change >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
            
            html += `
                <div class="bg-white p-3 rounded border relative">
                    <div class="absolute top-2 right-2">
                        <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">SIMULATED</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <div>
                            <span class="font-medium">${symbol}</span>
                            <div class="text-lg font-bold">₹${quote.last_price}</div>
                        </div>
                        <div class="text-right ${changeClass}">
                            <div class="flex items-center">
                                <i class="fas ${changeIcon} mr-1"></i>
                                <span>₹${change.toFixed(2)}</span>
                            </div>
                            <div class="text-sm">(${changePercent.toFixed(2)}%)</div>
                        </div>
                    </div>
                    <div class="grid grid-cols-4 gap-2 mt-2 text-xs text-gray-600">
                        <div>O: ₹${quote.open || '-'}</div>
                        <div>H: ₹${quote.high || '-'}</div>
                        <div>L: ₹${quote.low || '-'}</div>
                        <div>Vol: ${this.formatNumber(quote.volume || 0)}</div>
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        quotesDisplay.innerHTML = html;
    }

    displayOrders(orders) {
        const ordersDisplay = document.getElementById('orders-display');
        
        if (orders.length === 0) {
            ordersDisplay.innerHTML = '<p class="text-gray-500 text-center py-4">No orders found</p>';
            return;
        }
        
        let html = '<div class="space-y-2">';
        
        orders.forEach(order => {
            const statusClass = this.getOrderStatusClass(order.status);
            const typeColor = order.transaction_type === 'BUY' ? 'text-green-600' : 'text-red-600';
            
            html += `
                <div class="bg-white p-3 rounded border relative">
                    <div class="absolute top-2 right-2">
                        <span class="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">PAPER</span>
                    </div>
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="flex items-center space-x-2">
                                <span class="font-medium">${order.tradingsymbol}</span>
                                <span class="text-sm ${typeColor} font-medium">${order.transaction_type}</span>
                                <span class="text-sm text-gray-500">${order.order_type}</span>
                            </div>
                            <div class="text-sm text-gray-600">
                                Qty: ${order.quantity} | Price: ₹${order.price} | Product: ${order.product}
                            </div>
                            <div class="text-xs text-gray-500">
                                Order ID: ${order.order_id} | ${new Date(order.order_timestamp).toLocaleString()}
                            </div>
                        </div>
                        <span class="text-xs px-2 py-1 rounded ${statusClass}">${order.status}</span>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        ordersDisplay.innerHTML = html;
    }

    displayPositions(positions) {
        const positionsDisplay = document.getElementById('positions-display');
        
        if (positions.length === 0) {
            positionsDisplay.innerHTML = '<p class="text-gray-500 text-center py-4">No positions found</p>';
            return;
        }
        
        let html = '<div class="space-y-2">';
        
        positions.forEach(position => {
            const pnlClass = position.pnl >= 0 ? 'text-green-600' : 'text-red-600';
            const pnlIcon = position.pnl >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
            
            html += `
                <div class="bg-white p-3 rounded border relative">
                    <div class="absolute top-2 right-2">
                        <span class="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">VIRTUAL</span>
                    </div>
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="font-medium">${position.tradingsymbol}</div>
                            <div class="text-sm text-gray-600">
                                Qty: ${position.quantity} | Avg: ₹${position.average_price?.toFixed(2)} | LTP: ₹${position.last_price?.toFixed(2)}
                            </div>
                            <div class="text-sm text-gray-600">
                                Value: ₹${position.value?.toLocaleString()} | Realized P&L: ₹${position.realised_pnl?.toFixed(2)}
                            </div>
                        </div>
                        <div class="text-right">
                            <div class="${pnlClass} flex items-center font-medium">
                                <i class="fas ${pnlIcon} mr-1"></i>
                                ₹${position.pnl?.toFixed(2)}
                            </div>
                            <div class="text-xs text-gray-500">Total P&L</div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        positionsDisplay.innerHTML = html;
    }

    displayOrderResult(order) {
        const resultDisplay = document.getElementById('order-result');
        
        const typeColor = order.transaction_type === 'BUY' ? 'text-green-600' : 'text-red-600';
        
        const html = `
            <div class="bg-green-50 border border-green-200 p-3 rounded">
                <div class="flex items-center">
                    <i class="fas fa-check-circle text-green-600 mr-2"></i>
                    <span class="font-medium">Paper Order Executed Successfully</span>
                </div>
                <div class="mt-2 text-sm">
                    <div><strong>Order ID:</strong> ${order.order_id}</div>
                    <div><strong>Symbol:</strong> ${order.tradingsymbol}</div>
                    <div><strong>Type:</strong> <span class="${typeColor}">${order.transaction_type} ${order.order_type}</span></div>
                    <div><strong>Quantity:</strong> ${order.quantity}</div>
                    <div><strong>Price:</strong> ₹${order.price}</div>
                    <div><strong>Status:</strong> ${order.status}</div>
                </div>
            </div>
        `;
        
        resultDisplay.innerHTML = html;
        
        // Update portfolio display
        this.updatePortfolioDisplay();
    }

    toggleAutoRefresh() {
        const btn = document.getElementById('auto-refresh-btn');
        
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            btn.innerHTML = '<i class="fas fa-play mr-2"></i>Start Auto Refresh (30s)';
            btn.className = btn.className.replace('bg-red-600', 'bg-gray-600').replace('bg-red-700', 'bg-gray-700');
        } else {
            this.autoRefreshInterval = setInterval(() => {
                this.getQuotes();
            }, 30000);
            btn.innerHTML = '<i class="fas fa-stop mr-2"></i>Stop Auto Refresh';
            btn.className = btn.className.replace('bg-gray-600', 'bg-red-600').replace('bg-gray-700', 'bg-red-700');
            this.getQuotes(); // Get quotes immediately
        }
    }

    updatePriceField() {
        const orderType = document.getElementById('order-order-type').value;
        const priceSection = document.getElementById('price-section');
        
        if (orderType === 'MARKET') {
            priceSection.style.display = 'none';
        } else {
            priceSection.style.display = 'block';
        }
    }

    async placeOrder() {
        const orderData = {
            exchange: 'NSE',
            tradingsymbol: document.getElementById('order-symbol').value,
            transaction_type: document.getElementById('order-type').value,
            quantity: parseInt(document.getElementById('order-quantity').value),
            order_type: document.getElementById('order-order-type').value,
            product: document.getElementById('order-product').value
        };
        
        if (orderData.order_type !== 'MARKET') {
            const price = parseFloat(document.getElementById('order-price').value);
            if (!price || price <= 0) {
                this.log('Please enter a valid price', 'error');
                return;
            }
            orderData.price = price;
        }

        this.setLoading('place-order-btn', true);
        
        try {
            const response = await this.apiCall('POST', '/trading/place-order', orderData);
            
            if (response.success) {
                this.log(`Order placed successfully! Order ID: ${response.data.orderId}`, 'success');
                
                // Refresh orders
                setTimeout(() => {
                    this.getOrders();
                }, 1000);
            } else {
                this.log('Order failed: ' + (response.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            this.log('Error placing order: ' + error.message, 'error');
        }
        
        this.setLoading('place-order-btn', false);
    }

    async getOrders() {
        this.setLoading('get-orders-btn', true);
        
        try {
            const response = await this.apiCall('GET', '/trading/orders');
            
            if (response.success) {
                this.displayOrders(response.data.orders);
                this.log('Orders retrieved successfully', 'success');
            } else {
                this.log('Failed to get orders: ' + (response.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            this.log('Error getting orders: ' + error.message, 'error');
        }
        
        this.setLoading('get-orders-btn', false);
    }

    async getPositions() {
        this.setLoading('get-positions-btn', true);
        
        try {
            const response = await this.apiCall('GET', '/trading/positions');
            
            if (response.success) {
                this.displayPositions(response.data.positions);
                this.log('Positions retrieved successfully', 'success');
            } else {
                this.log('Failed to get positions: ' + (response.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            this.log('Error getting positions: ' + error.message, 'error');
        }
        
        this.setLoading('get-positions-btn', false);
    }

    displayOrders(orders) {
        const ordersDisplay = document.getElementById('orders-display');
        
        if (!orders || orders.length === 0) {
            ordersDisplay.innerHTML = '<p class="text-gray-500">No orders found</p>';
            return;
        }
        
        let html = '<h4 class="font-medium mb-2 text-green-600">Orders:</h4>';
        
        orders.slice(0, 10).forEach(order => {
            const statusColor = this.getStatusColor(order.status);
            html += `
                <div class="mb-2 p-2 border-l-2 border-${statusColor}-500 bg-${statusColor}-50">
                    <div class="flex justify-between">
                        <span class="font-medium">${order.tradingsymbol}</span>
                        <span class="text-sm text-${statusColor}-600">${order.status}</span>
                    </div>
                    <div class="text-xs text-gray-600">
                        ${order.transaction_type} ${order.quantity} @ ₹${order.price || 'Market'} 
                        (${order.product})
                    </div>
                </div>
            `;
        });
        
        ordersDisplay.innerHTML = html;
    }

    displayPositions(positions) {
        const ordersDisplay = document.getElementById('orders-display');
        const currentContent = ordersDisplay.innerHTML;
        
        if (!positions || (!positions.net?.length && !positions.day?.length)) {
            ordersDisplay.innerHTML = currentContent + '<h4 class="font-medium mb-2 mt-4 text-blue-600">Positions:</h4><p class="text-gray-500">No positions found</p>';
            return;
        }
        
        let html = '<h4 class="font-medium mb-2 mt-4 text-blue-600">Positions:</h4>';
        
        const allPositions = [...(positions.net || []), ...(positions.day || [])];
        
        allPositions.slice(0, 10).forEach(position => {
            const pnlColor = position.pnl >= 0 ? 'green' : 'red';
            html += `
                <div class="mb-2 p-2 border-l-2 border-${pnlColor}-500 bg-${pnlColor}-50">
                    <div class="flex justify-between">
                        <span class="font-medium">${position.tradingsymbol}</span>
                        <span class="text-sm text-${pnlColor}-600">₹${position.pnl?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div class="text-xs text-gray-600">
                        Qty: ${position.quantity} | Avg: ₹${position.average_price?.toFixed(2) || '0.00'} | 
                        LTP: ₹${position.last_price?.toFixed(2) || '0.00'}
                    </div>
                </div>
            `;
        });
        
        ordersDisplay.innerHTML = currentContent + html;
    }

    async testMarketOrder() {
        document.getElementById('order-symbol').value = 'RELIANCE';
        document.getElementById('order-type').value = 'BUY';
        document.getElementById('order-quantity').value = '1';
        document.getElementById('order-order-type').value = 'MARKET';
        document.getElementById('order-product').value = 'MIS';
        this.updatePriceField();
        
        this.log('Test market order configured - click "Place Order" to execute', 'info');
    }

    async testLimitOrder() {
        // Get current price and set limit order below market
        try {
            const response = await this.apiCall('POST', '/kite/quote', {
                symbols: ['NSE:RELIANCE']
            });
            
            if (response.success) {
                const currentPrice = response.data.quotes['NSE:RELIANCE'].last_price;
                const limitPrice = (currentPrice - 10).toFixed(2); // 10 rupees below market
                
                document.getElementById('order-symbol').value = 'RELIANCE';
                document.getElementById('order-type').value = 'BUY';
                document.getElementById('order-quantity').value = '1';
                document.getElementById('order-order-type').value = 'LIMIT';
                document.getElementById('order-price').value = limitPrice;
                document.getElementById('order-product').value = 'MIS';
                this.updatePriceField();
                
                this.log(`Test limit order configured at ₹${limitPrice} (₹10 below market ₹${currentPrice}) - click "Place Order" to execute`, 'info');
            }
        } catch (error) {
            this.log('Error setting up test limit order', 'error');
        }
    }

    async cancelAllOrders() {
        if (!confirm('Are you sure you want to cancel all pending orders?')) {
            return;
        }
        
        try {
            // First get all orders
            const response = await this.apiCall('GET', '/trading/orders');
            
            if (response.success && response.data.orders) {
                const pendingOrders = response.data.orders.filter(order => 
                    order.status === 'PENDING' || order.status === 'OPEN'
                );
                
                if (pendingOrders.length === 0) {
                    this.log('No pending orders to cancel', 'info');
                    return;
                }
                
                // Cancel each order
                for (const order of pendingOrders) {
                    try {
                        await this.apiCall('DELETE', `/trading/cancel-order/${order.order_id}`);
                        this.log(`Cancelled order ${order.order_id} for ${order.tradingsymbol}`, 'success');
                    } catch (error) {
                        this.log(`Failed to cancel order ${order.order_id}`, 'error');
                    }
                }
                
                // Refresh orders
                setTimeout(() => {
                    this.getOrders();
                }, 2000);
            }
        } catch (error) {
            this.log('Error cancelling orders: ' + error.message, 'error');
        }
    }

    async loadAccountInfo() {
        try {
            const response = await this.apiCall('GET', '/trading/account-info');
            
            if (response.success) {
                const account = response.data;
                document.getElementById('account-balance').textContent = `₹${this.formatNumber(account.balance || 0)}`;
                document.getElementById('margin-used').textContent = `₹${this.formatNumber(account.marginUsed || 0)}`;
                document.getElementById('margin-available').textContent = `₹${this.formatNumber(account.marginAvailable || 0)}`;
            }
        } catch (error) {
            this.log('Error loading account info', 'error');
        }
    }

    // Utility functions
    async apiCall(method, endpoint, data = null) {
        const config = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        if (data) {
            config.body = JSON.stringify(data);
        }
        
        const response = await fetch(this.baseURL + endpoint, config);
        const result = await response.json();
        
        // Log API response
        this.logApiResponse(method, endpoint, result);
        
        return result;
    }

    logApiResponse(method, endpoint, response) {
        const timestamp = new Date().toLocaleTimeString();
        const status = response.success ? 'SUCCESS' : 'ERROR';
        const statusClass = response.success ? 'status-success' : 'status-error';
        
        this.log(`[${timestamp}] ${method} ${endpoint} - ${status}`, statusClass, true);
        
        if (!response.success && response.message) {
            this.log(`Error: ${response.message}`, 'status-error', true);
        }
    }

    log(message, type = 'info', isApiLog = false) {
        const logsElement = document.getElementById('api-logs');
        const timestamp = new Date().toLocaleTimeString();
        
        const colorClass = {
            'success': 'status-success',
            'error': 'status-error', 
            'warning': 'status-pending',
            'info': 'text-blue-600'
        }[type] || 'text-gray-600';
        
        const logEntry = document.createElement('div');
        logEntry.innerHTML = `<span class="text-gray-500">[${timestamp}]</span> <span class="${colorClass}">${message}</span>`;
        
        logsElement.appendChild(logEntry);
        logsElement.scrollTop = logsElement.scrollHeight;
    }

    clearLogs() {
        document.getElementById('api-logs').innerHTML = '<p class="text-gray-500">API responses will appear here...</p>';
        document.getElementById('orders-display').innerHTML = '<p class="text-gray-500">Orders and positions will appear here...</p>';
    }

    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        const textElement = document.getElementById('connection-text');
        const userIdElement = document.getElementById('user-id');
        
        switch (status) {
            case 'authenticated':
                statusElement.className = 'w-3 h-3 rounded-full bg-yellow-500 mr-2';
                textElement.textContent = 'Authenticated';
                userIdElement.textContent = this.userId || 'Unknown';
                break;
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connection-status');
        const textElement = document.getElementById('connection-text');
        const userIdElement = document.getElementById('user-id');
        
        switch (status) {
            case 'paper-trading':
                statusElement.className = 'w-3 h-3 rounded-full bg-blue-500 mr-2';
                textElement.textContent = 'Paper Trading Active';
                userIdElement.textContent = this.userId || 'Virtual Trader';
                break;
            default:
                statusElement.className = 'w-3 h-3 rounded-full bg-gray-500 mr-2';
                textElement.textContent = 'Not Connected';
                userIdElement.textContent = 'Not logged in';
        }
    }

    enableTradingButtons() {
        const buttons = [
            'get-quotes-btn', 'auto-refresh-btn', 'place-order-btn', 
            'get-orders-btn', 'get-positions-btn', 'test-market-order-btn',
            'test-limit-order-btn', 'cancel-all-orders-btn'
        ];
        
        buttons.forEach(btnId => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.disabled = false;
            }
        });
    }

    toggleAutoRefresh() {
        const btn = document.getElementById('auto-refresh-btn');
        
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
            btn.innerHTML = '<i class="fas fa-play mr-2"></i>Start Auto Refresh (30s)';
            btn.className = btn.className.replace('bg-red-600', 'bg-gray-600').replace('bg-red-700', 'bg-gray-700');
        } else {
            this.autoRefreshInterval = setInterval(() => {
                this.getQuotes();
            }, 30000);
            btn.innerHTML = '<i class="fas fa-stop mr-2"></i>Stop Auto Refresh';
            btn.className = btn.className.replace('bg-gray-600', 'bg-red-600').replace('bg-gray-700', 'bg-red-700');
            this.getQuotes(); // Get quotes immediately
        }
    }

    updatePriceField() {
        const orderType = document.getElementById('order-order-type').value;
        const priceSection = document.getElementById('price-section');
        
        if (orderType === 'MARKET') {
            priceSection.style.display = 'none';
        } else {
            priceSection.style.display = 'block';
        }
    }

    getOrderFormData() {
        return {
            tradingsymbol: document.getElementById('order-symbol').value.trim().toUpperCase(),
            exchange: document.getElementById('order-exchange').value,
            transaction_type: document.getElementById('order-transaction-type').value,
            order_type: document.getElementById('order-order-type').value,
            quantity: parseInt(document.getElementById('order-quantity').value),
            price: parseFloat(document.getElementById('order-price').value) || 0,
            product: document.getElementById('order-product').value
        };
    }

    getOrderStatusClass(status) {
        const statusClasses = {
            'COMPLETE': 'bg-green-100 text-green-800',
            'PENDING': 'bg-yellow-100 text-yellow-800',
            'CANCELLED': 'bg-red-100 text-red-800',
            'REJECTED': 'bg-red-100 text-red-800',
            'OPEN': 'bg-blue-100 text-blue-800'
        };
        return statusClasses[status] || 'bg-gray-100 text-gray-800';
    }

    async testMarketOrder() {
        // Pre-fill form for quick testing
        document.getElementById('order-symbol').value = 'RELIANCE';
        document.getElementById('order-exchange').value = 'NSE';
        document.getElementById('order-transaction-type').value = 'BUY';
        document.getElementById('order-order-type').value = 'MARKET';
        document.getElementById('order-quantity').value = '10';
        document.getElementById('order-product').value = 'CNC';
        
        this.updatePriceField();
        this.placePaperOrder();
    }

    async testLimitOrder() {
        // Pre-fill form for quick testing
        document.getElementById('order-symbol').value = 'INFY';
        document.getElementById('order-exchange').value = 'NSE';
        document.getElementById('order-transaction-type').value = 'BUY';
        document.getElementById('order-order-type').value = 'LIMIT';
        document.getElementById('order-quantity').value = '5';
        document.getElementById('order-price').value = '1400';
        document.getElementById('order-product').value = 'CNC';
        
        this.updatePriceField();
        this.placePaperOrder();
    }

    updateUI() {
        this.updatePriceField();
        this.updatePortfolioDisplay();
    }

    setLoading(buttonId, loading) {
        const button = document.getElementById(buttonId);
        if (loading) {
            button.disabled = true;
            const icon = button.querySelector('i');
            if (icon) {
                icon.className = 'fas fa-spinner loading mr-2';
            }
        } else {
            button.disabled = false;
            const icon = button.querySelector('i');
            if (icon) {
                const iconMap = {
                    'start-auth-btn': 'fa-mobile-alt',
                    'verify-otp-btn': 'fa-check',
                    'get-quotes-btn': 'fa-sync-alt',
                    'place-order-btn': 'fa-plus',
                    'get-orders-btn': 'fa-list',
                    'get-positions-btn': 'fa-briefcase',
                    'test-market-order-btn': 'fa-rocket',
                    'test-limit-order-btn': 'fa-chart-line',
                    'cancel-all-orders-btn': 'fa-times'
                };
                icon.className = `fas ${iconMap[buttonId] || 'fa-check'} mr-2`;
            }
        }
    }

    showStatus(message, type, elementId) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`Status element '${elementId}' not found`);
            return;
        }
        element.className = `mt-4 p-3 rounded-lg ${type === 'success' ? 'bg-green-100 text-green-800' : 
                                                   type === 'error' ? 'bg-red-100 text-red-800' : 
                                                   type === 'info' ? 'bg-blue-100 text-blue-800' :
                                                   'bg-yellow-100 text-yellow-800'}`;
        element.textContent = message;
        element.classList.remove('hidden');
    }

    formatNumber(num) {
        if (num >= 10000000) return (num / 10000000).toFixed(2) + 'Cr';
        if (num >= 100000) return (num / 100000).toFixed(2) + 'L';
        if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
        return num.toString();
    }

    log(message, type = 'info') {
        const logsElement = document.getElementById('api-logs');
        const timestamp = new Date().toLocaleTimeString();
        
        const colorClass = {
            'success': 'text-green-600',
            'error': 'text-red-600', 
            'warning': 'text-yellow-600',
            'info': 'text-blue-600'
        }[type] || 'text-gray-600';
        
        const logEntry = document.createElement('div');
        logEntry.innerHTML = `<span class="text-gray-500">[${timestamp}]</span> <span class="${colorClass}">${message}</span>`;
        
        logsElement.appendChild(logEntry);
        logsElement.scrollTop = logsElement.scrollHeight;
    }

    clearLogs() {
        document.getElementById('api-logs').innerHTML = '<p class="text-gray-500">Paper trading logs will appear here...</p>';
        document.getElementById('order-result').innerHTML = '';
        
        // Clear displays
        document.getElementById('quotes-display').innerHTML = '<p class="text-gray-500">Market data will appear here...</p>';
        document.getElementById('orders-display').innerHTML = '<p class="text-gray-500">Orders will appear here...</p>';
        document.getElementById('positions-display').innerHTML = '<p class="text-gray-500">Positions will appear here...</p>';
    }
}

// Initialize Paper Trading Platform when page loads
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing Paper Trading Platform...');
    
    // Simple, reliable button setup
    const startBtn = document.getElementById('start-auth-btn');
    const verifyBtn = document.getElementById('verify-otp-btn');
    const otpSection = document.getElementById('otp-section');
    const authStatus = document.getElementById('auth-status');
    
    console.log('Elements found:', { startBtn, verifyBtn, otpSection, authStatus });
    
    if (startBtn) {
        startBtn.addEventListener('click', async function() {
            console.log('Start button clicked!');
            
            // Show loading state
            startBtn.disabled = true;
            startBtn.innerHTML = '<i class="fas fa-spinner loading mr-2"></i>Starting...';
            
            // Simulate account setup
            setTimeout(() => {
                // Show OTP section
                if (otpSection) {
                    otpSection.classList.remove('hidden');
                }
                
                // Show success message
                if (authStatus) {
                    authStatus.className = 'mt-4 p-3 rounded-lg bg-green-100 text-green-800';
                    authStatus.textContent = 'Paper trading account ready! Enter any 6-digit code to activate.';
                    authStatus.classList.remove('hidden');
                }
                
                // Reset button
                startBtn.disabled = false;
                startBtn.innerHTML = '<i class="fas fa-rocket mr-2"></i>Start Paper Trading Account';
                
                console.log('Account setup completed');
            }, 1000);
        });
        
        console.log('Start button event listener attached');
    }
    
    if (verifyBtn) {
        verifyBtn.addEventListener('click', function() {
            const otpInput = document.getElementById('otp-input');
            const otp = otpInput ? otpInput.value.trim() : '';
            
            if (!otp || otp.length !== 6) {
                if (authStatus) {
                    authStatus.className = 'mt-4 p-3 rounded-lg bg-red-100 text-red-800';
                    authStatus.textContent = 'Please enter a 6-digit code';
                    authStatus.classList.remove('hidden');
                }
                return;
            }
            
            // Show loading
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = '<i class="fas fa-spinner loading mr-2"></i>Activating...';
            
            setTimeout(() => {
                // Hide OTP section
                if (otpSection) {
                    otpSection.classList.add('hidden');
                }
                
                // Show success
                if (authStatus) {
                    authStatus.className = 'mt-4 p-3 rounded-lg bg-green-100 text-green-800';
                    authStatus.textContent = 'Paper trading account activated! Start trading with virtual funds.';
                }
                
                // Update connection status
                const statusElement = document.getElementById('connection-status');
                const textElement = document.getElementById('connection-text');
                if (statusElement && textElement) {
                    statusElement.className = 'w-3 h-3 rounded-full bg-blue-500 mr-2';
                    textElement.textContent = 'Paper Trading Active';
                }
                
                // Enable trading buttons
                const buttons = [
                    'get-quotes-btn', 'auto-refresh-btn', 'place-order-btn',
                    'get-orders-btn', 'get-positions-btn', 'test-market-order-btn',
                    'test-limit-order-btn', 'cancel-all-orders-btn'
                ];
                
                buttons.forEach(btnId => {
                    const btn = document.getElementById(btnId);
                    if (btn) {
                        btn.disabled = false;
                    }
                });
                
                // Reset verify button
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = '<i class="fas fa-check mr-1"></i>Activate';
                
                console.log('Paper trading account activated');
            }, 800);
        });
        
        console.log('Verify button event listener attached');
    }
    
    console.log('Paper Trading Platform initialization complete');
});