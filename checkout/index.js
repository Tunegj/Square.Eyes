document.addEventListener("DOMContentLoaded", async () => {
  const statusEl = document.getElementById("status");
  const root = document.getElementById("cart-root");
  const totalsEl = document.getElementById("cart-total");
  const paymentSection = document.getElementById("payment-section");
  const checkoutForm = document.getElementById("checkout-form");
  const backBtn = document.getElementById("back-to-cart");
  const cardFields = document.getElementById("card-fields");

  let lastLines = [];
  let lastGrand = 0;

  function showPayment() {
    if (!paymentSection) return;

    // reveal + re-enable interaction
    paymentSection.hidden = false;
    paymentSection.inert = false; // supported in Chromium/FF
    paymentSection.setAttribute("aria-hidden", "false");

    // focus the first field (or the section) and scroll into view
    (
      checkoutForm?.querySelector("input, select, textarea, button") ||
      paymentSection
    )?.focus({ preventScroll: true });
    paymentSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function hidePayment() {
    if (!paymentSection) return;

    // if focus is inside the section, move it out before hiding
    if (paymentSection.contains(document.activeElement)) {
      const focusTarget =
        totalsEl?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ||
        document.getElementById("cart-total") ||
        document.body;

      // ensure the target can be focused
      if (
        focusTarget &&
        !focusTarget.hasAttribute?.("tabindex") &&
        focusTarget === document.getElementById("cart-total")
      ) {
        focusTarget.setAttribute("tabindex", "-1");
      }
      focusTarget?.focus({ preventScroll: true });
    }

    // hide + disable interaction
    paymentSection.inert = true; // prevents tab, clicks
    paymentSection.hidden = true;
    paymentSection.setAttribute("aria-hidden", "true");
  }

  // Update cart count in header
  Cart.updateCartHeader();

  // Format number as NOK currency
  const nok = (n) => {
    const x = Number(n);
    return Number.isFinite(x) ? `NOK ${x.toFixed(2)}` : "";
  };

  // Get unit price of item
  const unitPrice = (i) => Number(i.onSale ? i.discountedPrice : i.price) || 0;

  let allProductsCache = null;

  async function getAllProducts() {
    if (allProductsCache) return allProductsCache;
    const res = await fetch("https://v2.api.noroff.dev/square-eyes");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data } = await res.json();
    allProductsCache = Array.isArray(data) ? data : [];
    return allProductsCache;
  }

  function makeRecoCard(p, onAdd) {
    const li = document.createElement("li");
    li.className = "similar-card";

    const a = document.createElement("a");
    a.href = `../product/index.html?id=${encodeURIComponent(p.id)}`;
    a.className = "similar-link";

    const img = document.createElement("img");
    img.src = p.image?.url || "";
    img.alt = p.image?.alt || p.title || "Movie image";
    img.loading = "lazy";

    const cap = document.createElement("div");
    cap.className = "similar-caption";

    const title = document.createElement("div");
    title.className = "similar-title";
    title.textContent = p.title || "Untitled";

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.justifyContent = "space-between";
    row.style.alignItems = "center";
    row.style.gap = "8px";

    const price = document.createElement("div");
    if (p.onSale) {
      const now = document.createElement("span");
      now.textContent = nok(p.discountedPrice);
      now.style.color = "#b91c1c";
      now.style.fontWeight = "600";
      const was = document.createElement("s");
      was.textContent = nok(p.price);
      was.style.color = "#6b7280";
      was.style.marginLeft = "6px";
      price.append(now, " ", was);
    } else {
      price.textContent = nok(p.price);
      price.style.fontWeight = "600";
    }

    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Add";
    btn.style.border = "1px solid #111827";
    btn.style.background = "white";
    btn.style.padding = "4px 8px";
    btn.style.borderRadius = "8px";
    btn.style.cursor = "pointer";
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      onAdd?.(p);
    });

    row.append(price, btn);
    cap.append(title, row);
    a.append(img, cap);
    li.appendChild(a);
    return li;
  }

  async function renderRecommendations() {
    const mount = document.getElementById("cart-recos");
    if (!mount) return;

    const cartItems = Cart.readCart();
    mount.innerHTML = "";
    if (!cartItems.length) return;

    try {
      const all = await getAllProducts();
      const inCartIds = new Set(cartItems.map((i) => i.id));
      const cartGenres = new Set(
        all
          .filter((p) => inCartIds.has(p.id))
          .map((p) => (p.genre || "").toLowerCase())
          .filter(Boolean)
      );
      if (!cartGenres.size) return;

      const recos = all
        .filter(
          (p) =>
            !inCartIds.has(p.id) &&
            cartGenres.has((p.genre || "").toLowerCase())
        )
        .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
        .slice(0, 12);

      if (!recos.length) return;

      const h3 = document.createElement("h3");
      h3.className = "similar-heading";
      h3.textContent = "You might also like";

      const ul = document.createElement("ul");
      ul.className = "similar-list";

      const onAdd = (p) => {
        Cart.addItem({
          id: p.id,
          title: p.title,
          price: p.price,
          discountedPrice: p.discountedPrice,
          onSale: p.onSale,
          image: p.image?.url || "",
        });
        Cart.updateCartHeader();
        renderCart();
        const statusEl = document.getElementById("status");
        if (statusEl) statusEl.textContent = `${p.title} added to cart.`;
        setTimeout(() => {
          statusEl.textContent = "";
        }, 1500);
      };

      for (const p of recos) {
        ul.appendChild(makeRecoCard(p, onAdd));
      }

      mount.append(h3, ul);
    } catch (err) {
      console.error("Failed to render recommendations:", err);
    }
  }

  // Render cart contents
  function renderCart() {
    const items = Cart.readCart();
    root.innerHTML = "";
    totalsEl.innerHTML = "";

    if (!items.length) {
      statusEl.textContent = "Your cart is empty.";
      hidePayment();
      return;
    }
    // clear status
    statusEl.textContent = "";

    // render items
    const frag = document.createDocumentFragment();
    let grand = 0;
    const lines = [];

    // for each item, render a line
    for (const i of items) {
      const qty = Number(i.qty ?? i.quantity ?? 1) || 1;
      const u = unitPrice(i);
      const line = u * qty;
      grand += line;

      // keep track of lines for order summary
      lines.push({
        id: i.id,
        title: i.title || "Untitled",
        qty,
        unit: u,
        line,
        image: i.image || "",
      });

      const li = document.createElement("li");
      li.className = "cart-line";
      li.style.display = "grid";
      li.style.gridTemplateColumns = "1fr auto auto auto";
      li.style.alignItems = "center";
      li.style.gap = "12px";
      li.style.padding = "8px 0";

      const left = document.createElement("div");
      left.style.display = "flex";
      left.style.alignItems = "center";
      left.style.gap = "12px";

      const img = document.createElement("img");
      img.src = i.image || "";
      img.alt = i.title || "Product image";
      img.style.width = "60px";
      img.style.height = "80px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "6px";

      const title = document.createElement("div");
      title.textContent = i.title || "Untitled";

      const qtyBox = document.createElement("div");
      qtyBox.style.display = "inline-flex";
      qtyBox.style.alignItems = "center";
      qtyBox.style.gap = "8px";

      const minus = document.createElement("button");
      minus.type = "button";
      minus.textContent = "−";
      minus.setAttribute(
        "aria-label",
        `Decrease quantity of ${i.title || "item"}`
      );
      minus.style.border = "1px solid #111827";
      minus.style.background = "transparent";
      minus.style.borderRadius = "6px";
      minus.style.padding = "4px 10px";
      minus.style.cursor = "pointer";

      // disable minus button if qty is 1
      minus.disabled = qty === 1;
      if (minus.disabled) {
        minus.style.opacity = "0.5";
        minus.style.cursor = "not-allowed";
      }

      //  quantity text
      const qtyText = document.createElement("span");
      qtyText.textContent = String(qty);

      const plus = document.createElement("button");
      plus.type = "button";
      plus.textContent = "+";
      plus.setAttribute(
        "aria-label",
        `Increase quantity of ${i.title || "item"}`
      );
      plus.style.border = "1px solid #111827";
      plus.style.background = "transparent";
      plus.style.borderRadius = "6px";
      plus.style.padding = "4px 10px";
      plus.style.cursor = "pointer";

      minus.addEventListener("click", () => {
        Cart.updateQty(i.id, -1);
        Cart.updateCartHeader();
        renderCart();
        statusEl.textContent = "Cart updated.";
        setTimeout(() => {
          statusEl.textContent = "";
        }, 1500);
      });

      plus.addEventListener("click", () => {
        Cart.updateQty(i.id, +1);
        Cart.updateCartHeader();
        renderCart();
        statusEl.textContent = "Cart updated.";
        setTimeout(() => {
          statusEl.textContent = "";
        }, 1500);
      });

      // assemble qty box
      qtyBox.append(minus, qtyText, plus);

      const right = document.createElement("div");
      right.textContent = `x${qty} • ${nok(u)} each • ${nok(line)}`;

      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "Remove";
      removeBtn.setAttribute(
        "aria-label",
        `Remove ${i.title ?? "item"} from cart`
      );
      removeBtn.style.border = "1px solid #dc2626";
      removeBtn.style.background = "transparent";
      removeBtn.style.color = "#dc2626";
      removeBtn.style.padding = "6px 10px";
      removeBtn.style.borderRadius = "6px";
      removeBtn.style.cursor = "pointer";

      removeBtn.addEventListener("click", () => {
        Cart.removeItem(i.id);
        Cart.updateCartHeader();
        renderCart();
        statusEl.textContent = "Item removed from cart.";
      });

      // assemble line item
      left.append(img, title);
      li.append(left, qtyBox, right, removeBtn);
      frag.appendChild(li);
    }

    lastLines = lines;
    lastGrand = grand;

    // append all lines at once
    root.appendChild(frag);

    const totalP = document.createElement("p");
    totalP.id = "grand-total";
    totalP.style.marginTop = "12px";
    totalP.style.fontWeight = "600";
    totalP.textContent = `Total: ${nok(grand)}`;
    totalsEl.appendChild(totalP);

    const checkoutBtn = document.createElement("button");
    checkoutBtn.type = "button";
    checkoutBtn.textContent = "Checkout";
    checkoutBtn.style.marginTop = "12px";
    checkoutBtn.style.padding = "10px 14px";
    checkoutBtn.style.borderRadius = "8px";
    checkoutBtn.style.border = "1px solid #111827";
    checkoutBtn.style.cursor = "pointer";
    totalsEl.appendChild(checkoutBtn);

    checkoutBtn.addEventListener("click", () => {
      showPayment(); // <— reveal the hidden form and scroll to it
    });

    // on checkout, save order to sessionStorage and redirect to confirmation
    // checkoutBtn.addEventListener("click", () => {
    //   const order = {
    //     id: (crypto?.randomUUID && crypto.randomUUID()) || String(Date.now()),
    //     createdAt: new Date().toISOString(),
    //     total: grand,
    //     items: lines,
    //   };
    //   sessionStorage.setItem("se_last_order", JSON.stringify(order));

    //   location.href = "confirmation/index.html";
    // });
  }

  function updatePaymentFields() {
    const method = checkoutForm?.querySelector(
      'input[name="payMethod"]:checked'
    )?.value;
    if (cardFields) cardFields.hidden = method !== "card";
  }
  checkoutForm?.addEventListener("change", (e) => {
    if (e.target && e.target.name === "payMethod") updatePaymentFields();
  });
  updatePaymentFields();

  // Back to cart button
  backBtn?.addEventListener("click", () => {
    hidePayment();
    document
      .getElementById("cart-total")
      ?.scrollIntoView({ behavior: "smooth" });
  });

  checkoutForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const err = document.getElementById("form-error");
    if (err) err.textContent = "";

    const fd = new FormData(checkoutForm);
    const name = (fd.get("name") || "").toString().trim();
    const email = (fd.get("email") || "").toString().trim();
    const cardNumber = (fd.get("cardNumber") || "").toString().trim();
    const exp = (fd.get("exp") || "").toString().trim();
    const cvc = (fd.get("cvc") || "").toString().trim();

    // minimal required fields
    if (!name || !email || !cardNumber || !exp || !cvc) {
      if (err) err.textContent = "Please fill out the required fields.";
      return;
    }

    const payMethod = (fd.get("payMethod") || "card").toString();
    const last4 =
      (fd.get("cardNumber") || "").toString().replace(/\s+/g, "").slice(-4) ||
      null;

    const order = {
      id: (crypto?.randomUUID && crypto.randomUUID()) || String(Date.now()),
      createdAt: new Date().toISOString(),
      total: lastGrand,
      items: lastLines,
      customer: {
        name,
        email,
      },
      payment: { method: payMethod, last4 },
    };

    sessionStorage.setItem("se_last_order", JSON.stringify(order));
    location.href = "confirmation/index.html";
  });

  renderCart();
  renderRecommendations();
});
