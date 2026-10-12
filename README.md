# HTTP Methods and CORS Reference

A practical reference for REST API methods, status codes, and CORS, with examples using a `/products` resource.

## 1. HTTP Basics

A request has a method, a URL, headers, and an optional body. A response has a status code, headers, and an optional body.

```
POST /products HTTP/1.1
Host: api.example.com
Content-Type: application/json

{"name": "Mouse", "price": 25}
```

Two properties matter when choosing a method:

- **Safe:** does not change server state.
- **Idempotent:** calling it once or many times leaves the server in the same state.

| Method  | Purpose                    | Safe | Idempotent | Request body | Response body |
|---------|----------------------------|------|------------|--------------|---------------|
| GET     | Read a resource            | Yes  | Yes        | No           | Yes           |
| POST    | Create a resource / action | No   | No         | Yes          | Yes           |
| PUT     | Replace a resource fully   | No   | Yes        | Yes          | Optional      |
| PATCH   | Update part of a resource  | No   | Not guaranteed | Yes      | Optional      |
| DELETE  | Remove a resource          | No   | Yes        | Usually no   | Optional      |
| HEAD    | Same as GET, headers only  | Yes  | Yes        | No           | No            |
| OPTIONS | Ask what is allowed (CORS) | Yes  | Yes        | No           | Optional      |

## 2. Methods in Detail

### GET

Reads data. Must not change server state. Parameters go in the URL, never in the body.

```
GET /products          -> list all
GET /products/5        -> get one
GET /products?minPrice=10&sort=price   -> filter and sort
```

Success: `200 OK`. Missing: `404 Not Found`.

```js
const res = await fetch('http://localhost:3000/products');
const products = await res.json();
```

### POST

Creates a new resource or triggers an action. The server assigns the ID. Calling it twice creates two resources.

```
POST /products
Content-Type: application/json

{"name": "Mouse", "price": 25}
```

Success: `201 Created`, with a `Location: /products/6` header and the created object in the body.

```js
const res = await fetch('http://localhost:3000/products', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Mouse', price: 25 })
});
const created = await res.json();
```

### PUT

Replaces the entire resource. The client sends the full object. Any field left out is removed or reset. Can also create a resource at a client-chosen URL.

```
PUT /products/5
Content-Type: application/json

{"name": "Mouse v2", "price": 30}
```

Success: `200 OK` or `204 No Content` (updated), `201 Created` (created).

### PATCH

Updates only the fields sent. Use it when you change one or two fields of a larger object.

```
PATCH /products/5
Content-Type: application/json

{"price": 28}
```

Success: `200 OK` or `204 No Content`.

PUT vs PATCH:

| | PUT | PATCH |
|---|---|---|
| Sends | Full resource | Only changed fields |
| Missing fields | Removed or reset | Left unchanged |
| Idempotent | Yes | Usually, depends on the operation |

PATCH is not idempotent when the change is relative (for example `{"op": "increment", "field": "stock"}`). Absolute changes like `{"price": 28}` are idempotent in practice.

### DELETE

Removes a resource. Repeating it leaves the server in the same state (the resource is gone), though the second call may return `404`.

```
DELETE /products/5
```

Success: `204 No Content` (no body) or `200 OK` (with a body).

### HEAD

Same as GET but returns only headers. Useful for checking existence, size (`Content-Length`), or caching info without downloading the body.

### OPTIONS

Returns the methods and headers a resource supports. Browsers send it automatically as a CORS preflight (see section 5).

## 3. Status Codes

### 2xx Success
| Code | Meaning | Typical use |
|------|---------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 202 | Accepted | Request queued, not yet processed |
| 204 | No Content | Successful DELETE or PUT with no body |

### 3xx Redirection
| Code | Meaning |
|------|---------|
| 301 | Moved permanently |
| 302 | Found (temporary redirect) |
| 304 | Not modified (use cached copy) |
| 307 / 308 | Redirect that keeps the same method |

### 4xx Client errors
| Code | Meaning | Typical cause |
|------|---------|---------------|
| 400 | Bad Request | Malformed JSON, missing field |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Authenticated but not allowed |
| 404 | Not Found | Resource does not exist |
| 405 | Method Not Allowed | Wrong method for this URL |
| 409 | Conflict | Duplicate or version clash |
| 415 | Unsupported Media Type | Wrong `Content-Type` |
| 422 | Unprocessable Entity | Valid JSON, failed validation |
| 429 | Too Many Requests | Rate limited |

### 5xx Server errors
| Code | Meaning |
|------|---------|
| 500 | Internal Server Error |
| 502 | Bad Gateway |
| 503 | Service Unavailable |
| 504 | Gateway Timeout |

## 4. Common Headers

| Header | Direction | Purpose |
|--------|-----------|---------|
| `Content-Type` | Both | Format of the body, e.g. `application/json` |
| `Accept` | Request | Format the client wants back |
| `Authorization` | Request | Credentials, e.g. `Bearer <token>` |
| `Origin` | Request | Where the request comes from (set by browser) |
| `Cache-Control` | Both | Caching rules |
| `ETag` / `If-Match` | Both | Version checks, prevents lost updates |
| `Location` | Response | URL of a newly created resource |

