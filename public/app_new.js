// Paper Trading Platform - Simple Functional Approach
console.log('Loading app.js...');

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded');
    
    // Get button elements
    const startBtn = document.getElementById('start-auth-btn');
    const verifyBtn = document.getElementById('verify-otp-btn');
    console.log('Start button:', startBtn);
    console.log('Verify button:', verifyBtn);
    
    // Start Paper Trading Account Button
    if (startBtn) {
        startBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Start button clicked!');
            
            // Show OTP section
            const otpSection = document.getElementById('otp-section');
            if (otpSection) {
                otpSection.classList.remove('hidden');
                console.log('OTP section shown');
            }
            
            // Show status message
            const authStatus = document.getElementById('auth-status');
            if (authStatus) {
                authStatus.className = 'mt-4 p-3 rounded-lg bg-green-100 text-green-800';
                authStatus.textContent = 'Paper trading account ready! Enter any 6-digit code to activate.';
                authStatus.classList.remove('hidden');
            }
        });
        
        console.log('Start button event listener attached successfully');
    } else {
        console.error('Start button not found!');
    }
    
    // Activate (Verify OTP) Button
    if (verifyBtn) {
        verifyBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Verify button clicked!');
            
            const otpInput = document.getElementById('otp-input');
            const otp = otpInput ? otpInput.value.trim() : '';
            console.log('OTP value:', otp);
            
            const authStatus = document.getElementById('auth-status');
            
            // Validate OTP
            if (!otp || otp.length !== 6) {
                if (authStatus) {
                    authStatus.className = 'mt-4 p-3 rounded-lg bg-red-100 text-red-800';
                    authStatus.textContent = 'Please enter a 6-digit code';
                    authStatus.classList.remove('hidden');
                }
                console.log('Invalid OTP');
                return;
            }
            
            // Show loading state
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Activating...';
            console.log('Activating paper trading account...');
            
            // Simulate activation
            setTimeout(function() {
                // Hide OTP section
                const otpSection = document.getElementById('otp-section');
                if (otpSection) {
                    otpSection.classList.add('hidden');
                }
                
                // Show success message
                if (authStatus) {
                    authStatus.className = 'mt-4 p-3 rounded-lg bg-green-100 text-green-800';
                    authStatus.textContent = '✓ Paper trading account activated! Start trading with virtual ₹1,00,000.';
                    authStatus.classList.remove('hidden');
                }
                
                // Update connection status
                const statusElement = document.getElementById('connection-status');
                const textElement = document.getElementById('connection-text');
                if (statusElement && textElement) {
                    statusElement.className = 'w-3 h-3 rounded-full bg-green-500 mr-2';
                    textElement.textContent = 'Paper Trading Active';
                }
                
                // Enable all trading buttons
                const buttons = [
                    'get-quotes-btn', 'auto-refresh-btn', 'place-order-btn',
                    'get-orders-btn', 'get-positions-btn', 'test-market-order-btn',
                    'test-limit-order-btn', 'cancel-all-orders-btn'
                ];
                
                buttons.forEach(function(btnId) {
                    const btn = document.getElementById(btnId);
                    if (btn) {
                        btn.disabled = false;
                        console.log('Enabled button:', btnId);
                    }
                });
                
                // Reset verify button
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = '<i class="fas fa-check mr-2"></i>Activate';
                
                console.log('Paper trading account activated successfully!');
            }, 800);
        });
        
        console.log('Verify button event listener attached successfully');
    } else {
        console.error('Verify button not found!');
    }
    
    // Get Live Quotes Button
    const getQuotesBtn = document.getElementById('get-quotes-btn');
    if (getQuotesBtn) {
        getQuotesBtn.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Get Quotes button clicked!');
            
            // Get selected instruments from checkboxes
            const checkboxes = document.querySelectorAll('.symbol-checkbox:checked');
            const quotesDisplay = document.getElementById('quotes-display');
            
            if (checkboxes.length === 0) {
                if (quotesDisplay) {
                    quotesDisplay.innerHTML = '<div class="p-3 rounded-lg bg-red-100 text-red-800">Please select at least one instrument</div>';
                }
                return;
            }
            
            // Show loading
            getQuotesBtn.disabled = true;
            getQuotesBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
            
            // Simulate fetching quotes
            setTimeout(function() {
                // Extract symbols from checkbox values (format: "NSE:SYMBOL")
                const symbols = Array.from(checkboxes).map(function(cb) {
                    return cb.value.split(':')[1]; // Extract symbol from "NSE:SYMBOL"
                });
                
                // Generate simulated market data
                let quotesHtml = '<div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
                
                symbols.forEach(function(symbol) {
                    const basePrice = getBasePrice(symbol);
                    const change = (Math.random() - 0.5) * 50;
                    const changePercent = (change / basePrice * 100).toFixed(2);
                    const ltp = (basePrice + change).toFixed(2);
                    const isPositive = change >= 0;
                    
                    quotesHtml += `
                        <div class="p-4 border border-gray-200 rounded-lg bg-white">
                            <div class="flex justify-between items-start mb-2">
                                <h4 class="font-bold text-lg">${symbol}</h4>
                                <span class="text-xs text-gray-500">NSE</span>
                            </div>
                            <div class="mb-3">
                                <div class="text-2xl font-bold text-gray-900">₹${ltp}</div>
                                <div class="text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}">
                                    ${isPositive ? '▲' : '▼'} ${Math.abs(change).toFixed(2)} (${changePercent}%)
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-2 text-sm text-gray-600">
                                <div>Open: ₹${(basePrice * 1.002).toFixed(2)}</div>
                                <div>High: ₹${(parseFloat(ltp) * 1.01).toFixed(2)}</div>
                                <div>Low: ₹${(parseFloat(ltp) * 0.99).toFixed(2)}</div>
                                <div>Vol: ${(Math.random() * 5000000).toFixed(0)}</div>
                            </div>
                        </div>
                    `;
                });
                
                quotesHtml += '</div>';
                
                if (quotesDisplay) {
                    quotesDisplay.innerHTML = quotesHtml;
                }
                
                // Reset button
                getQuotesBtn.disabled = false;
                getQuotesBtn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>Get Live Quotes';
                
                console.log('Quotes retrieved successfully');
            }, 500);
        });
        
        console.log('Get Quotes button event listener attached');
    }
    
    // Helper function to get base prices
    function getBasePrice(symbol) {
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
            'MARUTI': 10200,
            'TATAMOTORS': 620,
            'WIPRO': 420,
            'AXISBANK': 980,
            'BAJFINANCE': 6800,
            'HINDUNILVR': 2650
        };
        
        return basePrices[symbol] || (Math.random() * 1000 + 100);
    }
    
    // Paper Trading Portfolio
    let paperPortfolio = loadPortfolio();
    
    function loadPortfolio() {
        const saved = localStorage.getItem('paperTradingPortfolio');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            balance: 100000,
            totalPnL: 0,
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            bestTrade: 0,
            worstTrade: 0,
            positions: {},
            orders: []
        };
    }
    
    function savePortfolio() {
        localStorage.setItem('paperTradingPortfolio', JSON.stringify(paperPortfolio));
        updateStats();
    }
    
    function updateStats() {
        const balanceEl = document.getElementById('paper-balance');
        const pnlEl = document.getElementById('total-pnl');
        const tradesEl = document.getElementById('total-trades');
        const winRateEl = document.getElementById('win-rate');
        const bestEl = document.getElementById('best-trade');
        const worstEl = document.getElementById('worst-trade');
        
        if (balanceEl) balanceEl.textContent = `₹${paperPortfolio.balance.toLocaleString('en-IN', {maximumFractionDigits: 2})}`;
        if (pnlEl) pnlEl.textContent = `₹${paperPortfolio.totalPnL.toLocaleString('en-IN', {maximumFractionDigits: 2})}`;
        if (tradesEl) tradesEl.textContent = paperPortfolio.totalTrades;
        
        const winRate = paperPortfolio.totalTrades > 0 ? 
            ((paperPortfolio.winningTrades / paperPortfolio.totalTrades) * 100).toFixed(1) : 0;
        if (winRateEl) winRateEl.textContent = `${winRate}%`;
        
        if (bestEl) bestEl.textContent = `₹${paperPortfolio.bestTrade.toLocaleString('en-IN', {maximumFractionDigits: 2})}`;
        if (worstEl) worstEl.textContent = `₹${paperPortfolio.worstTrade.toLocaleString('en-IN', {maximumFractionDigits: 2})}`;
    }
    
    // Place Order Button
    const placeOrderBtn = document.getElementById('place-order-btn');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            console.log('Place Order button clicked!');
            
            const symbol = document.getElementById('order-symbol').value.trim().toUpperCase();
            const exchange = document.getElementById('order-exchange').value;
            const transactionType = document.getElementById('order-transaction-type').value;
            const orderType = document.getElementById('order-order-type').value;
            const quantity = parseInt(document.getElementById('order-quantity').value);
            const price = parseFloat(document.getElementById('order-price').value) || getBasePrice(symbol);
            const product = document.getElementById('order-product').value;
            
            const orderStatus = document.getElementById('order-status');
            
            if (!symbol || !quantity || quantity <= 0) {
                if (orderStatus) {
                    orderStatus.className = 'mt-4 p-3 rounded-lg bg-red-100 text-red-800';
                    orderStatus.textContent = 'Please enter valid symbol and quantity';
                    orderStatus.classList.remove('hidden');
                }
                return;
            }
            
            // Check balance for BUY orders
            const totalCost = quantity * price;
            if (transactionType === 'BUY' && paperPortfolio.balance < totalCost) {
                if (orderStatus) {
                    orderStatus.className = 'mt-4 p-3 rounded-lg bg-red-100 text-red-800';
                    orderStatus.textContent = `Insufficient balance. Required: ₹${totalCost.toFixed(2)}, Available: ₹${paperPortfolio.balance.toFixed(2)}`;
                    orderStatus.classList.remove('hidden');
                }
                return;
            }
            
            // Check position for SELL orders
            if (transactionType === 'SELL') {
                const position = paperPortfolio.positions[symbol];
                if (!position || position.quantity < quantity) {
                    if (orderStatus) {
                        orderStatus.className = 'mt-4 p-3 rounded-lg bg-red-100 text-red-800';
                        orderStatus.textContent = `Insufficient position. Available: ${position?.quantity || 0}, Required: ${quantity}`;
                        orderStatus.classList.remove('hidden');
                    }
                    return;
                }
            }
            
            placeOrderBtn.disabled = true;
            placeOrderBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Placing...';
            
            try {
                // Call backend API
                const response = await fetch('/api/trading/place-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('authToken')
                    },
                    body: JSON.stringify({
                        tradingsymbol: symbol,
                        exchange: exchange,
                        transaction_type: transactionType,
                        order_type: orderType,
                        quantity: quantity,
                        price: price,
                        product: product
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const order = data.data.order;
                    
                    // Update local portfolio
                    if (transactionType === 'BUY') {
                        paperPortfolio.balance -= totalCost;
                        
                        if (!paperPortfolio.positions[symbol]) {
                            paperPortfolio.positions[symbol] = {
                                symbol: symbol,
                                quantity: 0,
                                avgPrice: 0
                            };
                        }
                        
                        const position = paperPortfolio.positions[symbol];
                        const totalQty = position.quantity + quantity;
                        position.avgPrice = ((position.avgPrice * position.quantity) + (price * quantity)) / totalQty;
                        position.quantity = totalQty;
                    } else {
                        paperPortfolio.balance += totalCost;
                        
                        const position = paperPortfolio.positions[symbol];
                        const pnl = (price - position.avgPrice) * quantity;
                        paperPortfolio.totalPnL += pnl;
                        paperPortfolio.totalTrades++;
                        
                        if (pnl > 0) {
                            paperPortfolio.winningTrades++;
                            if (pnl > paperPortfolio.bestTrade) paperPortfolio.bestTrade = pnl;
                        } else {
                            paperPortfolio.losingTrades++;
                            if (pnl < paperPortfolio.worstTrade) paperPortfolio.worstTrade = pnl;
                        }
                        
                        position.quantity -= quantity;
                        if (position.quantity === 0) {
                            delete paperPortfolio.positions[symbol];
                        }
                    }
                    
                    savePortfolio();
                    
                    if (orderStatus) {
                        orderStatus.className = 'mt-4 p-3 rounded-lg bg-green-100 text-green-800';
                        orderStatus.innerHTML = `✓ Order ${data.data.orderId} executed: ${transactionType} ${quantity} ${symbol} @ ₹${order.price.toFixed(2)}`;
                        orderStatus.classList.remove('hidden');
                    }
                    
                    console.log('Order placed successfully:', data);
                } else {
                    throw new Error(data.error?.message || 'Failed to place order');
                }
                
            } catch (error) {
                console.error('Error placing order:', error);
                if (orderStatus) {
                    orderStatus.className = 'mt-4 p-3 rounded-lg bg-red-100 text-red-800';
                    orderStatus.textContent = 'Error: ' + error.message;
                    orderStatus.classList.remove('hidden');
                }
            } finally {
                placeOrderBtn.disabled = false;
                placeOrderBtn.innerHTML = '<i class="fas fa-plus mr-2"></i>Place Order';
            }
        });
    }
    
    // Get Orders Button
    const getOrdersBtn = document.getElementById('get-orders-btn');
    if (getOrdersBtn) {
        getOrdersBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const ordersStatus = document.getElementById('orders-status');
            
            getOrdersBtn.disabled = true;
            getOrdersBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
            
            try {
                const response = await fetch('/api/trading/orders?limit=20', {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('authToken')
                    }
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const orders = data.data.orders;
                    
                    if (orders.length === 0) {
                        if (ordersStatus) {
                            ordersStatus.className = 'mt-4 p-3 rounded-lg bg-blue-100 text-blue-800';
                            ordersStatus.textContent = 'No orders yet. Place your first order!';
                            ordersStatus.classList.remove('hidden');
                        }
                        return;
                    }
                    
                    let ordersHtml = '<div class="mt-4 overflow-x-auto"><table class="min-w-full bg-white border border-gray-200">';
                    ordersHtml += '<thead class="bg-gray-100"><tr>';
                    ordersHtml += '<th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Order ID</th>';
                    ordersHtml += '<th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Symbol</th>';
                    ordersHtml += '<th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Type</th>';
                    ordersHtml += '<th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Qty</th>';
                    ordersHtml += '<th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Price</th>';
                    ordersHtml += '<th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Status</th>';
                    ordersHtml += '<th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Date</th>';
                    ordersHtml += '</tr></thead><tbody>';
                    
                    orders.forEach(function(order) {
                        const typeColor = order.action === 'BUY' ? 'text-green-600' : 'text-red-600';
                        const date = new Date(order.createdAt).toLocaleString('en-IN', { 
                            dateStyle: 'short', 
                            timeStyle: 'short' 
                        });
                        ordersHtml += '<tr class="border-t">';
                        ordersHtml += `<td class="px-4 py-2 text-xs">${order.kiteOrderId}</td>`;
                        ordersHtml += `<td class="px-4 py-2 text-xs font-medium">${order.symbol}</td>`;
                        ordersHtml += `<td class="px-4 py-2 text-xs ${typeColor}">${order.action}</td>`;
                        ordersHtml += `<td class="px-4 py-2 text-xs">${order.quantity}</td>`;
                        ordersHtml += `<td class="px-4 py-2 text-xs">₹${order.price ? order.price.toFixed(2) : 'N/A'}</td>`;
                        ordersHtml += `<td class="px-4 py-2 text-xs"><span class="px-2 py-1 bg-green-100 text-green-800 rounded">${order.status}</span></td>`;
                        ordersHtml += `<td class="px-4 py-2 text-xs">${date}</td>`;
                        ordersHtml += '</tr>';
                    });
                    
                    ordersHtml += '</tbody></table></div>';
                    
                    if (ordersStatus) {
                        ordersStatus.className = 'mt-4';
                        ordersStatus.innerHTML = ordersHtml;
                        ordersStatus.classList.remove('hidden');
                    }
                } else {
                    throw new Error(data.error?.message || 'Failed to fetch orders');
                }
            } catch (error) {
                console.error('Error fetching orders:', error);
                if (ordersStatus) {
                    ordersStatus.className = 'mt-4 p-3 rounded-lg bg-red-100 text-red-800';
                    ordersStatus.textContent = 'Error: ' + error.message;
                    ordersStatus.classList.remove('hidden');
                }
            } finally {
                getOrdersBtn.disabled = false;
                getOrdersBtn.innerHTML = '<i class="fas fa-list mr-2"></i>Get Orders';
            }
        });
    }
    
    // Get Positions Button
    const getPositionsBtn = document.getElementById('get-positions-btn');
    if (getPositionsBtn) {
        getPositionsBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            
            const positionsStatus = document.getElementById('positions-status');
            
            getPositionsBtn.disabled = true;
            getPositionsBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Loading...';
            
            try {
                const response = await fetch('/api/trading/positions', {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + localStorage.getItem('authToken')
                    }
                });
                
                const data = await response.json();
                
                if (data.success) {
                    const positions = data.data.positions;
                    
                    if (positions.length === 0) {
                        if (positionsStatus) {
                            positionsStatus.className = 'mt-4 p-3 rounded-lg bg-blue-100 text-blue-800';
                            positionsStatus.textContent = 'No open positions';
                            positionsStatus.classList.remove('hidden');
                        }
                        return;
                    }
                    
                    let positionsHtml = '<div class="mt-4 overflow-x-auto"><table class="min-w-full bg-white border border-gray-200">';
                    positionsHtml += '<thead class="bg-gray-100"><tr>';
                    positionsHtml += '<th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Symbol</th>';
                    positionsHtml += '<th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Qty</th>';
                    positionsHtml += '<th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Avg Price</th>';
                    positionsHtml += '<th class="px-4 py-2 text-left text-xs font-medium text-gray-700">Current Price</th>';
                    positionsHtml += '<th class="px-4 py-2 text-left text-xs font-medium text-gray-700">P&L</th>';
                    positionsHtml += '</tr></thead><tbody>';
                    
                    positions.forEach(function(pos) {
                        const currentPrice = pos.currentPrice || pos.averagePrice;
                        const pnl = pos.pnl || ((currentPrice - pos.averagePrice) * pos.quantity);
                        const pnlColor = pnl >= 0 ? 'text-green-600' : 'text-red-600';
                        
                        positionsHtml += '<tr class="border-t">';
                        positionsHtml += `<td class="px-4 py-2 text-xs font-medium">${pos.symbol}</td>`;
                        positionsHtml += `<td class="px-4 py-2 text-xs">${pos.quantity}</td>`;
                        positionsHtml += `<td class="px-4 py-2 text-xs">₹${pos.averagePrice.toFixed(2)}</td>`;
                        positionsHtml += `<td class="px-4 py-2 text-xs">₹${currentPrice.toFixed(2)}</td>`;
                        positionsHtml += `<td class="px-4 py-2 text-xs ${pnlColor}">₹${pnl.toFixed(2)}</td>`;
                        positionsHtml += '</tr>';
                    });
                    
                    positionsHtml += '</tbody></table></div>';
                    
                    if (positionsStatus) {
                        positionsStatus.className = 'mt-4';
                        positionsStatus.innerHTML = positionsHtml;
                        positionsStatus.classList.remove('hidden');
                    }
                } else {
                    throw new Error(data.error?.message || 'Failed to fetch positions');
                }
            } catch (error) {
                console.error('Error fetching positions:', error);
                if (positionsStatus) {
                    positionsStatus.className = 'mt-4 p-3 rounded-lg bg-red-100 text-red-800';
                    positionsStatus.textContent = 'Error: ' + error.message;
                    positionsStatus.classList.remove('hidden');
                }
            } finally {
                getPositionsBtn.disabled = false;
                getPositionsBtn.innerHTML = '<i class="fas fa-briefcase mr-2"></i>Positions';
            }
        });
    }
    
    // Reset Portfolio Button
    const resetBtn = document.getElementById('reset-portfolio-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Reset your paper trading portfolio? This will clear all positions and reset balance to ₹1,00,000.')) {
                paperPortfolio = {
                    balance: 100000,
                    totalPnL: 0,
                    totalTrades: 0,
                    winningTrades: 0,
                    losingTrades: 0,
                    bestTrade: 0,
                    worstTrade: 0,
                    positions: {},
                    orders: []
                };
                savePortfolio();
                alert('Portfolio reset successfully!');
            }
        });
    }
    
    // Test Market Order
    const testMarketBtn = document.getElementById('test-market-order-btn');
    if (testMarketBtn) {
        testMarketBtn.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('order-symbol').value = 'RELIANCE';
            document.getElementById('order-transaction-type').value = 'BUY';
            document.getElementById('order-order-type').value = 'MARKET';
            document.getElementById('order-quantity').value = '1';
            document.getElementById('order-price').value = getBasePrice('RELIANCE');
            alert('Market order pre-filled! Click "Place Order" to execute.');
        });
    }
    
    // Test Limit Order
    const testLimitBtn = document.getElementById('test-limit-order-btn');
    if (testLimitBtn) {
        testLimitBtn.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('order-symbol').value = 'INFY';
            document.getElementById('order-transaction-type').value = 'BUY';
            document.getElementById('order-order-type').value = 'LIMIT';
            document.getElementById('order-quantity').value = '5';
            document.getElementById('order-price').value = '1450.00';
            alert('Limit order pre-filled! Click "Place Order" to execute.');
        });
    }
    
    // Initialize stats on load
    updateStats();
});

console.log('app.js loaded');
