import { supabase } from './supabase.js';

const CLAVE_BOLSA = 'camila_accesorios_bolsa_v1';

const PALETA_COLORES = [
  'Rojo',
  'Dorado',
  'Plateado',
  'Rosado',
  'Fucsia',
  'Celeste',
  'Azul',
  'Blanco',
  'Negro',
  'Verde',
  'Morado',
  'Lila',
  'Amarillo',
  'Coral',
  'Beige'
];

const state = {
  productos: [],
  categorias: [],
  categoriaActiva: 'todas',
  precioMin: 0,
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
  detalleAgregar: document.getElementById('detalle-agregar-bolsa'),
  btnAbrirBolsa: document.getElementById('btn-abrir-bolsa'),
  cerrarBolsa: document.getElementById('cerrar-bolsa'),
  drawerBolsa: document.getElementById('drawer-bolsa'),
  itemsBolsa: document.getElementById('items-bolsa'),
  totalBolsa: document.getElementById('total-bolsa'),
  contadorBolsa: document.getElementById('contador-bolsa'),
  btnEnviarWhatsapp: document.getElementById('btn-enviar-whatsapp')
};

function formatearPrecio(monto) {
  const num = Number(monto) || 0;
  return `${state.moneda} ${num.toFixed(2)}`;
}

function leerBolsa() {
  try {
    const raw = JSON.parse(localStorage.getItem(CLAVE_BOLSA) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (_) {
    return [];
  }
}

function guardarBolsa(items) {
  localStorage.setItem(CLAVE_BOLSA, JSON.stringify(items));
  const totalUnidades = items.reduce((acc, item) => acc + (Number(item.cantidad) || 1), 0);
  if (els.contadorBolsa) {
    els.contadorBolsa.textContent = String(totalUnidades);
  }
  window.dispatchEvent(new CustomEvent('bolsa-actualizada', { detail: items }));
}

function renderizarBolsa() {
  const items = leerBolsa();
  const totalUnidades = items.reduce((acc, item) => acc + (Number(item.cantidad) || 1), 0);

  if (els.contadorBolsa) {
    els.contadorBolsa.textContent = String(totalUnidades);
  }

  if (!els.itemsBolsa) return;

  if (!items.length) {
    els.itemsBolsa.innerHTML = '<p class="empty-state">Tu bolsa está vacía.</p>';
    if (els.totalBolsa) els.totalBolsa.textContent = formatearPrecio(0);
    return;
  }

  let subtotal = 0;
  els.itemsBolsa.innerHTML = items.map((item, idx) => {
    const cant = Number(item.cantidad) || 1;
    const precio = Number(item.precio) || 0;
    subtotal += cant * precio;

    return `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px;border:1px solid var(--border-light);border-radius:12px;">
        <div style="display:flex;align-items:center;gap:10px;min-width:0;">
          ${item.imagen ? `<img src="${item.imagen}" alt="${item.nombre}" style="width:46px;height:46px;object-fit:cover;border-radius:8px;" />` : ''}
          <div style="min-width:0;">
            <strong style="display:block;font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.nombre}</strong>
            <small style="color:var(--primary);font-weight:700;">${formatearPrecio(precio)} × ${cant}</small>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <button type="button" data-restar-bolsa="${idx}" style="padding:2px 8px;border-radius:8px;border:1px solid var(--border-light);background:#fff;cursor:pointer;">−</button>
          <button type="button" data-sumar-bolsa="${idx}" style="padding:2px 8px;border-radius:8px;border:1px solid var(--border-light);background:#fff;cursor:pointer;">+</button>
        </div>
      </div>
    `;
  }).join('');

  if (els.totalBolsa) {
    els.totalBolsa.textContent = formatearPrecio(subtotal);
  }

  els.itemsBolsa.querySelectorAll('[data-sumar-bolsa]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lista = leerBolsa();
      const i = Number(btn.dataset.sumarBolsa);
      if (lista[i]) lista[i].cantidad = (Number(lista[i].cantidad) || 1) + 1;
      guardarBolsa(lista);
      renderizarBolsa();
    });
  });

  els.itemsBolsa.querySelectorAll('[data-restar-bolsa]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const lista = leerBolsa();
      const i = Number(btn.dataset.restarBolsa);
      if (lista[i]) {
        if ((Number(lista[i].cantidad) || 1) > 1) {
          lista[i].cantidad -= 1;
        } else {
          lista.splice(i, 1);
        }
      }
      guardarBolsa(lista);
      renderizarBolsa();
    });
  });
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
      state.whatsapp = String(data.whatsapp).replace(/\D/g, '');
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

function esDesdePrecio(prod) {
  return Boolean(prod.es_desde || prod.mostrar_desde);
}

