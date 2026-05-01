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
    let trendBarsRemaining = 15 + Math.floor(Math.random() * 25);

    for (let i = 0; i < count; i++) {
        const time = startTime + i * intervalSeconds;

        // Trend management - create clear trends with reversals
        trendBarsRemaining--;
        if (trendBarsRemaining <= 0) {
            trend *= -1; // Reverse trend
            trendStrength = 0.0003 + Math.random() * 0.0008;
            trendBarsRemaining = 10 + Math.floor(Math.random() * 30);
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

// ─── Simulated Clock ────────────────────────────────────────────────────────────
// A global simulated clock that advances faster based on speed multiplier.
// Used by both the mock ticker (for new candle creation) and PriceScaleTimer
// (for accelerated countdown).

let _simBaseWallTime = 0;     // Wall clock snapshot when sim started or speed changed
let _simBaseSimTime = 0;      // Simulated time at that snapshot
let _simSpeed = 1;            // Current speed multiplier

/**
 * Initialize the simulated clock. Call once when demo mode starts.
 * seedTime should be the last candle's time + intervalSeconds (start of current candle).
 */
export function initSimulatedClock(seedTime: number): void {
    _simBaseWallTime = Date.now() / 1000;
    _simBaseSimTime = seedTime;
    _simSpeed = 1;
}

/**
 * Update the speed multiplier. Only re-snapshots when speed actually changes
 * to avoid precision loss from repeated Math.floor truncation.
 */
export function setSimulatedSpeed(speed: number): void {
    if (speed === _simSpeed) return; // No change, skip re-snapshot
    
    // Snapshot current sim time before changing speed (use raw, untruncated value)
    const elapsedWall = (Date.now() / 1000) - _simBaseWallTime;
    const currentSimTime = _simBaseSimTime + elapsedWall * _simSpeed;
    _simBaseWallTime = Date.now() / 1000;
    _simBaseSimTime = currentSimTime;
    _simSpeed = speed;
}

/**
 * Get current simulated IST timestamp (in seconds, integer).
 * Advances at `speed` × real wall-clock rate.
 */
export function getSimulatedTimestamp(): number {
    if (!isDemoMode()) {
        return Math.floor(Date.now() / 1000); // Fallback to real time
    }
    const elapsedWall = (Date.now() / 1000) - _simBaseWallTime;
    return Math.floor(_simBaseSimTime + elapsedWall * _simSpeed);
}

/**
 * Get the current simulation speed
 */
export function getSimulatedSpeed(): number {
    return _simSpeed;
}

// ─── Mock Ticker ────────────────────────────────────────────────────────────────

/**
 * Simulate real-time WebSocket ticks on mock data.
 * Supports dynamic speed control via getSpeed callback.
 * Returns a cleanup object with close().
 */
export function simulateMockTicker(
    baseData: MockCandle[],
    _intervalSeconds: number,
    tickCallback: (ticker: { close: number; volume: number; simulatedTime: number }) => void,
    getSpeed: () => number = () => 1,
    baseTickMs: number = 800
): { close: () => void } {
    let currentPrice = baseData[baseData.length - 1].close;
    let cumulativeVolume = baseData.reduce((sum, c) => sum + c.volume, 0);
    
    // Calculate per-tick volatility from the actual historical data
    // so that new candles statistically match the existing ones in size.
    const recentCandles = baseData.slice(-50);
    const avgRange = recentCandles.reduce((sum, c) => sum + Math.abs(c.close - c.open), 0) / recentCandles.length;
    const avgPrice = recentCandles.reduce((sum, c) => sum + c.close, 0) / recentCandles.length;
    const candleVolatility = avgRange / avgPrice; // e.g., ~0.003
    // Ticks per candle at 1x speed
    const ticksPerCandle = (_intervalSeconds * 1000) / baseTickMs;
    // Per-tick volatility = candle volatility / sqrt(ticks) (random walk scaling)
    const perTickVolatility = candleVolatility / Math.sqrt(ticksPerCandle);
    const perTickTrend = perTickVolatility * 0.15; // trend component = 15% of noise
    
    // Initialize simulated clock near the END of the last candle's period
    // so a new candle forms within a few seconds (not after a full interval wait).
    // Last candle spans [lastCandleTime, lastCandleTime + interval).
    // Seed clock 5 seconds before the next boundary.
    const lastCandleTime = baseData[baseData.length - 1].time;
    const seedTime = lastCandleTime + _intervalSeconds - 5;
    initSimulatedClock(seedTime);
    
    let microTrend = Math.random() > 0.5 ? 1 : -1;
    let tickCount = 0;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    
    const tick = () => {
        if (stopped) return;
        
        tickCount++;
        const speed = getSpeed();
        
        // Keep simulated clock in sync with current speed
        setSimulatedSpeed(speed);
        
        // Switch micro-trend occasionally
        if (tickCount % (15 + Math.floor(Math.random() * 20)) === 0) {
            microTrend *= -1;
        }
        
        // Per-tick price movement — volatility is pre-scaled to match historical candle size.
        // Speed only affects tick FREQUENCY (not magnitude), so candles stay the same size.
        const trendMove = microTrend * perTickTrend * currentPrice;
        const noise = (Math.random() - 0.5) * perTickVolatility * currentPrice;
        currentPrice = Math.round((currentPrice + trendMove + noise) * 100) / 100;
        
        // Simulate cumulative volume increase
        cumulativeVolume += Math.floor((500 + Math.random() * 2000) * speed);
        
        tickCallback({
            close: currentPrice,
            volume: cumulativeVolume,
            simulatedTime: getSimulatedTimestamp()
        });
        
        // Schedule next tick: faster at higher speed
        const nextInterval = Math.max(50, Math.floor(baseTickMs / speed));
        timerId = setTimeout(tick, nextInterval);
    };
    
    // Start first tick
    timerId = setTimeout(tick, baseTickMs);
    
    return {
        close: () => {
            stopped = true;
            if (timerId) clearTimeout(timerId);
        }
    };
}
