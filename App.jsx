import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring as useFramerSpring } from 'framer-motion';
import { HABITS, DAYS, CAT_STYLE, LEVELS, MAX_WEEKLY_XP, DUKE_QUOTES } from './constants.js';
import { getLevel, getNextLevel, weekXP, dayXP, isDayDone, completeDaysCount,
         loadData, saveData, defaultData, formatDate, randomItem } from './store.js';
import { soundCheck, soundUncheck, soundDayComplete, soundLevelUp, soundGodMode,
         soundNewWeek, speakDuke } from './audio.js';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const GOLD = '#D4A843';
const GOLD_DIM = '#8B6914';

// ─── CURSOR GLOW ─────────────────────────────────────────────────────────────
function CursorGlow() {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  useEffect(() => {
    const move = (e) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, []);
  const springX = useFramerSpring(x, { stiffness: 80, damping: 20 });
  const springY = useFramerSpring(y, { stiffness: 80, damping: 20 });
  return (
    <motion.div
      style={{
        position: 'fixed', pointerEvents: 'none', zIndex: 1,
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,168,67,0.04) 0%, transparent 70%)',
        left: springX, top: springY,
        translateX: '-50%', translateY: '-50%',
      }}
    />
  );
}

// ─── CINEMATIC BACKGROUND ─────────────────────────────────────────────────────
function CinematicBackground({ levelColor }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:0, overflow:'hidden', pointerEvents:'none' }}>
      {/* Deep space base */}
      <div style={{
        position:'absolute', inset:0,
        background:'#000000',
      }}/>

      {/* Primary orb — level color */}
      <motion.div style={{
        position:'absolute', borderRadius:'50%',
        width:900, height:900,
        left:'50%', top:'-20%',
        translateX:'-50%',
        background:`radial-gradient(circle, ${levelColor}08 0%, ${levelColor}03 40%, transparent 70%)`,
        filter:'blur(80px)',
      }}
        animate={{ scale:[1,1.15,1], opacity:[0.7,1,0.7] }}
        transition={{ duration:8, repeat:Infinity, ease:'easeInOut' }}
      />

      {/* Secondary orb */}
      <motion.div style={{
        position:'absolute', borderRadius:'50%',
        width:500, height:500,
        right:'-10%', bottom:'20%',
        background:'radial-gradient(circle, rgba(56,189,248,0.05) 0%, transparent 70%)',
        filter:'blur(60px)',
      }}
        animate={{ scale:[1,1.2,1], x:[0,-30,0], y:[0,20,0] }}
        transition={{ duration:12, repeat:Infinity, ease:'easeInOut', delay:3 }}
      />

      {/* Tertiary orb */}
      <motion.div style={{
        position:'absolute', borderRadius:'50%',
        width:400, height:400,
        left:'5%', bottom:'10%',
        background:'radial-gradient(circle, rgba(167,139,250,0.04) 0%, transparent 70%)',
        filter:'blur(50px)',
      }}
        animate={{ scale:[1,1.3,1], x:[0,20,0], y:[0,-20,0] }}
        transition={{ duration:10, repeat:Infinity, ease:'easeInOut', delay:6 }}
      />

      {/* Subtle scanline grid */}
      <div style={{
        position:'absolute', inset:0,
        backgroundImage:`
          linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)
        `,
        backgroundSize:'80px 80px',
      }}/>

      {/* Fine grain noise */}
      <div style={{
        position:'absolute', inset:0,
        backgroundImage:`url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
        opacity:0.6,
      }}/>

      {/* Vignette */}
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(ellipse 90% 80% at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%)',
      }}/>
    </div>
  );
}

// ─── PARTICLE BURST ───────────────────────────────────────────────────────────
function Particle({ x, y, color, size, angle, speed, onDone }) {
  const dx = Math.cos(angle) * speed;
  const dy = Math.sin(angle) * speed;
  return (
    <motion.div
      style={{
        position:'fixed', left:x, top:y,
        width:size, height:size, borderRadius:'50%',
        background:color,
        boxShadow:`0 0 ${size*3}px ${color}`,
        pointerEvents:'none', zIndex:9999,
      }}
      initial={{ opacity:1, scale:1, x:0, y:0 }}
      animate={{ opacity:0, scale:0, x:dx*70, y:dy*70 }}
      transition={{ duration:0.8, ease:'easeOut' }}
      onAnimationComplete={onDone}
    />
  );
}

function ParticleSystem({ bursts }) {
  return (
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:9999 }}>
      {bursts.map(b =>
        Array.from({length:16}).map((_,i) => {
          const angle = (i/16) * Math.PI * 2 + Math.random() * 0.3;
          const speed = 0.6 + Math.random() * 1.8;
          const size  = 3 + Math.random() * 5;
          return (
            <Particle key={`${b.id}-${i}`}
              x={b.x} y={b.y} color={b.color}
              angle={angle} speed={speed} size={size}
              onDone={() => {}}
            />
          );
        })
      )}
    </div>
  );
}

// ─── XP FLASH ─────────────────────────────────────────────────────────────────
function XPFlash({ messages }) {
  return (
    <div style={{ position:'fixed', top:'28%', left:'50%', transform:'translateX(-50%)', zIndex:9998, pointerEvents:'none' }}>
      <AnimatePresence>
        {messages.map(m => (
          <motion.div key={m.id} style={{
            textAlign:'center', whiteSpace:'nowrap',
            fontFamily:"'Syne', sans-serif",
            fontSize: m.big ? 44 : 26,
            fontWeight: 800,
            color: m.color || GOLD,
            textShadow:`0 0 40px ${m.color || GOLD}, 0 0 80px ${(m.color || GOLD)}60`,
            letterSpacing: m.big ? 6 : 4,
          }}
            initial={{ opacity:0, y:16, scale:0.6, filter:'blur(8px)' }}
            animate={{ opacity:1, y:0, scale:1, filter:'blur(0px)' }}
            exit={{ opacity:0, y:-50, scale:1.4, filter:'blur(4px)' }}
            transition={{ type:'spring', stiffness:500, damping:22 }}
          >
            {m.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── DUKE TOAST ───────────────────────────────────────────────────────────────
function DukeQuote({ quote }) {
  return (
    <AnimatePresence>
      {quote && (
        <motion.div
          style={{ position:'fixed', bottom:100, left:'50%', zIndex:9990, maxWidth:400, width:'92vw' }}
          initial={{ x:'-50%', y:24, opacity:0, scale:0.94 }}
          animate={{ x:'-50%', y:0, opacity:1, scale:1 }}
          exit={{ x:'-50%', y:-16, opacity:0, scale:0.96 }}
          transition={{ type:'spring', stiffness:350, damping:28 }}
        >
          <div style={{
            background:'rgba(8,8,8,0.96)',
            border:'1px solid rgba(212,168,67,0.25)',
            borderRadius:16,
            padding:'18px 22px',
            backdropFilter:'blur(40px)',
            boxShadow:`0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)`,
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <motion.div
                animate={{ rotate:[0,-8,8,-8,0] }}
                transition={{ duration:0.6, delay:0.1 }}
                style={{ fontSize:16 }}
              >🎮</motion.div>
              <span style={{ fontSize:8, color:GOLD, letterSpacing:5, fontWeight:700 }}>DUKE SAYS</span>
              <div style={{ flex:1, height:'1px', background:'linear-gradient(90deg, rgba(212,168,67,0.3), transparent)' }}/>
            </div>
            <p style={{ fontSize:13.5, color:'rgba(255,255,255,0.85)', lineHeight:1.55, fontWeight:500, fontStyle:'italic' }}>
              "{quote}"
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── ANIMATED NUMBER ─────────────────────────────────────────────────────────
function AnimNum({ value, style }) {
  const spring = useFramerSpring(value, { stiffness:90, damping:22 });
  const display = useTransform(spring, v => Math.round(v));
  const [disp, setDisp] = useState(value);
  useEffect(() => { spring.set(value); }, [value]);
  useEffect(() => { return display.on('change', v => setDisp(v)); }, []);
  return <motion.span style={style}>{disp}</motion.span>;
}

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({ value, label, color, icon, delay=0 }) {
  return (
    <motion.div
      initial={{ opacity:0, y:14, scale:0.95 }}
      animate={{ opacity:1, y:0, scale:1 }}
      transition={{ delay, type:'spring', stiffness:250, damping:22 }}
      whileHover={{ scale:1.04, y:-3 }}
      style={{
        background:'rgba(255,255,255,0.028)',
        border:'1px solid rgba(255,255,255,0.065)',
        borderRadius:18,
        padding:'16px 14px',
        textAlign:'center',
        flex:1,
        backdropFilter:'blur(20px)',
        cursor:'default',
        boxShadow:`0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`,
        minWidth:68,
        position:'relative',
        overflow:'hidden',
      }}
    >
      {/* Subtle top border glow */}
      <div style={{
        position:'absolute', top:0, left:'15%', right:'15%', height:1,
        background:`linear-gradient(90deg, transparent, ${color}60, transparent)`,
      }}/>
      {icon && <div style={{ fontSize:18, marginBottom:5 }}>{icon}</div>}
      <div style={{ fontSize:18, fontWeight:800, color, fontFamily:"'Syne Mono', monospace", lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:8, color:'rgba(255,255,255,0.22)', letterSpacing:2.5, marginTop:5, fontWeight:600 }}>{label}</div>
    </motion.div>
  );
}

// ─── LEVEL ORBS ───────────────────────────────────────────────────────────────
function LevelOrb({ level, size='md', pulse=false }) {
  const sz = size === 'sm' ? 40 : size === 'lg' ? 72 : 58;
  const fs = size === 'sm' ? 9 : size === 'lg' ? 13 : 11;
  return (
    <motion.div
      whileHover={{ scale:1.08 }}
      style={{ position:'relative', width:sz, height:sz, flexShrink:0 }}
    >
      {pulse && (
        <motion.div style={{
          position:'absolute', inset:-6, borderRadius:'50%',
          background:`radial-gradient(circle, ${level.color}20, transparent)`,
        }}
          animate={{ scale:[1,1.4,1], opacity:[0.6,0,0.6] }}
          transition={{ duration:2.5, repeat:Infinity }}
        />
      )}
      <svg width={sz} height={sz} style={{ position:'absolute', inset:0 }}>
        <circle cx={sz/2} cy={sz/2} r={sz/2-2} fill="none" stroke={`${level.color}22`} strokeWidth={1.5}/>
        <circle cx={sz/2} cy={sz/2} r={sz/2-2} fill="none" stroke={level.color} strokeWidth={1.5}
          strokeDasharray={`${(sz-4)*Math.PI}`}
          strokeLinecap="round"
          style={{ filter:`drop-shadow(0 0 6px ${level.color})` }}
        />
      </svg>
      <div style={{
        position:'absolute', inset:3, borderRadius:'50%',
        background:'#070707',
        display:'flex', alignItems:'center', justifyContent:'center',
        flexDirection:'column',
      }}>
        <div style={{ fontSize:fs, fontWeight:800, color:level.color, fontFamily:"'Syne Mono', monospace", lineHeight:1 }}>
          {level.level}
        </div>
      </div>
    </motion.div>
  );
}

// ─── XP BAR ───────────────────────────────────────────────────────────────────
function XPBar({ totalXP, level, nextLvl, xpPct }) {
  return (
    <div style={{ width:'100%' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
        <span style={{ fontSize:11, color:level.color, fontWeight:700, fontFamily:"'Syne Mono', monospace", letterSpacing:1 }}>
          {totalXP} <span style={{ fontSize:9, opacity:0.6 }}>XP</span>
        </span>
        <span style={{ fontSize:9, color:'rgba(255,255,255,0.2)', letterSpacing:1.5 }}>
          {nextLvl ? `${nextLvl.min - totalXP} XP → ${nextLvl.title}` : '⚡ MAXIMUM POWER'}
        </span>
      </div>
      <div style={{ position:'relative', height:5, background:'rgba(255,255,255,0.04)', borderRadius:3, overflow:'hidden' }}>
        <motion.div
          style={{
            position:'absolute', top:0, bottom:0, left:0,
            background:`linear-gradient(90deg, ${level.color}55, ${level.color}, rgba(255,255,255,0.5))`,
            borderRadius:3,
            boxShadow:`0 0 16px ${level.glow}`,
          }}
          initial={{ width:0 }}
          animate={{ width:`${xpPct}%` }}
          transition={{ duration:1.2, ease:[0.34,1.56,0.64,1] }}
        />
        {/* Shimmer sweep */}
        <motion.div style={{
          position:'absolute', top:0, bottom:0, width:60,
          background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
        }}
          animate={{ x:[-60, 500] }}
          transition={{ duration:3, repeat:Infinity, ease:'linear', repeatDelay:2 }}
        />
      </div>
      {/* Level milestone dots */}
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:6, padding:'0 1px' }}>
        {LEVELS.map(l => (
          <motion.div key={l.level}
            title={l.title}
            animate={{ scale: totalXP >= l.min ? [1,1.6,1] : 1 }}
            transition={{ duration:0.4 }}
            style={{
              width:5, height:5, borderRadius:'50%',
              background: totalXP >= l.min ? l.color : 'rgba(255,255,255,0.06)',
              boxShadow: totalXP >= l.min ? `0 0 8px ${l.glow}` : 'none',
              cursor:'help',
              transition:'all 0.4s',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── HABIT CHECKBOX ───────────────────────────────────────────────────────────
const HabitCheck = memo(function HabitCheck({ done, accent, glow, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale:0.7 }}
      whileHover={{ scale:1.15 }}
      style={{
        width:'100%', aspectRatio:'1',
        border:`1px solid ${done ? accent : 'rgba(255,255,255,0.06)'}`,
        borderRadius:10,
        background: done ? `${accent}14` : 'rgba(255,255,255,0.015)',
        cursor:'pointer',
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:13, color:accent, fontWeight:900,
        boxShadow: done ? `0 0 20px ${glow}, inset 0 0 12px ${accent}12` : 'none',
        transition:'border-color 0.15s, background 0.15s, box-shadow 0.15s',
        position:'relative', overflow:'hidden',
        outline:'none',
      }}
    >
      <AnimatePresence>
        {done && (
          <motion.span key="check"
            initial={{ scale:0, rotate:-45 }}
            animate={{ scale:1, rotate:0 }}
            exit={{ scale:0, rotate:45 }}
            transition={{ type:'spring', stiffness:600, damping:22 }}
          >✓</motion.span>
        )}
      </AnimatePresence>
      {done && (
        <motion.div style={{
          position:'absolute', inset:0, borderRadius:10,
          background:`radial-gradient(circle, ${accent}25, transparent)`,
        }}
          initial={{ opacity:1, scale:0.8 }}
          animate={{ opacity:0, scale:2 }}
          transition={{ duration:0.5 }}
        />
      )}
    </motion.button>
  );
});

// ─── DAY CHIP ─────────────────────────────────────────────────────────────────
function DayChip({ day, xp, done, idx }) {
  const maxDayXP = HABITS.reduce((a,h) => a+h.xp, 0);
  const pct = Math.round((xp / maxDayXP) * 100);
  return (
    <motion.div
      initial={{ opacity:0, y:14 }}
      animate={{ opacity:1, y:0 }}
      transition={{ delay: idx * 0.04, type:'spring', stiffness:250 }}
      whileHover={{ scale:1.07, y:-4 }}
      style={{
        background: done ? 'rgba(212,168,67,0.07)' : 'rgba(255,255,255,0.02)',
        border:`1px solid ${done ? GOLD+'55' : 'rgba(255,255,255,0.055)'}`,
        borderRadius:16,
        padding:'12px 10px',
        textAlign:'center',
        minWidth:52,
        flex:1,
        boxShadow: done ? `0 0 30px rgba(212,168,67,0.2), inset 0 1px 0 rgba(212,168,67,0.15)` : 'none',
        backdropFilter:'blur(12px)',
        cursor:'default',
        position:'relative',
        overflow:'hidden',
      }}
    >
      {done && (
        <div style={{
          position:'absolute', inset:0,
          background:'linear-gradient(180deg, rgba(212,168,67,0.04) 0%, transparent 100%)',
        }}/>
      )}
      <div style={{ fontSize:8, color: done ? GOLD : 'rgba(255,255,255,0.2)', letterSpacing:2, fontWeight:700 }}>{day}</div>
      <AnimatePresence mode="wait">
        {done ? (
          <motion.div key="fire"
            initial={{ scale:0, rotate:-20 }} animate={{ scale:1, rotate:0 }} exit={{ scale:0 }}
            transition={{ type:'spring', stiffness:500 }}
            style={{ fontSize:20, marginTop:4 }}
          >🔥</motion.div>
        ) : (
          <motion.div key="xp"
            style={{ fontSize:14, fontWeight:800, color: xp > 0 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.1)',
                     marginTop:4, fontFamily:"'Syne Mono', monospace" }}
          >{xp > 0 ? xp : '—'}</motion.div>
        )}
      </AnimatePresence>
      {/* Progress sliver at bottom */}
      {!done && xp > 0 && (
        <div style={{ position:'absolute', bottom:0, left:0, right:0, height:2, background:'rgba(255,255,255,0.04)' }}>
          <motion.div
            initial={{ width:0 }}
            animate={{ width:`${pct}%` }}
            transition={{ duration:0.8, ease:'easeOut' }}
            style={{ height:'100%', background:GOLD, borderRadius:1 }}
          />
        </div>
      )}
    </motion.div>
  );
}

// ─── HABIT ROW ────────────────────────────────────────────────────────────────
function HabitRow({ habit, checked, onToggle, rowIndex }) {
  const cs      = CAT_STYLE[habit.category];
  const weekDone = DAYS.filter((_,i) => checked[`${habit.id}-${i}`]).length;
  const allDone  = weekDone === 7;
  const pct      = (weekDone / 7) * 100;

  return (
    <motion.div
      initial={{ opacity:0, x:-16 }}
      animate={{ opacity:1, x:0 }}
      transition={{ delay: rowIndex * 0.035, type:'spring', stiffness:220 }}
      style={{ display:'grid', gridTemplateColumns:'152px repeat(7,1fr)', gap:4, marginBottom:4, alignItems:'center' }}
    >
      {/* Label */}
      <motion.div
        whileHover={{ x:2 }}
        style={{
          display:'flex', alignItems:'center', gap:8,
          background: allDone ? 'rgba(212,168,67,0.06)' : 'rgba(255,255,255,0.018)',
          borderLeft:`2px solid ${allDone ? GOLD : cs.accent}`,
          borderRadius:10,
          padding:'9px 11px',
          boxShadow: allDone ? `0 0 24px rgba(212,168,67,0.15)` : 'none',
          overflow:'hidden',
          cursor:'default',
          position:'relative',
          transition:'all 0.3s',
        }}
      >
        <motion.span
          style={{ fontSize:16, display:'block', flexShrink:0 }}
          animate={allDone ? { y:[0,-2,0] } : {}}
          transition={{ duration:2, repeat:Infinity, repeatDelay:1 }}
        >{habit.emoji}</motion.span>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ fontSize:10.5, color: allDone ? GOLD : 'rgba(255,255,255,0.8)', fontWeight:700, letterSpacing:0.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            {habit.label}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4, marginTop:2 }}>
            <div style={{ flex:1, height:2, background:'rgba(255,255,255,0.05)', borderRadius:1 }}>
              <motion.div
                animate={{ width:`${pct}%` }}
                transition={{ duration:0.6, ease:'easeOut' }}
                style={{ height:'100%', background: allDone ? GOLD : cs.accent, borderRadius:1, opacity:0.7 }}
              />
            </div>
            <span style={{ fontSize:8, color:'rgba(255,255,255,0.2)', fontFamily:"'Syne Mono', monospace", flexShrink:0 }}>
              {weekDone}/7
            </span>
          </div>
        </div>
      </motion.div>

      {/* Checkboxes */}
      {DAYS.map((_,i) => (
        <HabitCheck key={i}
          done={!!checked[`${habit.id}-${i}`]}
          accent={cs.accent} glow={cs.glow}
          onClick={(e) => onToggle(habit.id, i, e)}
        />
      ))}
    </motion.div>
  );
}

// ─── VIEW TITLE ───────────────────────────────────────────────────────────────
function ViewTitle({ icon, title, sub }) {
  return (
    <motion.div
      initial={{ opacity:0, y:-10 }}
      animate={{ opacity:1, y:0 }}
      style={{ textAlign:'center', marginBottom:32 }}
    >
      <motion.div
        animate={{ rotate:[0,5,-5,0] }}
        transition={{ duration:3, repeat:Infinity, repeatDelay:4 }}
        style={{ fontSize:30, marginBottom:8 }}
      >{icon}</motion.div>
      <div style={{ fontFamily:"'Syne', sans-serif", fontSize:20, letterSpacing:8, color:'rgba(255,255,255,0.9)', fontWeight:800 }}>{title}</div>
      {sub && <div style={{ fontSize:10, color:'rgba(255,255,255,0.2)', letterSpacing:3, marginTop:6 }}>{sub}</div>}
    </motion.div>
  );
}

// ─── CURRENT VIEW ─────────────────────────────────────────────────────────────
function CurrentView({ data, onToggle, onNewWeek }) {
  const { checked, currentWeek, totalStreak } = data;
  const totalXP  = weekXP(checked);
  const level    = getLevel(totalXP);
  const nextLvl  = getNextLevel(totalXP);
  const xpPct    = nextLvl ? ((totalXP-level.min)/(nextLvl.min-level.min))*100 : 100;
  const doneDays = completeDaysCount(checked);
  const totalPct = Math.round((totalXP/MAX_WEEKLY_XP)*100);
  const godMode  = totalXP === MAX_WEEKLY_XP;

  return (
    <motion.div
      key="current"
      initial={{ opacity:0, y:24 }}
      animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, y:-24 }}
      transition={{ type:'spring', stiffness:220, damping:26 }}
      style={{ maxWidth:760, margin:'0 auto', padding:'28px 16px 100px' }}
    >
      {/* GOD MODE Banner */}
      <AnimatePresence>
        {godMode && (
          <motion.div
            initial={{ height:0, opacity:0, scale:0.96 }}
            animate={{ height:'auto', opacity:1, scale:1 }}
            exit={{ height:0, opacity:0 }}
            style={{ marginBottom:28, overflow:'hidden' }}
          >
            <div style={{
              position:'relative',
              background:'linear-gradient(135deg, rgba(212,168,67,0.08), rgba(251,146,60,0.05))',
              border:'1px solid rgba(212,168,67,0.35)',
              borderRadius:24,
              textAlign:'center', padding:'36px 24px',
              overflow:'hidden',
              boxShadow:'0 0 80px rgba(212,168,67,0.18)',
            }}>
              {/* Radial glow behind crown */}
              <div style={{
                position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
                width:300, height:300,
                background:'radial-gradient(circle, rgba(212,168,67,0.12) 0%, transparent 70%)',
                pointerEvents:'none',
              }}/>
              <motion.div
                animate={{ rotate:360 }}
                transition={{ duration:5, repeat:Infinity, ease:'linear' }}
                style={{ fontSize:52, display:'inline-block', filter:`drop-shadow(0 0 20px ${GOLD})` }}
              >👑</motion.div>
              <motion.div
                animate={{ opacity:[0.8,1,0.8] }}
                transition={{ duration:2.5, repeat:Infinity }}
                style={{
                  fontFamily:"'Syne', sans-serif", fontSize:26, color:GOLD,
                  letterSpacing:8, marginTop:12, fontWeight:800,
                  textShadow:`0 0 40px ${GOLD}, 0 0 80px rgba(212,168,67,0.4)`,
                }}
              >PERFECT WEEK — GOD MODE</motion.div>
              <div style={{ fontSize:11, color:'rgba(212,168,67,0.5)', marginTop:6, letterSpacing:4, fontWeight:600 }}>
                {MAX_WEEKLY_XP} XP · YOU ABSOLUTE UNIT
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Day pills */}
      <div style={{ display:'flex', gap:5, justifyContent:'center', marginBottom:28, flexWrap:'wrap' }}>
        {DAYS.map((d,i) => (
          <DayChip key={d} day={d} xp={dayXP(checked,i)} done={isDayDone(checked,i)} idx={i}/>
        ))}
      </div>

      {/* Stats row */}
      <div style={{ display:'flex', gap:7, marginBottom:28, flexWrap:'wrap' }}>
        <StatCard value={`${totalPct}%`} label="WEEKLY" color={level.color} icon="📅" delay={0}/>
        <StatCard value={`${doneDays}/7`} label="DAYS DONE" color="#22c55e" icon="🗓" delay={0.05}/>
        <StatCard value={totalXP} label="XP EARNED" color="#38bdf8" icon="⚡" delay={0.1}/>
        <StatCard value={`🔥 ${totalStreak}`} label="STREAK" color="#f97316" delay={0.15}/>
      </div>

      {/* Habit grid */}
      <div style={{
        background:'rgba(255,255,255,0.014)',
        border:'1px solid rgba(255,255,255,0.055)',
        borderRadius:22,
        padding:'22px 18px',
        backdropFilter:'blur(24px)',
        boxShadow:'0 32px 100px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
        overflowX:'auto',
        position:'relative',
      }}>
        {/* Top accent line */}
        <div style={{
          position:'absolute', top:0, left:'10%', right:'10%', height:1,
          background:`linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)`,
        }}/>

        <div style={{ minWidth:500 }}>
          {/* Column headers */}
          <div style={{ display:'grid', gridTemplateColumns:'152px repeat(7,1fr)', gap:4, marginBottom:14 }}>
            <div/>
            {DAYS.map(d => (
              <div key={d} style={{ textAlign:'center', fontSize:8, fontWeight:800, color:'rgba(255,255,255,0.2)', letterSpacing:2 }}>{d}</div>
            ))}
          </div>

          {/* Habit categories */}
          {['morning','day','evening','night'].map((cat, ci) => {
            const habits = HABITS.filter(h => h.category === cat);
            const cs = CAT_STYLE[cat];
            return (
              <motion.div key={cat}
                initial={{ opacity:0 }}
                animate={{ opacity:1 }}
                transition={{ delay: ci * 0.07 }}
                style={{ marginBottom:18 }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:9 }}>
                  <span style={{ fontSize:11, color:cs.accent, fontWeight:700, letterSpacing:0.5 }}>{cs.icon}</span>
                  <span style={{ fontSize:8, letterSpacing:4, color:cs.accent, fontWeight:800 }}>{cs.label}</span>
                  <div style={{ flex:1, height:1, background:`linear-gradient(90deg, ${cs.accent}30, transparent)` }}/>
                </div>
                {habits.map((h, ri) => (
                  <HabitRow key={h.id} habit={h} checked={checked}
                    onToggle={onToggle} rowIndex={ci*3+ri}/>
                ))}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Complete week */}
      <div style={{ textAlign:'center', marginTop:40 }}>
        <motion.button
          whileHover={{ scale:1.03, boxShadow:`0 0 60px rgba(212,168,67,0.25)` }}
          whileTap={{ scale:0.97 }}
          onClick={onNewWeek}
          style={{
            background:'linear-gradient(135deg, rgba(212,168,67,0.12), rgba(251,146,60,0.07))',
            border:'1px solid rgba(212,168,67,0.28)',
            color:GOLD,
            padding:'15px 44px',
            borderRadius:50,
            cursor:'pointer',
            fontSize:11, letterSpacing:5, fontWeight:800,
            boxShadow:'0 0 30px rgba(212,168,67,0.08), inset 0 1px 0 rgba(212,168,67,0.1)',
            outline:'none',
            position:'relative',
            overflow:'hidden',
          }}
        >
          <motion.span
            style={{ position:'absolute', inset:0, background:'linear-gradient(90deg, transparent 0%, rgba(212,168,67,0.08) 50%, transparent 100%)' }}
            animate={{ x:['-100%','100%'] }}
            transition={{ duration:2.5, repeat:Infinity, ease:'linear', repeatDelay:1.5 }}
          />
          ARCHIVE WEEK {currentWeek} →
        </motion.button>
        <div style={{ fontSize:8, color:'rgba(255,255,255,0.12)', letterSpacing:3, marginTop:8 }}>SAVES PROGRESS TO HISTORY</div>
      </div>
    </motion.div>
  );
}

// ─── HISTORY VIEW ─────────────────────────────────────────────────────────────
function HistoryView({ data }) {
  const [expanded, setExpanded] = useState(null);
  const weeks = Object.values(data.history).sort((a,b) => b.weekNum - a.weekNum);

  return (
    <motion.div
      key="history"
      initial={{ opacity:0, x:32 }}
      animate={{ opacity:1, x:0 }}
      exit={{ opacity:0, x:-32 }}
      transition={{ type:'spring', stiffness:220, damping:26 }}
      style={{ maxWidth:760, margin:'0 auto', padding:'28px 16px 100px' }}
    >
      <ViewTitle icon="📅" title="WEEK ARCHIVE" sub={`Journey started ${formatDate(data.startDate)}`}/>

      {weeks.length === 0 && (
        <motion.div
          initial={{ opacity:0, scale:0.96 }} animate={{ opacity:1, scale:1 }} transition={{ delay:0.2 }}
          style={{ textAlign:'center', padding:'80px 20px', color:'rgba(255,255,255,0.15)', fontSize:13 }}
        >
          <div style={{ fontSize:44, marginBottom:14 }}>📭</div>
          <div style={{ letterSpacing:2 }}>No archived weeks yet. Complete a week to see it here.</div>
        </motion.div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {weeks.map((w, wi) => {
          const pct  = Math.round((w.totalXP/MAX_WEEKLY_XP)*100);
          const lv   = getLevel(w.totalXP);
          const isEx = expanded === w.weekNum;
          return (
            <motion.div key={w.weekNum}
              initial={{ opacity:0, y:16 }}
              animate={{ opacity:1, y:0 }}
              transition={{ delay: wi*0.05, type:'spring', stiffness:220 }}
            >
              <motion.div
                whileHover={{ scale:1.008 }}
                onClick={() => setExpanded(isEx ? null : w.weekNum)}
                style={{
                  background:'rgba(255,255,255,0.022)',
                  border:`1px solid ${isEx ? lv.color+'33' : 'rgba(255,255,255,0.055)'}`,
                  borderLeft:`2px solid ${lv.color}`,
                  borderRadius: isEx ? '18px 18px 0 0' : 18,
                  padding:'18px 20px',
                  cursor:'pointer',
                  backdropFilter:'blur(16px)',
                  boxShadow: isEx ? `0 0 40px ${lv.glow}` : '0 4px 24px rgba(0,0,0,0.3)',
                  transition:'all 0.25s',
                  position:'relative',
                  overflow:'hidden',
                }}
              >
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <LevelOrb level={lv} size="sm"/>
                    <div>
                      <div style={{ fontFamily:"'Syne', sans-serif", fontSize:16, color:lv.color, letterSpacing:3, fontWeight:800 }}>
                        WEEK {w.weekNum} {w.totalXP === MAX_WEEKLY_XP ? '👑' : ''}
                      </div>
                      <div style={{ fontSize:9, color:'rgba(255,255,255,0.25)', marginTop:2, letterSpacing:1 }}>
                        {formatDate(w.startDate)} → {formatDate(w.endDate)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:18, alignItems:'center' }}>
                    {[
                      { v:`${pct}%`, l:'DONE', c:lv.color },
                      { v:w.totalXP, l:'XP', c:'rgba(255,255,255,0.8)' },
                      { v:`${w.completeDays}/7`, l:'DAYS', c:'#f97316' },
                    ].map(s => (
                      <div key={s.l} style={{ textAlign:'center' }}>
                        <div style={{ fontSize:16, fontWeight:800, color:s.c, fontFamily:"'Syne Mono', monospace" }}>{s.v}</div>
                        <div style={{ fontSize:7, color:'rgba(255,255,255,0.2)', letterSpacing:2.5 }}>{s.l}</div>
                      </div>
                    ))}
                    <motion.div animate={{ rotate: isEx ? 180 : 0 }} transition={{ duration:0.3 }}
                      style={{ color:'rgba(255,255,255,0.2)', fontSize:10 }}>▼</motion.div>
                  </div>
                </div>
                <div style={{ height:2, background:'rgba(255,255,255,0.04)', borderRadius:1, marginTop:14, overflow:'hidden' }}>
                  <motion.div
                    initial={{ width:0 }}
                    animate={{ width:`${pct}%` }}
                    transition={{ duration:1, delay:wi*0.05+0.2, ease:'easeOut' }}
                    style={{ height:'100%', background:lv.color, borderRadius:1, boxShadow:`0 0 10px ${lv.glow}` }}
                  />
                </div>
              </motion.div>

              <AnimatePresence>
                {isEx && (
                  <motion.div
                    initial={{ height:0, opacity:0 }}
                    animate={{ height:'auto', opacity:1 }}
                    exit={{ height:0, opacity:0 }}
                    transition={{ duration:0.32, ease:[0.4,0,0.2,1] }}
                    style={{ overflow:'hidden' }}
                  >
                    <div style={{
                      background:'rgba(255,255,255,0.012)',
                      border:`1px solid ${lv.color}1a`,
                      borderTop:'none',
                      borderRadius:'0 0 18px 18px',
                      padding:'18px 20px',
                      backdropFilter:'blur(16px)',
                    }}>
                      <div style={{ overflowX:'auto' }}>
                        <div style={{ minWidth:360 }}>
                          <div style={{ display:'grid', gridTemplateColumns:'120px repeat(7,1fr)', gap:3, marginBottom:7 }}>
                            <div/>
                            {DAYS.map(d => <div key={d} style={{ textAlign:'center', fontSize:7, color:'rgba(255,255,255,0.18)', fontWeight:700, letterSpacing:1 }}>{d}</div>)}
                          </div>
                          {HABITS.map((habit, hi) => {
                            const cs = CAT_STYLE[habit.category];
                            return (
                              <motion.div key={habit.id}
                                initial={{ opacity:0, x:-8 }}
                                animate={{ opacity:1, x:0 }}
                                transition={{ delay:hi*0.025 }}
                                style={{ display:'grid', gridTemplateColumns:'120px repeat(7,1fr)', gap:3, marginBottom:3, alignItems:'center' }}
                              >
                                <div style={{ fontSize:9, color:'rgba(255,255,255,0.35)', display:'flex', gap:5, alignItems:'center' }}>
                                  <span style={{ fontSize:12 }}>{habit.emoji}</span>
                                  <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{habit.label}</span>
                                </div>
                                {DAYS.map((_,i) => {
                                  const done = !!w.checked?.[`${habit.id}-${i}`];
                                  return (
                                    <div key={i} style={{
                                      aspectRatio:'1', borderRadius:7,
                                      background: done ? `${cs.accent}14` : 'rgba(255,255,255,0.018)',
                                      border:`1px solid ${done ? cs.accent+'55' : 'rgba(255,255,255,0.045)'}`,
                                      display:'flex', alignItems:'center', justifyContent:'center',
                                      fontSize:9, color:cs.accent, fontWeight:700,
                                    }}>
                                      {done ? '✓' : ''}
                                    </div>
                                  );
                                })}
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── STATS VIEW ───────────────────────────────────────────────────────────────
function StatsView({ data, onReset }) {
  const allWeeks     = [...Object.values(data.history), { checked: data.checked, weekNum: data.currentWeek }];
  const allTimeXP    = data.lifetimeXP + weekXP(data.checked);
  const allTimeLvl   = getLevel(allTimeXP);
  const totalWeeks   = allWeeks.length;
  const perfectWeeks = Object.values(data.history).filter(w => w.totalXP === MAX_WEEKLY_XP).length;
  const totalHabits  = allWeeks.reduce((a,w) => a + Object.values(w.checked||{}).filter(Boolean).length, 0);
  const consistency  = totalWeeks > 0 ? Math.round((allTimeXP/(MAX_WEEKLY_XP*totalWeeks))*100) : 0;
  const avgXP        = totalWeeks > 1 ? Math.round(allTimeXP/totalWeeks) : weekXP(data.checked);

  return (
    <motion.div
      key="stats"
      initial={{ opacity:0, x:-32 }}
      animate={{ opacity:1, x:0 }}
      exit={{ opacity:0, x:32 }}
      transition={{ type:'spring', stiffness:220, damping:26 }}
      style={{ maxWidth:760, margin:'0 auto', padding:'28px 16px 100px' }}
    >
      <ViewTitle icon="📊" title="LIFETIME STATS" sub={`Since ${formatDate(data.startDate)}`}/>

      {/* Hero XP */}
      <motion.div
        initial={{ scale:0.92, opacity:0 }}
        animate={{ scale:1, opacity:1 }}
        transition={{ type:'spring', stiffness:160, delay:0.08 }}
        style={{
          textAlign:'center', marginBottom:28,
          background:'rgba(255,255,255,0.018)',
          border:'1px solid rgba(212,168,67,0.18)',
          borderRadius:24, padding:'36px 28px',
          backdropFilter:'blur(24px)',
          boxShadow:'0 32px 100px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
          position:'relative', overflow:'hidden',
        }}
      >
        <div style={{
          position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
          width:400, height:400,
          background:`radial-gradient(circle, ${allTimeLvl.color}07 0%, transparent 70%)`,
          pointerEvents:'none',
        }}/>
        <div style={{ fontSize:9, color:'rgba(255,255,255,0.25)', letterSpacing:6, marginBottom:10 }}>LIFETIME XP</div>
        <div style={{
          fontFamily:"'Syne', sans-serif", fontSize:76, lineHeight:1, fontWeight:800,
          background:`linear-gradient(135deg, ${GOLD}, #fb923c, ${GOLD})`,
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          filter:`drop-shadow(0 0 30px rgba(212,168,67,0.3))`,
        }}>
          <AnimNum value={allTimeXP}/>
        </div>
        <div style={{ fontSize:12, color:'rgba(255,255,255,0.3)', marginTop:10, letterSpacing:3, fontWeight:600 }}>
          {allTimeLvl.title} · LEVEL {allTimeLvl.level}
        </div>
      </motion.div>

      {/* Stats grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:10, marginBottom:28 }}>
        {[
          { icon:'📅', label:'TOTAL WEEKS',   value:totalWeeks,       color:'#38bdf8', delay:0    },
          { icon:'👑', label:'PERFECT WEEKS', value:perfectWeeks,     color:GOLD,      delay:0.05 },
          { icon:'🔥', label:'BEST STREAK',   value:`${data.totalStreak}d`, color:'#f97316', delay:0.1 },
          { icon:'✅', label:'HABITS DONE',   value:totalHabits,      color:'#22c55e', delay:0.15 },
          { icon:'⚡', label:'AVG XP / WEEK', value:avgXP,            color:'#a78bfa', delay:0.2  },
          { icon:'📈', label:'CONSISTENCY',   value:`${consistency}%`,color:'#38bdf8', delay:0.25 },
        ].map(s => (
          <motion.div key={s.label}
            initial={{ opacity:0, y:16, scale:0.96 }}
            animate={{ opacity:1, y:0, scale:1 }}
            transition={{ delay:s.delay, type:'spring', stiffness:220 }}
            whileHover={{ scale:1.03, y:-2 }}
            style={{
              background:'rgba(255,255,255,0.022)',
              border:'1px solid rgba(255,255,255,0.055)',
              borderLeft:`2px solid ${s.color}`,
              borderRadius:18, padding:'20px 22px',
              backdropFilter:'blur(16px)',
              cursor:'default',
              boxShadow:'0 8px 32px rgba(0,0,0,0.3)',
              position:'relative', overflow:'hidden',
            }}
          >
            <div style={{
              position:'absolute', top:0, left:0, bottom:0, width:2,
              background:`linear-gradient(180deg, ${s.color}, ${s.color}33)`,
            }}/>
            <div style={{ fontSize:22, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:28, fontWeight:800, color:s.color, fontFamily:"'Syne Mono', monospace" }}>
              {typeof s.value === 'number' ? <AnimNum value={s.value}/> : s.value}
            </div>
            <div style={{ fontSize:8, color:'rgba(255,255,255,0.2)', letterSpacing:3, marginTop:5, fontWeight:700 }}>{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Consistency bars */}
      <motion.div
        initial={{ opacity:0, y:16 }}
        animate={{ opacity:1, y:0 }}
        transition={{ delay:0.3 }}
        style={{
          background:'rgba(255,255,255,0.018)',
          border:'1px solid rgba(255,255,255,0.055)',
          borderRadius:22, padding:'24px 22px',
          backdropFilter:'blur(16px)',
          boxShadow:'0 8px 40px rgba(0,0,0,0.3)',
        }}
      >
        <div style={{ fontSize:9, color:'rgba(255,255,255,0.2)', letterSpacing:5, fontWeight:800, marginBottom:18 }}>HABIT BREAKDOWN</div>
        {HABITS.map((habit, hi) => {
          const cs        = CAT_STYLE[habit.category];
          const totalDone = allWeeks.reduce((acc,w) =>
            acc + DAYS.filter((_,i) => w.checked?.[`${habit.id}-${i}`]).length, 0);
          const totalPoss = allWeeks.length * 7;
          const pct       = Math.round((totalDone/totalPoss)*100);
          return (
            <motion.div key={habit.id}
              initial={{ opacity:0, x:-16 }}
              animate={{ opacity:1, x:0 }}
              transition={{ delay: 0.32 + hi*0.04, type:'spring', stiffness:220 }}
              style={{ marginBottom:14 }}
            >
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:5 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <span style={{ fontSize:15 }}>{habit.emoji}</span>
                  <span style={{ fontSize:11.5, color:'rgba(255,255,255,0.6)', fontWeight:600 }}>{habit.label}</span>
                </div>
                <span style={{ fontSize:11, color:cs.accent, fontWeight:800, fontFamily:"'Syne Mono', monospace" }}>{pct}%</span>
              </div>
              <div style={{ height:4, background:'rgba(255,255,255,0.04)', borderRadius:2, overflow:'hidden' }}>
                <motion.div
                  initial={{ width:0 }}
                  animate={{ width:`${pct}%` }}
                  transition={{ duration:1.3, delay:0.38+hi*0.04, ease:[0.34,1.56,0.64,1] }}
                  style={{
                    height:'100%',
                    background:`linear-gradient(90deg, ${cs.accent}66, ${cs.accent})`,
                    borderRadius:2,
                    boxShadow:`0 0 10px ${cs.glow}`,
                  }}
                />
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Reset */}
      <div style={{ textAlign:'center', marginTop:48 }}>
        <motion.button
          whileHover={{ scale:1.04 }}
          whileTap={{ scale:0.96 }}
          onClick={onReset}
          style={{
            background:'transparent',
            border:'1px solid rgba(239,68,68,0.15)',
            color:'rgba(239,68,68,0.35)',
            padding:'11px 30px',
            borderRadius:50, cursor:'pointer',
            fontSize:9, letterSpacing:4,
            outline:'none',
            transition:'all 0.2s',
          }}
        >
          RESET ALL DATA
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function NavPill({ item, active, levelColor, levelGlow, onClick }) {
  return (
    <motion.button
      whileHover={{ scale:1.04 }}
      whileTap={{ scale:0.95 }}
      onClick={onClick}
      style={{
        padding:'8px 16px',
        borderRadius:40,
        border:`1px solid ${active ? levelColor+'50' : 'rgba(255,255,255,0.07)'}`,
        background: active ? `rgba(${hexToRgb(levelColor)}, 0.1)` : 'transparent',
        color: active ? levelColor : 'rgba(255,255,255,0.3)',
        fontSize:9, letterSpacing:2.5, fontWeight:800,
        cursor:'pointer',
        boxShadow: active ? `0 0 24px ${levelGlow}` : 'none',
        transition:'color 0.2s, border-color 0.2s, background 0.2s',
        outline:'none',
        position:'relative',
        overflow:'hidden',
      }}
    >
      {active && (
        <motion.div style={{
          position:'absolute', inset:0,
          background:`linear-gradient(135deg, ${levelColor}10, transparent)`,
        }}
          initial={{ opacity:0 }}
          animate={{ opacity:1 }}
          transition={{ duration:0.3 }}
        />
      )}
      {item.label}
    </motion.button>
  );
}

function hexToRgb(hex) {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : '255,255,255';
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({ level, totalXP, nextLvl, xpPct, currentWeek, streak, view, setView, muted, setMuted }) {
  const navItems = [
    { key:'current', label:'NOW'     },
    { key:'history', label:'HISTORY' },
    { key:'stats',   label:'STATS'   },
  ];

  return (
    <motion.header
      initial={{ y:-80, opacity:0 }}
      animate={{ y:0, opacity:1 }}
      transition={{ type:'spring', stiffness:220, damping:26 }}
      style={{
        position:'sticky', top:0, zIndex:100,
        background:'rgba(0,0,0,0.82)',
        backdropFilter:'blur(40px) saturate(1.5)',
        borderBottom:'1px solid rgba(255,255,255,0.055)',
        boxShadow:'0 8px 40px rgba(0,0,0,0.6)',
      }}
    >
      <div style={{ maxWidth:760, margin:'0 auto', padding:'16px 16px 14px' }}>
        {/* Top row */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <LevelOrb level={level} size="md" pulse={level.level >= 5}/>
            <div>
              <div style={{ fontSize:8, color:'rgba(255,255,255,0.2)', letterSpacing:4, marginBottom:3, fontWeight:600 }}>
                WEEK {currentWeek} · 🔥{streak} DAY STREAK
              </div>
              <motion.div
                key={level.title}
                initial={{ opacity:0, x:-8 }}
                animate={{ opacity:1, x:0 }}
                style={{
                  fontFamily:"'Syne', sans-serif",
                  fontSize:21, letterSpacing:5, fontWeight:800,
                  color: level.color,
                  textShadow:`0 0 30px ${level.glow}`,
                }}
              >
                {level.title}
              </motion.div>
            </div>
          </div>

          <div style={{ display:'flex', gap:5, alignItems:'center' }}>
            {navItems.map(n => (
              <NavPill key={n.key} item={n} active={view===n.key}
                levelColor={level.color} levelGlow={level.glow}
                onClick={() => setView(n.key)}
              />
            ))}
            <motion.button
              whileHover={{ scale:1.12 }} whileTap={{ scale:0.9 }}
              onClick={() => setMuted(m => !m)}
              style={{
                fontSize:17, background:'transparent', border:'none',
                cursor:'pointer', opacity: muted ? 0.25 : 0.7,
                transition:'opacity 0.2s', outline:'none', marginLeft:4,
              }}
            >{muted ? '🔇' : '🔊'}</motion.button>
          </div>
        </div>

        {/* XP bar */}
        <XPBar totalXP={totalXP} level={level} nextLvl={nextLvl} xpPct={xpPct}/>
      </div>
    </motion.header>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData]       = useState(() => loadData() || defaultData());
  const [view, setView]       = useState('current');
  const [flashes, setFlashes] = useState([]);
  const [quote, setQuote]     = useState(null);
  const [bursts, setBursts]   = useState([]);
  const [muted, setMuted]     = useState(false);
  const quoteTimer            = useRef(null);
  const prevLevelRef          = useRef(null);

  const { checked, currentWeek, totalStreak } = data;
  const totalXP = weekXP(checked);
  const level   = getLevel(totalXP);
  const nextLvl = getNextLevel(totalXP);
  const xpPct   = nextLvl ? ((totalXP-level.min)/(nextLvl.min-level.min))*100 : 100;

  useEffect(() => { saveData(data); }, [data]);

  const addFlash = useCallback((text, color=GOLD, big=false) => {
    const id = Date.now() + Math.random();
    setFlashes(f => [...f, { id, text, color, big }]);
    setTimeout(() => setFlashes(f => f.filter(x => x.id !== id)), 1600);
  }, []);

  const showQuote = useCallback((text) => {
    clearTimeout(quoteTimer.current);
    setQuote(text);
    if (!muted) speakDuke(text);
    quoteTimer.current = setTimeout(() => setQuote(null), 4800);
  }, [muted]);

  const addBurst = useCallback((x, y, color) => {
    const id = Math.random();
    setBursts(b => [...b, { id, x, y, color }]);
    setTimeout(() => setBursts(b => b.filter(p => p.id !== id)), 900);
  }, []);

  const handleToggle = useCallback((hId, dIdx, e) => {
    const k     = `${hId}-${dIdx}`;
    const nowOn = !checked[k];
    const habit = HABITS.find(h => h.id === hId);
    const cs    = CAT_STYLE[habit.category];
    const newChecked = { ...checked, [k]: nowOn };
    const newXP      = weekXP(newChecked);
    const newLvl     = getLevel(newXP);

    setData(d => ({ ...d, checked: newChecked }));

    if (e?.currentTarget) {
      const r = e.currentTarget.getBoundingClientRect();
      addBurst(r.left + r.width/2, r.top + r.height/2, cs.accent);
    }

    if (nowOn) {
      if (!muted) soundCheck();
      addFlash(`+${habit.xp} XP`, cs.accent);

      if (newLvl.level > (prevLevelRef.current?.level || level.level)) {
        prevLevelRef.current = newLvl;
        if (!muted) soundLevelUp();
        setTimeout(() => addFlash(`🏆 ${newLvl.title}`, newLvl.color, true), 700);
        setTimeout(() => showQuote(randomItem(DUKE_QUOTES)), 1400);
      }

      const dayNowDone = HABITS.every(h => newChecked[`${h.id}-${dIdx}`]);
      if (dayNowDone) {
        if (!muted) soundDayComplete();
        setTimeout(() => addFlash(`🔥 ${DAYS[dIdx]} COMPLETE`, '#f97316'), 550);
        setTimeout(() => showQuote(randomItem(DUKE_QUOTES)), 1200);
      }

      if (newXP === MAX_WEEKLY_XP) {
        if (!muted) soundGodMode();
        setTimeout(() => addFlash('👑 GOD MODE', GOLD, true), 800);
        setTimeout(() => showQuote('PERFECT WEEK. You absolute unit. Duke is proud.'), 1900);
      }
    } else {
      if (!muted) soundUncheck();
    }
  }, [checked, level, muted, addFlash, addBurst, showQuote]);

  const handleNewWeek = useCallback(() => {
    const wk       = `week-${currentWeek}`;
    const doneDays = completeDaysCount(checked);
    setData(d => ({
      ...d,
      checked:     {},
      currentWeek: currentWeek + 1,
      totalStreak: d.totalStreak + doneDays,
      lifetimeXP:  d.lifetimeXP + totalXP,
      history: {
        ...d.history,
        [wk]: {
          checked:      { ...checked },
          totalXP,
          completeDays: doneDays,
          startDate:    d.history[wk]?.startDate || new Date().toISOString(),
          endDate:      new Date().toISOString(),
          weekNum:      currentWeek,
        },
      },
    }));
    if (!muted) soundNewWeek();
    addFlash(`WEEK ${currentWeek} ARCHIVED ✓`, '#22c55e', true);
  }, [checked, currentWeek, totalXP, muted, addFlash]);

  const handleReset = useCallback(() => {
    if (window.confirm('Reset ALL data? This cannot be undone.')) {
      const fresh = defaultData();
      setData(fresh);
      saveData(fresh);
      setView('current');
    }
  }, []);

  return (
    <div style={{ minHeight:'100vh', position:'relative' }}>
      <CinematicBackground levelColor={level.color}/>
      <CursorGlow/>
      <ParticleSystem bursts={bursts}/>
      <XPFlash messages={flashes}/>
      <DukeQuote quote={quote}/>

      <div style={{ position:'relative', zIndex:10 }}>
        <Header
          level={level} totalXP={totalXP} nextLvl={nextLvl} xpPct={xpPct}
          currentWeek={currentWeek} streak={totalStreak}
          view={view} setView={setView}
          muted={muted} setMuted={setMuted}
        />

        <AnimatePresence mode="wait">
          {view === 'current' && (
            <CurrentView key="current" data={data} onToggle={handleToggle} onNewWeek={handleNewWeek}/>
          )}
          {view === 'history' && (
            <HistoryView key="history" data={data}/>
          )}
          {view === 'stats' && (
            <StatsView key="stats" data={data} onReset={handleReset}/>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
