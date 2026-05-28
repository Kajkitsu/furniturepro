/* ═══════════════════════════════════════════════════════
   FurniturePro — Main App Entry Point
   ═══════════════════════════════════════════════════════ */

(function(FP) {
    'use strict';

    const { Store, Models, Viewport, Export, UI, MATERIALS, EDGE_BANDS } = FP;

    // ═══════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════
    document.addEventListener('DOMContentLoaded', () => {
        console.log('FurniturePro v2.0 — initializing...');

        // 1. Init 3D viewport
        Viewport.init();

        // 2. Subscribe store -> UI refresh
        Store.subscribe((state, changeType) => {
            UI.refreshAll(changeType);
        });

        // 3. Populate form dropdowns
        populateFormDropdowns();

        // 4. Bind all top-level events
        bindTopbarEvents();
        bindSidebarEvents();
        bindViewportEvents();
        bindModalEvents();
        bindKeyboardShortcuts();

        // 5. Initial UI render
        UI.refreshAll();

        // 6. Handle resize
        window.addEventListener('resize', () => Viewport.onResize());

        // 7. Auto-save to localStorage
        Store.subscribe(() => {
            try {
                localStorage.setItem('fp_autosave', Store.exportProject());
            } catch(e) {}
        });

        // 8. Try restore autosave
        try {
            const saved = localStorage.getItem('fp_autosave');
            if (saved) {
                const data = JSON.parse(saved);
                if (data.furniture && data.furniture.length > 0) {
                    Store.importProject(data);
                    UI.notify('Projekt przywrócony z autosave', 'info');
                }
            }
        } catch(e) {}

        console.log('FurniturePro ready.');
    });

    // ═══════════════════════════════════════════════════════
    // POPULATE DROPDOWNS
    // ═══════════════════════════════════════════════════════
    function populateFormDropdowns() {
        // Material select in new furniture form
        const matSel = document.getElementById('nf-material');
        if (matSel) {
            matSel.innerHTML = MATERIALS.filter(m => m.type !== 'hdf').map(m =>
                `<option value="${m.id}" ${m.id === 'lam_bialy_18' ? 'selected' : ''}>${m.name}</option>`
            ).join('');
        }

        // Edge band select in new furniture form
        const edgeSel = document.getElementById('nf-edge-band');
        if (edgeSel) {
            edgeSel.innerHTML = EDGE_BANDS.filter(e => e.id !== 'none').map(e =>
                `<option value="${e.id}" ${e.id === 'edge_bialy_2' ? 'selected' : ''}>${e.name} — ${e.code}</option>`
            ).join('');
        }
    }

    // ═══════════════════════════════════════════════════════
    // TOPBAR EVENTS
    // ═══════════════════════════════════════════════════════
    function bindTopbarEvents() {
        // Undo/Redo
        document.getElementById('btn-undo')?.addEventListener('click', () => {
            Store.undo();
            UI.notify('Cofnięto', 'info');
        });
        document.getElementById('btn-redo')?.addEventListener('click', () => {
            Store.redo();
            UI.notify('Ponowiono', 'info');
        });

        // Save project
        document.getElementById('btn-save-project')?.addEventListener('click', () => {
            const json = Store.exportProject();
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const name = Store.getState().project.name || 'projekt';
            a.download = `${name.replace(/\s+/g, '_')}.json`;
            a.click();
            URL.revokeObjectURL(url);
            UI.notify('Projekt zapisany do pliku JSON', 'success');
        });

        // Import project
        document.getElementById('btn-load-project')?.addEventListener('click', () => {
            document.getElementById('file-import')?.click();
        });
        document.getElementById('file-import')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const ok = Store.importProject(ev.target.result);
                if (ok) {
                    UI.notify('Projekt zaimportowany pomyślnie', 'success');
                    Viewport.fitView();
                } else {
                    UI.notify('Błąd importu - nieprawidłowy format', 'error');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });

        // Cutting list modal
        document.getElementById('btn-cutting-list')?.addEventListener('click', () => {
            openCuttingListModal();
        });

        // Materials modal
        document.getElementById('btn-materials')?.addEventListener('click', () => {
            openMaterialsModal();
        });

        // Materials import file
        document.getElementById('file-import-materials')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (Store.importMaterials(ev.target.result)) {
                    UI.notify('Materiały zaimportowane', 'success');
                    renderMaterialsLists();
                } else {
                    UI.notify('Błąd importu materiałów', 'error');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        });

        // Export CSV — removed (moved to Formatki modal)
    }

    // ═══════════════════════════════════════════════════════
    // SIDEBAR EVENTS
    // ═══════════════════════════════════════════════════════
    function bindSidebarEvents() {
        // Quick add buttons (sole add furniture entry points)
        document.getElementById('btn-add-cabinet')?.addEventListener('click', () => {
            openNewFurnitureModal('cabinet');
        });
        document.getElementById('btn-add-shelf')?.addEventListener('click', () => {
            openNewFurnitureModal('shelf');
        });
        document.getElementById('btn-add-drawer')?.addEventListener('click', () => {
            openNewFurnitureModal('drawer_unit');
        });
        document.getElementById('btn-add-panel')?.addEventListener('click', () => {
            openNewFurnitureModal('panel');
        });

        // Empty state new button
        document.getElementById('btn-empty-new')?.addEventListener('click', () => {
            openNewFurnitureModal();
        });

        // Project name/room
        document.getElementById('project-name')?.addEventListener('change', (e) => {
            Store.setProjectName(e.target.value);
        });
        document.getElementById('project-room')?.addEventListener('change', (e) => {
            Store.setProjectRoom(e.target.value);
        });
    }

    // ═══════════════════════════════════════════════════════
    // VIEWPORT EVENTS
    // ═══════════════════════════════════════════════════════
    function bindViewportEvents() {
        // View buttons
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                Viewport.setView(btn.dataset.view);
            });
        });

        // Toggle grid
        document.getElementById('btn-toggle-grid')?.addEventListener('click', () => {
            Store.toggleGrid();
        });

        // Toggle labels
        document.getElementById('btn-toggle-labels')?.addEventListener('click', () => {
            Store.toggleLabels();
        });

        // Toggle back panels
        document.getElementById('btn-toggle-back')?.addEventListener('click', () => {
            Store.toggleBackPanels();
        });

        // Exploded view
        document.getElementById('btn-exploded')?.addEventListener('click', () => {
            Store.toggleExploded();
        });

        // Toggle doors open/closed
        document.getElementById('btn-toggle-doors')?.addEventListener('click', () => {
            Store.toggleDoors();
        });

        // Fit view
        document.getElementById('btn-fit-view')?.addEventListener('click', () => {
            Viewport.fitView();
        });
    }

    // ═══════════════════════════════════════════════════════
    // MODAL EVENTS
    // ═══════════════════════════════════════════════════════
    function bindModalEvents() {
        // Close buttons
        document.querySelectorAll('[data-close-modal]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal-overlay');
                if (modal) modal.style.display = 'none';
            });
        });

        // Close on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.style.display = 'none';
            });
        });

        // Type change in new furniture form
        document.getElementById('nf-type')?.addEventListener('change', updateFormVisibility);

        // Baseboard type change — show/hide height field
        document.getElementById('nf-baseboard-type')?.addEventListener('change', () => {
            const val = document.getElementById('nf-baseboard-type')?.value;
            const hGroup = document.getElementById('nf-baseboard-h-group');
            if (hGroup) hGroup.style.display = val === 'cokol' ? '' : 'none';
        });

        // Door count — show/hide "between" gap field
        document.getElementById('nf-door-count')?.addEventListener('change', () => {
            const doorCount = parseInt(document.getElementById('nf-door-count')?.value) || 1;
            const betweenRow = document.getElementById('nf-door-between-row');
            if (betweenRow) betweenRow.style.display = doorCount >= 2 ? '' : 'none';
        });

        // Create furniture button
        document.getElementById('btn-create-furniture')?.addEventListener('click', createFurnitureFromForm);

        // Cutting list modal events
        document.getElementById('cl-aggregate')?.addEventListener('change', () => refreshCuttingList());
        document.getElementById('cl-furniture-filter')?.addEventListener('change', () => refreshCuttingList());

        // Order button
        document.getElementById('btn-download-order')?.addEventListener('click', () => exportMeblePl());
    }

    // ═══════════════════════════════════════════════════════
    // KEYBOARD SHORTCUTS
    // ═══════════════════════════════════════════════════════
    function bindKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't capture when typing in inputs
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

            if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                Store.undo();
            }
            if (e.ctrlKey && e.key === 'y') {
                e.preventDefault();
                Store.redo();
            }
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                openNewFurnitureModal();
            }
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                document.getElementById('btn-save-project')?.click();
            }
            if (e.key === 'Delete') {
                const state = Store.getState();
                if (state.selectedElementId && state.activeFurnitureId) {
                    Store.removeElement(state.activeFurnitureId, state.selectedElementId);
                    UI.notify('Element usunięty', 'info');
                }
            }
            if (e.key === 'Escape') {
                Store.selectElement(null);
                document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
            }
            if (e.key === 'f' || e.key === 'F') {
                Viewport.fitView();
            }
        });
    }

    // ═══════════════════════════════════════════════════════
    // MODAL HELPERS
    // ═══════════════════════════════════════════════════════
    function openModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'flex';
    }

    function closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.style.display = 'none';
    }

    // Open the new furniture modal with optional pre-selected type
    function openNewFurnitureModal(type) {
        populateFormDropdowns();

        if (type) {
            const typeEl = document.getElementById('nf-type');
            if (typeEl) typeEl.value = type;
            updateFormVisibility();
        }
        openModal('modal-new-furniture');
    }

    function updateFormVisibility() {
        const type = document.getElementById('nf-type')?.value;
        const cabinetOpts = document.getElementById('nf-cabinet-opts');
        const drawerOpts = document.getElementById('nf-drawer-opts');
        const depthEl = document.getElementById('nf-depth');
        const depthGroup = depthEl?.closest('.form-group');
        const baseboardTypeEl = document.getElementById('nf-baseboard-type');
        const baseboardHGroup = document.getElementById('nf-baseboard-h-group');

        if (cabinetOpts) cabinetOpts.style.display = (type === 'cabinet' || type === 'shelf') ? 'block' : 'none';
        if (drawerOpts) drawerOpts.style.display = type === 'drawer_unit' ? 'block' : 'none';
        if (depthGroup) depthGroup.style.display = type === 'panel' ? 'none' : '';
        // nf-top-bottom-row removed — top/bottom now via selects
        // Show door options only for cabinet
        const doorOpts = document.getElementById('nf-door-opts');
        if (doorOpts) doorOpts.style.display = type === 'cabinet' ? 'block' : 'none';
        // Reset between-row visibility based on current door count
        if (type === 'cabinet') {
            const doorCount = parseInt(document.getElementById('nf-door-count')?.value) || 1;
            const betweenRow = document.getElementById('nf-door-between-row');
            if (betweenRow) betweenRow.style.display = doorCount >= 2 ? '' : 'none';
        }
        // Show baseboard height only for cokół
        if (baseboardHGroup && baseboardTypeEl) {
            baseboardHGroup.style.display = (baseboardTypeEl.value === 'cokol') ? '' : 'none';
        }

        // Update default dimensions based on type
        const widthEl = document.getElementById('nf-width');
        const heightEl = document.getElementById('nf-height');
        const nameEl = document.getElementById('nf-name');

        const defaults = {
            cabinet:     { w: 800, h: 720, d: 560, name: 'Szafka' },
            shelf:       { w: 800, h: 300, d: 250, name: 'Regał' },
            drawer_unit: { w: 600, h: 720, d: 500, name: 'Komoda' },
            panel:       { w: 800, h: 400, d: 18,  name: 'Płyta' },
        };
        const d = defaults[type] || defaults.cabinet;
        if (widthEl) widthEl.value = d.w;
        if (heightEl) heightEl.value = d.h;
        if (depthEl) depthEl.value = d.d;
        if (nameEl && (nameEl.value === 'Szafka' || nameEl.value === 'Regał' || nameEl.value === 'Komoda' || nameEl.value === 'Płyta')) {
            nameEl.value = d.name;
        }
    }

    // ═══════════════════════════════════════════════════════
    // CREATE FURNITURE FROM FORM
    // ═══════════════════════════════════════════════════════
    function createFurnitureFromForm() {
        const type = document.getElementById('nf-type')?.value || 'cabinet';

        // ── Resolve material ──
        const matSelectVal = document.getElementById('nf-material')?.value || 'lam_bialy_18';
        const materialId = matSelectVal;
        const mat = Store.getMaterial(materialId);
        const materialColor = mat?.color || '#CCCCCC';
        const materialThickness = mat?.thickness || 18;

        // ── Resolve edge band (user picks from dropdown) ──
        const edgeBandId = document.getElementById('nf-edge-band')?.value || 'edge_bialy_2';

        const params = {
            name:            document.getElementById('nf-name')?.value || 'Mebel',
            width:           parseInt(document.getElementById('nf-width')?.value) || 800,
            height:          parseInt(document.getElementById('nf-height')?.value) || 720,
            depth:           parseInt(document.getElementById('nf-depth')?.value) || 560,
            materialId:      materialId,
            edgeBandId:      edgeBandId,
            thickness:       materialThickness,
            shelfCount:      parseInt(document.getElementById('nf-shelves')?.value) || 0,
            hasBack:         (document.getElementById('nf-back-material')?.value || 'hdf3') !== 'none',
            backMaterial:    (() => { const v = document.getElementById('nf-back-material')?.value || 'hdf3'; return v !== 'none' ? v : 'hdf3'; })(),
            topOption:       document.getElementById('nf-top-option')?.value || 'none',
            backOffset:      parseInt(document.getElementById('nf-back-offset')?.value) || 0,
            hasBaseboard:    (document.getElementById('nf-baseboard-type')?.value || 'none') !== 'none',
            baseboardType:   document.getElementById('nf-baseboard-type')?.value || 'none',
            baseboardHeight: parseInt(document.getElementById('nf-baseboard-h')?.value) || 100,
            hasTop:          true,
            hasBottom:       true,
            hasDoors:        true,
            doorCount:       parseInt(document.getElementById('nf-door-count')?.value) || 1,
            doorGap: {
                top:     parseFloat(document.getElementById('nf-door-gap-top')?.value) || 2,
                bottom:  parseFloat(document.getElementById('nf-door-gap-bottom')?.value) || 2,
                left:    parseFloat(document.getElementById('nf-door-gap-left')?.value) || 2,
                right:   parseFloat(document.getElementById('nf-door-gap-right')?.value) || 2,
                between: parseFloat(document.getElementById('nf-door-gap-between')?.value) || 3,
            },
            drawerCount:     parseInt(document.getElementById('nf-drawers-count')?.value) || 3,
            drawerFrontH:    parseInt(document.getElementById('nf-drawer-front-h')?.value) || 200,
        };

        // Validate
        if (params.width < 100 || params.width > 3000) {
            UI.notify('Szerokość musi być między 100 a 3000 mm', 'error');
            return;
        }
        if (params.height < 100 || params.height > 3000) {
            UI.notify('Wysokość musi być między 100 a 3000 mm', 'error');
            return;
        }

        let furniture;
        switch (type) {
            case 'cabinet':     furniture = Models.generateCabinet(params); break;
            case 'shelf':       furniture = Models.generateShelf(params); break;
            case 'drawer_unit': furniture = Models.generateDrawerUnit(params); break;
            case 'panel':       furniture = Models.generatePanel(params); break;
            default:            furniture = Models.generateCabinet(params);
        }

        Store.addFurniture(furniture);
        closeModal('modal-new-furniture');
        UI.notify(`Mebel "${params.name}" utworzony (${furniture.elements.length} elementów)`, 'success');

        // Fit view after short delay (allow scene to build)
        setTimeout(() => Viewport.fitView(), 100);
    }

    // ═══════════════════════════════════════════════════════
    // MATERIALS MODAL
    // ═══════════════════════════════════════════════════════
    function openMaterialsModal() {
        renderMaterialsLists();
        openModal('modal-materials');

        // Tab switching
        document.querySelectorAll('.mat-tab').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.mat-tab').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const tab = btn.dataset.matTab;
                document.getElementById('mat-tab-materials').style.display = tab === 'materials' ? '' : 'none';
                document.getElementById('mat-tab-edges').style.display = tab === 'edges' ? '' : 'none';
            };
        });

        document.getElementById('btn-add-material').onclick = () => {
            Store.addMaterial({ name: 'Nowa płyta', thickness: 18, color: '#CCCCCC', code: 'NEW_MAT', priceM2: 50 });
            renderMaterialsLists();
        };
        document.getElementById('btn-add-edge').onclick = () => {
            Store.addEdgeBand({ name: 'Nowe obrzeże', thickness: 2, color: '#CCCCCC', code: 'NEW_EDGE', priceM: 3 });
            renderMaterialsLists();
        };

        document.getElementById('btn-mat-export').onclick = () => {
            const json = Store.exportMaterials();
            const blob = new Blob([json], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'materialy_fp.json';
            a.click();
            UI.notify('Konfiguracja materiałów wyeksportowana', 'success');
        };

        document.getElementById('btn-mat-import').onclick = () => {
            document.getElementById('file-import-materials').click();
        };
    }

    function renderMaterialsLists() {
        // ── Plates ──
        const matContainer = document.getElementById('mat-list-materials');
        if (matContainer) {
            const header = `<div class="mat-list-header">
                <span></span>
                <span>Nazwa</span>
                <span>Grub. (mm)</span>
                <span>Kod</span>
                <span>Typ</span>
                <span></span>
            </div>`;
            const rows = Store.getMaterials().map(m => {

                return `<div class="mat-list-row" data-mat-id="${m.id}">
                    <input type="color" class="mat-swatch" value="${m.color}" data-field="color" data-id="${m.id}" title="Kolor">
                    <input class="mat-input" type="text" value="${m.name}" data-field="name" data-id="${m.id}" placeholder="Nazwa">
                    <input class="mat-input" type="number" value="${m.thickness}" data-field="thickness" data-id="${m.id}" min="1" max="60" step="0.5">
                    <input class="mat-input" type="text" value="${m.code}" data-field="code" data-id="${m.id}" placeholder="Kod">
                    <select class="mat-input" data-field="type" data-id="${m.id}">
                        <option value="laminate" ${m.type==='laminate'?'selected':''}>Laminat</option>
                        <option value="hdf" ${m.type==='hdf'?'selected':''}>HDF</option>
                        <option value="particle" ${m.type==='particle'?'selected':''}>Wiórowa</option>
                    </select>
                    <div class="mat-cell-actions">
                        <button class="mat-btn-del" data-del-mat="${m.id}" title="Usuń"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`;
            }).join('');
            matContainer.innerHTML = header + rows;

            matContainer.querySelectorAll('input[data-field], select[data-field]').forEach(inp => {
                inp.addEventListener('change', () => {
                    const id = inp.dataset.id;
                    const field = inp.dataset.field;
                    let val = inp.type === 'number' ? parseFloat(inp.value) : inp.value;
                    Store.updateMaterial(id, { [field]: val });
                    // Update swatch background for color input
                    if (field === 'color') {
                        const row = matContainer.querySelector(`[data-mat-id="${id}"]`);
                        if (row) row.querySelector('.mat-swatch').style.backgroundColor = val;
                    }
                });
                // Live swatch preview
                if (inp.type === 'color') {
                    inp.addEventListener('input', () => {
                        inp.style.backgroundColor = inp.value;
                    });
                    inp.style.backgroundColor = inp.value;
                }
            });

            matContainer.querySelectorAll('[data-del-mat]').forEach(btn => {
                btn.addEventListener('click', () => {
                    Store.removeMaterial(btn.dataset.delMat);
                    renderMaterialsLists();
                });
            });
        }

        // ── Edge Bands ──
        const edgeContainer = document.getElementById('mat-list-edges');
        if (edgeContainer) {
            const header = `<div class="mat-list-header edges">
                <span></span>
                <span>Nazwa</span>
                <span>Grub. (mm)</span>
                <span>Kod</span>
                <span></span>
            </div>`;
            const rows = Store.getEdgeBands().filter(e => e.id !== 'none').map(e => {
                return `<div class="mat-list-row edges" data-edge-id="${e.id}">
                    <input type="color" class="mat-swatch" value="${e.color === 'transparent' ? '#ffffff' : e.color}" data-field="color" data-id="${e.id}" title="Kolor">
                    <input class="mat-input" type="text" value="${e.name}" data-field="name" data-id="${e.id}" placeholder="Nazwa">
                    <input class="mat-input" type="number" value="${e.thickness}" data-field="thickness" data-id="${e.id}" min="0.1" max="5" step="0.1">
                    <input class="mat-input" type="text" value="${e.code}" data-field="code" data-id="${e.id}" placeholder="Kod">
                    <div class="mat-cell-actions">
                        <button class="mat-btn-del" data-del-edge="${e.id}" title="Usuń"><i class="fas fa-trash"></i></button>
                    </div>
                </div>`;
            }).join('');
            edgeContainer.innerHTML = header + rows;

            edgeContainer.querySelectorAll('input[data-field], select[data-field]').forEach(inp => {
                inp.addEventListener('change', () => {
                    const id = inp.dataset.id;
                    const field = inp.dataset.field;
                    let val = inp.type === 'number' ? parseFloat(inp.value) : inp.value;
                    Store.updateEdgeBand(id, { [field]: val });
                });
                if (inp.type === 'color') {
                    inp.addEventListener('input', () => { inp.style.backgroundColor = inp.value; });
                    inp.style.backgroundColor = inp.value;
                }
            });

            edgeContainer.querySelectorAll('[data-del-edge]').forEach(btn => {
                btn.addEventListener('click', () => {
                    Store.removeEdgeBand(btn.dataset.delEdge);
                    renderMaterialsLists();
                });
            });
        }
    }

    // ═══════════════════════════════════════════════════════
    // CUTTING LIST MODAL
    // ═══════════════════════════════════════════════════════
    function openCuttingListModal() {
        // Populate furniture filter dropdown
        const filterSel = document.getElementById('cl-furniture-filter');
        if (filterSel) {
            const state = Store.getState();
            const currentVal = filterSel.value;
            filterSel.innerHTML = '<option value="">Wszystkie meble</option>' +
                state.furniture.map(f =>
                    `<option value="${f.id}" ${f.id === currentVal ? 'selected' : ''}>${f.name}</option>`
                ).join('');
        }

        refreshCuttingList();
        openModal('modal-cutting-list');
    }

    function refreshCuttingList() {
        const aggregate = document.getElementById('cl-aggregate')?.checked ?? true;
        const filterVal = document.getElementById('cl-furniture-filter')?.value || '';

        const state = Store.getState();
        const furnitureId = filterVal || null;

        const cuttingList = Export.generateCuttingList(state.furniture, { aggregate, furnitureId });
        const summary = Export.generateMaterialSummary(cuttingList);

        const contentEl = document.getElementById('cutting-list-content');
        if (contentEl) contentEl.innerHTML = Export.renderCuttingListHTML(cuttingList);

        const summaryEl = document.getElementById('cl-summary');
        if (summaryEl) summaryEl.innerHTML = Export.renderSummaryHTML(summary);

        // Generate per-material export buttons
        const exportBtns = document.getElementById('cl-export-buttons');
        if (exportBtns) {
            const groups = Export.generateMeblePlPerMaterial(cuttingList);
            if (groups.length === 0) {
                exportBtns.innerHTML = '';
            } else {
                exportBtns.innerHTML = groups.map(g =>
                    `<button class="btn-primary cl-export-mat" data-mat-code="${g.materialCode}" title="Pobierz rozkrój dla: ${g.materialName}">
                        <i class="fas fa-file-csv"></i> ${g.materialName}
                    </button>`
                ).join('');
                exportBtns.querySelectorAll('.cl-export-mat').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const code = btn.dataset.matCode;
                        const group = groups.find(g => g.materialCode === code);
                        if (!group) return;
                        const projectName = Store.getState().project.name || 'projekt';
                        const safeName = (projectName + '_' + group.materialName).replace(/[\s/\\:*?"<>|]+/g, '_');
                        Export.downloadCSV(group.csv, `rozkroj_${safeName}.csv`);
                        UI.notify(`Pobrano rozkrój: ${group.materialName}`, 'success');
                    });
                });
            }
        }
    }

    // ═══════════════════════════════════════════════════════
    // MEBLE.PL EXPORT
    // ═══════════════════════════════════════════════════════
    function exportMeblePl() {
        const state = Store.getState();
        if (state.furniture.length === 0) { UI.notify('Brak mebli do eksportu', 'warn'); return; }
        const filterVal = document.getElementById('cl-furniture-filter')?.value || '';
        const aggregate = document.getElementById('cl-aggregate')?.checked ?? true;
        const cuttingList = Export.generateCuttingList(state.furniture, { aggregate, furnitureId: filterVal || null });
        const groups = Export.generateMeblePlPerMaterial(cuttingList);
        const projectName = state.project.name || 'projekt';
        groups.forEach(g => {
            const safeName = (projectName + '_' + g.materialName).replace(/[\s/\\:*?"<>|]+/g, '_');
            Export.downloadCSV(g.csv, `rozkroj_${safeName}.csv`);
        });
        UI.notify(`Wyeksportowano rozkrój (${groups.length} plików)`, 'success');
    }

})(window.FP);
