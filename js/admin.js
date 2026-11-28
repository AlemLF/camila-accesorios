import { supabase } from './supabase.js';
import { requerirSesionActiva, logout } from './auth.js';

const BUCKET_MEDIA = 'camila-media';

let perfilActual = null;
let categoriasCache = [];
let productosCache = [];
let faqCache = [];
let resenasCache = [];
let capturasCache = [];
let usuariosCache = [];

document.addEventListener('DOMContentLoaded', async () => {
  registrarEventosPestanas();

  perfilActual = await requerirSesionActiva();
  if (!perfilActual) return;

  const infoUsuario = document.getElementById('info-usuario-activo');
  if (infoUsuario) {
    infoUsuario.textContent = `${perfilActual.nombre} (${perfilActual.email}) · Rol: ${perfilActual.rol}`;
  }

  const tabUsuarios = document.getElementById('tab-usuarios');
  if (tabUsuarios && perfilActual.rol !== 'admin') {
    tabUsuarios.style.display = 'none';
  }

  document.getElementById('btn-logout')?.addEventListener('click', logout);

  registrarEventosFormularios();
  await cargarTodo();
});

// ==========================================
// NAVEGACIÓN POR PESTAÑAS DEL PANEL
// ==========================================
function resolverPanelPestana(targetId) {
  if (!targetId) return null;
  return (
    document.getElementById(targetId) ||
    document.querySelector(`[data-panel="${targetId}"]`) ||
    document.querySelector(`.tab-panel[data-tab="${targetId}"]`)
  );
}

function activarPestana(targetId) {
  const botones = document.querySelectorAll('.tab-btn[data-tab]');
  if (!botones.length) return;

  const paneles = Array.from(botones)
    .map((b) => resolverPanelPestana(b.dataset.tab))
    .filter(Boolean);

  botones.forEach((btn) => {
    const esActiva = btn.dataset.tab === targetId;
    btn.classList.toggle('active', esActiva);
    btn.setAttribute('aria-selected', String(esActiva));
  });

  paneles.forEach((panel) => {
    const coincide =
      panel.id === targetId ||
      panel.dataset.panel === targetId ||
      panel.dataset.tab === targetId;
    panel.classList.toggle('active', coincide);
    panel.hidden = !coincide;
  });
}

function registrarEventosPestanas() {
  const botones = document.querySelectorAll('.tab-btn[data-tab]');
  if (!botones.length) return;

  botones.forEach((btn) => {
    btn.addEventListener('click', () => {
      activarPestana(btn.dataset.tab);
    });
  });

  const inicial =
    document.querySelector('.tab-btn.active[data-tab]')?.dataset.tab ||
    botones[0].dataset.tab;
  activarPestana(inicial);
}

async function cargarTodo() {
  await Promise.all([
    cargarCategorias(),
    cargarProductos(),
    cargarFAQ(),
    cargarResenas(),
    cargarCapturas(),
    cargarConfiguracion(),
    perfilActual.rol === 'admin' ? cargarUsuarios() : Promise.resolve()
  ]);
}

