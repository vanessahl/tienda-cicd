'use strict';
const http = require('node:http');
const metrics = require('./metrics');

const APP_ENV = process.env.APP_ENV || 'local';
const APP_VERSION = process.env.APP_VERSION || 'dev';

function createApp() {
  const orders = new Map();
  let nextId = 1;

  function send(res, status, body, contentType = 'application/json') {
    const payload = contentType === 'application/json' ? JSON.stringify(body) : body;
    res.writeHead(status, { 'Content-Type': contentType });
    res.end(payload);
  }

  function readJson(req) {
    return new Promise((resolve, reject) => {
      let raw = '';
      req.on('data', (chunk) => {
        raw += chunk;
        if (raw.length > 1e6) reject(new Error('payload demasiado grande'));
      });
      req.on('end', () => {
        try {
          resolve(raw ? JSON.parse(raw) : {});
        } catch {
          reject(new Error('JSON inválido'));
        }
      });
    });
  }

  function validateOrder(body) {
    if (!body || typeof body.customer !== 'string' || body.customer.trim() === '') {
      return 'customer es obligatorio';
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return 'items debe ser una lista con al menos un producto';
    }
    for (const item of body.items) {
      if (typeof item.sku !== 'string' || item.sku === '') return 'cada item necesita sku';
      if (!Number.isInteger(item.qty) || item.qty < 1) return 'qty debe ser un entero mayor a 0';
      if (typeof item.price !== 'number' || item.price < 0) return 'price debe ser un número >= 0';
    }
    return null;
  }

  return http.createServer(async (req, res) => {
    const start = process.hrtime.bigint();
    const pathname = new URL(req.url, 'http://localhost').pathname;
    let routeName = 'unknown';

    res.on('finish', () => {
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      metrics.observeRequest(req.method, routeName, res.statusCode, seconds);
    });

    try {
      if (req.method === 'GET' && pathname === '/health') {
        routeName = '/health';
        return send(res, 200, { status: 'ok', env: APP_ENV, version: APP_VERSION });
      }

      if (req.method === 'GET' && pathname === '/metrics') {
        routeName = '/metrics';
        return send(res, 200, metrics.render(), 'text/plain; version=0.0.4');
      }

      if (pathname === '/orders') {
        routeName = '/orders';
        if (req.method === 'GET') return send(res, 200, [...orders.values()]);
        if (req.method === 'POST') {
          let body;
          try {
            body = await readJson(req);
          } catch (err) {
            return send(res, 400, { error: err.message });
          }
          const problem = validateOrder(body);
          if (problem) return send(res, 400, { error: problem });

          const total = body.items.reduce((sum, i) => sum + i.qty * i.price, 0);
          const order = {
            id: nextId++,
            customer: body.customer.trim(),
            items: body.items,
            total: Math.round(total * 100) / 100,
            status: 'creado',
          };
          orders.set(order.id, order);
          metrics.incOrdersCreated();
          return send(res, 201, order);
        }
      }

      const match = pathname.match(/^\/orders\/(\d+)$/);
      if (match && req.method === 'GET') {
        routeName = '/orders/:id';
        const order = orders.get(Number(match[1]));
        if (!order) return send(res, 404, { error: 'pedido no encontrado' });
        return send(res, 200, order);
      }

      return send(res, 404, { error: 'ruta no encontrada' });
    } catch (err) {
      console.error(JSON.stringify({ level: 'error', message: err.message }));
      return send(res, 500, { error: 'error interno' });
    }
  });
}

module.exports = { createApp };