function esNovedad(prod) {
  return Boolean(prod.novedad || prod.es_novedad || prod.destacado);
}

function capitalizarTexto(texto = '') {
  const limpio = String(texto || '').trim().replace(/\s+/g, ' ');
  if (!limpio) return '';
  return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
}

function obtenerColoresProducto(prod) {
  const encontrados = new Set();

  if (prod.color) {
    String(prod.color)
      .split(/[,/|-]+/)
      .map((c) => capitalizarTexto(c))
      .filter(Boolean)
      .forEach((c) => encontrados.add(c));
  }

  const texto = `${prod.nombre || ''} ${prod.descripcion || ''}`.toLowerCase();
  PALETA_COLORES.forEach((color) => {
    const regex = new RegExp(`\\b${color.toLowerCase()}(?:a|as|os|s)?\\b`, 'i');
    if (regex.test(texto)) {
      encontrados.add(color);
    }
  });

  return [...encontrados];
}

function perteneceACategoria(prod, cat) {
  if (prod.categoria_id !== undefined && prod.categoria_id !== null) {
    return String(prod.categoria_id) === String(cat.id);
  }
  if (prod.categoria && cat.nombre) {
    return String(prod.categoria).toLowerCase().trim() === String(cat.nombre).toLowerCase().trim();
  }
  return false;
}

function configurarRangoPrecio() {
  if (!els.rangoPrecio || !els.valorPrecio) return;

  const precios = state.productos
    .map((p) => Number(p.precio) || 0)
    .filter((n) => n > 0);

  const minReal = precios.length ? Math.max(0, Math.floor(Math.min(...precios))) : 0;
  const maxReal = precios.length
    ? Math.max(50, Math.ceil(Math.max(...precios) / 5) * 5)
    : 100;

  state.precioMin = minReal;
  state.precioMax = maxReal;

  els.rangoPrecio.min = String(minReal);
  els.rangoPrecio.max = String(maxReal);
  els.rangoPrecio.step = '0.5';
  els.rangoPrecio.value = String(maxReal);
  els.valorPrecio.textContent = formatearPrecio(maxReal);
}

async function cargarDatos() {
  await cargarConfiguracion();

  const [
    { data: cats, error: errCats },
    { data: prods, error: errProds }
  ] = await Promise.all([
    supabase
      .from('categorias')
      .select('*')
      .order('orden', { ascending: true })
      .order('nombre', { ascending: true }),
    supabase
      .from('productos')
      .select('*')
      .order('creado_en', { ascending: false })
  ]);

  if (errProds) {
    console.error('Error cargando productos:', errProds);
    els.grid.innerHTML = `<p class="empty-state">Error al cargar productos: ${errProds.message}</p>`;
    els.contadorResultados.textContent = '0 productos encontrados';
    return;
  }

  if (errCats) {
    console.error('Error cargando categorías:', errCats);
  }

  state.categorias = (cats || []).filter((c) => c.activa !== false);
  state.productos = (prods || []).filter((p) => {
    const estado = (p.estado || '').toString().toLowerCase().trim();
    return estado !== 'agotado' && estado !== 'inactivo' && estado !== 'oculto';
  });

  configurarRangoPrecio();
  renderCategorias();
  renderColores();
  renderCatalogo();
  renderizarBolsa();
}

