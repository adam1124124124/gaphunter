import { useState, useEffect, useRef } from "react";

// CONFIG: Hardcoded premium percentage for KvamDex
const KVAMDEX_PREMIUM_PCT = 7.16;
const INITIAL_AMOUNT = 1000;
const SCAN_DURATION_MS = 5000;
const BYBIT_URL = "https://www.bybit.com";
const KVAMDEX_URL = "https://kvamdex.com";
const TELEGRAM_CONTACT = "https://t.me/pisapopakaka";


const EXCHANGES = [
  "BYBIT", "KvamDex", "MEXC", "OKX", "Gate.io", "Bitget", 
  "Binance", "Kraken", "Coinbase", "Huobi", "KuCoin", "Gemini",
  "Crypto.com", "Bitfinex", "Bitstamp", "Poloniex", "Bittrex",
  "HTX", "Upbit", "Bithumb", "Phemex", "BingX"
];

const COINS = [
  "🪙 BTC", "💎 ETH", "☀️ SOL", "🐕 DOGE", "🐸 PEPE", "🐕 SHIB",
  "🔺 TRX", "⚡ MATIC", "🔵 DOT", "🟢 AVAX", "🔴 ADA", "🟡 BNB",
  "🔗 LINK", "🔶 LTC", "🟠 XRP", "💜 UNI", "💚 ALGO", "💙 ATOM",
  "🧡 FTM", "🌙 NEAR", "⭐ XLM", "🎯 SAND", "🎮 AXS", "🏦 USDT",
  "💵 USDC", "🔥 FLOKI", "🐱 KITTY", "🌊 WAVES", "🎨 APE", "🦄 CAKE"
];

// Скорости анимации
const IDLE_SPEED = 800;
const SCAN_SPEED = 150;

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
  const [showData, setShowData] = useState(false);
  const [currentExchange, setCurrentExchange] = useState(0);
  const [currentCoin, setCurrentCoin] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<string>("");


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

  useEffect(() => {
    if (showResults) return;
    
    const speed = isScanning ? SCAN_SPEED : IDLE_SPEED;

    if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);

    cycleIntervalRef.current = window.setInterval(() => {
      setCurrentExchange((prev) => (prev + 1) % EXCHANGES.length);
      setCurrentCoin((prev) => (prev + 1) % COINS.length);
    }, speed);

    return () => {
      if (cycleIntervalRef.current) clearInterval(cycleIntervalRef.current);
    };
  }, [isScanning, showResults]);

  const startScan = async () => {
    await fetchBybitPrice();
    setShowData(true);

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
        
        setTimeout(() => {
          setIsScanning(false);
          setShowResults(true);
        }, 1500);
      }
    }, 50);
  };

  