function escapeHtml(texto = '') {
  return String(texto)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function generarSlug(texto = '') {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ==========================================
// SUBIDA DE IMÁGENES A SUPABASE STORAGE
// ==========================================
export async function subirImagenMedia(file, carpeta = 'productos') {
  if (!file) return null;

  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!tiposPermitidos.includes(file.type)) {
    throw new Error('Solo se permiten imágenes JPG, PNG, WEBP o GIF.');
  }

  const maxBytes = 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error('La imagen no debe superar los 5 MB.');
  }

  const extension = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const nombreArchivo = `${carpeta}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_MEDIA)
    .upload(nombreArchivo, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from(BUCKET_MEDIA).getPublicUrl(nombreArchivo);
  return data.publicUrl;
}

// ==========================================
// 1. PRODUCTOS
// ==========================================
async function cargarProductos() {
  const { data, error } = await supabase
    .from('productos')
    .select('*, categorias(nombre)')
    .order('orden', { ascending: true })
    .order('id', { ascending: false });

  if (error) {
    console.error('Error cargando productos:', error);
    return;
  }

  productosCache = data || [];
  renderTablaProductos();
}

function renderTablaProductos() {
  const tbody = document.getElementById('tbody-productos');
  if (!tbody) return;

  if (!productosCache.length) {
    tbody.innerHTML = '<tr><td colspan="6">No hay productos registrados.</td></tr>';
    return;
  }

  tbody.innerHTML = productosCache.map((p) => {
    const precioFmt = `${p.es_desde ? 'Desde ' : ''}${Number(p.precio).toFixed(2)}`;
    const catNombre = p.categorias?.nombre || p.categoria || 'Sin categoría';
    return `
      <tr>
        <td>
          ${p.imagen_url
            ? `<img src="${escapeHtml(p.imagen_url)}" alt="${escapeHtml(p.nombre)}" />`
            : '<span>—</span>'}
        </td>
        <td>
          <strong>${escapeHtml(p.nombre)}</strong>
          ${p.destacado ? '<br><small>★ Destacado</small>' : ''}
        </td>
        <td>${escapeHtml(catNombre)}</td>
        <td>${precioFmt}</td>
        <td>${p.estado === 'agotado' ? 'Agotado' : 'Disponible'}</td>
        <td>
          <button type="button" class="btn btn-outline btn-sm" data-edit-prod="${p.id}">Editar</button>
          <button type="button" class="btn btn-danger btn-sm" data-del-prod="${p.id}">Eliminar</button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-edit-prod]').forEach((btn) => {
    btn.addEventListener('click', () => editarProducto(Number(btn.dataset.editProd)));
  });

  tbody.querySelectorAll('[data-del-prod]').forEach((btn) => {
    btn.addEventListener('click', () => eliminarProducto(Number(btn.dataset.delProd)));
  });
}

function editarProducto(id) {
  const prod = productosCache.find((item) => item.id === id);
  if (!prod) return;

  const tituloEl = document.getElementById('titulo-form-producto');
  if (tituloEl) tituloEl.textContent = 'Editar producto';

  document.getElementById('prod-id').value = prod.id;
  document.getElementById('prod-nombre').value = prod.nombre || '';
  document.getElementById('prod-categoria').value = prod.categoria_id || '';
  document.getElementById('prod-precio').value = prod.precio ?? 0;
  document.getElementById('prod-estado').value = prod.estado || 'disponible';
  document.getElementById('prod-orden').value = prod.orden ?? 0;
  document.getElementById('prod-es-desde').checked = Boolean(prod.es_desde);
  document.getElementById('prod-destacado').checked = Boolean(prod.destacado);
  document.getElementById('prod-descripcion').value = prod.descripcion || '';
  document.getElementById('prod-imagen-url').value = prod.imagen_url || '';
  document.getElementById('prod-archivo').value = '';

  const colorInput = document.getElementById('prod-color');
  if (colorInput) colorInput.value = prod.color || '';

  activarPestana('sec-productos');
}

function resetFormProducto() {
  const tituloEl = document.getElementById('titulo-form-producto');
  if (tituloEl) tituloEl.textContent = 'Agregar producto';
  document.getElementById('form-producto')?.reset();
  document.getElementById('prod-id').value = '';
}

async function eliminarProducto(id) {
  if (!confirm('¿Seguro que deseas eliminar este producto?')) return;
  const { error } = await supabase.from('productos').delete().eq('id', id);
  if (error) {
    alert('Error al eliminar producto: ' + error.message);
    return;
  }
  await cargarProductos();
}

// ==========================================
// 2. CATEGORÍAS
// ==========================================
async function cargarCategorias() {
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('orden', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    console.error('Error cargando categorías:', error);
    return;
  }

  categoriasCache = data || [];
  poblarSelectCategorias();
  renderTablaCategorias();
}

function poblarSelectCategorias() {
  const select = document.getElementById('prod-categoria');
  if (!select) return;

  select.innerHTML = `<option value="">Sin categoría</option>` +
    categoriasCache.map((c) => `<option value="${c.id}">${escapeHtml(c.nombre)}</option>`).join('');
}

