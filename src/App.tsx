import { useState, useEffect, useRef } from "react";

// CONFIG: Hardcoded premium percentage for KvamDex
const KVAMDEX_PREMIUM_PCT = 7.16;
const INITIAL_AMOUNT = 1000;
const SCAN_DURATION_MS = 5000;
const PRICE_FETCH_INTERVAL_MS = 10000;

const EXCHANGES = ["BYBIT", "KvamDex", "MEXC", "OKX", "Gate.io", "Bitget"];
const COINS = [
  "🪙 BTC",
  "💎 ETH",
  "☀️ SOL",
  "🐕 DOGE",
  "🐸 PEPE",
  "🐕 SHIB",
  "🔺 TRX",
];

interface BybitTickerResponse {
  retCode: number;
  retMsg: string;
  result: {
    category: string;
    list: Array<{
      symbol: string;
      lastPrice: string;
    }>;
  };
}

function App() {
  const [bybitPrice, setBybitPrice] = useState<number | null>(null);
  const [kvamDexPrice, setKvamDexPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [showData, setShowData] = useState(false); // ✅ ДОБАВЛЕНО
  const [currentExchange, setCurrentExchange] = useState(0);
  const [currentCoin, setCurrentCoin] = useState(0);

  const intervalRef = useRef<number | null>(null);
  const scanIntervalRef = useRef<number | null>(null);
  const cycleIntervalRef = useRef<number | null>(null);

  const fetchBybitPrice = async () => {
    try {
      const response = await fetch(
        "https://api.bybit.com/v5/market/tickers?category=spot&symbol=TRXUSDT"
      );
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data: BybitTickerResponse = await response.json();

      if (data.retCode !== 0 || !data.result?.list?.[0]?.lastPrice) {
        throw new Error("Invalid response from Bybit API");
      }

      const price = parseFloat(data.result.list[0].lastPrice);
      setBybitPrice(price);
      setKvamDexPrice(price * (1 + KVAMDEX_PREMIUM_PCT / 100));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch price");
      setBybitPrice(null);
      setKvamDexPrice(null);
    }
  };

  // ✅ УДАЛЁН useEffect с автозагрузкой

  useEffect(() => {
    if (isScanning || showResults) {
      cycleIntervalRef.current = window.setInterval(() => {
        setCurrentExchange((prev) => (prev + 1) % EXCHANGES.length);
        setCurrentCoin((prev) => (prev + 1) % COINS.length);
      }, 300);
    } else {
      if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
    }

    return () => {
      if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
    };
  }, [isScanning, showResults]);

  const startScan = async () => {
    await fetchBybitPrice();
    setShowData(true); // ✅ ДОБАВЛЕНО

    setIsScanning(true);
    setShowResults(false);
    setScanProgress(0);

    const startTime = Date.now();
    scanIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / SCAN_DURATION_MS) * 100, 100);
      setScanProgress(progress);

      if (progress >= 100) {
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
        setIsScanning(false);
        setShowResults(true);
      }
    }, 50);
  };

  const resetScan = () => {
    setShowResults(false);
    setScanProgress(0);
  };

  const gapPct =
    bybitPrice && kvamDexPrice
      ? ((kvamDexPrice - bybitPrice) / bybitPrice) * 100
      : 0;
  const finalUSDT = INITIAL_AMOUNT * (1 + gapPct / 100);
  const extraUSDT = finalUSDT - INITIAL_AMOUNT;

  return (
    <div className="app">
      <div className="hero">
        <div className="cycling-area">
          <div className="cycle-row">
            <span className="pill exchange-pill">
              {EXCHANGES[currentExchange]}
            </span>
            <span className="pill coin-pill">{COINS[currentCoin]}</span>
          </div>
        </div>

        <h1 className="title">GapFinder</h1>
        <p className="subtitle">Scan platforms for rate gaps.</p>

        {error && (
          <div className="error-state">
            <p className="error-message">⚠️ {error}</p>
            <button onClick={fetchBybitPrice} className="btn-retry">
              Retry
            </button>
          </div>
        )}

        {showData && !error &&  {/* ✅ ДОБАВЛЕНО showData && */}
          bybitPrice &&
          kvamDexPrice &&
          !isScanning &&
          !showResults && (
            <div className="live-info">
              <div className="info-row">
                <span>Bybit TRX/USDT:</span>
                <span className="price">${bybitPrice.toFixed(6)}</span>
              </div>
              <div className="info-row">
                <span>KvamDex Rate:</span>
                <span className="price">${kvamDexPrice.toFixed(6)}</span>
              </div>
              <div className="info-row highlight">
                <span>Gap:</span>
                <span className="gap">+{gapPct.toFixed(2)}%</span>
              </div>
            </div>
          )}

        {!isScanning && !showResults && (
          <button
            className="btn-hunt"
            onClick={startScan}
          >
            Hunt Profit
          </button>
        )}

        {isScanning && (
          <div className="scan-area">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
            <p className="progress-text">{scanProgress.toFixed(0)}%</p>
            <p className="scan-label">Scanning exchanges...</p>
          </div>
        )}

        {showResults && bybitPrice && kvamDexPrice && (
          <div className="results-card">
            <h2 className="results-title">✅ Gap Found!</h2>
            <p className="results-subtitle">Bybit ↔ KvamDex</p>

            <div className="results-grid">
              <div className="result-item">
                <span className="result-label">Bybit Rate</span>
                <span className="result-value">${bybitPrice.toFixed(6)}</span>
              </div>
              <div className="result-item">
                <span className="result-label">KvamDex Rate</span>
                <span className="result-value">${kvamDexPrice.toFixed(6)}</span>
              </div>
              <div className="result-item highlight-item">
                <span className="result-label">Gap</span>
                <span className="result-value gap">+{gapPct.toFixed(2)}%</span>
              </div>
              <div className="result-item highlight-item">
                <span className="result-label">
                  Extra on {INITIAL_AMOUNT} USDT
                </span>
                <span className="result-value profit">
                  +${extraUSDT.toFixed(2)} ({finalUSDT.toFixed(2)} USDT)
                </span>
              </div>
            </div>

            <button className="btn-again" onClick={resetScan}>
              Run Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