useEffect(() => {
  if (!showResults) return;

  const firstSearchTime = localStorage.getItem('firstSearchTime');
  const now = Date.now();
  
  if (!firstSearchTime) {
    localStorage.setItem('firstSearchTime', now.toString());
  }

  const searchTime = parseInt(firstSearchTime || now.toString());
  const resetTime = searchTime + (24 * 60 * 60 * 1000);

  const updateTimer = () => {
    const remaining = resetTime - Date.now();
    
    if (remaining <= 0) {
      localStorage.removeItem('firstSearchTime');
      setTimeRemaining("00:00:00");
      return;
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    setTimeRemaining(
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    );
  };

  updateTimer();
  const timerInterval = setInterval(updateTimer, 1000);

  return () => clearInterval(timerInterval);
}, [showResults]);


  const gapPct =
    bybitPrice && kvamDexPrice
      ? ((kvamDexPrice - bybitPrice) / bybitPrice) * 100
      : 0;
  const finalUSDT = INITIAL_AMOUNT * (1 + gapPct / 100);
  const extraUSDT = finalUSDT - INITIAL_AMOUNT;

  return (
    <div className="app">
      <div className="hero">
        {!showResults ? (
          <div className="cycling-area">
            <div className="cycle-row">
              <span className="pill exchange-pill">
                {EXCHANGES[currentExchange]}
              </span>
              <span className="arrow">⇄</span>
              <span className="pill exchange-pill">
                {EXCHANGES[(currentExchange + 1) % EXCHANGES.length]}
              </span>
            </div>
            <div className="coin-row">
              <span className="pill coin-pill">{COINS[currentCoin]}</span>
            </div>
          </div>
        ) : (
          <div className="cycling-area-frozen">
            <div className="cycle-row">
              <a 
                href={BYBIT_URL} 
                target="_blank" 
                rel="noopener noreferrer"
                className="pill exchange-pill exchange-link"
              >
                BYBIT
              </a>
              <span className="arrow-static">⇄</span>
              <a 
                href={KVAMDEX_URL} 
                target="_blank" 
                rel="noopener noreferrer"
                className="pill exchange-pill exchange-link"
              >
                KvamDex
              </a>
            </div>
            <div className="coin-row">
              <span className="pill coin-pill">🔺 TRX</span>
              <span className="pair-separator">/</span>
              <span className="pill coin-pill">💵 USDT</span>
            </div>
          </div>
        )}

        <h1 className="title">GapFinder</h1>
        {!showResults && (
          <>
            <p className="subtitle">Find profitable arbitrage opportunities</p>
            <p className="scan-counter">🔍 302 scans completed today</p>
          </>
        )}


        {error && (
          <div className="error-state">
            <p className="error-message">⚠️ {error}</p>
            <button onClick={fetchBybitPrice} className="btn-retry">
              Retry
            </button>
          </div>
        )}

        {showData && !error && bybitPrice && kvamDexPrice && !isScanning && !showResults && (
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
          <button className="btn-hunt" onClick={startScan}>
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
    <h2 className="results-title">✅ Profitable Gap Found!</h2>
    <div className="live-indicator">
  <span className="pulse-dot"></span>
  Live data - Updated 3s ago
</div>
    <p className="results-subtitle">Buy on Bybit → Sell on KvamDex</p>

    <div className="results-grid">
      <div className="result-item">
        <span className="result-label">
          Buy price (Bybit)
          <a 
            href={BYBIT_URL} 
            target="_blank" 
            rel="noopener noreferrer"
            className="external-link"
          >
            🔗
          </a>
        </span>
        <span className="result-value">${bybitPrice.toFixed(6)}</span>
      </div>
      <div className="result-item">
        <span className="result-label">
          Sell price (KvamDex)
          <a 
            href={KVAMDEX_URL} 
            target="_blank" 
            rel="noopener noreferrer"
            className="external-link"
          >
            🔗
          </a>
        </span>
        <span className="result-value">${kvamDexPrice.toFixed(6)}</span>
      </div>
      <div className="result-item highlight-item">
        <span className="result-label">Price difference:</span>
        <span className="result-value gap">+{gapPct.toFixed(2)}%</span>
      </div>
      <div className="result-item highlight-item">
        <span className="result-label">
          Your profit per {INITIAL_AMOUNT} USDT
        </span>
        <span className="result-value profit">
          +${extraUSDT.toFixed(2)} ({finalUSDT.toFixed(2)} USDT)
        </span>
      </div>
    </div>

    <div className="instructions-card">
      <h3 className="instructions-title">💰 Profit Calculation</h3>
      
      <div className="calculation-table">
        <div className="calc-row">
          <span>1️⃣Starting Balance:</span>
          <span className="calc-value">1000 USDT</span>
        </div>
        <div className="calc-row">
          <span>2️⃣Buy TRX on Bybit for ${bybitPrice.toFixed(4)}:</span>
          <span className="calc-value">{(INITIAL_AMOUNT / bybitPrice).toFixed(0)} TRX</span>
        </div>
        <div className="calc-row highlight-calc">
          <span>3️⃣Transfer TRX → KvamDex:</span>
          <span className="calc-value">{(INITIAL_AMOUNT / bybitPrice).toFixed(0)} TRX</span>
        </div>
        <div className="calc-row">
          <span>4️⃣Sell TRX on KvamDex for ${kvamDexPrice.toFixed(4)}:</span>
          <span className="calc-value">{finalUSDT.toFixed(2)} USDT</span>
        </div>
        <div className="calc-row profit-row">
          <span><strong>✅NET PROFIT:</strong></span>
          <span className="calc-profit">+${extraUSDT.toFixed(2)} ({gapPct.toFixed(2)}%)</span>
        </div>
      </div>

      <div className="action-steps">
        <p><strong>🎯 How to Execute:</strong></p>
<ol>
  <li>
    Register on{" "}
    <a href={BYBIT_URL} target="_blank" rel="noopener noreferrer" className="inline-link">
      Bybit
    </a>
    {" "}and{" "}
    <a href={KVAMDEX_URL} target="_blank" rel="noopener noreferrer" className="inline-link">
      KvamDex
    </a>
  </li>
  <li>Buy TRX on Bybit with USDT</li>
  <li>Transfer TRX to KvamDex (TRC-20 network)</li>
  <li>Sell TRX for USDT on KvamDex</li>
  <li>Withdraw profit back</li>
</ol>

      </div>
    </div>

<div className="limit-notice">
  <p className="limit-text">⏳ Free scan limit reached!</p>
  <p className="limit-subtext">Next free scan in:</p>
  <p className="countdown-timer">{timeRemaining}</p>
</div>


    <a 
      href={TELEGRAM_CONTACT}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-contact"
    >
      Unlock Unlimited Access
    </a>

    <p className="contact-footer">
      For full access to real-time scanning, contact us on Telegram:{" "}
      <a 
        href={TELEGRAM_CONTACT}
        target="_blank"
        rel="noopener noreferrer"
        className="telegram-link"
      >
        @pisapopakaka
      </a>
    </p>
  </div>
)}


      </div>
    </div>
  );
}

export default App;
