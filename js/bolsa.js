const STORAGE_KEY = 'camila_accesorios_bolsa_v1';

export function obtenerBolsa() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function guardarBolsa(items) {
  const normalizados = (Array.isArray(items) ? items : []).map((item) => ({
    id: item.id,
    nombre: String(item.nombre || 'Accesorio'),
    precio: Number(item.precio) || 0,
    es_desde: Boolean(item.es_desde),
    imagen: item.imagen || item.imagen_url || '',
    moneda: item.moneda || 'S/',
    cantidad: Math.max(1, Number(item.cantidad) || 1)
  }));

  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizados));
  actualizarContadorUI();
  window.dispatchEvent(new CustomEvent('bolsa-actualizada', { detail: normalizados }));
  return normalizados;
}

export function agregarProductoABolsa(producto, moneda = 'S/') {
  if (!producto) return obtenerBolsa();
  const estado = String(producto.estado || '').toLowerCase().trim();
  if (estado === 'agotado') return obtenerBolsa();

  const bolsa = obtenerBolsa();
  const existente = bolsa.find((item) => String(item.id) === String(producto.id));

  if (existente) {
    existente.cantidad = (Number(existente.cantidad) || 1) + 1;
    if (!existente.imagen && (producto.imagen || producto.imagen_url)) {
      existente.imagen = producto.imagen || producto.imagen_url;
    }
  } else {
    bolsa.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: Number(producto.precio) || 0,
      es_desde: Boolean(producto.es_desde || producto.mostrar_desde),
      imagen: producto.imagen || producto.imagen_url || '',
      moneda: producto.moneda || moneda || 'S/',
      cantidad: 1
    });
  }

  return guardarBolsa(bolsa);
}

export function actualizarCantidadItem(indice, delta) {
  const bolsa = obtenerBolsa();
  const item = bolsa[indice];
  if (!item) return bolsa;

  const nuevaCantidad = (Number(item.cantidad) || 1) + Number(delta || 0);
  if (nuevaCantidad <= 0) {
    bolsa.splice(indice, 1);
  } else {
    item.cantidad = nuevaCantidad;
  }

  return guardarBolsa(bolsa);
}

export function eliminarItemBolsa(indice) {
  const bolsa = obtenerBolsa();
  if (indice >= 0 && indice < bolsa.length) {
    bolsa.splice(indice, 1);
    return guardarBolsa(bolsa);
  }
  return bolsa;
}

export function vaciarBolsa() {
  return guardarBolsa([]);
}

export function calcularSubtotalBolsa(items = obtenerBolsa()) {
  return items.reduce((acc, item) => {
    const cant = Number(item.cantidad) || 1;
    const precio = Number(item.precio) || 0;
    return acc + cant * precio;
  }, 0);
}

export function generarLinkWhatsApp(numero, mensajeBase, items = obtenerBolsa(), monedaPorDefecto = 'S/') {
  const limpio = String(numero || '').replace(/\D/g, '') || '51900000000';
  const base = (mensajeBase || 'Hola Camila Accesorios, deseo realizar el siguiente pedido:').trim();
  const moneda = items[0]?.moneda || monedaPorDefecto || 'S/';

  const lineas = items.map((i) => {
    const cant = Number(i.cantidad) || 1;
    const precio = Number(i.precio) || 0;
    const mon = i.moneda || moneda;
    const prefijo = i.es_desde ? 'Desde ' : '';
    return `• ${cant}x ${i.nombre} (${prefijo}${mon} ${(precio * cant).toFixed(2)})`;
  });

  const total = calcularSubtotalBolsa(items);
  const texto = `${base}\n\n${lineas.join('\n')}\n\nTotal estimado: ${mon} ${total.toFixed(2)}`;
  return `https://wa.me/${limpio}?text=${encodeURIComponent(texto)}`;
}

export function actualizarContadorUI() {
  const total = obtenerBolsa().reduce((acc, item) => acc + (Number(item.cantidad) || 1), 0);
  document.querySelectorAll('[data-contador-bolsa], #contador-bolsa').forEach((el) => {
    el.textContent = String(total);
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', actualizarContadorUI);
}
```[cite: 7, 8]

Si quieres que también actualice `js/catalogo.js` para que importe directamente estas funciones de `./bolsa.js` en lugar de repetir su propia lógica de bolsa, avísame y te lo dejo listo.