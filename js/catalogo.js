import { supabase } from './supabase.js';

const state = {
  productos: [],
  categorias: [],
  categoriaActiva: 'todas',
  precioMax: 100,
  colorActivo: 'todos',
  busqueda: '',
  orden: 'recientes',
  soloNovedades: false,
  moneda: 'S/',
  whatsapp: '',
  productoSeleccionado: null
};

const els = {
  grid: document.getElementById('grid-productos'),
  listaCategorias: document.getElementById('lista-categorias'),
  countTodas: document.getElementById('count-todas'),
  contadorResultados: document.getElementById('contador-resultados'),
  rangoPrecio: document.getElementById('filtro-precio-max'),
  valorPrecio: document.getElementById('valor-precio-max'),
  selectColor: document.getElementById('filtro-color'),
  btnLimpiar: document.getElementById('btn-limpiar-filtros'),
  inputBuscar: document.getElementById('buscar-producto'),
  selectOrden: document.getElementById('ordenar-productos'),
  navNovedades: document.getElementById('nav-novedades'),
  modalDetalle: document.getElementById('modal-detalle'),
  cerrarDetalle: document.getElementById('cerrar-detalle'),
  detalleImg: document.getElementById('detalle-imagen'),
  detalleCat: document.getElementById('detalle-categoria'),
  detalleTitulo: document.getElementById('detalle-titulo'),
  detallePrecio: document.getElementById('detalle-precio'),
  detalleDesc: document.getElementById('detalle-descripcion'),
  detalleAgregar: document.getElementById('detalle-agregar-bolsa')
};

function formatearPrecio(monto) {
  const num = Number(monto) || 0;
  return `${state.moneda} ${num.toFixed(2)}`;
}

async function cargarConfiguracion() {
  try {
    const { data, error } = await supabase
      .from('configuracion')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error || !data) return;

    if (data.moneda) state.moneda = data.moneda;
    if (data.whatsapp) {
      state.whatsapp = data.whatsapp.replace(/\D/g, '');
      const urlWa = `https://wa.me/${state.whatsapp}?text=${encodeURIComponent('Hola, deseo consultar sobre sus accesorios.')}`;
      const topWa = document.getElementById('topbar-whatsapp-link');
      const footWa = document.getElementById('footer-whatsapp');
      if (topWa) topWa.href = urlWa;
      if (footWa) footWa.href = urlWa;
    }
    if (data.nombre_negocio) {
      document.title = `${data.nombre_negocio} — Catálogo`;
      const brandEl = document.getElementById('brand-name');
      const footMarca = document.getElementById('footer-marca');
      if (brandEl) brandEl.textContent = data.nombre_negocio;
      if (footMarca) footMarca.textContent = data.nombre_negocio;
    }
    if (data.hero_titulo) {
      const heroTitle = document.getElementById('hero-titulo');
      if (heroTitle) heroTitle.textContent = data.hero_titulo;
    }
    if (data.hero_subtitulo) {
      const heroSub = document.getElementById('hero-subtitulo');
      if (heroSub) heroSub.textContent = data.hero_subtitulo;
    }
    if (data.hero_imagen) {
      const heroImg = document.getElementById('hero-imagen');
      if (heroImg) heroImg.src = data.hero_imagen;
    }
    if (data.instagram) {
      const ig = document.getElementById('footer-instagram');
      if (ig) ig.href = data.instagram;
    }
    if (data.facebook) {
      const fb = document.getElementById('footer-facebook');
      if (fb) fb.href = data.facebook;
    }
  } catch (_) {
    // Continúa con valores por defecto
  }
}

