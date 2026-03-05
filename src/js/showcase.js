const PROJECTS = {
    scce: {
        title: "SCCE — Sistema de Control de Cacao Especial",
        type: "Sistema Enterprise",
        desc: "Plataforma de trazabilidad agroindustrial que digitaliza el ciclo de vida completo del cacao especial: desde el ingreso de materia prima con proveedor y origen, pasando por fermentación y secado, hasta el análisis de calidad y almacenamiento. Diseñado para reemplazar registros físicos y hojas de cálculo dispersas en una empresa real.",
        stack: ["NestJS", "TypeScript", "Angular 17", "PostgreSQL", "TypeORM", "JWT Auth", "REST API", "AWS EC2"],
        highlights: [
            { label: "Tipo de Proyecto", value: "Full Stack Enterprise" },
            { label: "Frontend", value: "Angular Standalone Components" },
            { label: "Backend", value: "NestJS + REST API" },
            { label: "Base de Datos", value: "PostgreSQL" },
            { label: "Autenticación", value: "JWT con roles" },
            { label: "Estado", value: "Productivo para cliente" }
        ],
        view: "/proyectos/modules/scce/view.html"
    },
    hackershop: {
        title: "HackerShop — E-commerce Full Stack Decoupled",
        type: "E-commerce",
        desc: "Tienda en línea construida con una arquitectura completamente desacoplada: el frontend (React SPA) y el backend (Express.js) operan de manera independiente comunicándose exclusivamente vía JSON. Demuestra el patron API-First donde el servidor es agnóstico a la capa de presentación.",
        stack: ["React", "Express.js", "SQLite", "REST API", "Vite", "React Router", "CSS Modules"],
        highlights: [
            { label: "Arquitectura", value: "Full Stack Decoupled" },
            { label: "Frontend", value: "React SPA (Vite)" },
            { label: "Backend", value: "Express.js API REST" },
            { label: "Base de Datos", value: "SQLite (lightweight)" },
            { label: "Comunicación", value: "JSON via HTTP" },
            { label: "Estado", value: "Proyecto personal" }
        ],
        view: "/proyectos/modules/hackershop/view.html"
    },
    login: {
        title: "Animated Login Lab — Experimento UX con SVG",
        type: "Experimento UX",
        desc: "Componente de login interactivo donde un personaje SVG reacciona a las acciones del usuario en tiempo real: los ojos siguen el cursor, la boca sonríe al enfocar el email y las manos tapan los ojos al ingresar la contraseña. Una alternativa de alto impacto visual a los formularios estáticos tradicionales.",
        stack: ["SVG", "CSS Animations", "Vanilla JS", "HTML5", "conic-gradient", "Event Listeners"],
        highlights: [
            { label: "Tipo", value: "Componente UX interactivo" },
            { label: "Tecnología base", value: "SVG + CSS puro" },
            { label: "Sin librerías", value: "Vanilla JS únicamente" },
            { label: "Animaciones", value: "CSS transitions + JS" },
            { label: "Eye Tracking", value: "Mouse position → SVG transform" },
            { label: "Estado", value: "Experimento" }
        ],
        view: "/proyectos/modules/login/view.html"
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const viewport = document.getElementById('project-viewport');
    const docPanel = document.getElementById('doc-panel');
    const docTitle = document.getElementById('doc-title');
    const docDesc = document.getElementById('doc-desc');
    const docStack = document.getElementById('doc-stack');
    const docType = document.getElementById('doc-type');
    const docHighlights = document.getElementById('doc-highlights');
    const tabBar = document.getElementById('vsc-tabs');
    const breadcrumb = document.getElementById('vsc-breadcrumb');
    const statusLang = document.getElementById('status-lang');
    const items = document.querySelectorAll('.project-item');

    // Map project → display metadata for tabs/breadcrumb
    const TAB_META = {
        scce: { iconColor: '#3178c6', iconLabel: 'TS', file: 'scce.ts', crumb: 'portfolio', lang: 'TypeScript' },
        hackershop: { iconColor: '#f1fa8c', iconLabel: 'JS', file: 'hackershop.jsx', crumb: 'portfolio', lang: 'JavaScript JSX' },
        login: { iconColor: '#ffb86c', iconLabel: 'HTML', file: 'login-lab.html', crumb: 'portfolio', lang: 'HTML' },
    };

    const openTabs = new Set(['scce']);

    function renderTabs(activeId) {
        tabBar.innerHTML = '';
        openTabs.forEach(id => {
            const meta = TAB_META[id];
            const tab = document.createElement('div');
            tab.className = `vsc-tab ${id === activeId ? 'active' : ''}`;
            tab.dataset.project = id;
            tab.innerHTML = `
                <span style="font-size:0.68rem; font-weight:700; color:${meta.iconColor};">${meta.iconLabel}</span>
                ${meta.file}
                <span class="vsc-tab-close" data-close="${id}">×</span>
            `;
            tab.addEventListener('click', (e) => {
                if (e.target.dataset.close) {
                    openTabs.delete(e.target.dataset.close);
                    const remaining = [...openTabs];
                    if (remaining.length) loadProject(remaining[remaining.length - 1]);
                    else viewport.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--dr-comment);">No hay archivos abiertos</div>';
                    renderTabs(remaining[remaining.length - 1] || null);
                    return;
                }
                loadProject(id);
                updateActiveFile(id);
            });
            tabBar.appendChild(tab);
        });
    }

    function updateActiveFile(id) {
        // Sidebar active state
        items.forEach(i => i.classList.toggle('active', i.dataset.project === id));
        // Tab active state
        document.querySelectorAll('.vsc-tab').forEach(t => t.classList.toggle('active', t.dataset.project === id));
        // Breadcrumb
        if (breadcrumb && TAB_META[id]) {
            const meta = TAB_META[id];
            breadcrumb.innerHTML = `treborrr › ${meta.crumb} › <span>${meta.file}</span>`;
        }
        // Status bar language
        if (statusLang && TAB_META[id]) statusLang.textContent = TAB_META[id].lang;
    }

    function renderDocs(p) {
        if (!docPanel) return;
        docTitle.textContent = p.title;
        docDesc.textContent = p.desc;
        docType.textContent = p.type;
        docStack.innerHTML = p.stack.map(s => `<span class="doc-stack-item">${s}</span>`).join('');
        docHighlights.innerHTML = p.highlights.map(h => `
            <div class="doc-highlight-item">
                <strong>${h.label}</strong>
                <span>${h.value}</span>
            </div>
        `).join('');
        docPanel.classList.add('visible');
    }

    // Re-execute <script> tags injected via innerHTML (browser blocks them by default)
    function executeScripts(container) {
        container.querySelectorAll('script').forEach(oldScript => {
            const s = document.createElement('script');
            s.textContent = oldScript.textContent;
            document.body.appendChild(s);
            document.body.removeChild(s);
        });
    }

    async function loadProject(id) {
        const p = PROJECTS[id];
        if (!p) return;

        viewport.style.opacity = '0';
        try {
            const response = await fetch(p.view);
            const html = await response.text();
            setTimeout(() => {
                viewport.innerHTML = html;
                executeScripts(viewport);   // <-- run module scripts
                viewport.style.opacity = '1';
                renderDocs(p);
                if (id === 'hackershop') initHackerShop();
            }, 300);
        } catch (err) {
            viewport.innerHTML = `<div style="padding:40px; color:#ff5555;">Error cargando módulo: ${err.message}</div>`;
        }
    }


    // --- Module Initializers ---

    function initLoginLab() {
        // Logic is self-contained inside modules/login/view.html
    }

    function initHackerShop() {
        window.sendHackLog = (txt) => {
            const stream = document.getElementById('hack-api-stream');
            if (stream) {
                const entry = document.createElement('div');
                entry.textContent = txt;
                stream.prepend(entry);
            }
        };
    }

    // --- SCCE Internal Navigation Helper ---
    function scceSetActiveNav(label) {
        document.querySelectorAll('.scce-nav-item').forEach(el => {
            el.classList.toggle('active', el.textContent.trim() === label);
        });
    }

    window.loadScceDashboard = () => {
        scceSetActiveNav('Dashboard');
        const view = document.getElementById('scce-inner-view');
        if (!view) return;
        view.innerHTML = `
            <div class="scce-title" style="margin-bottom: 8px;">
                <h1>Panel de Control</h1>
                <p style="font-size: 0.8rem; color: #999;">Sistema de Control y Calidad del Cacao</p>
            </div>
            <p style="font-size: 0.75rem; color: #00a651; text-align: right; margin-bottom: 16px;">Hoy · Trazabilidad en tiempo real</p>

            <!-- KPI Cards Row 1 -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 12px;">
                <div class="scce-card" style="border-left: 4px solid #00a651; padding: 14px;">
                    <div style="font-size: 1.4rem; font-weight:800; color:#1a1a1a;">0.0 kg</div>
                    <div style="font-size:0.7rem; color:#999;">Stock en Almacén</div>
                </div>
                <div class="scce-card" style="border-left: 4px solid #f39c12; padding: 14px;">
                    <div style="font-size: 1.4rem; font-weight:800; color:#1a1a1a;">200</div>
                    <div style="font-size:0.7rem; color:#999;">Lotes Totales</div>
                </div>
                <div class="scce-card" style="border-left: 4px solid #9b59b6; padding: 14px;">
                    <div style="font-size: 1.4rem; font-weight:800; color:#1a1a1a;">0</div>
                    <div style="font-size:0.7rem; color:#999;">Muestras</div>
                </div>
                <div class="scce-card" style="border-left: 4px solid #3498db; padding: 14px;">
                    <div style="font-size: 1.4rem; font-weight:800; color:#1a1a1a;">0</div>
                    <div style="font-size:0.7rem; color:#999;">Análisis Físicos</div>
                </div>
            </div>

            <!-- KPI Cards Row 2 -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;">
                <div class="scce-card" style="border-left: 4px solid #e74c3c; padding: 14px;">
                    <div style="font-size: 1.4rem; font-weight:800; color:#1a1a1a;">0</div>
                    <div style="font-size:0.7rem; color:#999;">Sesiones de Cata</div>
                </div>
                <div class="scce-card" style="border-left: 4px solid #1abc9c; padding: 14px;">
                    <div style="font-size: 1.4rem; font-weight:800; color:#1a1a1a;">0.0 kg</div>
                    <div style="font-size:0.7rem; color:#999;">Stock Derivados</div>
                </div>
                <div class="scce-card" style="border-left: 4px solid #27ae60; padding: 14px;">
                    <div style="font-size: 1.4rem; font-weight:800; color:#1a1a1a;">42</div>
                    <div style="font-size:0.7rem; color:#999;">Proveedores</div>
                </div>
                <div class="scce-card" style="border-left: 4px solid #f39c12; padding: 14px;">
                    <div style="font-size: 1.4rem; font-weight:800; color:#1a1a1a;">200</div>
                    <div style="font-size:0.7rem; color:#999;">Lotes en Proceso</div>
                </div>
            </div>

            <!-- Charts Row -->
            <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 16px;">
                <!-- Donut placeholder -->
                <div class="scce-card" style="padding: 16px;">
                    <div style="font-size: 0.8rem; font-weight: 700; color: #333; margin-bottom: 12px;">Distribución de Lotes</div>
                    <div style="display: flex; align-items: center; justify-content: center; gap: 16px;">
                        <div style="width: 80px; height: 80px; border-radius: 50%; background: conic-gradient(#f39c12 0% 95%, #e67e22 95% 99%, #e74c3c 99% 100%); display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 0 24px white;">
                            <span style="font-size: 0.7rem; font-weight: 800; color: #1a1a1a;">200<br><span style="font-weight:400">Lotes</span></span>
                        </div>
                        <div style="font-size: 0.65rem; color: #666; display: flex; flex-direction: column; gap: 6px;">
                            <div><span style="display:inline-block; width:8px; height:8px; background:#f39c12; border-radius:2px; margin-right:5px;"></span>Listo Ferm. 191</div>
                            <div><span style="display:inline-block; width:8px; height:8px; background:#e67e22; border-radius:2px; margin-right:5px;"></span>Fermentación 7</div>
                            <div><span style="display:inline-block; width:8px; height:8px; background:#e74c3c; border-radius:2px; margin-right:5px;"></span>Secado 2</div>
                        </div>
                    </div>
                </div>

                <!-- Bar chart -->
                <div class="scce-card" style="padding: 16px;">
                    <div style="font-size: 0.8rem; font-weight: 700; color: #333; margin-bottom: 12px;">Kg Baba Comprados por Mes</div>
                    <div style="display: flex; align-items: flex-end; gap: 6px; height: 80px;">
                        ${[
                ['Sep', 31411, 100],
                ['Oct', 22019, 70],
                ['Nov', 20826, 66],
                ['Dec', 9840, 31],
                ['Ene', 17030, 54],
                ['Feb', 31541, 100],
                ['Mar', 7543, 24]
            ].map(([m, v, p]) => `
                            <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px;">
                                <div style="font-size:0.55rem; color:#999;">${(v / 1000).toFixed(0)}k</div>
                                <div style="width:100%; background:#3498db; height:${p}%; border-radius:3px 3px 0 0; min-height:4px;"></div>
                                <div style="font-size:0.6rem; color:#999;">${m}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    };

    window.loadScceInicio = () => {
        scceSetActiveNav('Inicio');
        const view = document.getElementById('scce-inner-view');
        if (!view) return;
        view.innerHTML = `
            <div class="scce-welcome">
                <div class="scce-title">
                    <h1>Bienvenido, <span>Administrador</span></h1>
                    <p style="font-size: 0.8rem; color: #999;">Sistema de Trazabilidad de Producción de Cacao</p>
                </div>
                <div class="scce-badge-admin">ADMINISTRADOR</div>
            </div>
            <p style="font-size: 0.8rem; color: #999; margin-bottom: 20px;">Tienes acceso a las siguientes secciones:</p>
            <div class="scce-grid">
                <div class="scce-card card-dash">
                    <h3>Dashboard</h3>
                    <p>KPIs, gráficos y actividad reciente del sistema.</p>
                    <a href="#">Ir a Dashboard →</a>
                </div>
                <div class="scce-card card-lotes" onclick="window.loadScceTracking()">
                    <h3>Lotes</h3>
                    <p>Registro y seguimiento de lotes de cacao.</p>
                    <a href="#" style="color: #f39c12;">Ir a Lotes →</a>
                </div>
                <div class="scce-card card-ferm" onclick="window.loadScceFermentacion()">
                    <h3>Fermentación</h3>
                    <p>Control de eventos y mediciones del proceso.</p>
                    <a href="#">Ir a Fermentación →</a>
                </div>
                <div class="scce-card card-secado">
                    <h3>Secado</h3>
                    <p>Registro del proceso de secado y finalización.</p>
                    <a href="#" style="color: #e67e22;">Ir a Secado →</a>
                </div>
            </div>
        `;
    };

    window.loadScceTracking = () => {
        scceSetActiveNav('Tracking');
        const view = document.getElementById('scce-inner-view');
        if (!view) return;
        view.innerHTML = `
            <div class="scce-title" style="margin-bottom: 24px;">
                <h1>Tracking de <span>Lotes</span></h1>
                <p style="font-size: 0.8rem; color: #999;">Historial completo de lotes y derivados</p>
            </div>
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <input type="text" placeholder="Buscar por código..." style="flex: 1; padding: 10px; border-radius: 8px; border: 1px solid #ddd; font-size: 0.8rem;">
                <select style="padding: 10px; border-radius: 8px; border: 1px solid #ddd; font-size: 0.8rem;">
                    <option>Todos los estados</option>
                    <option>Fermentación</option>
                    <option>Listo Ferm.</option>
                    <option>Almacén</option>
                </select>
            </div>
            <div class="scce-table-container">
                <table class="scce-table">
                    <thead><tr><th>CÓDIGO</th><th>TIPO</th><th>ESTADO</th><th>PROVEEDOR</th><th>KG</th></tr></thead>
                    <tbody>
                        <tr><td>TR000200</td><td><span class="scce-status status-lote">LOTE</span></td><td><span class="scce-status" style="background:#fff3e0; color:#e67e22;">Fermentación</span></td><td>Naranjos Alto</td><td>2,654 kg</td></tr>
                        <tr><td>TR000199</td><td><span class="scce-status status-lote">LOTE</span></td><td><span class="scce-status" style="background:#fffde7; color:#f1c40f;">Listo Ferm.</span></td><td>Wawas / Laguna</td><td>1,483 kg</td></tr>
                        <tr><td>TR000198</td><td><span class="scce-status status-lote">LOTE</span></td><td><span class="scce-status status-lote">Almacén</span></td><td>Néstor Jiménez</td><td>2,825 kg</td></tr>
                    </tbody>
                </table>
            </div>
        `;
    };

    window.loadScceFermentacion = () => {
        scceSetActiveNav('Fermentación');
        const view = document.getElementById('scce-inner-view');
        if (!view) return;
        view.innerHTML = `
            <div class="scce-title" style="margin-bottom: 20px;">
                <h1>Fermentación</h1>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;">
                <div class="scce-card card-lotes" style="border-left-width: 6px;">
                    <p style="font-size: 0.7rem; text-transform: uppercase; color: #999; margin-bottom: 4px;">LOTES ACTIVOS</p>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #1a1a1a;">7 lotes</div>
                </div>
                <div class="scce-card" style="border-left: 6px solid #f1c40f;">
                    <p style="font-size: 0.7rem; text-transform: uppercase; color: #999; margin-bottom: 4px;">PESO TOTAL EN FERMENTACIÓN</p>
                    <div style="font-size: 1.8rem; font-weight: 800; color: #1a1a1a;">5,906.54 kg</div>
                </div>
            </div>
            <div class="scce-table-container">
                <table class="scce-table">
                    <thead><tr><th>Código</th><th>Proveedor</th><th>Kg Baba</th><th>Estado</th><th>Días Ferm.</th></tr></thead>
                    <tbody>
                        <tr><td>TR000200</td><td>Naranjos Alto Nueva Piura</td><td>2,654 kg</td><td><span class="scce-status" style="background:#fff3e0; color:#e67e22;">FERMENTACION</span></td><td>0 días</td></tr>
                        <tr><td>TR000199</td><td>Wawas / Laguna</td><td>1,483 kg</td><td><span class="scce-status" style="background:#fffde7; color:#f1c40f;">LISTO_FERM.</span></td><td>—</td></tr>
                        <tr><td>TR000198</td><td>Naranjos Alto</td><td>580 kg</td><td><span class="scce-status" style="background:#fffde7; color:#f1c40f;">LISTO_FERM.</span></td><td>—</td></tr>
                    </tbody>
                </table>
            </div>
        `;
    };

    // --- Global Events ---
    items.forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.project;
            openTabs.add(id);
            renderTabs(id);
            updateActiveFile(id);
            loadProject(id);
        });
    });

    // Initial Load
    renderTabs('scce');
    updateActiveFile('scce');
    loadProject('scce');
});
