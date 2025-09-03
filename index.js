const API_URL = "https://v2.api.noroff.dev/square-eyes";

async function fetchProducts() {
  const res = await fetch(API_URL);
  if (!res.ok) {
    throw new Error(`Http ${res.status}`);
  }
  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}

document.addEventListener("DOMContentLoaded", async () => {
  const statusEl = document.getElementById("status");
  try {
    const products = await fetchProducts();
    console.log("Square Eyes products:", products); // <- check DevTools Console
    console.log("First product:", products[0]); // <- peek at shape/fields
    statusEl.textContent = `Loaded ${products.length} products.`;
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Failed to load products.";
  }
});