async function cargarDatos() {
  await cargarConfiguracion();

  const [{ data: cats }, { data: prods, error }] = await Promise.all([
    supabase.from('categorias').select('*').order('nombre', { ascending: true }),
    supabase.from('productos').select('*').order('created_at', { ascending: false })
  ]);

  if (error) {
    els.grid.innerHTML = `<p class="empty-state">No se pudieron cargar los productos.</p>`;
    els.contadorResultados.textContent = '0 productos encontrados';
    return;
  }

  state.categorias = cats || [];
  state.productos = (prods || []).filter((p) => p.estado !== 'Agotado');

  // Ajustar rango de precio máximo dinámicamente según el mayor precio existente
  const precios = state.productos.map((p) => Number(p.precio) || 0);
  const maxPrecioReal = precios.length ? Math.max(100, Math.ceil(Math.max(...precios) / 10) * 10) : 100;
  els.rangoPrecio.max = String(maxPrecioReal);
  els.rangoPrecio.value = String(maxPrecioReal);
  state.precioMax = maxPrecioReal;
  els.valorPrecio.textContent = formatearPrecio(maxPrecioReal);

  renderCategorias();
  renderColores();
  renderCatalogo();
}

function renderCategorias() {
  if (els.countTodas) {
    els.countTodas.textContent = String(state.productos.length);
  }

  const itemsHtml = state.categorias.map((cat) => {
    const cantidad = state.productos.filter(
      (p) => String(p.categoria_id) === String(cat.id) || p.categoria === cat.nombre
    ).length;
    const activa = String(state.categoriaActiva) === String(cat.id) ? 'is-active' : '';
    return `
      <li>
        <button type="button" class="category-btn ${activa}" data-categoria="${cat.id}">
          <span>${cat.nombre}</span>
          <span class="category-count">${cantidad}</span>
        </button>
      </li>
    `;
  }).join('');

  const btnTodas = els.listaCategorias.querySelector('[data-categoria="todas"]')?.closest('li');
  els.listaCategorias.innerHTML = '';
  if (btnTodas) {
    btnTodas.querySelector('.category-btn').classList.toggle('is-active', state.categoriaActiva === 'todas');
    els.listaCategorias.appendChild(btnTodas);
  }
  els.listaCategorias.insertAdjacentHTML('beforeend', itemsHtml);

  els.listaCategorias.querySelectorAll('.category-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.categoriaActiva = btn.dataset.categoria;
      state.soloNovedades = false;
      renderCategorias();
      renderCatalogo();
    });
  });
}

function renderColores() {
  const coloresUnicos = [...new Set(
    state.productos
      .map((p) => (p.color || '').trim())
      .filter(Boolean)
  )];

  els.selectColor.innerHTML = `<option value="todos">Todos los colores</option>`;
  coloresUnicos.forEach((color) => {
    const opt = document.createElement('option');
    opt.value = color;
    opt.textContent = color;
    els.selectColor.appendChild(opt);
  });
}

function obtenerNombreCategoria(prod) {
  const encontrada = state.categorias.find((c) => String(c.id) === String(prod.categoria_id));
  return encontrada ? encontrada.nombre : (prod.categoria || 'Accesorios');
}

function esNovedad(prod) {
  return Boolean(prod.novedad || prod.es_novedad || prod.destacado);
}

function filtrarYOrdenar() {
  let lista = state.productos.filter((prod) => {
    const precio = Number(prod.precio) || 0;
    const nombre = (prod.nombre || '').toLowerCase();
    const desc = (prod.descripcion || '').toLowerCase();
    const q = state.busqueda.trim().toLowerCase();

    const pasaCategoria =
      state.categoriaActiva === 'todas' ||
      String(prod.categoria_id) === String(state.categoriaActiva);

    const pasaPrecio = precio <= state.precioMax;
    const pasaColor =
      state.colorActivo === 'todos' ||
      (prod.color || '').toLowerCase() === state.colorActivo.toLowerCase();

    const pasaBusqueda = !q || nombre.includes(q) || desc.includes(q);
    const pasaNovedad = !state.soloNovedades || esNovedad(prod);

    return pasaCategoria && pasaPrecio && pasaColor && pasaBusqueda && pasaNovedad;
  });

  if (state.orden === 'precio-asc') {
    lista.sort((a, b) => (Number(a.precio) || 0) - (Number(b.precio) || 0));
  } else if (state.orden === 'precio-desc') {
    lista.sort((a, b) => (Number(b.precio) || 0) - (Number(a.precio) || 0));
  } else if (state.orden === 'nombre') {
    lista.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }

  return lista;
}

