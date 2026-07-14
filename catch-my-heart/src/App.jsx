import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * Catch My Heart 💕
 * A cute mini-game: drag/tap to move the basket, catch falling hearts,
 * dodge the clouds, fill the meter, get a sweet surprise message.
 *
 * Fully touch-friendly for mobile. Drop this into any React app
 * (Vite, Next.js, CRA...). No external deps required.
 */

const GOAL = 15;
const DURATION = 20;
const GOOD = ["💖", "💕", "💗", "💓", "💝"];
const BAD = ["☁️", "🌧️"];

const WIN_TITLE = "you caught my heart 🥹";
const WIN_MSG =
  "One month with you and I already can't picture my days without you in them. " +
  "You're the one who always finds a way to make me smile, even on the days that don't deserve it. " +
  "I love having you beside me, and I love you. Here's to so many more. 💗";
const LOSE_TITLE = "close enough — I'm still yours 😌";
const LOSE_MSG =
  "Okay so the hearts got away a little, but honestly? So did mine, a long time ago — straight to you. " +
  "Play again if you want a redo, or just take the win. 💗";

export default function CatchMyHeart() {
  const [stage, setStage] = useState("start"); // start | playing | end
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [won, setWon] = useState(false);
  const [basketX, setBasketX] = useState(
    typeof window !== "undefined" ? window.innerWidth / 2 : 200
  );

  const gameAreaRef = useRef(null);
  const fallersRef = useRef([]); // {id, el(ref via state re-render), x, y, speed, bad}
  const [fallers, setFallers] = useState([]);
  const rafRef = useRef(null);
  const spawnTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const idRef = useRef(0);
  const scoreRef = useRef(0);
  const canvasRef = useRef(null);

  const clampX = useCallback((x) => {
    const w = window.innerWidth;
    return Math.max(30, Math.min(w - 30, x));
  }, []);

  const handlePointerMove = useCallback(
    (clientX) => {
      if (stage !== "playing") return;
      setBasketX(clampX(clientX));
    },
    [stage, clampX]
  );

  useEffect(() => {
    const onMouse = (e) => handlePointerMove(e.clientX);
    const onTouch = (e) => {
      if (e.touches[0]) handlePointerMove(e.touches[0].clientX);
    };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
    };
  }, [handlePointerMove]);

  const spawnItem = useCallback(() => {
    const isBad = Math.random() < 0.28;
    const w = window.innerWidth;
    const item = {
      id: idRef.current++,
      x: 20 + Math.random() * (w - 40),
      y: -40,
      speed: 2 + Math.random() * 2.2,
      bad: isBad,
      symbol: isBad
        ? BAD[Math.floor(Math.random() * BAD.length)]
        : GOOD[Math.floor(Math.random() * GOOD.length)],
      caught: false,
    };
    fallersRef.current.push(item);
  }, []);

  const endGame = useCallback(() => {
    setStage("end");
    clearInterval(spawnTimerRef.current);
    clearInterval(countdownRef.current);
    cancelAnimationFrame(rafRef.current);
    fallersRef.current = [];
    setFallers([]);
    const didWin = scoreRef.current >= GOAL;
    setWon(didWin);
    if (didWin) launchConfetti(canvasRef.current);
  }, []);

  const loop = useCallback(() => {
    const basketTop = window.innerHeight - 30 - 26;
    let changed = false;
    fallersRef.current.forEach((item) => {
      if (item.caught) return;
      item.y += item.speed;

      if (
        item.y > basketTop - 20 &&
        item.y < basketTop + 30 &&
        Math.abs(item.x - basketX) < 42
      ) {
        item.caught = true;
        changed = true;
        if (item.bad) {
          scoreRef.current = Math.max(0, scoreRef.current - 1);
        } else {
          scoreRef.current += 1;
        }
        setScore(scoreRef.current);
      } else if (item.y > window.innerHeight + 40) {
        item.caught = true;
        changed = true;
      }
    });
    if (changed) {
      fallersRef.current = fallersRef.current.filter((f) => !f.caught);
    }
    setFallers([...fallersRef.current]);
    rafRef.current = requestAnimationFrame(loop);
  }, [basketX]);

  const startGame = useCallback(() => {
    scoreRef.current = 0;
    setScore(0);
    setTimeLeft(DURATION);
    setWon(false);
    fallersRef.current = [];
    setFallers([]);
    setStage("playing");

    spawnTimerRef.current = setInterval(spawnItem, 550);
    countdownRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          endGame();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    rafRef.current = requestAnimationFrame(loop);
  }, [spawnItem, loop, endGame]);

  useEffect(() => {
    return () => {
      clearInterval(spawnTimerRef.current);
      clearInterval(countdownRef.current);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    if (stage !== "playing") return;
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, loop]);

  useEffect(() => {
    const onResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      setBasketX((x) => clampX(x));
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampX]);

  const pct = Math.min(100, (score / GOAL) * 100);

  return (
    <div style={styles.root}>
      <Stars />
      <canvas ref={canvasRef} style={styles.canvas} />

      {stage === "start" && (
        <div style={styles.centerScreen}>
          <h1 style={styles.title}>catch my heart 💕</h1>
          <p style={styles.subtitle}>
            Tap or drag to move the basket and catch as many hearts as you
            can. Watch out for the grumpy clouds ☁️ — they don't count!
          </p>
          <button style={styles.bigButton} onClick={startGame}>
            start the game
          </button>
        </div>
      )}

      {stage === "playing" && (
        <div ref={gameAreaRef} style={styles.gameArea}>
          <div style={styles.hud}>
            <div style={styles.hudText}>💖 {score}</div>
            <div style={styles.meterWrap}>
              <div style={{ ...styles.meterFill, width: `${pct}%` }} />
            </div>
            <div style={styles.hudText}>⏱ {timeLeft}s</div>
          </div>

          {fallers.map((f) => (
            <div
              key={f.id}
              style={{
                ...styles.falling,
                left: f.x,
                transform: `translateY(${f.y}px)`,
              }}
            >
              {f.symbol}
            </div>
          ))}

          <div
            style={{
              ...styles.basket,
              left: basketX,
            }}
          >
            🧺
          </div>
        </div>
      )}

      {stage === "end" && (
        <div style={styles.surpriseOverlay}>
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>{won ? WIN_TITLE : LOSE_TITLE}</h2>
            <p style={styles.cardMsg}>{won ? WIN_MSG : LOSE_MSG}</p>
            <button style={styles.cardButton} onClick={startGame}>
              play again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stars() {
  const stars = useRef(
    Array.from({ length: 70 }).map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 3,
    }))
  ).current;

  return (
    <div style={styles.starsWrap}>
      {stars.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: 2,
            height: 2,
            background: "#fff",
            borderRadius: "50%",
            opacity: 0.6,
            left: `${s.left}vw`,
            top: `${s.top}vh`,
            animation: `twinkle 3s infinite ease-in-out`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes twinkle { 0%,100%{opacity:.15;} 50%{opacity:.9;} }
        @media (prefers-reduced-motion: reduce) {
          * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

function launchConfetti(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const colors = ["#ff6f9c", "#ffd166", "#ffb3c6", "#e0aaff", "#ffffff"];
  const pieces = Array.from({ length: 120 }).map(() => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.5,
    r: 4 + Math.random() * 5,
    c: colors[Math.floor(Math.random() * colors.length)],
    vy: 2 + Math.random() * 3,
    vx: -1.5 + Math.random() * 3,
    rot: Math.random() * 360,
    vr: -6 + Math.random() * 12,
  }));
  let frame = 0;
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    pieces.forEach((p) => {
      if (p.y > canvas.height + 20) return;
      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rot * Math.PI) / 180);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 1.6);
      ctx.restore();
    });
    frame++;
    if (alive && frame < 260) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  tick();
}