## 5. CORS (Cross-Origin Resource Sharing)

### The problem: Same-Origin Policy

Browsers block JavaScript on one origin from reading responses from another origin. An origin is the combination of scheme, host, and port.

| Page origin | Request to | Same origin? |
|---|---|---|
| `http://localhost:5500` | `http://localhost:5500/api` | Yes |
| `http://localhost:5500` | `http://localhost:3000/api` | No (port differs) |
| `https://app.com` | `http://app.com` | No (scheme differs) |
| `https://app.com` | `https://api.app.com` | No (host differs) |

CORS is the mechanism that lets a server say which other origins may read its responses. Key facts:

- CORS is enforced by the **browser**. The server only sends headers. curl, Postman, and server-to-server calls ignore CORS.
- CORS is not authentication. It does not stop anyone from calling your API directly.
- A CORS error means the browser blocked your code from reading the response. The request often still reached the server.

### Simple requests

A request is "simple" (no preflight) when all of these hold:

- Method is `GET`, `HEAD`, or `POST`.
- Only basic headers are set (`Accept`, `Accept-Language`, `Content-Language`, `Content-Type`).
- `Content-Type` is `text/plain`, `application/x-www-form-urlencoded`, or `multipart/form-data`.

Flow:

```
Browser -> GET /products
           Origin: http://localhost:5500

Server  -> 200 OK
           Access-Control-Allow-Origin: http://localhost:5500
```

If the response lacks a matching `Access-Control-Allow-Origin`, the browser blocks access.

### Preflight requests

Any request that is not simple triggers a preflight: the browser first sends an `OPTIONS` request to ask permission. This happens for:

- Methods `PUT`, `PATCH`, `DELETE`.
- `Content-Type: application/json` (a very common cause).
- Custom headers such as `Authorization`.

Flow:

```
1. Preflight
Browser -> OPTIONS /products/5
           Origin: http://localhost:5500
           Access-Control-Request-Method: PATCH
           Access-Control-Request-Headers: content-type

Server  -> 204 No Content
           Access-Control-Allow-Origin: http://localhost:5500
           Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE
           Access-Control-Allow-Headers: Content-Type, Authorization
           Access-Control-Max-Age: 600

2. Actual request (only if the preflight passed)
Browser -> PATCH /products/5
           Origin: http://localhost:5500

Server  -> 200 OK
           Access-Control-Allow-Origin: http://localhost:5500
```

Your products page sends `POST` with `Content-Type: application/json`, so it triggers a preflight.

### CORS response headers

| Header | Purpose |
|--------|---------|
| `Access-Control-Allow-Origin` | Origin allowed to read the response (one origin or `*`) |
| `Access-Control-Allow-Methods` | Methods allowed (preflight response) |
| `Access-Control-Allow-Headers` | Request headers allowed (preflight response) |
| `Access-Control-Allow-Credentials` | `true` to allow cookies and auth credentials |
| `Access-Control-Expose-Headers` | Response headers JavaScript may read beyond the defaults |
| `Access-Control-Max-Age` | Seconds the browser may cache the preflight result |
| `Vary: Origin` | Required when the allowed origin changes per request, so caches stay correct |

### CORS request headers (set by the browser)

| Header | Purpose |
|--------|---------|
| `Origin` | The requesting origin |
| `Access-Control-Request-Method` | Method of the real request (preflight) |
| `Access-Control-Request-Headers` | Headers of the real request (preflight) |

### Credentials

By default, cross-origin requests do not send cookies. To include them:

Client:
```js
fetch('http://localhost:3000/products', { credentials: 'include' });
```

Server must respond with:
```
Access-Control-Allow-Origin: http://localhost:5500   (exact origin, NOT *)
Access-Control-Allow-Credentials: true
```

Rules when credentials are used:
- `Access-Control-Allow-Origin: *` is not allowed.
- `Access-Control-Allow-Headers: *` and `Access-Control-Allow-Methods: *` wildcards are not honored.

### Common CORS errors and fixes

| Error message (browser console) | Cause | Fix |
|---|---|---|
| No 'Access-Control-Allow-Origin' header is present | Server sends no CORS headers | Enable CORS on the server |
| Response to preflight does not have HTTP ok status | Server rejects `OPTIONS` (404/405/401) | Handle `OPTIONS` and return 204 before auth checks |
| Method PATCH is not allowed by Access-Control-Allow-Methods | Method missing from allow list | Add the method |
| Request header content-type is not allowed | Header missing from allow list | Add `Content-Type` to `Allow-Headers` |
| Wildcard '*' cannot be used when credentials mode is 'include' | `*` with credentials | Return the exact origin |
| Origin 'null' | Page opened from `file://` | Serve the page from a local server |

## 6. Enabling CORS on a Node.js / Express Server