function renderTablaCategorias() {
  const tbody = document.getElementById('tbody-categorias');
  if (!tbody) return;

  if (!categoriasCache.length) {
    tbody.innerHTML = '<tr><td colspan="5">No hay categorías registradas.</td></tr>';
    return;
  }

  tbody.innerHTML = categoriasCache.map((c) => `
    <tr>
      <td>${escapeHtml(c.nombre)}</td>
      <td><code>${escapeHtml(c.slug)}</code></td>
      <td>${c.orden}</td>
      <td>${c.activa ? 'Activa' : 'Inactiva'}</td>
      <td>
        <button type="button" class="btn btn-outline btn-sm" data-edit-cat="${c.id}">Editar</button>
        <button type="button" class="btn btn-danger btn-sm" data-del-cat="${c.id}">Eliminar</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-edit-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = categoriasCache.find((item) => item.id === Number(btn.dataset.editCat));
      if (!cat) return;
      document.getElementById('cat-id').value = cat.id;
      document.getElementById('cat-nombre').value = cat.nombre;
      document.getElementById('cat-slug').value = cat.slug;
      document.getElementById('cat-orden').value = cat.orden;
      document.getElementById('cat-activa').value = String(cat.activa);
    });
  });

  tbody.querySelectorAll('[data-del-cat]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar esta categoría?')) return;
      const { error } = await supabase.from('categorias').delete().eq('id', Number(btn.dataset.delCat));
      if (error) {
        alert('Error al eliminar categoría: ' + error.message);
        return;
      }
      await cargarCategorias();
    });
  });
}

// ==========================================
// 3. PREGUNTAS FRECUENTES (FAQ)
// ==========================================
async function cargarFAQ() {
  const { data, error } = await supabase
    .from('preguntas_frecuentes')
    .select('*')
    .order('orden', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    console.error('Error cargando FAQ:', error);
    return;
  }

  faqCache = data || [];
  renderTablaFAQ();
}

function renderTablaFAQ() {
  const tbody = document.getElementById('tbody-faq');
  if (!tbody) return;

  if (!faqCache.length) {
    tbody.innerHTML = '<tr><td colspan="4">No hay preguntas registradas.</td></tr>';
    return;
  }

  tbody.innerHTML = faqCache.map((f) => `
    <tr>
      <td>
        <strong>${escapeHtml(f.pregunta)}</strong><br>
        <small>${escapeHtml(f.respuesta)}</small>
      </td>
      <td>${f.orden}</td>
      <td>${f.activa ? 'Activa' : 'Inactiva'}</td>
      <td>
        <button type="button" class="btn btn-outline btn-sm" data-edit-faq="${f.id}">Editar</button>
        <button type="button" class="btn btn-danger btn-sm" data-del-faq="${f.id}">Eliminar</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-edit-faq]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = faqCache.find((f) => f.id === Number(btn.dataset.editFaq));
      if (!item) return;
      document.getElementById('faq-id').value = item.id;
      document.getElementById('faq-pregunta').value = item.pregunta;
      document.getElementById('faq-respuesta').value = item.respuesta;
      document.getElementById('faq-orden').value = item.orden;
      document.getElementById('faq-activa').value = String(item.activa);
    });
  });

  tbody.querySelectorAll('[data-del-faq]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar esta pregunta frecuente?')) return;
      const { error } = await supabase.from('preguntas_frecuentes').delete().eq('id', Number(btn.dataset.delFaq));
      if (error) {
        alert('Error al eliminar FAQ: ' + error.message);
        return;
      }
      await cargarFAQ();
    });
  });
}

// ==========================================
// 4. CLIENTAS FELICES (RESEÑAS)
// ==========================================
async function cargarResenas() {
  const { data, error } = await supabase
    .from('resenas')
    .select('*')
    .order('creado_en', { ascending: false });

  if (error) {
    console.error('Error cargando reseñas:', error);
    return;
  }

  resenasCache = data || [];
  renderTablaResenas();
}