const styles = {
  root: {
    position: "fixed",
    inset: 0,
    background:
      "radial-gradient(ellipse at top, #6a3f8f, #2b1a3d 70%)",
    overflow: "hidden",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    touchAction: "none",
    userSelect: "none",
  },
  starsWrap: { position: "fixed", inset: 0, zIndex: 0 },
  canvas: { position: "fixed", inset: 0, zIndex: 9, pointerEvents: "none" },
  centerScreen: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    textAlign: "center",
    color: "#fff6ef",
    padding: "0 24px",
  },
  title: {
    fontFamily: "'Brush Script MT', 'Segoe Script', cursive",
    fontSize: "clamp(2.5rem, 8vw, 4.5rem)",
    color: "#ffb3c6",
    margin: "0 0 6px 0",
    textShadow: "0 0 20px rgba(255,111,156,0.5)",
  },
  subtitle: {
    margin: "0 0 28px 0",
    fontSize: "1rem",
    letterSpacing: ".5px",
    color: "#e6d9f0",
    opacity: 0.85,
    maxWidth: 340,
  },
  bigButton: {
    background: "linear-gradient(135deg, #ff6f9c, #d64a7c)",
    color: "#fff",
    border: "none",
    padding: "16px 38px",
    fontSize: "1.1rem",
    borderRadius: 40,
    cursor: "pointer",
    fontWeight: 600,
    letterSpacing: ".5px",
    boxShadow: "0 8px 24px rgba(255,111,156,.4)",
  },
  gameArea: { position: "fixed", inset: 0, zIndex: 1 },
  hud: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 22px",
    color: "#fff6ef",
    fontSize: "1rem",
  },
  hudText: { minWidth: 60 },
  meterWrap: {
    flex: 1,
    maxWidth: 340,
    margin: "0 16px",
    height: 14,
    background: "rgba(255,255,255,.15)",
    borderRadius: 10,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,.25)",
  },
  meterFill: {
    height: "100%",
    background: "linear-gradient(90deg, #ff6f9c, #ffd166)",
    transition: "width .25s ease",
  },
  falling: {
    position: "absolute",
    top: -40,
    fontSize: 32,
    filter: "drop-shadow(0 2px 6px rgba(0,0,0,.35))",
  },
  basket: {
    position: "fixed",
    bottom: 30,
    fontSize: 52,
    transform: "translateX(-50%)",
    zIndex: 4,
    pointerEvents: "none",
    filter: "drop-shadow(0 4px 10px rgba(0,0,0,.4))",
  },
  surpriseOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background:
      "radial-gradient(ellipse at center, rgba(74,42,92,.98), rgba(43,26,61,.99))",
  },
  card: {
    background: "linear-gradient(160deg, #fff6ef, #ffe9ee)",
    color: "#4a2a5c",
    borderRadius: 22,
    padding: "40px 34px",
    maxWidth: 380,
    width: "88%",
    textAlign: "center",
    boxShadow: "0 20px 60px rgba(0,0,0,.5)",
  },
  cardTitle: {
    fontFamily: "'Brush Script MT', 'Segoe Script', cursive",
    fontSize: "2.4rem",
    margin: "0 0 14px 0",
    color: "#ff6f9c",
  },
  cardMsg: { lineHeight: 1.6, fontSize: "1.02rem", margin: "0 0 22px 0" },
  cardButton: {
    background: "transparent",
    border: "2px solid #ff6f9c",
    color: "#ff6f9c",
    padding: "10px 26px",
    borderRadius: 30,
    fontWeight: 600,
    cursor: "pointer",
  },
};
