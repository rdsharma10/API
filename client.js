const BASE_URL = 'http://localhost:3000/products';

async function getProducts() {
  const res = await fetch(BASE_URL);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}

async function getProduct(id) {
  const res = await fetch(`${BASE_URL}/${id}`);
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}

async function createProduct(product) {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}

async function updateProduct(id, product) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product)
  });
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}

async function patchProduct(id, partialData) {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(partialData)
  });
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}