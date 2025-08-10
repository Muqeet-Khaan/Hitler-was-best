(function(){
  const PAGE = document.body.getAttribute('data-page');

  // --- Data ---
  const PRODUCTS = [
    { id:'m-boxer-01', title:'AirFlex Boxer', price:14.99, category:'men', sizes:['S','M','L','XL'], badge:'New', image:'https://source.unsplash.com/600x420/?men%20boxer%20briefs%20flatlay' },
    { id:'m-brief-02', title:'Seamless Brief', price:11.99, category:'men', sizes:['S','M','L','XL'], badge:'Hot', image:'https://source.unsplash.com/600x420/?men%20briefs%20flatlay%20apparel' },
    { id:'m-trunk-03', title:'CoolDry Trunk', price:12.99, category:'men', sizes:['S','M','L','XL'], badge:'', image:'https://source.unsplash.com/600x420/?men%20trunks%20underwear%20flatlay' },
    { id:'m-thermal-04', title:'Thermal Base', price:19.99, category:'men', sizes:['S','M','L','XL'], badge:'Warm', image:'https://source.unsplash.com/600x420/?thermal%20base%20layer%20men%20flatlay' },
    { id:'k-brief-05', title:'Kids Soft Brief', price:7.99, category:'children', sizes:['4','6','8','10','12','14'], badge:'Kids', image:'https://source.unsplash.com/600x420/?kids%20clothing%20flatlay%20apparel' },
    { id:'k-boxer-06', title:'Kids Play Boxer', price:8.99, category:'children', sizes:['4','6','8','10','12','14'], badge:'', image:'https://source.unsplash.com/600x420/?kids%20shorts%20flatlay%20apparel' },
    { id:'k-thermal-07', title:'Kids Thermal', price:13.99, category:'children', sizes:['4','6','8','10','12','14'], badge:'Warm', image:'https://source.unsplash.com/600x420/?kids%20thermal%20clothing%20flatlay' },
    { id:'m-br-08', title:'Sport Brief+', price:15.49, category:'men', sizes:['S','M','L','XL'], badge:'Pro', image:'https://source.unsplash.com/600x420/?sports%20underwear%20men%20flatlay' }
  ];

  // --- State ---
  const CART_KEY = 'underwave.cart';
  const CHECKOUT_ITEM_KEY = 'underwave.checkoutItem';
  let cart = loadCart();

  function loadCart(){
    try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; }
  }
  function saveCart(){ localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateCartCount(); }
  function cartSubtotal(){ return cart.reduce((s,i)=> s + i.price * i.qty, 0); }

  function updateCartCount(){
    const el = document.getElementById('cartCount');
    if (el) el.textContent = String(cart.reduce((s,i)=> s + i.qty, 0));
  }

  // --- UI helpers ---
  function showToast(msg){
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    setTimeout(()=> t.classList.remove('show'), 1500);
  }

  function attachRipples(root){
    (root || document).querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const r = document.createElement('span');
        r.className = 'ripple';
        const rect = btn.getBoundingClientRect();
        r.style.left = (e.clientX - rect.left) + 'px';
        r.style.top = (e.clientY - rect.top) + 'px';
        btn.appendChild(r);
        setTimeout(()=> r.remove(), 450);
      });
    });
  }

  function flyToCart(fromEl){
    const cartBtn = document.getElementById('openCart');
    if (!fromEl || !cartBtn) return;
    const a = fromEl.getBoundingClientRect();
    const b = cartBtn.getBoundingClientRect();
    const clone = fromEl.cloneNode(true);
    const style = getComputedStyle(fromEl);
    clone.style.position = 'fixed';
    clone.style.left = a.left + 'px';
    clone.style.top = a.top + 'px';
    clone.style.width = a.width + 'px';
    clone.style.height = a.height + 'px';
    clone.style.borderRadius = style.borderRadius;
    clone.style.zIndex = 2000;
    clone.style.opacity = '0.9';
    clone.style.transition = 'transform .5s cubic-bezier(.2,.8,.2,1), opacity .5s ease';
    document.body.appendChild(clone);
    const dx = b.left - a.left; const dy = b.top - a.top; const sx = (b.width / a.width) * 0.2;
    requestAnimationFrame(()=>{
      clone.style.transform = `translate(${dx}px, ${dy}px) scale(${sx})`;
      clone.style.opacity = '0.2';
    });
    setTimeout(()=> clone.remove(), 520);
  }

  // --- Product rendering ---
  function renderProducts(category='men', sort='featured'){
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    let items = PRODUCTS.filter(p => p.category === category);
    if (sort === 'price-asc') items.sort((a,b)=> a.price - b.price);
    if (sort === 'price-desc') items.sort((a,b)=> b.price - a.price);
    grid.innerHTML = items.map(p => cardHTML(p)).join('');

    grid.querySelectorAll('.size').forEach(btn => btn.addEventListener('click', onSelectSize));
    grid.querySelectorAll('[data-add]').forEach(btn => btn.addEventListener('click', onAddToCart));
    grid.querySelectorAll('[data-buy]').forEach(btn => btn.addEventListener('click', onBuyNow));
    attachRipples(grid);
  }

  function cardHTML(p){
    const sizes = p.sizes.map((s,i)=> `<button class="size${i===0?' active':''}" data-size data-id="${p.id}" data-val="${s}">${s}</button>`).join('');
    return `
      <article class="card" data-id="${p.id}">
        <div class="thumb">
          <span class="sku">${p.id}</span>
          ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
          <img src="${p.image || `./assets/${p.id}.svg`}" alt="${p.title}" loading="lazy" />
        </div>
        <div class="card-body">
          <h3 class="title">${p.title}</h3>
          <div class="price"><strong>$${p.price.toFixed(2)}</strong> <span class="muted">USD</span></div>
          <div class="size-row" role="group" aria-label="Choose size">${sizes}</div>
          <div class="card-actions">
            <button class="btn soft" data-add data-id="${p.id}">Add to cart</button>
            <button class="btn primary" data-buy data-id="${p.id}">Buy now</button>
          </div>
        </div>
      </article>
    `;
  }

  function onSelectSize(e){
    const btn = e.currentTarget;
    const id = btn.getAttribute('data-id');
    const parent = btn.closest('.size-row');
    parent.querySelectorAll('.size').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
  }

  function getSelectedSizeForCard(card){
    const active = card.querySelector('.size.active');
    return active ? active.getAttribute('data-val') : null;
  }

  function onAddToCart(e){
    const id = e.currentTarget.getAttribute('data-id');
    const product = PRODUCTS.find(p=>p.id===id);
    const card = e.currentTarget.closest('.card');
    const size = getSelectedSizeForCard(card);
    if (!size){ showToast('Please select a size'); return; }
    const existing = cart.find(i=> i.id===id && i.size===size);
    if (existing) existing.qty += 1; else cart.push({ id, title:product.title, price:product.price, size, qty:1, category:product.category });
    saveCart();
    renderCart();
    showToast('Added to cart');
    flyToCart(card.querySelector('.thumb'));
  }

  function onBuyNow(e){
    const id = e.currentTarget.getAttribute('data-id');
    const product = PRODUCTS.find(p=>p.id===id);
    const card = e.currentTarget.closest('.card');
    const size = getSelectedSizeForCard(card);
    if (!size){ showToast('Please select a size'); return; }
    sessionStorage.setItem(CHECKOUT_ITEM_KEY, JSON.stringify([{ id, title:product.title, price:product.price, size, qty:1, category:product.category }]));
    window.location.href = './pages/checkout.html';
  }

  // --- Cart drawer ---
  const drawer = document.getElementById('cartDrawer');
  const overlay = document.getElementById('drawerOverlay');
  const openCartBtn = document.getElementById('openCart');
  const closeCartBtn = document.getElementById('closeCart');

  function openDrawer(){ if (!drawer) return; drawer.classList.add('open'); overlay?.classList.add('show'); drawer.setAttribute('aria-hidden','false'); }
  function closeDrawer(){ if (!drawer) return; drawer.classList.remove('open'); overlay?.classList.remove('show'); drawer.setAttribute('aria-hidden','true'); }
  openCartBtn?.addEventListener('click', openDrawer);
  closeCartBtn?.addEventListener('click', closeDrawer);
  overlay?.addEventListener('click', closeDrawer);

  function renderCart(){
    const wrap = document.getElementById('cartItems');
    if (!wrap) return;
    if (cart.length === 0){ wrap.innerHTML = '<p class="muted">Your cart is empty.</p>'; }
    else {
      wrap.innerHTML = cart.map((i, idx) => `
        <div class="cart-item" data-idx="${idx}">
          <div class="cart-thumb"></div>
          <div class="cart-meta">
            <strong>${i.title}</strong>
            <small>Size: ${i.size}</small>
            <small>$${i.price.toFixed(2)}</small>
          </div>
          <div>
            <div class="qty">
              <button data-dec aria-label="Decrease">−</button>
              <input value="${i.qty}" inputmode="numeric" />
              <button data-inc aria-label="Increase">+</button>
            </div>
            <button class="icon-btn" data-remove title="Remove">🗑</button>
          </div>
        </div>
      `).join('');
    }
    const subtotal = document.getElementById('cartSubtotal');
    if (subtotal) subtotal.textContent = `$${cartSubtotal().toFixed(2)}`;

    // Attach handlers
    wrap.querySelectorAll('[data-dec]').forEach(b=> b.addEventListener('click', onDecQty));
    wrap.querySelectorAll('[data-inc]').forEach(b=> b.addEventListener('click', onIncQty));
    wrap.querySelectorAll('input').forEach(inp=> inp.addEventListener('change', onQtyInput));
    wrap.querySelectorAll('[data-remove]').forEach(b=> b.addEventListener('click', onRemove));
  }

  function idxFromEl(el){ return parseInt(el.closest('.cart-item').getAttribute('data-idx')); }
  function onDecQty(e){ const idx = idxFromEl(e.currentTarget); cart[idx].qty = Math.max(1, cart[idx].qty-1); saveCart(); renderCart(); }
  function onIncQty(e){ const idx = idxFromEl(e.currentTarget); cart[idx].qty += 1; saveCart(); renderCart(); }
  function onQtyInput(e){ const idx = idxFromEl(e.currentTarget); let v = parseInt(e.currentTarget.value||'1',10); if (isNaN(v)||v<1) v=1; cart[idx].qty=v; saveCart(); renderCart(); }
  function onRemove(e){ const idx = idxFromEl(e.currentTarget); cart.splice(idx,1); saveCart(); renderCart(); }

  // --- Navigation ---
  const chips = document.querySelectorAll('.chip');
  const sortSelect = document.getElementById('sortSelect');
  chips.forEach(ch => ch.addEventListener('click', () => {
    chips.forEach(c=> c.classList.remove('active'));
    ch.classList.add('active');
    renderProducts(ch.getAttribute('data-category'), sortSelect?.value || 'featured');
  }));
  sortSelect?.addEventListener('change', () => {
    const active = document.querySelector('.chip.active');
    const cat = active?.getAttribute('data-category') || 'men';
    renderProducts(cat, sortSelect.value);
  });
  document.querySelector('[data-category-jump="children"]')?.addEventListener('click', () => {
    document.querySelector('[data-category="children"]').click();
    document.getElementById('products')?.scrollIntoView({ behavior:'smooth' });
  });

  // --- Checkout page logic ---
  function onCheckoutPage(){
    const list = document.getElementById('ckItems');
    if (!list) return;
    // Merge cart + potential single checkout item
    let intent = [];
    try{ intent = JSON.parse(sessionStorage.getItem(CHECKOUT_ITEM_KEY)) || []; } catch {}
    const items = intent.length ? intent : cart;
    if (!items.length){ list.innerHTML = '<p class="muted">Your cart is empty.</p>'; return; }
    list.innerHTML = items.map(i=> `
      <div class="cart-item">
        <div class="cart-thumb"></div>
        <div class="cart-meta">
          <strong>${i.title}</strong>
          <small>Size: ${i.size}</small>
          <small>$${i.price.toFixed(2)} × ${i.qty}</small>
        </div>
      </div>
    `).join('');
    const sub = items.reduce((s,i)=> s+i.price*i.qty, 0);
    document.getElementById('ckSubtotal').textContent = `$${sub.toFixed(2)}`;
    document.getElementById('ckPlaceOrder').addEventListener('click', (e)=>{
      e.preventDefault();
      showToast('Order placed (demo)');
      sessionStorage.removeItem(CHECKOUT_ITEM_KEY);
      cart = [];
      saveCart();
      setTimeout(()=> window.location.href = '../index.html', 800);
    });
  }

  // --- Init ---
  attachRipples();
  updateCartCount();
  renderCart();
  if (PAGE === 'home') renderProducts('men', 'featured');
  if (PAGE === 'checkout') onCheckoutPage();
})();


