document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");
  const root = document.getElementById("order-root");

  Cart.updateCartHeader();

  const raw = sessionStorage.getItem("se_last_order");
  if (!raw) {
    statusEl.textContent = "No recent order found.";
    return;
  }

  let order;
  try {
    order = JSON.parse(raw);
  } catch {
    statusEl.textContent = "Could not read order details.";
    return;
  }

  statusEl.textContent = "";

  const name = (order?.customer?.name || "fellow cinephile").toString().trim();
  const email = (order?.customer?.email || "").toString().trim();

  const thanksH2 = document.createElement("h2");
  thanksH2.textContent = `Thank you, ${name}!`;

  const receiptP = document.createElement("p");
  receiptP.textContent = email
    ? `A receipt has been sent to ${email}.`
    : "A receipt has been sent to you email.";

  root.append(thanksH2, receiptP);

  const nok = (n) => {
    const x = Number(n);
    return Number.isFinite(x) ? `NOK ${x.toFixed(2)}` : "";
  };

  const h2 = document.createElement("h2");
  h2.textContent = `Order #${order.id}`;

  const when = document.createElement("p");
  when.textContent = new Date(order.createdAt).toLocaleString();

  const ul = document.createElement("ul");
  for (const line of order.items || []) {
    const li = document.createElement("li");
    li.style.display = "flex";
    li.style.justifyContent = "space-between";
    li.style.gap = "12px";
    li.style.padding = "6px 0";

    const left = document.createElement("div");
    left.textContent = `${line.title} - x${line.qty}`;

    const right = document.createElement("div");
    right.textContent = `${nok(line.unit)} each • ${nok(line.line)}`;

    li.append(left, right);
    ul.appendChild(li);
  }

  const totalP = document.createElement("p");
  totalP.style.marginTop = "12px";
  totalP.style.fontWeight = "600";
  totalP.textContent = `Total paid: ${nok(order.total)}`;

  root.append(h2, when, ul, totalP);

  Cart.clearCart();
  Cart.updateCartHeader();
});
