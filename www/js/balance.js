// balance.js — all gameplay tuning, ported verbatim from sippy-prototype.html.
// Greed is quadratic: holding longer pays more mL but wakes the giant faster.

export const FIRST = ["Uncle","Big","Gym","Nonna","Coach","Chef","Officer","Baby","Grandpa","DJ","Sleepy","Cousin","Auntie","Captain"];
export const NAMES = ["Tito","Greg","Pia","Steve","Brenda","Marv","Lucia","Dwayne","Bertha","Carl","Yolanda","Bruno","Fanny","Reginald"];

export const SLEEPERS = [
  { label: "Deep Sleeper",   irrBase: 7,  windup: 560, spike: 0.10, hint: "Snores like a freight train." },
  { label: "Light Sleeper",  irrBase: 13, windup: 380, spike: 0.18, hint: "One wrong slurp and it's over." },
  { label: "Chaotic Napper", irrBase: 9,  windup: 460, spike: 0.42, hint: "Twitchy. Unpredictable. Rude." },
];

export const SKINS = ["#F2B68C","#E8A06B","#C98850","#A86B3F","#8C5430","#F5C9A2"];
export const HAIRC = ["#3B2A20","#101010","#B8B8B8","#C9722B","#6B4FA0","#244D8A","#0a7a5a"];

export const sipBlood = (t) => 6 * t + 7 * t * t;           // mL — quadratic = greed pays
export const multOf = (t) => (1 + t * t * 0.32).toFixed(1); // greed multiplier readout

export const UPGRADES = {
  straw: {
    name: 'Thicker Straw',
    desc: 'Increases sip rate (+15% mL/sec per level).',
    costs: [100, 250, 500, 1000],
    mults: [1.0, 1.15, 1.30, 1.45, 1.60],
  },
  wings: {
    name: 'Stealth Wings',
    desc: 'Reduces giant irritation rate (-10% per level).',
    costs: [150, 300, 600, 1200],
    mults: [1.0, 0.90, 0.80, 0.70, 0.60],
  },
  reflexes: {
    name: 'Ninja Reflexes',
    desc: 'Increases windup time (+60ms reaction time per level).',
    costs: [200, 400, 800, 1500],
    mults: [0, 60, 120, 180, 240], // ms added
  },
  magnet: {
    name: 'Blood Magnet',
    desc: 'Bank more mL on successful escapes (+15% per level).',
    costs: [250, 500, 1000, 2000],
    mults: [1.0, 1.15, 1.30, 1.45, 1.60],
  }
};

export const TRAILS = {
  classic: { name: 'Classic Red', cost: 0 },
  gold: { name: 'Golden Sparkles', cost: 300 },
  rainbow: { name: 'Rainbow Trail', cost: 800 },
  smoke: { name: 'Ghostly Smoke', cost: 1500 }
};