function renderTablaResenas() {
  const tbody = document.getElementById('tbody-resenas');
  const filtro = document.getElementById('filtro-estado-resenas')?.value || 'todos';
  if (!tbody) return;

  const filtradas = resenasCache.filter((r) => filtro === 'todos' || r.estado === filtro);

  if (!filtradas.length) {
    tbody.innerHTML = '<tr><td colspan="5">No hay comentarios en este estado.</td></tr>';
    return;
  }

  tbody.innerHTML = filtradas.map((r) => `
    <tr>
      <td><strong>${escapeHtml(r.autor_visible)}</strong></td>
      <td>${escapeHtml(r.comentario)}</td>
      <td>${'★'.repeat(r.calificacion)} (${r.calificacion})</td>
      <td><strong>${escapeHtml(r.estado)}</strong></td>
      <td>
        <button type="button" class="btn btn-primary btn-sm" data-estado-resena="${r.id}" data-nuevo-estado="aprobado">Aprobar</button>
        <button type="button" class="btn btn-outline btn-sm" data-estado-resena="${r.id}" data-nuevo-estado="rechazado">Rechazar</button>
        <button type="button" class="btn btn-danger btn-sm" data-del-resena="${r.id}">Eliminar</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-estado-resena]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = Number(btn.dataset.estadoResena);
      const estado = btn.dataset.nuevoEstado;
      const { error } = await supabase.from('resenas').update({ estado }).eq('id', id);
      if (error) {
        alert('Error al actualizar reseña: ' + error.message);
        return;
      }
      await cargarResenas();
    });
  });

  tbody.querySelectorAll('[data-del-resena]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este comentario definitivamente?')) return;
      const { error } = await supabase.from('resenas').delete().eq('id', Number(btn.dataset.delResena));
      if (error) {
        alert('Error al eliminar comentario: ' + error.message);
        return;
      }
      await cargarResenas();
    });
  });
}

// ==========================================
// 5. CAPTURAS DE WHATSAPP
// ==========================================
async function cargarCapturas() {
  const { data, error } = await supabase
    .from('capturas_whatsapp')
    .select('*')
    .order('orden', { ascending: true })
    .order('id', { ascending: false });

  if (error) {
    console.error('Error cargando capturas:', error);
    return;
  }

  capturasCache = data || [];
  renderAdminCapturas();
}

function renderAdminCapturas() {
  const grid = document.getElementById('grid-admin-capturas');
  if (!grid) return;

  if (!capturasCache.length) {
    grid.innerHTML = '<p class="texto-suave">No hay capturas registradas.</p>';
    return;
  }

  grid.innerHTML = capturasCache.map((c) => `
    <div class="captura-item">
      <img src="${escapeHtml(c.imagen_url)}" alt="${escapeHtml(c.descripcion || 'Captura')}" />
      <p>${escapeHtml(c.descripcion || 'Sin descripción')}</p>
      <small>Orden: ${c.orden} · ${c.activa ? 'Activa' : 'Inactiva'}</small>
      <div class="form-actions">
        <button type="button" class="btn btn-outline btn-sm" data-edit-cap="${c.id}">Editar</button>
        <button type="button" class="btn btn-danger btn-sm" data-del-cap="${c.id}">Eliminar</button>
      </div>
    </div>
  `).join('');

  grid.querySelectorAll('[data-edit-cap]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cap = capturasCache.find((item) => item.id === Number(btn.dataset.editCap));
      if (!cap) return;
      document.getElementById('cap-id').value = cap.id;
      document.getElementById('cap-url').value = cap.imagen_url || '';
      document.getElementById('cap-descripcion').value = cap.descripcion || '';
      document.getElementById('cap-orden').value = cap.orden ?? 0;
      document.getElementById('cap-activa').value = String(cap.activa);
      document.getElementById('cap-archivo').value = '';
    });
  });

  grid.querySelectorAll('[data-del-cap]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar esta captura?')) return;
      const { error } = await supabase.from('capturas_whatsapp').delete().eq('id', Number(btn.dataset.delCap));
      if (error) {
        alert('Error al eliminar captura: ' + error.message);
        return;
      }
      await cargarCapturas();
    });
  });
}

// ==========================================
// 6. CONFIGURACIÓN DEL SITIO
// ==========================================
async function cargarConfiguracion() {
  const { data, error } = await supabase
    .from('configuracion_sitio')
    .select('*')
    .eq('id', 1)
    .single();

  if (error || !data) return;

  document.getElementById('cfg-marca').value = data.nombre_marca || 'Camila Accesorios';
  document.getElementById('cfg-lema').value = data.lema || '';
  document.getElementById('cfg-wa').value = data.whatsapp_numero || '';
  document.getElementById('cfg-moneda').value = data.moneda_simbolo || 'S/';
  document.getElementById('cfg-mensaje-wa').value = data.mensaje_base_wa || '';
  document.getElementById('cfg-fb').value = data.url_facebook || '';
  document.getElementById('cfg-ig').value = data.url_instagram || '';
  document.getElementById('cfg-tt').value = data.url_tiktok || '';
}

// ==========================================
// 7. USUARIOS Y ROLES (SOLO ADMIN)
// ==========================================
async function cargarUsuarios() {
  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .order('creado_en', { ascending: true });

  if (error) {
    console.error('Error cargando usuarios:', error);
    return;
  }

  usuariosCache = data || [];
  renderTablaUsuarios();
}

function renderTablaUsuarios() {
  const tbody = document.getElementById('tbody-usuarios');
  if (!tbody) return;

  tbody.innerHTML = usuariosCache.map((u) => `
    <tr>
      <td>${escapeHtml(u.nombre)}</td>
      <td>${escapeHtml(u.email)}</td>
      <td>
        <select data-rol-usuario="${u.id}">
          <option value="editor" ${u.rol === 'editor' ? 'selected' : ''}>editor</option>
          <option value="admin" ${u.rol === 'admin' ? 'selected' : ''}>admin</option>
        </select>
      </td>
      <td>
        <select data-activo-usuario="${u.id}">
          <option value="true" ${u.activo ? 'selected' : ''}>Activo</option>
          <option value="false" ${!u.activo ? 'selected' : ''}>Inactivo</option>
        </select>
      </td>
      <td>
        <button type="button" class="btn btn-primary btn-sm" data-guardar-usuario="${u.id}">Guardar</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-guardar-usuario]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.guardarUsuario;
      const rol = tbody.querySelector(`[data-rol-usuario="${id}"]`).value;
      const activo = tbody.querySelector(`[data-activo-usuario="${id}"]`).value === 'true';

      const { error } = await supabase
        .from('perfiles')
        .update({ rol, activo })
        .eq('id', id);

      if (error) {
        alert('Error al actualizar usuario: ' + error.message);
        return;
      }
      alert('Usuario actualizado correctamente.');
      await cargarUsuarios();
    });
  });
}

