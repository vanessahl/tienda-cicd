'use strict';
// Métricas en formato Prometheus, sin dependencias externas.

const BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5];
const startedAt = Date.now();
const requests = new Map(); // "METODO|ruta|estatus" -> contador
const latency = new Map();  // ruta -> { counts, sum, count }
let ordersCreated = 0;

function observeRequest(method, route, status, seconds) {
  const key = `${method}|${route}|${status}`;
  requests.set(key, (requests.get(key) || 0) + 1);

  let h = latency.get(route);
  if (!h) {
    h = { counts: BUCKETS.map(() => 0), sum: 0, count: 0 };
    latency.set(route, h);
  }
  BUCKETS.forEach((b, i) => {
    if (seconds <= b) h.counts[i] += 1;
  });
  h.sum += seconds;
  h.count += 1;
}

function incOrdersCreated() {
  ordersCreated += 1;
}

function render() {
  const out = [];

  out.push('# HELP http_requests_total Total de peticiones HTTP recibidas.');
  out.push('# TYPE http_requests_total counter');
  for (const [key, value] of requests) {
    const [method, route, status] = key.split('|');
    out.push(`http_requests_total{method="${method}",route="${route}",status="${status}"} ${value}`);
  }

  out.push('# HELP http_request_duration_seconds Duración de las peticiones HTTP en segundos.');
  out.push('# TYPE http_request_duration_seconds histogram');
  for (const [route, h] of latency) {
    BUCKETS.forEach((b, i) => {
      out.push(`http_request_duration_seconds_bucket{route="${route}",le="${b}"} ${h.counts[i]}`);
    });
    out.push(`http_request_duration_seconds_bucket{route="${route}",le="+Inf"} ${h.count}`);
    out.push(`http_request_duration_seconds_sum{route="${route}"} ${h.sum}`);
    out.push(`http_request_duration_seconds_count{route="${route}"} ${h.count}`);
  }

  out.push('# HELP orders_created_total Pedidos creados correctamente.');
  out.push('# TYPE orders_created_total counter');
  out.push(`orders_created_total ${ordersCreated}`);

  out.push('# HELP app_uptime_seconds Segundos que lleva encendida la aplicación.');
  out.push('# TYPE app_uptime_seconds gauge');
  out.push(`app_uptime_seconds ${Math.floor((Date.now() - startedAt) / 1000)}`);

  out.push('# HELP process_resident_memory_bytes Memoria residente del proceso.');
  out.push('# TYPE process_resident_memory_bytes gauge');
  out.push(`process_resident_memory_bytes ${process.memoryUsage().rss}`);

  return out.join('\n') + '\n';
}

module.exports = { observeRequest, incOrdersCreated, render };
