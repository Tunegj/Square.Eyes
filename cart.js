const CART_KEY = "se_cart_v1";

function readCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) ?? [];
  } catch {
    return [];
  }
}

function writeCart(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function countCart() {
  return readCart().reduce((sum, i) => {
    const q = Number(i.qty ?? i.quantity ?? 1);
    return sum + (Number.isFinite(q) ? q : 1);
  }, 0);
}

// Always store with `qty`
function addItem(item) {
  const cart = readCart();
  const idx = cart.findIndex((i) => i.id === item.id);

  if (idx >= 0) {
    const current = Number(cart[idx].qty ?? cart[idx].quantity ?? 1);
    cart[idx].qty = (Number.isFinite(current) ? current : 1) + 1;
    delete cart[idx].quantity;
  } else {
    cart.push({ ...item, qty: 1 });
  }

  writeCart(cart);
  return countCart();
}

function removeItem(id) {
  const cart = readCart().filter((i) => i.id !== id);
  writeCart(cart);
  return countCart();
}

function clearCart() {
  writeCart([]);
}

function updateCartHeader() {
  const count = countCart();
  const badge = document.getElementById("cart-count");
  if (badge) {
    badge.textContent = String(count);
    const link = badge.closest("a");
    if (link) {
      link.setAttribute(
        "aria-label",
        count === 1 ? "View cart, 1 item" : `View cart, ${count} items`
      );
    }
  }
}

function unitPrice(i) {
  const n = Number(i.onSale ? i.discountedPrice : i.unitPrice);
  return Number.isFinite(n) ? n : 0;
}

function cartTotal() {
  return readCart().reduce((sum, i) => {
    const qty = Number(i.qty ?? i.quantity ?? 1) || 1;
    return sum + unitPrice(i) * qty;
  }, 0);
}

window.Cart = {
  readCart,
  writeCart,
  addItem,
  removeItem,
  clearCart,
  countCart,
  updateCartHeader,
  unitPrice,
  cartTotal,
};
