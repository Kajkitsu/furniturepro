/* ═══════════════════════════════════════════════════════
   FurniturePro — UI Module (all panels rendering)
   ═══════════════════════════════════════════════════════ */

(function(FP) {
    'use strict';

    const { Store, Models, Export, MATERIALS, EDGE_BANDS } = FP;

    // ─── Notification system ───
    function notify(message, type = 'info') {
        const container = document.getElementById('notifications');
        if (!container) return;
        const el = document.createElement('div');
        el.className = `notif ${type}`;
        el.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warn' ? 'exclamation-triangle' : 'info-circle'}"></i> ${message}`;
        container.appendChild(el);
        setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3000);
    }

    // ═══════════════════════════════════════════════════════
    // TABS
    // ═══════════════════════════════════════════════════════
    function renderTabs() {
        const tabsEl = document.getElementById('furniture-tabs');
        if (!tabsEl) return;
        const state = Store.getState();
        const furniture = state.furniture;

        tabsEl.innerHTML = furniture.map(f => {
            const mat = Store.getMaterial(f.materialId);
            const active = f.id === state.activeFurnitureId ? 'active' : '';
            return `<div class="tab-item ${active}" data-fid="${f.id}">
                <span class="tab-icon" style="background:${mat ? mat.color : '#ccc'}"></span>
                <span class="tab-name">${f.name}</span>
                <button class="tab-close" data-close-tab="${f.id}"><i class="fas fa-times"></i></button>
            </div>`;
        }).join('');

        // Events
        tabsEl.querySelectorAll('.tab-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.tab-close')) return;
                Store.setActiveFurniture(el.dataset.fid);
            });
        });
        tabsEl.querySelectorAll('.tab-close').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = el.dataset.closeTab;
                if (confirm('Usunąć mebel z projektu?')) {
                    Store.removeFurniture(id);
                    notify('Mebel usunięty', 'info');
                }
            });
        });
    }

    // ═══════════════════════════════════════════════════════
    // SIDEBAR — Furniture list
    // ═══════════════════════════════════════════════════════
    function renderSidebar() {
        const listEl = document.getElementById('furniture-list');
        const countEl = document.getElementById('furniture-count');
        if (!listEl) return;

        const state = Store.getState();
        const furniture = state.furniture;

        if (countEl) countEl.textContent = `(${furniture.length})`;

        if (furniture.length === 0) {
            listEl.innerHTML = '<div style="text-align:center;color:#8690a2;padding:20px;font-size:12px">Brak mebli w projekcie</div>';
            return;
        }

        listEl.innerHTML = furniture.map(f => {
            const mat = Store.getMaterial(f.materialId);
            const active = f.id === state.activeFurnitureId ? 'active' : '';
            const locked = f.locked ? 'locked' : '';
            const typeLabel = { cabinet: 'Szafka', shelf: 'Regał', drawer_unit: 'Komoda', panel: 'Płyta' }[f.type] || f.type;
            const validation = Models.validateFurniture(f);
            const hasBadge = validation.errors.length > 0 || validation.warnings.length > 0;
            const badgeColor = validation.errors.length > 0 ? '#ef4444' : '#f59e0b';
            const badgeTitle = [...validation.errors, ...validation.warnings].join('\n');
            const badge = hasBadge ? `<span class="fl-validation-badge" title="${badgeTitle.replace(/"/g, '&quot;')}" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:${badgeColor};color:#fff;font-size:9px;font-weight:700;flex-shrink:0;margin-right:4px"><i class="fas fa-${validation.errors.length > 0 ? 'times' : 'exclamation'}"></i></span>` : '';
            return `<div class="fl-item ${active} ${locked}" data-fid="${f.id}">
                <div class="fl-color" style="background:${mat ? mat.color : '#ccc'}"></div>
                <div class="fl-info">
                    <div class="fl-name">${badge}${f.name}</div>
                    <div class="fl-dims">${typeLabel} • ${f.width}×${f.height}×${f.depth}</div>
                </div>
                <div class="fl-actions">
                    <button class="fl-act" title="Duplikuj" data-dup="${f.id}"><i class="fas fa-copy"></i></button>
                    <button class="fl-act" title="Zablokuj" data-lock="${f.id}"><i class="fas fa-${f.locked ? 'lock' : 'lock-open'}"></i></button>
                    <button class="fl-act danger" title="Usuń" data-del="${f.id}"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }).join('');

        // Events
        listEl.querySelectorAll('.fl-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.fl-act')) return;
                Store.setActiveFurniture(el.dataset.fid);
            });
        });
        listEl.querySelectorAll('[data-dup]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                Store.duplicateFurniture(el.dataset.dup);
                notify('Mebel zduplikowany', 'success');
            });
        });
        listEl.querySelectorAll('[data-lock]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                Store.toggleFurnitureLock(el.dataset.lock);
            });
        });
        listEl.querySelectorAll('[data-del]').forEach(el => {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Usunąć ten mebel?')) {
                    Store.removeFurniture(el.dataset.del);
                    notify('Mebel usunięty', 'info');
                }
            });
        });
    }

    // ═══════════════════════════════════════════════════════
    // PROPERTIES PANEL
    // ═══════════════════════════════════════════════════════
    function renderProperties() {
        const body = document.getElementById('props-body');
        const header = document.getElementById('props-header');
        const headerActions = document.getElementById('props-header-actions');
        if (!body) return;

        const state = Store.getState();
        const furniture = Store.getActiveFurniture();
        const selEl = Store.getSelectedElement();

        if (selEl && furniture) {
            renderElementProperties(body, headerActions, furniture, selEl);
        } else if (furniture) {
            renderFurnitureProperties(body, headerActions, furniture);
        } else {
            body.innerHTML = '<div class="props-empty"><i class="fas fa-mouse-pointer"></i><p>Zaznacz element w widoku 3D lub dodaj mebel</p></div>';
            if (headerActions) headerActions.innerHTML = '';
        }
    }

    // ─── Furniture Properties ───
    function renderFurnitureProperties(body, headerActions, furniture) {
        if (headerActions) {
            headerActions.innerHTML = `<button class="btn-sm btn-ghost" id="btn-regen" title="Przebuduj mebel"><i class="fas fa-sync"></i></button>`;
        }

        const typeLabel = { cabinet: 'Szafka z półkami', shelf: 'Regał', drawer_unit: 'Komoda z szufladami', panel: 'Pojedyncza płyta' }[furniture.type] || furniture.type;
        const mat = Store.getMaterial(furniture.materialId);
        const validation = Models.validateFurniture(furniture);

        let html = '';

        // ── Info section ──
        html += `<div class="prop-section">
            <div class="prop-section-title"><i class="fas fa-cube"></i> Informacje</div>
            <div class="prop-row">
                <span class="prop-label">Nazwa</span>
                <div class="prop-value"><input class="prop-input" type="text" value="${furniture.name}" data-fp="name"></div>
            </div>
            <div class="prop-row">
                <span class="prop-label">Typ</span>
                <span class="prop-value" style="font-size:12px">${typeLabel}</span>
            </div>
        </div>`;

        // ── Dimensions ──
        html += `<div class="prop-section">
            <div class="prop-section-title"><i class="fas fa-ruler-combined"></i> Wymiary</div>
            <div class="prop-dims">
                <div class="prop-dim-item"><label>Szer.</label><input type="number" value="${furniture.width}" data-fp="width" min="100" max="3000"></div>
                <div class="prop-dim-item"><label>Wys.</label><input type="number" value="${furniture.height}" data-fp="height" min="100" max="3000"></div>
                <div class="prop-dim-item"><label>Głęb.</label><input type="number" value="${furniture.depth}" data-fp="depth" min="100" max="1200"></div>
            </div>
        </div>`;

        // ── Material ──
        const edgeBand = Store.getEdgeBand(furniture.edgeBandId);
        html += `<div class="prop-section">
            <div class="prop-section-title"><i class="fas fa-palette"></i> Materiał</div>
            <div class="prop-row">
                <span class="prop-label">Płyta</span>
                <div class="prop-value">
                    <select class="prop-input" data-fp="materialId">
                        ${MATERIALS.filter(m => m.type !== 'hdf').map(m => `<option value="${m.id}" ${m.id === furniture.materialId ? 'selected' : ''}>${m.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="prop-row">
                <span class="prop-label">Grubość płyty</span>
                <span class="prop-value" style="font-size:12px">${furniture.thickness} mm</span>
            </div>
            <div class="prop-row">
                <span class="prop-label">Obrzeże</span>
                <span class="prop-value" style="font-size:12px">${edgeBand ? edgeBand.name : '—'} (kolor = płyta)</span>
            </div>
        </div>`;

        // ── Construction options ──
        if (furniture.type === 'cabinet' || furniture.type === 'drawer_unit' || furniture.type === 'shelf') {
            const bbType = furniture.baseboardType || (furniture.hasBaseboard ? 'maskownica' : 'none');
            const topOpt = furniture.topOption || 'none';
            html += `<div class="prop-section">
                <div class="prop-section-title"><i class="fas fa-cog"></i> Konstrukcja</div>
                <div class="prop-row">
                    <span class="prop-label">Plecy</span>
                    <div class="prop-value"><select class="prop-input" data-fp="backMaterial">
                        <option value="none" ${!furniture.hasBack ? 'selected' : ''}>Brak</option>
                        <option value="hdf3" ${furniture.hasBack && furniture.backMaterial === 'hdf3' ? 'selected' : ''}>HDF 3mm</option>
                        <option value="plate18" ${furniture.hasBack && furniture.backMaterial === 'plate18' ? 'selected' : ''}>Płyta 18mm</option>
                    </select></div>
                </div>
                <div class="prop-row">
                    <span class="prop-label">Cofnięcie półek</span>
                    <div class="prop-value"><input class="prop-input-sm" type="number" value="${furniture.backOffset || 0}" data-fp="backOffset" min="0" max="100"> mm</div>
                </div>
                <div class="prop-row">
                    <span class="prop-label">Maskownica górna</span>
                    <div class="prop-value"><select class="prop-input" data-fp="topOption">
                        <option value="none" ${topOpt === 'none' ? 'selected' : ''}>Brak</option>
                        <option value="maskownica" ${topOpt === 'maskownica' ? 'selected' : ''}>Maskownica</option>
                    </select></div>
                </div>
                <div class="prop-row">
                    <span class="prop-label">Cokół / mask. dolna</span>
                    <div class="prop-value"><select class="prop-input" data-fp="baseboardType">
                        <option value="none" ${bbType === 'none' ? 'selected' : ''}>Brak</option>
                        <option value="maskownica" ${bbType === 'maskownica' ? 'selected' : ''}>Maskownica</option>
                        <option value="cokol" ${bbType === 'cokol' ? 'selected' : ''}>Cokół</option>
                    </select></div>
                </div>
                ${bbType === 'cokol' ? `<div class="prop-row">
                    <span class="prop-label">Wys. cokołu</span>
                    <div class="prop-value"><input class="prop-input-sm" type="number" value="${furniture.baseboardHeight || 100}" data-fp="baseboardHeight" min="50" max="200"> mm</div>
                </div>` : ''}
                ${furniture.type === 'cabinet' || furniture.type === 'shelf' ? `<div class="prop-row">
                    <span class="prop-label">Półki</span>
                    <div class="prop-value"><input class="prop-input-sm" type="number" value="${furniture.shelfCount || 0}" data-fp="shelfCount" min="0" max="20"></div>
                </div>` : ''}
                ${furniture.type === 'drawer_unit' ? `<div class="prop-row">
                    <span class="prop-label">Szuflady</span>
                    <div class="prop-value"><input class="prop-input-sm" type="number" value="${furniture.drawerCount || 3}" data-fp="drawerCount" min="1" max="10"></div>
                </div>` : ''}
            </div>`;
        }

        // ── Door options (cabinet) ──
        if (furniture.type === 'cabinet') {
            const dg = furniture.doorGap || { top: 2, bottom: 2, left: 2, right: 2, between: 3 };
            html += `<div class="prop-section">
                <div class="prop-section-title"><i class="fas fa-door-open"></i> Drzwiczki</div>
                <div class="prop-row">
                    <span class="prop-label">Drzwi</span>
                    <div class="prop-value"><label class="check-label"><input type="checkbox" data-fp="hasDoors" ${furniture.hasDoors ? 'checked' : ''}> Włączone</label></div>
                </div>
                ${furniture.hasDoors ? `
                <div class="prop-row">
                    <span class="prop-label">Liczba</span>
                    <div class="prop-value"><select class="prop-input" data-fp="doorCount">
                        <option value="1" ${(furniture.doorCount || 1) === 1 ? 'selected' : ''}>1 drzwi</option>
                        <option value="2" ${(furniture.doorCount || 1) === 2 ? 'selected' : ''}>2 drzwi</option>
                    </select></div>
                </div>
                <div class="prop-row">
                    <span class="prop-label">Luz G/D</span>
                    <div class="prop-value" style="display:flex;gap:4px;align-items:center">
                        <input class="prop-input-sm" type="number" value="${dg.top}" data-fp-door-gap="top" min="0" max="10" step="0.5" style="width:50px"> /
                        <input class="prop-input-sm" type="number" value="${dg.bottom}" data-fp-door-gap="bottom" min="0" max="10" step="0.5" style="width:50px"> mm
                    </div>
                </div>
                <div class="prop-row">
                    <span class="prop-label">Luz L/P</span>
                    <div class="prop-value" style="display:flex;gap:4px;align-items:center">
                        <input class="prop-input-sm" type="number" value="${dg.left}" data-fp-door-gap="left" min="0" max="10" step="0.5" style="width:50px"> /
                        <input class="prop-input-sm" type="number" value="${dg.right}" data-fp-door-gap="right" min="0" max="10" step="0.5" style="width:50px"> mm
                    </div>
                </div>
                ${(furniture.doorCount || 1) >= 2 ? `<div class="prop-row">
                    <span class="prop-label">Między</span>
                    <div class="prop-value"><input class="prop-input-sm" type="number" value="${dg.between}" data-fp-door-gap="between" min="0" max="10" step="0.5"> mm</div>
                </div>` : ''}
                ` : ''}
            </div>`;
        }

        // ── Validation ──
        html += `<div class="prop-section">
            <div class="prop-section-title"><i class="fas fa-shield-alt"></i> Walidacja</div>
            ${validation.errors.length === 0 && validation.warnings.length === 0
                ? `<div class="badge success" style="margin-bottom:4px;display:flex"><i class="fas fa-check-circle"></i> Brak problemów — mebel poprawny</div>`
                : `${validation.errors.map(e => `<div class="badge danger" style="margin-bottom:4px;display:flex"><i class="fas fa-times-circle"></i> ${e}</div>`).join('')}${validation.warnings.map(w => `<div class="badge warn" style="margin-bottom:4px;display:flex"><i class="fas fa-exclamation-triangle"></i> ${w}</div>`).join('')}`
            }
        </div>`;

        // ── Elements list ──
        const activeElements = furniture.elements.filter(e => !e.deleted);
        html += `<div class="prop-section">
            <div class="prop-section-title"><i class="fas fa-layer-group"></i> Elementy (${activeElements.length})
                <button class="btn-sm btn-ghost" style="margin-left:auto;font-size:10px" id="btn-add-shelf-prop"><i class="fas fa-plus"></i> Półka</button>
            </div>
            <div class="elem-list">
                ${activeElements.map((el, idx) => {
                    const hidden = !el.visible ? 'hidden-el' : '';
                    return `<div class="elem-item ${hidden}" data-eid="${el.id}">
                        <span class="elem-color" style="background:${el.color}"></span>
                        <span class="elem-name">${el.elementNumber || idx + 1}. ${el.name}</span>
                        <span class="elem-dims">${el.length}×${el.width}</span>
                        <div class="elem-acts">
                            <button class="elem-act" title="Zaznacz" data-sel="${el.id}"><i class="fas fa-crosshairs"></i></button>
                            <button class="elem-act" title="${el.visible ? 'Ukryj' : 'Pokaż'}" data-vis="${el.id}"><i class="fas fa-${el.visible ? 'eye' : 'eye-slash'}"></i></button>
                            <button class="elem-act" title="Usuń" data-rem="${el.id}"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>`;

        body.innerHTML = html;

        // ── Bind events ──
        bindFurniturePropertyEvents(body, furniture);
    }

    function bindFurniturePropertyEvents(body, furniture) {
        // Text/number inputs
        body.querySelectorAll('[data-fp]').forEach(input => {
            const prop = input.dataset.fp;
            const handler = () => {
                let val = input.type === 'checkbox' ? input.checked : input.value;
                if (input.type === 'number') val = parseFloat(val) || 0;

                const updates = { [prop]: val };

                // When backMaterial changes, derive hasBack from it
                if (prop === 'backMaterial') {
                    updates.hasBack = value !== 'none';
                    if (value === 'none') updates.backMaterial = 'hdf3';
                }
                // When baseboardType changes, also update hasBaseboard flag
                if (prop === 'baseboardType') {
                    updates.hasBaseboard = val !== 'none';
                }

                // When material changes, also update thickness and edge band to match
                if (prop === 'materialId') {
                    const newMat = Store.getMaterial(val);
                    if (newMat) {
                        updates.thickness = newMat.thickness;
                        // Auto-match edge band color to new material
                        const currentEdge = Store.getEdgeBand(furniture.edgeBandId);
                        const edgeThickness = currentEdge ? currentEdge.thickness : 2;
                        updates.edgeBandId = Store.findOrCreateEdgeBand(newMat.color, edgeThickness);
                    }
                }

                // When doorCount changes, convert from string to number
                if (prop === 'doorCount') {
                    updates.doorCount = parseInt(val) || 1;
                }

                Store.updateFurniture(furniture.id, updates);

                // Regenerate geometry for structural changes
                const structural = ['width', 'height', 'depth', 'thickness', 'materialId', 'edgeBandId',
                    'shelfCount', 'hasBack', 'backMaterial', 'backOffset', 'hasBaseboard', 'baseboardType', 'baseboardHeight', 'topOption',
                    'drawerCount', 'hasTop', 'hasBottom', 'hasDoors', 'doorCount', 'doorGap'];
                if (structural.includes(prop)) {
                    const updated = Store.getFurniture(furniture.id);
                    const regen = Models.regenerateFurniture(updated);
                    Store.updateFurniture(furniture.id, { elements: regen.elements });
                }
            };
            if (input.type === 'checkbox') {
                input.addEventListener('change', handler);
            } else {
                input.addEventListener('change', handler);
            }
        });

        // Door gap inputs
        body.querySelectorAll('[data-fp-door-gap]').forEach(input => {
            input.addEventListener('change', () => {
                const side = input.dataset.fpDoorGap;
                const currentGap = furniture.doorGap || { top: 2, bottom: 2, left: 2, right: 2, between: 3 };
                const newGap = { ...currentGap, [side]: parseFloat(input.value) || 0 };
                Store.updateFurniture(furniture.id, { doorGap: newGap });
                const updated = Store.getFurniture(furniture.id);
                const regen = Models.regenerateFurniture(updated);
                Store.updateFurniture(furniture.id, { elements: regen.elements });
            });
        });

        // Element list interactions
        body.querySelectorAll('[data-sel]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                Store.selectElement(btn.dataset.sel);
            });
        });
        body.querySelectorAll('[data-vis]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                Store.toggleElementVisibility(furniture.id, btn.dataset.vis);
            });
        });
        body.querySelectorAll('[data-rem]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                Store.removeElement(furniture.id, btn.dataset.rem);
                notify('Element usunięty', 'info');
            });
        });
        body.querySelectorAll('.elem-item').forEach(el => {
            el.addEventListener('click', () => {
                Store.selectElement(el.dataset.eid);
            });
        });

        // Add shelf button
        const addShelfBtn = document.getElementById('btn-add-shelf-prop');
        if (addShelfBtn) {
            addShelfBtn.addEventListener('click', () => {
                const T = furniture.thickness || 18;
                const innerW = furniture.width - 2 * T;
                const newShelf = Models.createElement({
                    name: `Półka ${furniture.elements.filter(e => e.type === 'shelf' && !e.deleted).length + 1}`,
                    type: 'shelf',
                    length: innerW,
                    width: furniture.depth - (furniture.backOffset || 0) - (furniture.hasBack ? (furniture.backMaterial === 'hdf3' ? 3 : T) : 0),
                    thickness: T,
                    x: T,
                    y: Math.round(furniture.height / 2),
                    z: 0,
                    materialId: furniture.materialId,
                    color: Store.getMaterial(furniture.materialId)?.color || '#CCC',
                    edgeBandId: furniture.edgeBandId,
                });
                Store.addElement(furniture.id, newShelf);
                notify('Półka dodana', 'success');
            });
        }

        // Regen button
        const regenBtn = document.getElementById('btn-regen');
        if (regenBtn) {
            regenBtn.addEventListener('click', () => {
                const f = Store.getFurniture(furniture.id);
                if (!f) return;
                const regen = Models.regenerateFurniture(f, false); // false = reset edges
                Store.updateFurniture(furniture.id, { elements: regen.elements });
                notify('Mebel przebudowany', 'success');
            });
        }
    }

    // ─── Element Properties ───
    function renderElementProperties(body, headerActions, furniture, el) {
        if (headerActions) {
            headerActions.innerHTML = `<button class="btn-sm btn-ghost" id="btn-back-to-furniture" title="Wróć do mebla"><i class="fas fa-arrow-left"></i></button>`;
        }

        const mat = Store.getMaterial(el.materialId) || MATERIALS[0];

        let html = '';

        // ── Element info ──
        html += `<div class="prop-section">
            <div class="prop-section-title"><i class="fas fa-vector-square"></i> ${el.name}
                <span class="badge ${el.visible ? 'success' : 'warn'}" style="margin-left:auto;font-size:9px">${el.visible ? 'Widoczny' : 'Ukryty'}</span>
            </div>
            <div class="prop-row">
                <span class="prop-label">Nazwa</span>
                <div class="prop-value"><input class="prop-input" type="text" value="${el.name}" data-ep="name"></div>
            </div>
            <div class="prop-row">
                <span class="prop-label">Typ</span>
                <span class="prop-value" style="font-size:12px">${el.type}</span>
            </div>
        </div>`;

        // ── Dimensions ──
        const _edgeT = (side) => {
            const e = (el.edges || {})[side];
            if (!e || !e.has || !e.bandId || e.bandId === 'none') return 0;
            const b = EDGE_BANDS.find(x => x.id === e.bandId);
            return b ? b.thickness : 0;
        };
        const cutLength = Math.round((el.length - _edgeT('left') - _edgeT('right')) * 10) / 10;
        const cutWidth  = Math.round((el.width  - _edgeT('front') - _edgeT('back'))  * 10) / 10;
        const hasCutDiff = cutLength !== el.length || cutWidth !== el.width;

        html += `<div class="prop-section">
            <div class="prop-section-title"><i class="fas fa-ruler-combined"></i> Wymiary formatki</div>
            <div class="prop-dims">
                <div class="prop-dim-item"><label>Długość</label><input type="number" value="${el.length}" data-ep="length" min="10" max="3000"></div>
                <div class="prop-dim-item"><label>Szerokość</label><input type="number" value="${el.width}" data-ep="width" min="10" max="3000"></div>
                <div class="prop-dim-item">
                    <label>Grubość</label>
                    <input type="number" value="${el.thickness}" data-ep="thickness" min="1" max="50" step="0.5" disabled title="Grubość wynika z wybranego materiału">
                </div>
            </div>
            ${hasCutDiff ? `<div class="prop-cut-dims">
                <i class="fas fa-cut" style="font-size:10px;margin-right:4px;color:#6b7280"></i>
                <span>Wymiar cięcia:</span>
                <strong>${cutLength} × ${cutWidth} mm</strong>
            </div>` : ''}
        </div>`;

        // ── Position ──
        html += `<div class="prop-section">
            <div class="prop-section-title"><i class="fas fa-arrows-alt"></i> Pozycja (mm)</div>
            <div class="prop-dims">
                <div class="prop-dim-item"><label>X</label><input type="number" value="${el.x}" data-ep="x"></div>
                <div class="prop-dim-item"><label>Y</label><input type="number" value="${el.y}" data-ep="y"></div>
                <div class="prop-dim-item"><label>Z</label><input type="number" value="${el.z}" data-ep="z"></div>
            </div>
        </div>`;

        // ── Material ──
        html += `<div class="prop-section">
            <div class="prop-section-title"><i class="fas fa-palette"></i> Materiał</div>
            <div class="prop-row">
                <span class="prop-label">Płyta</span>
                <div class="prop-value">
                    <select class="prop-input" data-ep="materialId">
                        ${MATERIALS.map(m => `<option value="${m.id}" ${m.id === el.materialId ? 'selected' : ''}>${m.name}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div class="prop-row">
                <span class="prop-label">Kolor</span>
                <div class="prop-value" style="display:flex;align-items:center;gap:8px">
                    <input type="color" value="${el.color}" data-ep="color" style="width:32px;height:24px;border:1px solid #ddd;border-radius:4px;cursor:pointer">
                    <code style="font-size:10px">${el.color}</code>
                </div>
            </div>
            <div class="prop-row">
                <span class="prop-label">Usłojenie</span>
                <div class="prop-value">
                    <select class="prop-input" data-ep="grain">
                        <option value="R" ${el.grain === 'R' ? 'selected' : ''}>R — wzdłuż długości</option>
                        <option value="N" ${el.grain === 'N' ? 'selected' : ''}>N — brak</option>
                    </select>
                </div>
            </div>
        </div>`;

        // ── Edge bands ──
        const renderEdge = (side, label) => {
            const edge = el.edges[side] || { has: false, bandId: 'none' };
            return `<div class="edge-item ${edge.has ? 'active' : ''}" data-edge-side="${side}">
                <input type="checkbox" ${edge.has ? 'checked' : ''} data-edge-toggle="${side}">
                <span class="edge-item-label">${label}</span>
                ${edge.has ? `<select class="prop-input" style="flex:1;padding:2px 4px;font-size:10px" data-edge-band="${side}">
                    ${EDGE_BANDS.filter(e => e.id !== 'none').map(e => `<option value="${e.id}" ${e.id === edge.bandId ? 'selected' : ''}>${e.name}</option>`).join('')}
                </select>` : ''}
            </div>`;
        };

        html += `<div class="prop-section">
            <div class="prop-section-title"><i class="fas fa-border-style"></i> Obrzeża</div>
            <div class="edge-grid">
                ${renderEdge('front', 'Przód')}
                ${renderEdge('back', 'Tył')}
                ${renderEdge('left', 'Lewo')}
                ${renderEdge('right', 'Prawo')}
            </div>
        </div>`;

        // ── Notes ──
        html += `<div class="prop-section">
            <div class="prop-section-title"><i class="fas fa-sticky-note"></i> Notatki</div>
            <textarea class="prop-input" data-ep="notes" rows="2" style="resize:vertical">${el.notes || ''}</textarea>
        </div>`;

        // ── Actions ──
        html += `<div class="prop-section">
            <div style="display:flex;gap:6px">
                <button class="btn-sm btn-ghost" id="btn-toggle-vis-el"><i class="fas fa-${el.visible ? 'eye-slash' : 'eye'}"></i> ${el.visible ? 'Ukryj' : 'Pokaż'}</button>
                <button class="btn-sm btn-danger" id="btn-delete-el"><i class="fas fa-trash"></i> Usuń element</button>
            </div>
        </div>`;

        body.innerHTML = html;

        // ── Bind events ──
        bindElementPropertyEvents(body, furniture, el);
    }

    function bindElementPropertyEvents(body, furniture, el) {
        // Back to furniture view
        const backBtn = document.getElementById('btn-back-to-furniture');
        if (backBtn) {
            backBtn.addEventListener('click', () => Store.selectElement(null));
        }

        // Property inputs
        body.querySelectorAll('[data-ep]').forEach(input => {
            const prop = input.dataset.ep;
            const handler = () => {
                let val = input.value;
                if (input.type === 'number') val = parseFloat(val) || 0;

                const updates = { [prop]: val };

                // When material changes, also update color
                if (prop === 'materialId') {
                    const newMat = Store.getMaterial(val);
                    if (newMat) {
                        updates.color = newMat.color;
                        updates.thickness = newMat.thickness;
                    }
                }

                Store.updateElement(furniture.id, el.id, updates);
            };
            input.addEventListener('change', handler);
        });

        // Edge toggles
        body.querySelectorAll('[data-edge-toggle]').forEach(cb => {
            cb.addEventListener('change', () => {
                const side = cb.dataset.edgeToggle;
                const newEdges = JSON.parse(JSON.stringify(el.edges));
                newEdges[side].has = cb.checked;
                if (!cb.checked) newEdges[side].bandId = 'none';
                else newEdges[side].bandId = furniture.edgeBandId || 'edge_bialy_2';
                Store.updateElement(furniture.id, el.id, { edges: newEdges });
            });
        });

        // Edge band selects
        body.querySelectorAll('[data-edge-band]').forEach(sel => {
            sel.addEventListener('change', () => {
                const side = sel.dataset.edgeBand;
                const newEdges = JSON.parse(JSON.stringify(el.edges));
                newEdges[side].bandId = sel.value;
                Store.updateElement(furniture.id, el.id, { edges: newEdges });
            });
        });

        // Visibility toggle
        const visBtn = document.getElementById('btn-toggle-vis-el');
        if (visBtn) {
            visBtn.addEventListener('click', () => {
                Store.toggleElementVisibility(furniture.id, el.id);
            });
        }

        // Delete
        const delBtn = document.getElementById('btn-delete-el');
        if (delBtn) {
            delBtn.addEventListener('click', () => {
                Store.removeElement(furniture.id, el.id);
                notify('Element usunięty', 'info');
            });
        }
    }

    // ═══════════════════════════════════════════════════════
    // Empty state toggle
    // ═══════════════════════════════════════════════════════
    function updateEmptyState() {
        const el = document.getElementById('vp-empty');
        if (!el) return;
        const state = Store.getState();
        el.style.display = state.furniture.length === 0 ? 'block' : 'none';
    }

    // ═══════════════════════════════════════════════════════
    // Undo/redo button states
    // ═══════════════════════════════════════════════════════
    function updateUndoRedo() {
        const undoBtn = document.getElementById('btn-undo');
        const redoBtn = document.getElementById('btn-redo');
        if (undoBtn) undoBtn.disabled = !Store.canUndo();
        if (redoBtn) redoBtn.disabled = !Store.canRedo();
    }

    // ═══════════════════════════════════════════════════════
    // Full UI refresh
    // ═══════════════════════════════════════════════════════
    function refreshAll(changeType) {
        renderTabs();
        renderSidebar();
        renderProperties();
        updateEmptyState();
        updateUndoRedo();

        // Rebuild 3D scene for structural changes
        const sceneChanges = ['furniture-add', 'furniture-remove', 'furniture-update', 'element-add',
            'element-remove', 'element-update', 'active-change', 'view', 'import', 'undo', 'redo', 'reset', 'batch'];
        if (!changeType || sceneChanges.includes(changeType)) {
            if (FP.Viewport) FP.Viewport.buildScene();
        }
        // For selection-only changes, just refresh highlight
        if (changeType === 'selection') {
            if (FP.Viewport) FP.Viewport.refreshHighlight();
        }

        // Show toast notifications for validation issues — only when errors change (deduped)
        const notifyChanges = ['furniture-add', 'furniture-update', 'element-update', 'undo', 'redo'];
        if (!changeType || notifyChanges.includes(changeType)) {
            const active = Store.getActiveFurniture();
            if (active) {
                const v = Models.validateFurniture(active);
                const key = active.id + ':' + v.errors.join('|') + '~' + v.warnings.join('|');
                if (key !== refreshAll._lastValidationKey) {
                    refreshAll._lastValidationKey = key;
                    v.errors.forEach(e => notify(e, 'error'));
                    v.warnings.forEach(w => notify(w, 'warn'));
                }
            } else {
                refreshAll._lastValidationKey = null;
            }
        }
    }

    // Export
    FP.UI = {
        notify,
        renderTabs,
        renderSidebar,
        renderProperties,
        updateEmptyState,
        updateUndoRedo,
        refreshAll,
    };

})(window.FP);
