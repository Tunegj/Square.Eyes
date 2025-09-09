document.addEventListener("DOMContentLoaded", async () => {
  const statusEl = document.getElementById("status");
  const root = document.getElementById("cart-root");
  const totalsEl = document.getElementById("cart-total");

  Cart.updateCartHeader();

  const nok = (n) => {
    const x = Number(n);
    return Number.isFinite(x) ? `NOK ${x.toFixed(2)}` : "";
  };

  const unitPrice = (i) => Number(i.onSale ? i.discountedPrice : i.price) || 0;

  function renderCart() {
    const items = Cart.readCart();
    root.innerHTML = "";
    totalsEl.innerHTML = "";

    if (!items.length) {
      statusEl.textContent = "Your cart is empty.";
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
      li.style.gridTemplateColumns = "1fr auto auto";
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
      li.append(left, right, removeBtn);
      frag.appendChild(li);
    }

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
      const order = {
        id: (crypto?.randomUUID && crypto.randomUUID()) || String(Date.now()),
        createdAt: new Date().toISOString(),
        total: grand,
        items: lines,
      };
      sessionStorage.setItem("se_last_order", JSON.stringify(order));

      location.href = "/checkout/confirmation/index.html";
    });
  }

  renderCart();
});
