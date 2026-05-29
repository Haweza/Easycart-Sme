/**
 * promoManager.js — Promo image preview, publish, bring-down, and active-promo display
 * Uses globals: apiFetch, API_BASE, fmtDate, showToast (from api.js classic script)
 */

import { adminState } from '../state/adminState.js';

export function previewPromoImage(input) {
  const file = input.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showToast('Image size exceeds 2MB limit.', 'error');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    adminState.uploadedPromoImageBase64 = e.target.result;
    const container = document.getElementById('promo-image-preview-container');
    if (container) {
      container.innerHTML = `<img src="${adminState.uploadedPromoImageBase64}" style="width:100%; height:100%; object-fit:contain;" />`;
    }
  };
  reader.readAsDataURL(file);
}

export async function publishPromo(e) {
  e.preventDefault();
  const btn = document.getElementById('promo-submit-btn');
  const serviceName  = document.getElementById('promo-service-name').value.trim();
  const price        = document.getElementById('promo-price').value.trim();
  const description  = document.getElementById('promo-description').value.trim();

  if (!serviceName || !price || !description) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  if (!adminState.uploadedPromoImageBase64) {
    showToast('Please upload a promo image.', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Publishing...';

  try {
    await apiFetch('/admin/promos', {
      method: 'POST',
      body: { serviceName, price, description, imageContent: adminState.uploadedPromoImageBase64 }
    });

    showToast('Promo published successfully!', 'success');

    // Reset form
    document.getElementById('promo-form').reset();
    adminState.uploadedPromoImageBase64 = '';
    const container = document.getElementById('promo-image-preview-container');
    if (container) container.innerHTML = `<span style="font-size:1.5rem; color:var(--text-muted);">🖼️</span>`;

    await loadAndRenderPromos();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Publish to Homepage';
  }
}

export async function bringDownPromo() {
  if (!confirm('Are you sure you want to bring down the active promotion and restore the slideshow?')) return;
  try {
    await apiFetch('/admin/promos/active', { method: 'DELETE' });
    showToast('Promotion removed successfully!', 'success');
    await loadAndRenderPromos();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export async function loadAndRenderPromos() {
  const container = document.getElementById('active-promo-status-container');
  if (!container) return;

  container.innerHTML = `<div class="text-center" style="padding:40px;"><div class="spinner"></div></div>`;

  try {
    const res = await fetch(`${API_BASE}/promos/active`);
    if (res.status === 200) {
      const promo = await res.json();

      // Calculate remaining time
      const createdTime  = new Date(promo.createdAt);
      const expiryTime   = new Date(createdTime.getTime() + 24 * 60 * 60 * 1000);
      const remainingMs  = expiryTime - new Date();
      let remainingStr   = 'Expired';
      if (remainingMs > 0) {
        const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
        const remainingMins  = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        remainingStr = `${remainingHours}h ${remainingMins}m remaining`;
      } else {
        remainingStr = 'Expired (Falls back to slideshow)';
      }

      container.innerHTML = `
        <div style="border: 1px solid var(--border); border-radius: var(--radius); padding: 1.25rem; background: var(--surface-hover); text-align: center; display:flex; flex-direction:column; gap:12px; align-items:center;">
          <div style="background: var(--surface); border-radius: var(--radius-lg); padding: 10px; display: flex; align-items: center; justify-content: center; width: 90px; height: 90px; box-shadow: var(--shadow-sm);">
            <img src="${promo.imageContent || 'assets/default_icon.png'}" style="max-width:100%; max-height:100%; object-fit:contain;" onerror="this.src='assets/default_icon.png'">
          </div>
          <div>
            <h4 style="margin:0; font-size:1.15rem; font-weight:700;">${promo.serviceName}</h4>
            <div style="font-size:1rem; font-weight:700; color:var(--success); margin: 4px 0;">${promo.price}</div>
            <p style="font-size:0.85rem; color:var(--text-muted); line-height:1.4; margin: 4px 0;">${promo.description}</p>
          </div>
          <div style="border-top: 1px solid var(--border); width:100%; padding-top:8px; display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:var(--text-muted);">
            <span>Published: ${fmtDate(promo.createdAt)}</span>
            <span style="font-weight:600; color:var(--warning);">${remainingStr}</span>
          </div>
          <button class="btn btn-outline btn-sm w-full" onclick="bringDownPromo()" style="color:var(--danger); border-color:rgba(220,38,38,0.2); margin-top: 8px; font-weight:600; justify-content:center;">
            🗑️ Bring Down Promo
          </button>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div style="text-align:center; padding:30px; color:var(--text-muted);">
          <span style="font-size:2.5rem; display:block; margin-bottom:12px;">📭</span>
          <p style="font-size:0.95rem; margin-bottom:4px; font-weight:600;">No Active Promotion</p>
          <p style="font-size:0.8rem;">Homepage slideshow is currently running.</p>
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger); font-size:0.85rem; text-align:center;">Failed to load active promotion: ${err.message}</div>`;
  }
}
