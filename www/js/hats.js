// hats.js — cosmetic registry. Each hat is drawn procedurally (no image assets) by a
// function that runs in a canvas context already translated/rotated to Sippy's crown:
//   origin (0,0) = top-centre of the head, +x right, +y DOWN (so hats extend upward = -y).
//   `s` is the head radius in px — scale everything by it so hats ride the inflation.
// IAP packs map a Play SKU → several hat ids; a hat is "owned" if free or its sku is owned.
// Equipped hat persists via save.js and must render on Sippy, the ghost, and the share card.

export const PACKS = {
  hat_pack_party_199: { name: 'Party Pack', price: '$1.99', hats: ['party', 'propeller', 'sombrero'] },
  hat_pack_fancy_199: { name: 'Fancy Pack', price: '$1.99', hats: ['tophat', 'crown', 'crocs'] },
};

function fill(ctx, color, path) { ctx.fillStyle = color; ctx.beginPath(); path(); ctx.fill(); }

export const HATS = {
  none: { name: 'No hat', free: true, draw() {} },

  beanie: {
    name: 'Beanie', free: true,
    draw(ctx, s) {
      fill(ctx, '#e0533c', () => ctx.arc(0, -s * 0.15, s * 0.95, Math.PI, 0));
      ctx.fillStyle = '#f4f1de'; ctx.fillRect(-s * 0.95, -s * 0.2, s * 1.9, s * 0.22);
      fill(ctx, '#f4f1de', () => ctx.arc(0, -s * 1.05, s * 0.18, 0, Math.PI * 2)); // pom
    },
  },

  halo: {
    name: 'Halo', free: true,
    draw(ctx, s) {
      ctx.strokeStyle = '#ffe066'; ctx.lineWidth = s * 0.16; ctx.shadowColor = '#ffe066'; ctx.shadowBlur = s;
      ctx.beginPath(); ctx.ellipse(0, -s * 1.2, s * 0.75, s * 0.28, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.shadowBlur = 0;
    },
  },

  party: {
    name: 'Party Hat', sku: 'hat_pack_party_199',
    draw(ctx, s) {
      fill(ctx, '#ff5d8f', () => { ctx.moveTo(-s * 0.7, -s * 0.1); ctx.lineTo(s * 0.7, -s * 0.1); ctx.lineTo(0, -s * 1.7); });
      ctx.fillStyle = '#ffd166'; for (let i = 0; i < 4; i++) ctx.fillRect(-s * 0.4 + i * s * 0.26, -s * (0.4 + i * 0.3), s * 0.16, s * 0.16);
      fill(ctx, '#ffd166', () => ctx.arc(0, -s * 1.7, s * 0.16, 0, Math.PI * 2));
    },
  },

  propeller: {
    name: 'Propeller Cap', sku: 'hat_pack_party_199',
    draw(ctx, s) {
      fill(ctx, '#06d6a0', () => ctx.arc(0, -s * 0.15, s * 0.85, Math.PI, 0));
      ctx.strokeStyle = '#118ab2'; ctx.lineWidth = s * 0.12;
      ctx.beginPath(); ctx.ellipse(0, -s * 0.5, s * 0.5, s * 0.16, 0, Math.PI, 0); ctx.stroke();
      ctx.fillStyle = '#ef476f'; // blades
      ctx.fillRect(-s * 0.9, -s * 1.05, s * 1.8, s * 0.12);
      ctx.fillRect(-s * 0.12, -s * 1.4, s * 0.24, s * 0.7);
      fill(ctx, '#073b4c', () => ctx.arc(0, -s * 1.0, s * 0.13, 0, Math.PI * 2));
    },
  },

  sombrero: {
    name: 'Tiny Sombrero', sku: 'hat_pack_party_199',
    draw(ctx, s) {
      fill(ctx, '#d4a017', () => ctx.ellipse(0, -s * 0.2, s * 1.4, s * 0.4, 0, 0, Math.PI * 2));
      fill(ctx, '#e0a82e', () => ctx.ellipse(0, -s * 0.7, s * 0.5, s * 0.55, 0, 0, Math.PI * 2));
      ctx.strokeStyle = '#a86b00'; ctx.lineWidth = s * 0.08;
      ctx.beginPath(); ctx.ellipse(0, -s * 0.4, s * 0.55, s * 0.18, 0, 0, Math.PI * 2); ctx.stroke();
    },
  },

  tophat: {
    name: 'Top Hat', sku: 'hat_pack_fancy_199',
    draw(ctx, s) {
      ctx.fillStyle = '#1b1b2f';
      ctx.fillRect(-s * 1.1, -s * 0.25, s * 2.2, s * 0.2);   // brim
      ctx.fillRect(-s * 0.6, -s * 1.5, s * 1.2, s * 1.3);    // crown
      ctx.fillStyle = '#e63946'; ctx.fillRect(-s * 0.6, -s * 0.55, s * 1.2, s * 0.22); // band
    },
  },

  crown: {
    name: 'Crown', sku: 'hat_pack_fancy_199',
    draw(ctx, s) {
      fill(ctx, '#ffd700', () => {
        ctx.moveTo(-s * 0.8, -s * 0.1); ctx.lineTo(-s * 0.8, -s * 0.9); ctx.lineTo(-s * 0.4, -s * 0.5);
        ctx.lineTo(0, -s * 1.05); ctx.lineTo(s * 0.4, -s * 0.5); ctx.lineTo(s * 0.8, -s * 0.9);
        ctx.lineTo(s * 0.8, -s * 0.1);
      });
      ['#e63946', '#06d6a0', '#118ab2'].forEach((c, i) => fill(ctx, c, () => ctx.arc(-s * 0.4 + i * s * 0.4, -s * 0.25, s * 0.1, 0, Math.PI * 2)));
    },
  },

  crocs: {
    name: 'Tiny Crocs', sku: 'hat_pack_fancy_199', onFeet: true,
    draw(ctx, s) { // worn on two legs rather than the head; sippy.js positions these
      ctx.fillStyle = '#06d6a0';
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.28, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * s * 0.1, -s * 0.04, s * 0.03, 0, Math.PI * 2); ctx.fill(); }
    },
  },
};

export function hatList() { return Object.keys(HATS); }

export function isFree(id) { return !!HATS[id]?.free; }

// Owned if free, or its pack sku is in the owned list.
export function isOwned(id, ownedSkus) {
  const h = HATS[id];
  if (!h) return false;
  if (h.free) return true;
  return h.sku ? ownedSkus.includes(h.sku) : false;
}

export function hatsInPack(skuId) { return PACKS[skuId]?.hats || []; }
