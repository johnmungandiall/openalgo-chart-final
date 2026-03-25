/**
 * Mock Data Service for Demo/Testing Mode
 * 
 * Generates realistic OHLC candlestick data and simulates
 * real-time WebSocket ticks for offline testing.
 * 
 * Enable via URL param: ?demo=true
 */

export interface MockCandle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

/**
 * Check if demo mode is enabled via URL parameter
 */
export function isDemoMode(): boolean {
    try {
        const params = new URLSearchParams(window.location.search);
        return params.get('demo') === 'true';
    } catch {
        return false;
    }
}

/**
 * Generate realistic OHLC candle data with trends, reversals, and volatility
 */
export function generateMockOHLCData(
    count: number = 500,
    intervalSeconds: number = 300,
    basePrice: number = 23500,
    volatility: number = 0.004
): MockCandle[] {
    const candles: MockCandle[] = [];
    
    // Start time: go back `count` intervals from now (IST-aligned)
    const now = Math.floor(Date.now() / 1000);
    const startTime = now - count * intervalSeconds;
    
    let price = basePrice;
    let trend = 1; // 1 = bullish, -1 = bearish
    let trendStrength = 0.0002;
    let trendBarsRemaining = 30 + Math.floor(Math.random() * 50);
    
    for (let i = 0; i < count; i++) {
        const time = startTime + i * intervalSeconds;
        
        // Trend management - create clear trends for UT Bot to detect
        trendBarsRemaining--;
        if (trendBarsRemaining <= 0) {
            trend *= -1; // Reverse trend
            trendStrength = 0.0001 + Math.random() * 0.0004;
            trendBarsRemaining = 20 + Math.floor(Math.random() * 60);
        }
        
        // Price movement with trend bias
        const trendMove = trend * trendStrength * price;
        const noise = (Math.random() - 0.5) * volatility * price;
        const priceChange = trendMove + noise;

        const open = price;
        const close = price + priceChange;
        
        // Generate realistic high/low based on open/close
        const range = Math.abs(priceChange) + Math.random() * volatility * price * 0.5;
        const high = Math.max(open, close) + Math.random() * range * 0.5;
        const low = Math.min(open, close) - Math.random() * range * 0.5;
        
        // Volume with some variance (higher on trend changes)
        const baseVolume = 50000 + Math.random() * 100000;
        const volumeSpike = trendBarsRemaining < 5 ? 2.5 : 1;
        const volume = Math.floor(baseVolume * volumeSpike);
        
        candles.push({
            time: time,
            open: Math.round(open * 100) / 100,
            high: Math.round(high * 100) / 100,
            low: Math.round(low * 100) / 100,
            close: Math.round(close * 100) / 100,
            volume
        });
        
        price = close;
    }
    
    return candles;
}

/**
 * Simulate real-time WebSocket ticks on mock data.
 * Returns a cleanup function (like WebSocket.close).
 * 
 * Calls the ticker callback every `tickIntervalMs` with
 * a simulated price update on the latest candle.
 */
export function simulateMockTicker(
    baseData: MockCandle[],
    intervalSeconds: number,
    tickCallback: (ticker: { close: number; volume: number }) => void,
    tickIntervalMs: number = 1000
): { close: () => void } {
    let currentPrice = baseData[baseData.length - 1].close;
    let cumulativeVolume = baseData.reduce((sum, c) => sum + c.volume, 0);
    const volatility = 0.0008;
    
    // Small trend bias that slowly oscillates
    let microTrend = Math.random() > 0.5 ? 1 : -1;
    let tickCount = 0;
    
    const timer = setInterval(() => {
        tickCount++;
        
        // Switch micro-trend occasionally
        if (tickCount % (15 + Math.floor(Math.random() * 20)) === 0) {
            microTrend *= -1;
        }
        
        // Simulate price movement
        const trendMove = microTrend * 0.0001 * currentPrice;
        const noise = (Math.random() - 0.5) * volatility * currentPrice;
        currentPrice = Math.round((currentPrice + trendMove + noise) * 100) / 100;
        
        // Simulate cumulative volume increase
        cumulativeVolume += Math.floor(500 + Math.random() * 2000);
        
        tickCallback({
            close: currentPrice,
            volume: cumulativeVolume
        });
    }, tickIntervalMs);
    
    return {
        close: () => clearInterval(timer)
    };
}
