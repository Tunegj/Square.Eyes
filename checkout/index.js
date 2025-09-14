document.addEventListener("DOMContentLoaded", async () => {
  const statusEl = document.getElementById("status");
  const root = document.getElementById("cart-root");
  const totalsEl = document.getElementById("cart-total");

  const paymentSection = document.getElementById("payment-section");
  const checkoutForm = document.getElementById("checkout-form");
  const backBtn = document.getElementById("back-to-cart");
  const cardFields = document.getElementById("card-fields");

  const REQUIRE_LUHN = false;
  const cardNumberEl = checkoutForm?.elements["cardNumber"];
  const expEl = checkoutForm?.elements["exp"];
  const cvcEl = checkoutForm?.elements["cvc"];

  const digits = (s) => (s || "").replace(/\D/g, "");

  function luhnOk(numStr) {
    const a = numStr.split("").reverse().map(Number);
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      let d = a[i];
      if (i % 2 === 1) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
    }
    return sum % 10 === 0;
  }

  function formatCardNumber(s) {
    const d = digits(s).slice(0, 19);
    return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
  }

  function isValidCardNumber(s) {
    const d = digits(s);
    if (d.length < 13 || d.length > 19) return false;
    return REQUIRE_LUHN ? luhnOk(d) : true;
  }

  function formatExp(s) {
    const d = digits(s).slice(0, 4);
    if (d.length <= 2) return d;
    return d.slice(0, 2) + "/" + d.slice(2);
  }

  function isValidExpiry(s) {
    const m = /^(\d{2})\/(\d{2})$/.exec(s || "");
    if (!m) return false;
    const mm = Number(m[1]),
      yy = Number(m[2]);
    if (mm < 1 || mm > 12) return false;

    const now = new Date();
    const curYY = now.getFullYear() % 100;
    const curMM = now.getMonth() + 1;
    if (yy < curYY) return false;
    if (yy === curYY && mm < curMM) return false;
    return true;
  }

  function isValidCVC(s) {
    return /^\d{3,4}$/.test(digits(s));
  }

  function setInvalid(el, invalid) {
    if (!el) return;
    el.setAttribute("aria-invalid", invalid ? "true" : "false");
  }

  if (cardNumberEl) {
    cardNumberEl.addEventListener("input", () => {
      cardNumberEl.value = formatCardNumber(cardNumberEl.value);
      const okLen = digits(cardNumberEl.value).length >= 13;
      setInvalid(cardNumberEl, !okLen);
    });
    cardNumberEl.addEventListener("blur", () => {
      setInvalid(cardNumberEl, !isValidCardNumber(cardNumberEl.value));
    });
  }

  if (expEl) {
    expEl.addEventListener("input", () => {
      expEl.value = formatExp(expEl.value);
      const looksOk = /^(\d{0,2})(\/?\d{0,2})$/.test(expEl.value);
      setInvalid(expEl, !looksOk);
    });
    expEl.addEventListener("blur", () => {
      setInvalid(expEl, !isValidExpiry(expEl.value));
    });
  }

  if (cvcEl) {
    cvcEl.addEventListener("input", () => {
      const d = digits(cvcEl.value).slice(0, 4);
      cvcEl.value = d;
      setInvalid(cvcEl, d.length < 3);
    });
    cvcEl.addEventListener("blur", () => {
      setInvalid(cvcEl, !isValidCVC(cvcEl.value));
    });
  }

  let lastLines = [];
  let lastGrand = 0;

  function showPayment() {
    if (!paymentSection) return;

    paymentSection.hidden = false;
    paymentSection.inert = false;
    paymentSection.setAttribute("aria-hidden", "false");

    (
      checkoutForm?.querySelector("input, select, textarea, button") ||
      paymentSection
    )?.focus({ preventScroll: true });
    paymentSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function hidePayment() {
    if (!paymentSection) return;
    if (paymentSection.contains(document.activeElement)) {
      const focusTarget =
        totalsEl?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ||
        document.getElementById("cart-total") ||
        document.body;
      if (
        focusTarget &&
        !focusTarget.hasAttribute?.("tabindex") &&
        focusTarget === document.getElementById("cart-total")
      ) {
        focusTarget.setAttribute("tabindex", "-1");
      }
      focusTarget?.focus({ preventScroll: true });
    }

    paymentSection.inert = true;
    paymentSection.hidden = true;
    paymentSection.setAttribute("aria-hidden", "true");
  }

  Cart.updateCartHeader();

  const nok = (n) => {
    const x = Number(n);
    return Number.isFinite(x) ? `NOK ${x.toFixed(2)}` : "";
  };

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

  function renderCart() {
    const items = Cart.readCart();
    root.innerHTML = "";
    totalsEl.innerHTML = "";

    if (!items.length) {
      statusEl.textContent = "Your cart is empty.";
      hidePayment();
      return;
    }

    statusEl.textContent = "";

    const frag = document.createDocumentFragment();
    let grand = 0;
    const lines = [];

    for (const i of items) {
      const qty = Number(i.qty ?? i.quantity ?? 1) || 1;
      const u = unitPrice(i);
      const line = u * qty;
      grand += line;

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
      img.style.margin = "0 10px";

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

      minus.disabled = qty === 1;
      if (minus.disabled) {
        minus.style.opacity = "0.5";
        minus.style.cursor = "not-allowed";
      }

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

      left.append(img, title);
      li.append(left, qtyBox, right, removeBtn);
      frag.appendChild(li);
    }

    lastLines = lines;
    lastGrand = grand;

    root.appendChild(frag);

    const totalP = document.createElement("p");
    totalP.id = "grand-total";
    totalP.style.marginTop = "12px";
    totalP.style.fontWeight = "600";
    totalP.style.margin = "0 10px";
    totalP.textContent = `Total: ${nok(grand)}`;
    totalsEl.appendChild(totalP);

    const checkoutBtn = document.createElement("button");
    checkoutBtn.type = "button";
    checkoutBtn.textContent = "Checkout";
    checkoutBtn.style.margin = "12px 10px";
    checkoutBtn.style.padding = "10px 14px";
    checkoutBtn.style.borderRadius = "8px";
    checkoutBtn.style.border = "1px solid #111827";
    checkoutBtn.style.cursor = "pointer";
    totalsEl.appendChild(checkoutBtn);

    checkoutBtn.addEventListener("click", () => {
      showPayment();
    });
  }

  function updatePaymentFields() {
    const method =
      checkoutForm?.querySelector('input[name="payMethod"]:checked')?.value ||
      "card";
    const required = method === "card";
    if (cardFields) cardFields.hidden = !required;
    if (cardNumberEl) cardNumberEl.required = required;
    if (expEl) expEl.required = required;
    if (cvcEl) cvcEl.required = required;
  }

  checkoutForm?.addEventListener("change", (e) => {
    if (e.target && e.target.name === "payMethod") updatePaymentFields();
  });

  updatePaymentFields();

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
    const payMethod = (fd.get("payMethod") || "card").toString();

    if (!name || !email) {
      if (err)
        err.textContent =
          "Please fill out the required fields (name and email).";
      return;
    }

    if (payMethod === "card") {
      const rawNum = cardNumberEl?.value || "";
      const rawExp = expEl?.value || "";
      const rawCvc = cvcEl?.value || "";

      if (digits(rawNum).length === 0) {
        setInvalid(cardNumberEl, true);
        if (err) err.textContent = "Card number is required.";
        cardNumberEl?.focus();
        return;
      }
      if (!isValidCardNumber(rawNum)) {
        setInvalid(cardNumberEl, true);
        if (err) err.textContent = "Please enter a valid card number.";
        cardNumberEl?.focus();
        return;
      }
      if (rawExp.trim() === "" || !isValidExpiry(rawExp)) {
        setInvalid(expEl, true);
        if (err)
          err.textContent = "Expiry must be in MM/YY and not in the past.";
        expEl?.focus();
        return;
      }
      if (digits(rawCvc).length === 0 || !isValidCVC(rawCvc)) {
        setInvalid(cvcEl, true);
        if (err) err.textContent = "CVC must be 3 or 4 digits.";
        cvcEl?.focus();
        return;
      }
    }

    const last4 =
      (fd.get("cardNumber") || "").toString().replace(/\s+/g, "").slice(-4) ||
      null;

    const order = {
      id: (crypto?.randomUUID && crypto.randomUUID()) || String(Date.now()),
      createdAt: new Date().toISOString(),
      total: lastGrand,
      items: lastLines,
      customer: { name, email },
      payment: { method: payMethod, last4 },
    };

    sessionStorage.setItem("se_last_order", JSON.stringify(order));
    location.href = "confirmation/index.html";
  });

  renderCart();
  renderRecommendations();
});