### Using the `cors` package

```bash
npm install express cors
```

```js
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: ['http://localhost:5500', 'https://myapp.com'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  maxAge: 600
}));

app.use(express.json());
```

Register `cors()` before your routes and before any auth middleware so preflight requests succeed.

### Manual headers (no package)

```js
const allowed = ['http://localhost:5500', 'https://myapp.com'];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '600');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
```

### Development shortcut

```js
app.use(cors());   // allows all origins; do not use in production with sensitive data
```

## 7. Complete REST Example (Express)

```js
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors({ origin: 'http://localhost:5500' }));
app.use(express.json());

let products = [{ id: 1, name: 'Mouse', price: 25 }];
let nextId = 2;

// GET all
app.get('/products', (req, res) => res.json(products));

// GET one
app.get('/products/:id', (req, res) => {
  const p = products.find(x => x.id === Number(req.params.id));
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

// POST create
app.post('/products', (req, res) => {
  const { name, price } = req.body;
  if (!name || typeof price !== 'number') {
    return res.status(400).json({ error: 'name and numeric price required' });
  }
  const p = { id: nextId++, name, price };
  products.push(p);
  res.status(201).location(`/products/${p.id}`).json(p);
});

// PUT replace
app.put('/products/:id', (req, res) => {
  const i = products.findIndex(x => x.id === Number(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  const { name, price } = req.body;
  if (!name || typeof price !== 'number') {
    return res.status(400).json({ error: 'name and numeric price required' });
  }
  products[i] = { id: products[i].id, name, price };
  res.json(products[i]);
});

// PATCH partial update
app.patch('/products/:id', (req, res) => {
  const p = products.find(x => x.id === Number(req.params.id));
  if (!p) return res.status(404).json({ error: 'Not found' });
  if (req.body.name !== undefined) p.name = req.body.name;
  if (req.body.price !== undefined) p.price = req.body.price;
  res.json(p);
});

// DELETE
app.delete('/products/:id', (req, res) => {
  const i = products.findIndex(x => x.id === Number(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  products.splice(i, 1);
  res.status(204).end();
});

app.listen(3000, () => console.log('API on http://localhost:3000'));
```

## 8. Client Example (`client.js`)

```js
const API = 'http://localhost:3000';

async function request(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

const getProducts   = ()          => request('/products');
const getProduct    = id          => request(`/products/${id}`);
const createProduct = data        => request('/products', { method: 'POST',   body: JSON.stringify(data) });
const replaceProduct = (id, data) => request(`/products/${id}`, { method: 'PUT',    body: JSON.stringify(data) });
const updateProduct = (id, data)  => request(`/products/${id}`, { method: 'PATCH',  body: JSON.stringify(data) });
const deleteProduct = id          => request(`/products/${id}`, { method: 'DELETE' });
```

`fetch` only rejects on network failure or a CORS block. A `404` or `500` still resolves, so always check `res.ok`.

## 9. Testing with curl

curl ignores CORS, so it tests the API itself.

```bash
curl http://localhost:3000/products

curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Keyboard","price":45}'

curl -X PATCH http://localhost:3000/products/1 \
  -H "Content-Type: application/json" \
  -d '{"price":22}'

curl -X DELETE http://localhost:3000/products/1
```

Simulate a preflight to check your CORS config:

```bash
curl -i -X OPTIONS http://localhost:3000/products \
  -H "Origin: http://localhost:5500" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

The response should include `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, and `Access-Control-Allow-Headers`.

## 10. REST Design Rules

- Use nouns for URLs, plural: `/products`, not `/getProducts`.
- Let the method express the action: `DELETE /products/5`, not `/products/5/delete`.
- Nest only when ownership is clear: `/customers/3/orders`.
- Return the correct status code and a consistent JSON error shape, e.g. `{"error": "message"}`.
- Validate input on the server. Never trust the client.
- Version your API: `/v1/products`.
- Paginate lists: `?page=2&limit=20`.
- Use HTTPS in production.

## 11. Security Notes for CORS

- Never reflect any `Origin` back without checking it against an allow list.
- Avoid `*` for APIs that use cookies or return private data.
- CORS does not replace authentication, authorization, or CSRF protection.
- Keep the allow list of methods and headers as small as the app needs.
- Add `Vary: Origin` when the allowed origin is dynamic.

## 12. Quick Troubleshooting Checklist

1. Is the server running and reachable at that URL and port?
2. Open the browser Network tab. Do you see an `OPTIONS` request? What status did it return?
3. Does the response include `Access-Control-Allow-Origin` matching the page origin exactly (scheme, host, port)?
4. Does `Access-Control-Allow-Methods` include your method, and `Access-Control-Allow-Headers` include every header you send?
5. Is CORS middleware registered before routes and auth?
6. Using cookies? Check `credentials: 'include'`, an exact origin, and `Allow-Credentials: true`.
7. Opening the HTML as `file://`? Serve it with a local server (for example the VS Code Live Server extension or `npx serve`).
