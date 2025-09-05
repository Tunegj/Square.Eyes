const BASE = "https://v2.api.noroff.dev/square-eyes";

function nok(n) {
  const x = Number(n);
  return Number.isFinite(x) ? `NOK ${x.toFixed(2)}` : "";
}

async function getProduct(id) {
  const res = await fetch(`${BASE}/${encodeURIComponent(id)}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const { data } = await res.json();
  return data;
}

document.addEventListener("DOMContentLoaded", async () => {
  const statusEl = document.getElementById("status");
  const root = document.getElementById("product-root");

  const id = new URL(location.href).searchParams.get("id");
  if (!id) {
    statusEl.textContent = "Missing product id.";
    return;
  }

  try {
    const p = await getProduct(id);
    statusEl.textContent = "";
    root.innerHTML = "";

    const img = document.createElement("img");
    img.src = p.image?.url || "";
    img.alt = p.image?.alt || p.title || "Product image";
    img.style.width = "100%";
    img.style.maxWidth = "480px";
    img.style.aspectRatio = "3 / 4";
    img.style.objectFit = "cover";
    img.style.borderRadius = "12px";

    const h2 = document.createElement("h2");
    h2.textContent = p.title || "Untitled";

    const desc = document.createElement("p");
    desc.textContent = p.description || "No description";

    const meta = document.createElement("p");
    meta.textContent = `Genre: ${p.genre ?? ""} * Released: ${
      p.released ?? ""
    } * Rating: ${p.rating ?? ""}`;

    const price = document.createElement("p");
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

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "Add to cart";
    addBtn.style.marginTop = "12px";
    addBtn.style.padding = "8px 12px";
    addBtn.style.border = "1px solid #111827";
    addBtn.style.borderRadius = "8px";
    addBtn.style.cursor = "pointer";

    addBtn.addEventListener("click", () => {
      Cart.addItem({
        id: p.id,
        title: p.title,
        price: p.price,
        discountedPrice: p.discountedPrice,
        onSale: p.onSale,
        image: p.image?.url || "",
      });

      Cart.updateCartHeader();
      statusEl.textContent = "Added to basket.";
    });

    root.append(addBtn);
    Cart.updateCartHeader();

    root.append(img, h2, desc, meta, price);
  } catch (e) {
    console.error(e);
    statusEl.textContent = `Failed to load product: ${e.message}`;
  }
});