// ==========================================
// REGISTRO DE EVENTOS DE FORMULARIOS
// ==========================================
function registrarEventosFormularios() {
  const inputCatNombre = document.getElementById('cat-nombre');
  const inputCatSlug = document.getElementById('cat-slug');
  inputCatNombre?.addEventListener('input', () => {
    if (!document.getElementById('cat-id').value) {
      inputCatSlug.value = generarSlug(inputCatNombre.value);
    }
  });

  // Submit producto
  document.getElementById('form-producto')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const id = document.getElementById('prod-id').value;
      const archivo = document.getElementById('prod-archivo').files[0];
      let imagen_url = document.getElementById('prod-imagen-url').value.trim() || null;

      if (archivo) {
        imagen_url = await subirImagenMedia(archivo, 'productos');
      }

      const categoriaRaw = document.getElementById('prod-categoria').value;
      const esDesde = document.getElementById('prod-es-desde').checked;
      const destacado = document.getElementById('prod-destacado').checked;
      const colorVal = document.getElementById('prod-color')?.value.trim() || null;

      const payload = {
        nombre: document.getElementById('prod-nombre').value.trim(),
        categoria_id: categoriaRaw ? Number(categoriaRaw) : null,
        precio: Number(document.getElementById('prod-precio').value || 0),
        estado: document.getElementById('prod-estado').value,
        orden: Number(document.getElementById('prod-orden').value || 0),
        es_desde: esDesde,
        mostrar_desde: esDesde,
        destacado,
        novedad: destacado,
        es_novedad: destacado,
        color: colorVal,
        descripcion: document.getElementById('prod-descripcion').value.trim() || null,
        imagen_url
      };

      const { error } = id
        ? await supabase.from('productos').update(payload).eq('id', Number(id))
        : await supabase.from('productos').insert([payload]);

      if (error) throw error;

      resetFormProducto();
      await cargarProductos();
      alert('Producto guardado correctamente.');
    } catch (err) {
      alert('Error al guardar producto: ' + err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });

  document.getElementById('btn-cancelar-prod')?.addEventListener('click', resetFormProducto);

  // Submit categoría
  document.getElementById('form-categoria')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('cat-id').value;
    const nombre = document.getElementById('cat-nombre').value.trim();
    const slug = generarSlug(document.getElementById('cat-slug').value.trim() || nombre);
    const payload = {
      nombre,
      slug,
      orden: Number(document.getElementById('cat-orden').value || 0),
      activa: document.getElementById('cat-activa').value === 'true'
    };

    const { error } = id
      ? await supabase.from('categorias').update(payload).eq('id', Number(id))
      : await supabase.from('categorias').insert([payload]);

    if (error) {
      alert('Error al guardar categoría: ' + error.message);
      return;
    }

    e.target.reset();
    document.getElementById('cat-id').value = '';
    await cargarCategorias();
    alert('Categoría guardada.');
  });

  document.getElementById('btn-cancelar-cat')?.addEventListener('click', () => {
    document.getElementById('form-categoria')?.reset();
    document.getElementById('cat-id').value = '';
  });

  // Submit FAQ
  document.getElementById('form-faq')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('faq-id').value;
    const payload = {
      pregunta: document.getElementById('faq-pregunta').value.trim(),
      respuesta: document.getElementById('faq-respuesta').value.trim(),
      orden: Number(document.getElementById('faq-orden').value || 0),
      activa: document.getElementById('faq-activa').value === 'true'
    };

    const { error } = id
      ? await supabase.from('preguntas_frecuentes').update(payload).eq('id', Number(id))
      : await supabase.from('preguntas_frecuentes').insert([payload]);

    if (error) {
      alert('Error al guardar pregunta: ' + error.message);
      return;
    }

    e.target.reset();
    document.getElementById('faq-id').value = '';
    await cargarFAQ();
    alert('Pregunta frecuente guardada.');
  });

  document.getElementById('btn-cancelar-faq')?.addEventListener('click', () => {
    document.getElementById('form-faq')?.reset();
    document.getElementById('faq-id').value = '';
  });

  // Filtro estado reseñas
  document.getElementById('filtro-estado-resenas')?.addEventListener('change', renderTablaResenas);

  // Submit captura
  document.getElementById('form-captura')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const id = document.getElementById('cap-id').value;
      const archivo = document.getElementById('cap-archivo').files[0];
      let imagen_url = document.getElementById('cap-url').value.trim() || null;

      if (archivo) {
        imagen_url = await subirImagenMedia(archivo, 'capturas');
      }

      if (!imagen_url) {
        throw new Error('Debes subir una imagen o indicar una URL.');
      }

      const payload = {
        imagen_url,
        descripcion: document.getElementById('cap-descripcion').value.trim() || null,
        orden: Number(document.getElementById('cap-orden').value || 0),
        activa: document.getElementById('cap-activa').value === 'true'
      };

      const { error } = id
        ? await supabase.from('capturas_whatsapp').update(payload).eq('id', Number(id))
        : await supabase.from('capturas_whatsapp').insert([payload]);

      if (error) throw error;

      e.target.reset();
      document.getElementById('cap-id').value = '';
      await cargarCapturas();
      alert('Captura guardada.');
    } catch (err) {
      alert('Error al guardar captura: ' + err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });

  document.getElementById('btn-cancelar-cap')?.addEventListener('click', () => {
    document.getElementById('form-captura')?.reset();
    document.getElementById('cap-id').value = '';
  });

  // Submit configuración
  document.getElementById('form-config')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      nombre_marca: document.getElementById('cfg-marca').value.trim(),
      lema: document.getElementById('cfg-lema').value.trim() || null,
      whatsapp_numero: document.getElementById('cfg-wa').value.trim(),
      moneda_simbolo: document.getElementById('cfg-moneda').value.trim() || 'S/',
      mensaje_base_wa: document.getElementById('cfg-mensaje-wa').value.trim() || null,
      url_facebook: document.getElementById('cfg-fb').value.trim() || null,
      url_instagram: document.getElementById('cfg-ig').value.trim() || null,
      url_tiktok: document.getElementById('cfg-tt').value.trim() || null,
      actualizado_en: new Date().toISOString()
    };

    const { error } = await supabase
      .from('configuracion_sitio')
      .update(payload)
      .eq('id', 1);

    if (error) {
      alert('Error al guardar configuración: ' + error.message);
      return;
    }
    alert('Configuración actualizada.');
  });
}
