const express = require('express');
const app = express();
const PORT = 3000;
const cors=require('cors');
app.use(express.json());
app.use(cors({
    origin:"http://127.0.0.1:5500",
    methods:["GET"]
}))

let products = [
  { id: 1, name: 'Laptop', price: 1000 },
  { id: 2, name: 'Phone', price: 500 },
  { id: 3, name: 'Tablet', price: 300 }
];

app.get('/products', (req, res) => {
  res.json(products);
});

app.get('/products/:id', (req, res) => {
  const product = products.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

app.post('/products', (req, res) => {
  const newProduct = req.body;
  newProduct.id = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
  products.push(newProduct);
  res.status(201).json(newProduct);
});



app.put('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const index = products.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Product not found' });

  const updatedProduct = { ...req.body, id };
  products[index] = updatedProduct;
  res.json(updatedProduct);
});

app.patch('/products/:id', (req, res) => {
  const id = Number(req.params.id);
  const product = products.find(p => p.id === id);
  if (!product) return res.status(404).json({ error: 'Product not found' });

  Object.assign(product, req.body, { id });
  res.json(product);
});
 

 
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});