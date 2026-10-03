# Chart engine — how charts, indicator maths and drawing/plugin overlays are built.

`lightweight-charts` v5 is the renderer. Panes are React components; the series,
indicators and custom primitives live outside React.

## Pane and series layer
- `src/components/Chart/ChartGrid.tsx` — the pane grid; its local `LayoutType` is
  `'1' | '2' | '3' | '4'` (the workspace type in `src/types/domain/workspace.ts#LayoutType`
  is wider: also `2v` and `6` — check which one a feature must honour).
- `src/components/Chart/ChartComponent.tsx` — the chart pane: creates the chart,
  wires data, crosshair, OHLC header, drawings and indicator legends.
- `src/components/Chart/utils/seriesFactories.ts#...` — series construction by type;
  it handles `candlestick`, `bar`, `hollow-candlestick`, `line`, `area`, `baseline`,
  `heikin-ashi` and `renko` cases (the public `ChartType` union exposes six of these).
- Renko conversion for charts is separate: `src/utils/renkoUtils.ts#calculateRenko`.
- Chart appearance/theme: `src/utils/chartTheme.ts`, `src/styles/themes.ts`.

## Indicator maths (barrel `src/utils/indicators/index.ts`)
Pure functions, unit-tested per feature (see [[features/testing]]):
- Moving averages: `src/utils/indicators/sma.ts#calculateSMA`,
  `src/utils/indicators/ema.ts#calculateEMA`.
- Oscillators: `src/utils/indicators/rsi.ts#calculateRSI`,
  `src/utils/indicators/stochastic.ts#calculateStochastic`.
- Momentum: `src/utils/indicators/macd.ts#calculateMACD`.
- Volatility: `src/utils/indicators/bollingerBands.ts#calculateBollingerBands`,
  `src/utils/indicators/atr.ts#calculateATR`.
- Trend: `src/utils/indicators/supertrend.ts#calculateSupertrend`,
  `src/utils/indicators/utBotAlerts.ts#calculateUTBotAlerts`,
  `src/utils/indicators/avg_directional_index.ts#calculateADX`,
  `src/utils/indicators/ichimoku.ts#calculateIchimoku`,
  `src/utils/indicators/pivotPoints.ts#calculatePivotPoints`,
  `src/utils/indicators/hilengaMilenga.ts#calculateHilengaMilenga`.
- Volume: `src/utils/indicators/volume.ts#calculateVolume` (also `calculateVolumeMA`,
  `calculateEnhancedVolume`), `src/utils/indicators/vwap.ts#calculateVWAP` +
  anchored/bands variants.
- Strategies: `src/utils/indicators/firstCandle.ts#calculateFirstCandle`,
  `src/utils/indicators/priceActionRange.ts#calculatePriceActionRange`,
  `src/utils/indicators/rangeBreakout.ts#calculateRangeBreakout` (opening range
  9:30–10:00), `src/utils/indicators/annStrategy.ts#calculateANNStrategy`.
- Market profile: `src/utils/indicators/tpo.ts#calculateTPO`,`src/utils/indicators/tpoCalculations.ts`,
  `src/utils/indicators/tpoRenderer.ts`.
- Risk: `src/utils/indicators/riskCalculator.ts#calculateRiskPosition` (also
  `autoDetectSide`, `validateRiskParams`), plotted by
  `src/utils/indicators/riskCalculatorChart.ts#createRiskCalculatorPrimitive`.
- Market-time helpers: `src/utils/indicators/timeUtils.ts` (re-exported with `*` from
  the barrel, so it owns IST market hours and time windows).

⚠ The filenames do not always match the indicator name (ADX is in
`avg_directional_index.ts`) — grep the folder rather than guessing a path.

## Off the main thread
- `src/utils/workers/indicatorWorker.ts` — the indicator web worker.
- `src/hooks/useIndicatorWorker.ts` — the React side that talks to it.
- `src/services/indicatorDataManager.ts` — caches indicator series for **alert
  evaluation** (recomputes RSI/MACD/Bollinger/Stochastic/Supertrend/VWAP/SMA/EMA/
  ATR/UT Bot from candles); this is the path the alert monitor reads, not the chart.

## Overlays: drawings and primitives (`src/plugins/`)
- Base class: `src/plugins/plugin-base.ts#PluginBase` — implements
  `ISeriesPrimitive`, subscribes to series data changes, exposes `chart` / `series`.
- Drawing engine: `src/plugins/line-tools/` —
  `line-tool-manager.ts`, `line-tools.ts`, `template-manager.ts`,
  `history-manager.ts`, `chart-controls.ts`, `floating-toolbar.ts`,
  `text-input-dialog.ts`. The React side is `src/hooks/useChartDrawings.ts` +
  `useDrawingProperties.ts` and the UI in `src/components/Toolbar/`.
- Active drawing-tool names: `src/context/ToolContext.tsx#DRAWING_TOOLS`
  (TrendLine, HorizontalLine, VerticalLine, Rectangle, Circle, Path, Text, Callout,
  PriceRange, Arrow, Ray, ExtendedLine, ParallelChannel, FibonacciRetracement).
- Custom primitives, one folder each with `index.ts` + `*Constants.ts`:
  `tpo-profile/`, `volume-profile/`, `delta-profile/`, `footprint-chart/`,
  `oi-profile/`, `power-trades/`, `bar-stats/`, `visual-trading/`, `risk-calculator/`.
- Drawing persistence: `src/services/drawingsService.ts`; templates/workspace via
  `src/utils/TemplateManager.ts`, `src/utils/layoutTemplateService.ts`.

See [[architecture]] for where this sits in the app; [[features/market-data]] for the
data feeding it.
