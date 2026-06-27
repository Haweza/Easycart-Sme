/**
 * electronicsManager.js — Electronic Products admin management
 * Handles image preview, publish, delete, and listing render for the
 * "Electronics Displays" admin dashboard panel.
 *
 * Uses globals: apiFetch, API_BASE, showToast (from api.js classic script)
 */

import { adminState } from '../state/adminState.js';

// ---- Constants -------------------------------------------
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const WHATSAPP_NUMBER = '260973276523'; // Admin WhatsApp number

// ---- Image Preview ----------------------------------------

export function previewElectronicImage(input) {
  const file = input.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showToast('Image size exceeds 2MB limit. Please resize and try again.', 'error');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    adminState.uploadedElectronicImageBase64 = e.target.result;
    const container = document.getElementById('electronic-image-preview-container');
    if (container) {
      container.innerHTML = `<img src="${adminState.uploadedElectronicImageBase64}" style="width:100%; height:100%; object-fit:contain; border-radius:6px;" />`;
    }
  };
  reader.readAsDataURL(file);
}

// ---- Publish New Product ----------------------------------

export async function publishElectronic(e) {
  e.preventDefault();
  const btn = document.getElementById('electronic-submit-btn');
  const name  = document.getElementById('electronic-name').value.trim();
  const price = document.getElementById('electronic-price').value.trim();

  if (!name || !price) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  if (!adminState.uploadedElectronicImageBase64) {
    showToast('Please upload a product image.', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Publishing...';

  try {
    await Electronics.create({
      name,
      price,
      imageContent: adminState.uploadedElectronicImageBase64,
    });

    showToast('Product published successfully!', 'success');

    // Reset form and preview
    document.getElementById('electronic-form').reset();
    adminState.uploadedElectronicImageBase64 = '';
    const container = document.getElementById('electronic-image-preview-container');
    if (container) {
      container.innerHTML = `<span style="font-size:1.5rem; color:var(--text-muted);">📷</span>`;
    }

    // Refresh the listing
    await loadAndRenderElectronics();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Publish Product';
  }
}

// ---- Delete Product ---------------------------------------

export async function deleteElectronicAction(id) {
  if (!confirm('Are you sure you want to remove this product listing?')) return;
  try {
    await Electronics.delete(id);
    showToast('Product removed successfully.', 'success');
    await loadAndRenderElectronics();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ---- Load & Render Listing --------------------------------

export async function loadAndRenderElectronics() {
  const listContainer = document.getElementById('electronics-list-container');
  if (!listContainer) return;

  listContainer.innerHTML = `<div style="text-align:center; padding:32px;"><div class="spinner"></div></div>`;

  try {
    const items = await Electronics.getAll();
    adminState.allElectronics = items;

    if (!items || items.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding:40px; color:var(--text-muted);">
          <span style="font-size:2.5rem; display:block; margin-bottom:12px;">📭</span>
          <p style="font-weight:600; margin-bottom:4px;">No Products Posted Yet</p>
          <p style="font-size:0.85rem;">Use the form to post your first electronic product listing.</p>
        </div>
      `;
      return;
    }

    const now = Date.now();

    listContainer.innerHTML = items.map(item => {
      const createdMs   = new Date(item.createdAt).getTime();
      const expiresMs   = createdMs + THREE_DAYS_MS;
      const remainingMs = expiresMs - now;
      const isActive    = remainingMs > 0;

      let timeLabel;
      if (isActive) {
        const d = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
        const h = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        timeLabel = `⏱️ ${d}d ${h}h remaining`;
      } else {
        timeLabel = 'Expired';
      }

      const statusColor = isActive ? 'var(--success)' : 'var(--text-muted)';
      const statusBg    = isActive ? '#D1FAE5'        : 'var(--bg-subtle)';
      const statusText  = isActive ? '#065F46'        : 'var(--text-muted)';

      return `
        <div style="display:flex; align-items:center; gap:16px; padding:14px 16px; border-bottom:1px solid var(--border); transition:background .15s;"
             onmouseenter="this.style.background='var(--surface-hover)'" onmouseleave="this.style.background=''"
        >
          <!-- Product image -->
          <div style="width:58px; height:58px; border-radius:8px; background:var(--bg-subtle); display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0; border:1px solid var(--border);">
            <img src="${item.imageContent}" alt="${escapeHtml(item.name)}"
                 style="max-width:100%; max-height:100%; object-fit:contain;"
                 onerror="this.src='assets/default_icon.png'">
          </div>

          <!-- Info -->
          <div style="flex:1; min-width:0;">
            <div style="font-weight:700; font-size:.95rem; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(item.name)}</div>
            <div style="font-size:.88rem; color:var(--success); font-weight:600; margin-top:2px;">${escapeHtml(item.price)}</div>
            <div style="font-size:.75rem; color:${statusColor}; margin-top:4px;">${timeLabel}</div>
          </div>

          <!-- Status badge -->
          <span style="background:${statusBg}; color:${statusText}; font-size:.72rem; font-weight:700; padding:3px 10px; border-radius:999px; white-space:nowrap; flex-shrink:0;">
            ${isActive ? '● Active' : '○ Expired'}
          </span>

          <!-- Delete -->
          <button class="btn btn-sm btn-outline"
                  onclick="deleteElectronicAction('${item.id}')"
                  style="color:var(--danger); border-color:rgba(220,38,38,0.2); flex-shrink:0;">
            🗑️ Remove
          </button>
        </div>
      `;
    }).join('');

  } catch (err) {
    listContainer.innerHTML = `<div style="color:var(--danger); font-size:.85rem; text-align:center; padding:20px;">Failed to load listings: ${err.message}</div>`;
  }
}

// ---- Helper ----------------------------------------------
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
