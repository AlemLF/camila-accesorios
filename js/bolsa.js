const STORAGE_KEY = 'camila_accesorios_bolsa_v1';

export function obtenerBolsa() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

export function guardarBolsa(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  actualizarContadorUI();
}

export function agregarProductoABolsa(producto, moneda = 'S/') {
  if (producto.estado === 'agotado') return;
  const bolsa = obtenerBolsa();
  const existente = bolsa.find((item) => item.id === producto.id);

  if (existente) {
    existente.cantidad += 1;
  } else {
    bolsa.push({
      id: producto.id,
      nombre: producto.nombre,
      precio: Number(producto.precio),
      es_desde: Boolean(producto.es_desde),
      moneda,
      cantidad: 1
    });
  }
  guardarBolsa(bolsa);
}

export function generarLinkWhatsApp(numero, mensajeBase, items) {
  const limpio = String(numero || '').replace(/\D/g, '');
  const lineas = items.map((i) => {
    const prefijo = i.es_desde ? 'Desde ' : '';
    return `• ${i.cantidad}x ${i.nombre} (${prefijo}${i.moneda} ${i.precio.toFixed(2)})`;
  });
  const texto = `${mensajeBase}\n\n${lineas.join('\n')}`;
  return `https://wa.me/${limpio}?text=${encodeURIComponent(texto)}`;
}

export function actualizarContadorUI() {
  const total = obtenerBolsa().reduce((acc, item) => acc + item.cantidad, 0);
  document.querySelectorAll('[data-contador-bolsa]').forEach((el) => {
    el.textContent = String(total);
  });
}