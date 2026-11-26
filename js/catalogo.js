import { supabase } from './supabase.js';
import { agregarProductoABolsa, actualizarContadorUI } from './bolsa.js';

let configSitio = {
  nombre_marca: 'Camila Accesorios',
  lema: 'Accesorios y detalles seleccionados con atención por WhatsApp',
  whatsapp_numero: '51900000000',
  mensaje_base_wa: 'Hola Camila Accesorios! Quisiera realizar el siguiente pedido:',
  moneda_simbolo: 'S/'
};
let productosCache = [];

document.addEventListener('DOMContentLoaded', async () => {
  actualizarContadorUI();
  await cargarConfiguracion();
  await Promise.all([
    cargarCategorias(),
    cargarProductos(),
    cargarFAQ(),
    cargarResenasAprobadas(),
    cargarCapturas(),
    configurarFormularioResena()
  ]);
});

async function cargarConfiguracion() {
  const { data } = await supabase.from('configuracion_sitio').select('*').eq('id', 1).single();
  if (data) configSitio = { ...configSitio, ...data };

  document.querySelectorAll('[data-marca-nombre]').forEach((el) => {
    el.textContent = configSitio.nombre_marca;
  });
  document.querySelectorAll('[data-marca-lema]').forEach((el) => {
    el.textContent = configSitio.lema || '';
  });
}

async function cargarCategorias() {
  const { data } = await supabase.from('categorias').select('*').eq('activa', true).order('orden');
  const contenedor = document.getElementById('filtro-categorias');
  if (!contenedor || !data) return;

  contenedor.innerHTML = `<button data-cat="todas" class="active">Todos</button>` +
    data.map((c) => `<button data-cat="${c.id}">${c.nombre}</button>`).join('');

  contenedor.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      contenedor.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderProductos(btn.dataset.cat);
    });
  });
}

async function cargarProductos() {
  const { data } = await supabase
    .from('productos')
    .select('*, categorias(nombre)')
    .order('orden', { ascending: true })
    .order('id', { ascending: false });

  productosCache = data || [];
  renderProductos('todas');
}

function renderProductos(categoriaId) {
  const grid = document.getElementById('grid-productos');
  const buscador = (document.getElementById('buscar-producto')?.value || '').trim().toLowerCase();
  if (!grid) return;

  const filtrados = productosCache.filter((p) => {
    const pasaCat = categoriaId === 'todas' || String(p.categoria_id) === String(categoriaId);
    const pasaTexto = !buscador ||
      p.nombre.toLowerCase().includes(buscador) ||
      (p.descripcion || '').toLowerCase().includes(buscador);
    return pasaCat && pasaTexto;
  });

  grid.innerHTML = filtrados.map((p) => {
    const precioTxt = `${p.es_desde ? 'Desde ' : ''}${configSitio.moneda_simbolo} ${Number(p.precio).toFixed(2)}`;
    const agotado = p.estado === 'agotado';
    return `
      <article class="card-producto ${agotado ? 'agotado' : ''}">
        <img src="${p.imagen_url || 'imagenes/placeholder.jpg'}" alt="${p.nombre}" loading="lazy" />
        <span class="badge-estado">${agotado ? 'Agotado' : 'Disponible'}</span>
        <h3>${p.nombre}</h3>
        <p class="precio">${precioTxt}</p>
        <p class="desc">${p.descripcion || ''}</p>
        <button ${agotado ? 'disabled' : ''} data-add-id="${p.id}">
          ${agotado ? 'Producto agotado' : 'Agregar al pedido'}
        </button>
      </article>
    `;
  }).join('');

  grid.querySelectorAll('[data-add-id]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const prod = productosCache.find((item) => String(item.id) === btn.dataset.addId);
      if (prod) agregarProductoABolsa(prod, configSitio.moneda_simbolo);
    });
  });
}

async function cargarFAQ() {
  const { data } = await supabase.from('preguntas_frecuentes').select('*').eq('activa', true).order('orden');
  const cont = document.getElementById('lista-faq');
  if (!cont || !data) return;
  cont.innerHTML = data.map((f) => `
    <details>
      <summary>${f.pregunta}</summary>
      <p>${f.respuesta}</p>
    </details>
  `).join('');
}

async function cargarResenasAprobadas() {
  const { data } = await supabase
    .from('resenas')
    .select('*')
    .eq('estado', 'aprobado')
    .order('orden', { ascending: true })
    .order('creado_en', { ascending: false });

  const cont = document.getElementById('lista-resenas');
  if (!cont || !data) return;
  cont.innerHTML = data.map((r) => `
    <div class="resena-card">
      <div class="estrellas">${'★'.repeat(r.calificacion)}${'☆'.repeat(5 - r.calificacion)}</div>
      <p>“${r.comentario}”</p>
      <strong>${r.autor_visible}</strong>
    </div>
  `).join('');
}

async function cargarCapturas() {
  const { data } = await supabase.from('capturas_whatsapp').select('*').eq('activa', true).order('orden');
  const cont = document.getElementById('galeria-capturas');
  if (!cont || !data) return;
  cont.innerHTML = data.map((c) => `
    <figure class="captura-item">
      <img src="${c.imagen_url}" alt="${c.descripcion || 'Mensaje de clienta'}" loading="lazy" />
      ${c.descripcion ? `<figcaption>${c.descripcion}</figcaption>` : ''}
    </figure>
  `).join('');
}

function configurarFormularioResena() {
  const form = document.getElementById('form-resena');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const autor_visible = form.autor.value.trim();
    const comentario = form.comentario.value.trim();
    const calificacion = Number(form.calificacion.value);

    const { error } = await supabase.from('resenas').insert([
      { autor_visible, comentario, calificacion, estado: 'pendiente' }
    ]);

    if (!error) {
      form.reset();
      alert('¡Gracias! Tu opinión se envió y quedará visible una vez aprobada.');
    }
  });
}