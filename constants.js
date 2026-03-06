export const HABITS = [
  { id:1, emoji:'🧴', label:'Skincare AM',   category:'morning', xp:10, desc:'Glow up starts here' },
  { id:2, emoji:'🥣', label:'Eat Breakfast', category:'morning', xp:10, desc:'Fuel the machine' },
  { id:3, emoji:'💊', label:'Magnesium',      category:'morning', xp:10, desc:'Deep sleep unlocked' },
  { id:4, emoji:'👟', label:'10k Steps',      category:'day',     xp:20, desc:'Move or decay' },
  { id:5, emoji:'💧', label:'Drink 2L Water', category:'day',     xp:15, desc:'Hydrate or diedrate' },
  { id:6, emoji:'🧘', label:'Yoga / Stretch', category:'day',     xp:20, desc:'Flex on the past you' },
  { id:7, emoji:'💪', label:'Workout',         category:'evening', xp:25, desc:'Build the body' },
  { id:8, emoji:'🌙', label:'Skincare PM',    category:'evening', xp:10, desc:'Night repair activated' },
  { id:9, emoji:'🛏️', label:'Sleep by 2am',  category:'night',   xp:15, desc:'Recovery is gains' },
];

export const DAYS = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
export const MAX_DAILY_XP  = HABITS.reduce((a,h) => a+h.xp, 0);
export const MAX_WEEKLY_XP = MAX_DAILY_XP * 7;

export const LEVELS = [
  { level:1, title:'ROOKIE',    min:0,              color:'#64748b', glow:'rgba(100,116,139,0.5)',  ring:'#64748b33' },
  { level:2, title:'GRINDER',   min:200,            color:'#22c55e', glow:'rgba(34,197,94,0.5)',    ring:'#22c55e33' },
  { level:3, title:'WARRIOR',   min:400,            color:'#38bdf8', glow:'rgba(56,189,248,0.5)',   ring:'#38bdf833' },
  { level:4, title:'BEAST',     min:600,            color:'#a78bfa', glow:'rgba(167,139,250,0.5)',  ring:'#a78bfa33' },
  { level:5, title:'LEGEND',    min:800,            color:'#f97316', glow:'rgba(249,115,22,0.5)',   ring:'#f9731633' },
  { level:6, title:'GOD MODE',  min:MAX_WEEKLY_XP,  color:'#D4A843', glow:'rgba(212,168,67,0.6)',   ring:'#D4A84333' },
];

export const CAT_STYLE = {
  morning: { accent:'#f97316', glow:'rgba(249,115,22,0.4)',  label:'MORNING RITUAL', icon:'◐' },
  day:     { accent:'#38bdf8', glow:'rgba(56,189,248,0.4)',  label:'DAY STACK',      icon:'◑' },
  evening: { accent:'#a78bfa', glow:'rgba(167,139,250,0.4)', label:'EVENING OPS',    icon:'◒' },
  night:   { accent:'#22c55e', glow:'rgba(34,197,94,0.4)',   label:'NIGHT PROTOCOL', icon:'◓' },
};

export const DUKE_QUOTES = [
  "Haha, you sexy fucker — keep going.",
  "Come get some... discipline. Now.",
  "Nobody messes with a guy who does his skincare.",
  "Balls of steel. Also excellent bone structure.",
  "Your future self just texted — he said you're his hero.",
  "That's one small tick for man, one giant glow-up for mankind.",
  "Hydrate or diedrate, king. Literal facts.",
  "NPC behavior? Never heard of her.",
  "No cap, you're genuinely built different rn.",
  "The gym called. It misses you. You showed up. Legend.",
  "Your skin is about to be so smooth they'll call it plot armor.",
  "Sigma grindset activated. Unironically this time.",
  "What are you waiting for? The gains aren't gonna build themselves.",
  "I should've been a model... wait, that's you now.",
  "Day by day, inch by inch, you're becoming him.",
  "Even Duke takes his magnesium. Don't be a clown.",
  "That's it. That's the check. That's the move. LFG.",
  "Your jawline is loading... please complete more habits.",
  "Another one bites the dust. That dust being your laziness.",
  "You absolute unit. Certified glowup behavior.",
];

export const STORAGE_KEY = 'godmode_v3';
