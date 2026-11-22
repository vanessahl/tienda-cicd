'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');

let server;
let base;

before(async () => {
  server = createApp();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

const post = (path, body) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

test('GET /health responde 200 y status ok', async () => {
  const res = await fetch(`${base}/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'ok');
});

test('POST /orders crea un pedido y calcula el total', async () => {
  const res = await post('/orders', {
    customer: 'Ana',
    items: [{ sku: 'A1', qty: 2, price: 10.5 }, { sku: 'B2', qty: 1, price: 4 }],
  });
  assert.equal(res.status, 201);
  const order = await res.json();
  assert.equal(order.total, 25);
  assert.equal(order.status, 'creado');
});

test('POST /orders rechaza datos inválidos con 400', async () => {
  const res = await post('/orders', { customer: '', items: [] });
  assert.equal(res.status, 400);
});

test('GET /orders/:id devuelve 404 si no existe', async () => {
  const res = await fetch(`${base}/orders/9999`);
  assert.equal(res.status, 404);
});

test('GET /metrics expone métricas de Prometheus', async () => {
  const res = await fetch(`${base}/metrics`);
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /http_requests_total/);
  assert.match(text, /orders_created_total/);
});
