import { supabase } from './supabase.js';

const CLAVE_BOLSA = 'camila_accesorios_bolsa';

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
    return JSON.parse(localStorage.getItem(CLAVE_BOLSA) || '[]');
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
      const i = Number(btn.dataset.restar-bolsa);
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

function perteneceACategoria(prod, cat) {
  if (prod.categoria_id !== undefined && prod.categoria_id !== null) {
    return String(prod.categoria_id) === String(cat.id);
  }
  if (prod.categoria && cat.nombre) {
    return String(prod.categoria).toLowerCase().trim() === String(cat.nombre).toLowerCase().trim();
  }
  return false;
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

  const precios = state.productos.map((p) => Number(p.precio) || 0);
  const maxPrecioReal = precios.length
    ? Math.max(100, Math.ceil(Math.max(...precios) / 10) * 10)
    : 100;

  els.rangoPrecio.max = String(maxPrecioReal);
  els.rangoPrecio.value = String(maxPrecioReal);
  state.precioMax = maxPrecioReal;
  els.valorPrecio.textContent = formatearPrecio(maxPrecioReal);

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
  const coloresUnicos = [...new Set(
    state.productos
      .map((p) => (p.color || '').toString().trim())
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
  const encontrada = state.categorias.find((c) => perteneceACategoria(prod, c));
  return encontrada ? encontrada.nombre : (prod.categoria || 'Accesorios');
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

    const pasaPrecio = precio <= state.precioMax;
    const pasaColor =
      state.colorActivo === 'todos' ||
      (prod.color || '').toString().toLowerCase().trim() === state.colorActivo.toLowerCase().trim();

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
  els.contadorResultados.textContent = `${filtrados.length} ${filtrados.length === 1 ? 'producto encontrado' : 'productos encontrados'}`;

  if (!filtrados.length) {
    els.grid.innerHTML = `<p class="empty-state">No encontramos accesorios con esos filtros.</p>`;
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
      imagen: prod.imagen_url || '',
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
    return `• ${i.nombre} (x${cant}) - ${formatearPrecio(precio * cant)}`;
  });
  const total = items.reduce((acc, i) => acc + (Number(i.precio) || 0) * (Number(i.cantidad) || 1), 0);
  const texto = `Hola Camila Accesorios, deseo realizar el siguiente pedido:\n${lineas.join('\n')}\nTotal estimado: ${formatearPrecio(total)}`;
  const numero = state.whatsapp || '51900000000';
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer');
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
  actualizarEstadoMenu('catalogo');
});

cargarDatos();