function renderCategorias() {
  if (els.countTodas) {
    els.countTodas.textContent = String(state.productos.length);
  }

  const itemsHtml = state.categorias.map((cat) => {
    const cantidad = state.productos.filter((p) => perteneceACategoria(p, cat)).length;
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
  if (!els.selectColor) return;

  const coloresSet = new Set();
  state.productos.forEach((prod) => {
    obtenerColoresProducto(prod).forEach((color) => coloresSet.add(color));
  });

  const coloresOrdenados = [...coloresSet].sort((a, b) => a.localeCompare(b, 'es'));

  els.selectColor.innerHTML = `<option value="todos">Todos los colores</option>`;
  coloresOrdenados.forEach((color) => {
    const opt = document.createElement('option');
    opt.value = color;
    opt.textContent = color;
    els.selectColor.appendChild(opt);
  });

  if (
    state.colorActivo !== 'todos' &&
    !coloresOrdenados.some((c) => c.toLowerCase() === state.colorActivo.toLowerCase())
  ) {
    state.colorActivo = 'todos';
    els.selectColor.value = 'todos';
  }
}

function obtenerNombreCategoria(prod) {
  const encontrada = state.categorias.find((c) => perteneceACategoria(prod, c));
  return encontrada ? encontrada.nombre : (prod.categoria || 'Accesorios');
}

function actualizarEstadoBotonesFiltro() {
  if (!els.btnLimpiar) return;
  const maxActual = Number(els.rangoPrecio?.max) || state.precioMax;
  const hayFiltroActivo =
    state.categoriaActiva !== 'todas' ||
    state.colorActivo !== 'todos' ||
    state.soloNovedades ||
    Boolean(state.busqueda.trim()) ||
    Number(state.precioMax) < maxActual;

  els.btnLimpiar.classList.toggle('has-active-filters', hayFiltroActivo);
  els.btnLimpiar.textContent = hayFiltroActivo ? 'Limpiar filtros activos' : 'Limpiar filtros';
}

function filtrarYOrdenar() {
  const categoriaSeleccionada = state.categorias.find(
    (c) => String(c.id) === String(state.categoriaActiva)
  );

  const lista = state.productos.filter((prod) => {
    const precio = Number(prod.precio) || 0;
    const nombre = (prod.nombre || '').toLowerCase();
    const desc = (prod.descripcion || '').toLowerCase();
    const q = state.busqueda.trim().toLowerCase();

    const pasaCategoria =
      state.categoriaActiva === 'todas' ||
      (categoriaSeleccionada ? perteneceACategoria(prod, categoriaSeleccionada) : false);

    const pasaPrecio = precio <= Number(state.precioMax);

    const coloresProd = obtenerColoresProducto(prod).map((c) => c.toLowerCase());
    const pasaColor =
      state.colorActivo === 'todos' ||
      coloresProd.includes(state.colorActivo.toLowerCase().trim());

    const pasaBusqueda = !q || nombre.includes(q) || desc.includes(q);
    const pasaNovedad = !state.soloNovedades || esNovedad(prod);

    return pasaCategoria && pasaPrecio && pasaColor && pasaBusqueda && pasaNovedad;
  });

  if (state.orden === 'precio-asc') {
    lista.sort((a, b) => (Number(a.precio) || 0) - (Number(b.precio) || 0));
  } else if (state.orden === 'precio-desc') {
    lista.sort((a, b) => (Number(b.precio) || 0) - (Number(a.precio) || 0));
  } else if (state.orden === 'nombre') {
    lista.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es'));
  } else {
    lista.sort((a, b) => {
      const ordDiff = (Number(a.orden) || 0) - (Number(b.orden) || 0);
      if (ordDiff !== 0) return ordDiff;
      return new Date(b.creado_en || 0) - new Date(a.creado_en || 0);
    });
  }

  return lista;
}

function renderCatalogo() {
  const filtrados = filtrarYOrdenar();
  actualizarEstadoBotonesFiltro();

  if (els.contadorResultados) {
    els.contadorResultados.textContent = `${filtrados.length} ${filtrados.length === 1 ? 'producto encontrado' : 'productos encontrados'}`;
  }

  if (!filtrados.length) {
    els.grid.innerHTML = `
      <div class="empty-state">
        <p>No encontramos accesorios con esos filtros.</p>
        <button type="button" class="btn-clear-filters" id="btn-empty-reset" style="margin-top:12px;">
          Restablecer filtros
        </button>
      </div>
    `;
    document.getElementById('btn-empty-reset')?.addEventListener('click', () => {
      els.btnLimpiar?.click();
    });
    return;
  }

  els.grid.innerHTML = filtrados.map((prod) => {
    const imgUrl = prod.imagen_url || 'https://via.placeholder.com/400x400?text=Camila+Accesorios';
    const precioTexto = esDesdePrecio(prod)
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
  els.detalleImg.src = prod.imagen_url || 'https://via.placeholder.com/400x400?text=Camila+Accesorios';
  els.detalleImg.alt = prod.nombre;
  els.detalleCat.textContent = obtenerNombreCategoria(prod);
  els.detalleTitulo.textContent = prod.nombre;
  els.detallePrecio.textContent = esDesdePrecio(prod)
    ? `Desde ${formatearPrecio(prod.precio)}`
    : formatearPrecio(prod.precio);
  els.detalleDesc.textContent = prod.descripcion || 'Accesorio artesanal hecho con dedicación.';
  els.modalDetalle.hidden = false;
}

function actualizarEstadoMenu(seccionActiva) {
  document.querySelectorAll('.nav-menu .nav-link').forEach((link) => {
    const href = link.getAttribute('href') || '';
    const esNovedadLink = link.id === 'nav-novedades';
    let activa = false;

    if (seccionActiva === 'inicio') {
      activa = href === '#inicio';
    } else if (seccionActiva === 'novedades') {
      activa = esNovedadLink;
    } else if (seccionActiva === 'catalogo') {
      activa = href === '#catalogo-seccion' && !esNovedadLink;
    } else if (seccionActiva === 'contacto') {
      activa = href === '#contacto-seccion';
    }

    link.classList.toggle('is-active', activa);
  });
}

function mostrarCatalogoCompleto({ scroll = true } = {}) {
  state.soloNovedades = false;
  state.categoriaActiva = 'todas';
  renderCategorias();
  renderCatalogo();
  actualizarEstadoMenu('catalogo');

  if (scroll) {
    document.getElementById('catalogo-seccion')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

els.cerrarDetalle?.addEventListener('click', () => {
  els.modalDetalle.hidden = true;
});

els.modalDetalle?.addEventListener('click', (e) => {
  if (e.target === els.modalDetalle) els.modalDetalle.hidden = true;
});

els.detalleAgregar?.addEventListener('click', () => {
  if (!state.productoSeleccionado) return;
  const prod = state.productoSeleccionado;
  const items = leerBolsa();
  const existente = items.find((i) => String(i.id) === String(prod.id));

  if (existente) {
    existente.cantidad = (Number(existente.cantidad) || 1) + 1;
  } else {
    items.push({
      id: prod.id,
      nombre: prod.nombre,
      precio: Number(prod.precio) || 0,
      es_desde: esDesdePrecio(prod),
      imagen: prod.imagen_url || '',
      moneda: state.moneda,
      cantidad: 1
    });
  }

  guardarBolsa(items);
  els.modalDetalle.hidden = true;
  renderizarBolsa();
  if (els.drawerBolsa) els.drawerBolsa.hidden = false;
});

els.btnAbrirBolsa?.addEventListener('click', () => {
  renderizarBolsa();
  if (els.drawerBolsa) els.drawerBolsa.hidden = false;
});

els.cerrarBolsa?.addEventListener('click', () => {
  if (els.drawerBolsa) els.drawerBolsa.hidden = true;
});

els.drawerBolsa?.addEventListener('click', (e) => {
  if (e.target === els.drawerBolsa) els.drawerBolsa.hidden = true;
});

els.btnEnviarWhatsapp?.addEventListener('click', () => {
  const items = leerBolsa();
  if (!items.length) return;
  const lineas = items.map((i) => {
    const cant = Number(i.cantidad) || 1;
    const precio = Number(i.precio) || 0;
    const prefijo = i.es_desde ? 'Desde ' : '';
    return `• ${i.nombre} (x${cant}) - ${prefijo}${formatearPrecio(precio * cant)}`;
  });
  const total = items.reduce((acc, i) => acc + (Number(i.precio) || 0) * (Number(i.cantidad) || 1), 0);
  const texto = `Hola Camila Accesorios, deseo realizar el siguiente pedido:\n${lineas.join('\n')}\nTotal estimado: ${formatearPrecio(total)}`;
  const numero = state.whatsapp || '51900000000';
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
});

els.rangoPrecio?.addEventListener('input', (e) => {
  state.precioMax = Number(e.target.value);
  if (els.valorPrecio) {
    els.valorPrecio.textContent = formatearPrecio(state.precioMax);
  }
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

document.querySelectorAll('.nav-menu .nav-link').forEach((link) => {
  const href = link.getAttribute('href') || '';
  const esNovedadLink = link.id === 'nav-novedades';

  if (esNovedadLink) {
    link.addEventListener('click', () => {
      state.soloNovedades = true;
      renderCatalogo();
      actualizarEstadoMenu('novedades');
    });
  } else if (href === '#catalogo-seccion') {
    link.addEventListener('click', () => {
      mostrarCatalogoCompleto({ scroll: true });
    });
  } else if (href === '#inicio') {
    link.addEventListener('click', () => {
      state.soloNovedades = false;
      renderCatalogo();
      actualizarEstadoMenu('inicio');
    });
  } else if (href === '#contacto-seccion') {
    link.addEventListener('click', () => {
      actualizarEstadoMenu('contacto');
    });
  }
});

document.querySelector('.hero__box a[href="#catalogo-seccion"]')?.addEventListener('click', () => {
  mostrarCatalogoCompleto({ scroll: true });
});

els.btnLimpiar?.addEventListener('click', () => {
  const maxReset = Number(els.rangoPrecio?.max) || 100;

  state.categoriaActiva = 'todas';
  state.colorActivo = 'todos';
  state.busqueda = '';
  state.orden = 'recientes';
  state.soloNovedades = false;
  state.precioMax = maxReset;

  if (els.rangoPrecio) els.rangoPrecio.value = String(maxReset);
  if (els.valorPrecio) els.valorPrecio.textContent = formatearPrecio(maxReset);
  if (els.selectColor) els.selectColor.value = 'todos';
  if (els.inputBuscar) els.inputBuscar.value = '';
  if (els.selectOrden) els.selectOrden.value = 'recientes';

  renderCategorias();
  renderCatalogo();
  actualizarEstadoMenu('catalogo');
});

cargarDatos();
