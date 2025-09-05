const API_URL = "https://v2.api.noroff.dev/square-eyes";

async function fetchProducts() {
  const res = await fetch(API_URL);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const json = await res.json();
  return Array.isArray(json.data) ? json.data : [];
}

document.addEventListener("DOMContentLoaded", async () => {
  const statusEl = document.getElementById("status");
  const listEl = document.getElementById("products");

  function nok(n) {
    const x = Number(n);
    return Number.isFinite(x) ? `NOK ${x.toFixed(2)}` : "";
  }

  function renderProducts(items) {
    if (!listEl) {
      console.warn('No element with id "products" found. Skipping rendering.');
      return;
    }

    if (!items.length) {
      listEl.innerHTML = "<li>No products found.</li>";
      return;
    }

    listEl.innerHTML = "";
    const frag = document.createDocumentFragment();

    for (const p of items) {
      const li = document.createElement("li");
      li.style.border = "1px solid #e5e7eb";
      li.style.borderRadius = "8px";
      li.style.padding = "8px";

      const img = document.createElement("img");
      img.src = p.image?.url || "";
      img.alt = p.image?.alt || p.title || "Product image";
      img.loading = "lazy";
      img.style.width = "100%";
      img.style.aspectRatio = "3 / 4";
      img.style.objectFit = "cover";
      img.style.borderRadius = "6px";

      const h3 = document.createElement("h3");
      h3.textContent = p.title || "Untitled";
      h3.style.margin = "8px 0 4px 0";
      h3.style.fontSize = "1rem";

      const priceP = document.createElement("p");
      priceP.style.margin = "0";

      if (p.onSale) {
        const now = document.createElement("span");
        now.textContent = nok(p.discountedPrice);
        now.style.color = "#b91c1c";
        now.style.fontWeight = "600";

        const was = document.createElement("s");
        was.textContent = nok(p.price);
        was.style.color = "#6b7280";
        was.style.marginLeft = "6px";

        priceP.append(now, " ", was);
      } else {
        priceP.textContent = nok(p.price);
        priceP.style.fontWeight = "600";
      }

      li.append(img, h3, priceP);
      frag.appendChild(li);
    }

    listEl.appendChild(frag);
  }

  try {
    const products = await fetchProducts();
    console.log("Square Eyes products:", products);
    console.log("First product:", products[0]);
    renderProducts(products);
    statusEl.textContent = `Loaded ${products.length} products.`;
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Failed to load products.";
  }
});