function renderCatalogo() {
  const filtrados = filtrarYOrdenar();
  els.contadorResultados.textContent = `${filtrados.length} ${filtrados.length === 1 ? 'producto encontrado' : 'productos encontrados'}`;

  if (!filtrados.length) {
    els.grid.innerHTML = `<p class="empty-state">No encontramos accesorios con esos filtros.</p>`;
    return;
  }

  els.grid.innerHTML = filtrados.map((prod) => {
    const imgUrl = prod.imagen_url || prod.imagen || 'https://via.placeholder.com/400x400?text=Camila+Accesorios';
    const precioTexto = prod.mostrar_desde
      ? `Desde ${formatearPrecio(prod.precio)}`
      : formatearPrecio(prod.precio);

    return `
      <article class="product-card" data-id="${prod.id}">
        <div class="product-card__media">
          ${esNovedad(prod) ? `<span class="badge-novedad">Novedad</span>` : ''}
          <img src="${imgUrl}" alt="${prod.nombre}" loading="lazy" />
        </div>
        <h3 class="product-card__title">${prod.nombre}</h3>
        <p class="product-card__price">${precioTexto}</p>
        <button type="button" class="product-card__link" data-ver-detalle="${prod.id}">
          Ver detalle
        </button>
      </article>
    `;
  }).join('');

  els.grid.querySelectorAll('[data-ver-detalle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const prod = state.productos.find((p) => String(p.id) === String(btn.dataset.verDetalle));
      if (prod) abrirDetalle(prod);
    });
  });
}

function abrirDetalle(prod) {
  state.productoSeleccionado = prod;
  els.detalleImg.src = prod.imagen_url || prod.imagen || 'https://via.placeholder.com/400x400?text=Camila+Accesorios';
  els.detalleImg.alt = prod.nombre;
  els.detalleCat.textContent = obtenerNombreCategoria(prod);
  els.detalleTitulo.textContent = prod.nombre;
  els.detallePrecio.textContent = prod.mostrar_desde
    ? `Desde ${formatearPrecio(prod.precio)}`
    : formatearPrecio(prod.precio);
  els.detalleDesc.textContent = prod.descripcion || 'Accesorio artesanal hecho con dedicación.';
  els.modalDetalle.hidden = false;
}

els.cerrarDetalle?.addEventListener('click', () => {
  els.modalDetalle.hidden = true;
});

els.modalDetalle?.addEventListener('click', (e) => {
  if (e.target === els.modalDetalle) els.modalDetalle.hidden = true;
});

els.detalleAgregar?.addEventListener('click', () => {
  if (!state.productoSeleccionado) return;
  window.dispatchEvent(new CustomEvent('agregar-a-bolsa', {
    detail: {
      id: state.productoSeleccionado.id,
      nombre: state.productoSeleccionado.nombre,
      precio: Number(state.productoSeleccionado.precio) || 0,
      imagen: state.productoSeleccionado.imagen_url || state.productoSeleccionado.imagen || ''
    }
  }));
  els.modalDetalle.hidden = true;
});

els.rangoPrecio?.addEventListener('input', (e) => {
  state.precioMax = Number(e.target.value);
  els.valorPrecio.textContent = formatearPrecio(state.precioMax);
  renderCatalogo();
});

els.selectColor?.addEventListener('change', (e) => {
  state.colorActivo = e.target.value;
  renderCatalogo();
});

els.inputBuscar?.addEventListener('input', (e) => {
  state.busqueda = e.target.value;
  renderCatalogo();
});

els.selectOrden?.addEventListener('change', (e) => {
  state.orden = e.target.value;
  renderCatalogo();
});

els.navNovedades?.addEventListener('click', () => {
  state.soloNovedades = true;
  renderCatalogo();
});

els.btnLimpiar?.addEventListener('click', () => {
  state.categoriaActiva = 'todas';
  state.colorActivo = 'todos';
  state.busqueda = '';
  state.orden = 'recientes';
  state.soloNovedades = false;
  state.precioMax = Number(els.rangoPrecio.max) || 100;

  els.rangoPrecio.value = String(state.precioMax);
  els.valorPrecio.textContent = formatearPrecio(state.precioMax);
  els.selectColor.value = 'todos';
  els.inputBuscar.value = '';
  els.selectOrden.value = 'recientes';

  renderCategorias();
  renderCatalogo();
});

cargarDatos();