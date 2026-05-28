/* ═══════════════════════════════════════════════════════
   FurniturePro — Global State Store with Undo/Redo
   ═══════════════════════════════════════════════════════ */

window.FP = window.FP || {};

(function(FP) {
    'use strict';

    // ─── Material & Edge Presets ───
    const MATERIALS = [
        { id: 'lam_bialy_18',       name: 'Biały 18mm',              thickness: 18, color: '#F5F5F0', code: 'LAM_BIALY_18',       type: 'laminate' },
        { id: 'lam_dab_craft_18',   name: 'Dąb Craft 18mm',          thickness: 18, color: '#C4A46C', code: 'LAM_DAB_CRAFT_18',   type: 'laminate' },
        { id: 'lam_dab_sonoma_18',  name: 'Dąb Sonoma 18mm',         thickness: 18, color: '#D4B98A', code: 'LAM_DAB_SONOMA_18',  type: 'laminate' },
        { id: 'lam_orzech_18',      name: 'Orzech 18mm',             thickness: 18, color: '#6B4226', code: 'LAM_ORZECH_18',      type: 'laminate' },
        { id: 'lam_czarny_18',      name: 'Czarny 18mm',             thickness: 18, color: '#2D2D2D', code: 'LAM_CZARNY_18',      type: 'laminate' },
        { id: 'lam_antracyt_18',    name: 'Antracyt 18mm',           thickness: 18, color: '#4A4A4A', code: 'LAM_ANTRACYT_18',    type: 'laminate' },
        { id: 'lam_szary_18',       name: 'Szary 18mm',              thickness: 18, color: '#9E9E9E', code: 'LAM_SZARY_18',       type: 'laminate' },
        { id: 'lam_bialy_25',       name: 'Biały 25mm',              thickness: 25, color: '#F5F5F0', code: 'LAM_BIALY_25',       type: 'laminate' },
        { id: 'lam_dab_craft_25',   name: 'Dąb Craft 25mm',          thickness: 25, color: '#C4A46C', code: 'LAM_DAB_CRAFT_25',   type: 'laminate' },
        { id: 'hdf_bialy_3',        name: 'HDF Biały 3mm',           thickness: 3,  color: '#EFEFEF', code: 'HDF_BIALY_3',        type: 'hdf'      },
        { id: 'hdf_czarny_3',       name: 'HDF Czarny 3mm',          thickness: 3,  color: '#333333', code: 'HDF_CZARNY_3',       type: 'hdf'      },
        { id: 'plyta_16',           name: 'Płyta wiórowa 16mm',      thickness: 16, color: '#DEB887', code: 'PLYTA_16',           type: 'particle' },
    ];

    const EDGE_BANDS = [
        { id: 'edge_bialy_04',      name: 'Biały 0.4mm',      thickness: 0.4, color: '#F5F5F0', code: 'EDGE_BIALY_04'      },
        { id: 'edge_bialy_2',       name: 'Biały 2mm',        thickness: 2,   color: '#F5F5F0', code: 'EDGE_BIALY_2'       },
        { id: 'edge_dab_craft_04',  name: 'Dąb Craft 0.4mm',  thickness: 0.4, color: '#C4A46C', code: 'EDGE_DAB_CRAFT_04'  },
        { id: 'edge_dab_craft_2',   name: 'Dąb Craft 2mm',    thickness: 2,   color: '#C4A46C', code: 'EDGE_DAB_CRAFT_2'   },
        { id: 'edge_dab_sonoma_2',  name: 'Dąb Sonoma 2mm',   thickness: 2,   color: '#D4B98A', code: 'EDGE_DAB_SONOMA_2'  },
        { id: 'edge_orzech_2',      name: 'Orzech 2mm',       thickness: 2,   color: '#6B4226', code: 'EDGE_ORZECH_2'      },
        { id: 'edge_czarny_04',     name: 'Czarny 0.4mm',     thickness: 0.4, color: '#2D2D2D', code: 'EDGE_CZARNY_04'     },
        { id: 'edge_czarny_2',      name: 'Czarny 2mm',       thickness: 2,   color: '#2D2D2D', code: 'EDGE_CZARNY_2'      },
        { id: 'edge_antracyt_2',    name: 'Antracyt 2mm',     thickness: 2,   color: '#4A4A4A', code: 'EDGE_ANTRACYT_2'    },
        { id: 'edge_szary_2',       name: 'Szary 2mm',        thickness: 2,   color: '#9E9E9E', code: 'EDGE_SZARY_2'       },
        { id: 'none',               name: 'Brak',             thickness: 0,   color: 'transparent', code: 'NONE'           },
    ];

    const BRACKET_TYPES = [
        { id: 'shelf_pin',    name: 'Kołek półkowy',     icon: 'fa-circle',       size: { w: 5, h: 5, d: 15 } },
        { id: 'angle',        name: 'Kątownik',          icon: 'fa-angle-right',  size: { w: 30, h: 30, d: 15 } },
        { id: 'cam_lock',     name: 'Zamek mimośrodowy',  icon: 'fa-lock',         size: { w: 15, h: 15, d: 12 } },
        { id: 'dowel',        name: 'Kołek drewniany',    icon: 'fa-grip-lines-vertical', size: { w: 8, h: 8, d: 30 } },
        { id: 'confirmat',    name: 'Konfirmat',          icon: 'fa-screwdriver',  size: { w: 7, h: 7, d: 50 } },
        { id: 'hinge',        name: 'Zawias',             icon: 'fa-door-open',    size: { w: 35, h: 25, d: 12 } },
        { id: 'slide',        name: 'Prowadnica szuflady', icon: 'fa-arrows-alt-h', size: { w: 12, h: 40, d: 350 } },
    ];

    // ─── Helpers ───
    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
    }

    function deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    // ─── State ───
    const MAX_HISTORY = 80;
    let _state = {
        project: {
            name: 'Mój projekt',
            room: '',
            createdAt: new Date().toISOString(),
        },
        furniture: [],           // array of Furniture objects
        activeFurnitureId: null,
        selectedElementId: null,
        showBackPanels: true,
        showLabels: false,
        showGrid: true,
        explodedView: false,
        doorsOpen: false,
    };

    let _history = [];
    let _future = [];
    let _listeners = [];
    let _batchUpdate = false;

    // ─── Snapshot for undo ───
    function snapshot() {
        _history.push(deepClone(_state));
        if (_history.length > MAX_HISTORY) _history.shift();
        _future = [];
    }

    // ─── Notify listeners ───
    function notify(changeType) {
        if (_batchUpdate) return;
        _listeners.forEach(fn => {
            try { fn(_state, changeType); } catch(e) { console.error('Store listener error:', e); }
        });
    }

    // ─── Public API ───
    const Store = {
        // Getters
        getState()           { return _state; },
        getMaterials()       { return MATERIALS; },
        getEdgeBands()       { return EDGE_BANDS; },
        getBracketTypes()    { return BRACKET_TYPES; },
        getMaterial(id)      { return MATERIALS.find(m => m.id === id); },
        getEdgeBand(id)      { return EDGE_BANDS.find(e => e.id === id); },

        getActiveFurniture() {
            return _state.furniture.find(f => f.id === _state.activeFurnitureId) || null;
        },
        getSelectedElement() {
            const f = Store.getActiveFurniture();
            if (!f) return null;
            return f.elements.find(e => e.id === _state.selectedElementId) || null;
        },
        getFurniture(id) {
            return _state.furniture.find(f => f.id === id) || null;
        },

        // Subscriptions
        subscribe(fn) {
            _listeners.push(fn);
            return () => { _listeners = _listeners.filter(l => l !== fn); };
        },

        // ─── Batch updates (suppress notifications until done) ───
        batch(fn) {
            _batchUpdate = true;
            fn();
            _batchUpdate = false;
            notify('batch');
        },

        // ─── Project ───
        setProjectName(name) {
            _state.project.name = name;
            notify('project');
        },
        setProjectRoom(room) {
            _state.project.room = room;
            notify('project');
        },

        // ─── Furniture CRUD ───
        addFurniture(furniture) {
            snapshot();
            furniture.id = furniture.id || uid();
            furniture.createdAt = new Date().toISOString();
            furniture.version = 1;
            _state.furniture.push(furniture);
            _state.activeFurnitureId = furniture.id;
            _state.selectedElementId = null;
            notify('furniture-add');
        },

        removeFurniture(id) {
            snapshot();
            _state.furniture = _state.furniture.filter(f => f.id !== id);
            if (_state.activeFurnitureId === id) {
                _state.activeFurnitureId = _state.furniture[0]?.id || null;
                _state.selectedElementId = null;
            }
            notify('furniture-remove');
        },

        duplicateFurniture(id) {
            const src = Store.getFurniture(id);
            if (!src) return;
            snapshot();
            const copy = deepClone(src);
            copy.id = uid();
            copy.name = src.name + ' (kopia)';
            copy.elements.forEach(e => e.id = uid());
            copy.brackets = (copy.brackets || []).map(b => ({ ...b, id: uid() }));
            copy.version = 1;
            copy.createdAt = new Date().toISOString();
            _state.furniture.push(copy);
            _state.activeFurnitureId = copy.id;
            _state.selectedElementId = null;
            notify('furniture-add');
        },

        setActiveFurniture(id) {
            if (_state.activeFurnitureId === id) return;
            _state.activeFurnitureId = id;
            _state.selectedElementId = null;
            notify('active-change');
        },

        updateFurniture(id, updates) {
            snapshot();
            const f = Store.getFurniture(id);
            if (!f) return;
            Object.assign(f, updates);
            f.version = (f.version || 1) + 1;
            notify('furniture-update');
        },

        toggleFurnitureLock(id) {
            const f = Store.getFurniture(id);
            if (!f) return;
            f.locked = !f.locked;
            notify('furniture-update');
        },

        // ─── Elements CRUD ───
        selectElement(elementId) {
            _state.selectedElementId = elementId;
            notify('selection');
        },

        updateElement(furnitureId, elementId, updates) {
            snapshot();
            const f = Store.getFurniture(furnitureId);
            if (!f) return;
            const el = f.elements.find(e => e.id === elementId);
            if (!el) return;
            Object.assign(el, updates);
            notify('element-update');
        },

        addElement(furnitureId, element) {
            snapshot();
            const f = Store.getFurniture(furnitureId);
            if (!f) return;
            element.id = element.id || uid();
            f.elements.push(element);
            _state.selectedElementId = element.id;
            notify('element-add');
        },

        removeElement(furnitureId, elementId) {
            snapshot();
            const f = Store.getFurniture(furnitureId);
            if (!f) return;
            const el = f.elements.find(e => e.id === elementId);
            if (el) el.deleted = true;
            if (_state.selectedElementId === elementId) _state.selectedElementId = null;
            notify('element-remove');
        },

        toggleElementVisibility(furnitureId, elementId) {
            const f = Store.getFurniture(furnitureId);
            if (!f) return;
            const el = f.elements.find(e => e.id === elementId);
            if (el) {
                el.visible = !el.visible;
                notify('element-update');
            }
        },

        // ─── Brackets ───
        addBracket(furnitureId, bracket) {
            snapshot();
            const f = Store.getFurniture(furnitureId);
            if (!f) return;
            if (!f.brackets) f.brackets = [];
            bracket.id = bracket.id || uid();
            f.brackets.push(bracket);
            notify('bracket-add');
        },

        removeBracket(furnitureId, bracketId) {
            snapshot();
            const f = Store.getFurniture(furnitureId);
            if (!f || !f.brackets) return;
            f.brackets = f.brackets.filter(b => b.id !== bracketId);
            notify('bracket-remove');
        },

        // ─── View toggles ───
        toggleBackPanels() {
            _state.showBackPanels = !_state.showBackPanels;
            notify('view');
        },
        toggleLabels() {
            _state.showLabels = !_state.showLabels;
            notify('view');
        },
        toggleGrid() {
            _state.showGrid = !_state.showGrid;
            notify('view');
        },
        toggleExploded() {
            _state.explodedView = !_state.explodedView;
            notify('view');
        },
        toggleDoors() {
            _state.doorsOpen = !_state.doorsOpen;
            notify('view');
        },

        // ─── Undo / Redo ───
        undo() {
            if (_history.length === 0) return;
            _future.push(deepClone(_state));
            _state = _history.pop();
            notify('undo');
        },
        redo() {
            if (_future.length === 0) return;
            _history.push(deepClone(_state));
            _state = _future.pop();
            notify('redo');
        },
        canUndo() { return _history.length > 0; },
        canRedo() { return _future.length > 0; },

        // ─── Import / Export project ───
        exportProject() {
            // Filter out built-in materials/edge bands to avoid bloating JSON;
            // save only custom ones (added by user) plus needed references.
            const builtinMatIds = new Set(['lam_bialy_18','lam_dab_craft_18','lam_dab_sonoma_18','lam_orzech_18',
                'lam_czarny_18','lam_antracyt_18','lam_szary_18','lam_bialy_25','lam_dab_craft_25',
                'hdf_bialy_3','hdf_czarny_3','plyta_16']);
            const builtinEdgeIds = new Set(['edge_bialy_04','edge_bialy_2','edge_dab_craft_04','edge_dab_craft_2',
                'edge_dab_sonoma_2','edge_orzech_2','edge_czarny_04','edge_czarny_2','edge_antracyt_2',
                'edge_szary_2','none']);
            const customMaterials = MATERIALS.filter(m => !builtinMatIds.has(m.id));
            const customEdgeBands = EDGE_BANDS.filter(e => !builtinEdgeIds.has(e.id));
            return JSON.stringify({
                version: '2.0',
                exportedAt: new Date().toISOString(),
                project: _state.project,
                furniture: _state.furniture,
                customMaterials,
                customEdgeBands,
            }, null, 2);
        },

        importProject(json) {
            try {
                const data = typeof json === 'string' ? JSON.parse(json) : json;
                if (!data.furniture || !Array.isArray(data.furniture)) throw new Error('Brak danych mebli');
                snapshot();
                _state.project = data.project || { name: 'Import', room: '' };
                _state.furniture = data.furniture;
                _state.activeFurnitureId = _state.furniture[0]?.id || null;
                _state.selectedElementId = null;
                // Restore custom materials
                if (Array.isArray(data.customMaterials)) {
                    data.customMaterials.forEach(m => {
                        if (!MATERIALS.find(x => x.id === m.id)) MATERIALS.push(m);
                    });
                }
                // Restore custom edge bands (insert before 'none')
                if (Array.isArray(data.customEdgeBands)) {
                    const noneIdx = EDGE_BANDS.findIndex(e => e.id === 'none');
                    data.customEdgeBands.forEach(e => {
                        if (!EDGE_BANDS.find(x => x.id === e.id)) {
                            if (noneIdx !== -1) EDGE_BANDS.splice(noneIdx, 0, e);
                            else EDGE_BANDS.push(e);
                        }
                    });
                }
                notify('import');
                return true;
            } catch(e) {
                console.error('Import error:', e);
                return false;
            }
        },

        // ─── Reset ───
        reset() {
            snapshot();
            _state.furniture = [];
            _state.activeFurnitureId = null;
            _state.selectedElementId = null;
            notify('reset');
        },

        // ─── Custom Materials & Edge Bands ───
        addCustomMaterial(name, color, thickness) {
            const id = 'custom_' + uid();
            const code = 'CUSTOM_' + name.replace(/[^a-zA-Z0-9]+/g, '_').toUpperCase() + '_' + thickness;
            const fullName = name + ' ' + thickness + 'mm';
            MATERIALS.push({ id, name: fullName, thickness, color, code, type: 'laminate' });
            return id;
        },

        findOrCreateEdgeBand(color, thickness) {
            const normColor = color.toUpperCase();
            const existing = EDGE_BANDS.find(e =>
                e.id !== 'none' && e.color.toUpperCase() === normColor && Math.abs(e.thickness - thickness) < 0.01
            );
            if (existing) return existing.id;
            const id = 'edge_custom_' + uid();
            const name = 'Obrzeże ' + thickness + 'mm';
            const code = 'EDGE_CUSTOM_' + uid().toUpperCase();
            EDGE_BANDS.splice(EDGE_BANDS.length - 1, 0, { id, name, thickness, color, code });
            return id;
        },

        // ─── Full Materials CRUD ───
        addMaterial(m) {
            const id = m.id || ('mat_' + uid());
            const entry = {
                id,
                name: m.name || 'Nowa płyta',
                thickness: parseFloat(m.thickness) || 18,
                color: m.color || '#CCCCCC',
                code: m.code || ('MAT_' + uid().toUpperCase()),
                type: m.type || 'laminate',
            };
            MATERIALS.push(entry);
            return id;
        },

        updateMaterial(id, updates) {
            const m = MATERIALS.find(m => m.id === id);
            if (!m) return;
            Object.assign(m, updates);
        },

        removeMaterial(id) {
            const idx = MATERIALS.findIndex(m => m.id === id);
            if (idx !== -1) MATERIALS.splice(idx, 1);
        },

        // ─── Full Edge Bands CRUD ───
        addEdgeBand(e) {
            const id = e.id || ('edge_' + uid());
            const entry = {
                id,
                name: e.name || 'Nowe obrzeże',
                thickness: parseFloat(e.thickness) || 2,
                color: e.color || '#CCCCCC',
                code: e.code || ('EDGE_' + uid().toUpperCase()),
            };
            // Insert before 'none'
            const noneIdx = EDGE_BANDS.findIndex(eb => eb.id === 'none');
            if (noneIdx !== -1) EDGE_BANDS.splice(noneIdx, 0, entry);
            else EDGE_BANDS.push(entry);
            return id;
        },

        updateEdgeBand(id, updates) {
            const e = EDGE_BANDS.find(e => e.id === id);
            if (!e) return;
            Object.assign(e, updates);
        },

        removeEdgeBand(id) {
            if (id === 'none') return;
            const idx = EDGE_BANDS.findIndex(e => e.id === id);
            if (idx !== -1) EDGE_BANDS.splice(idx, 1);
        },

        // ─── Export / Import Materials config ───
        exportMaterials() {
            return JSON.stringify({
                version: '1.0',
                exportedAt: new Date().toISOString(),
                materials: MATERIALS,
                edgeBands: EDGE_BANDS,
            }, null, 2);
        },

        importMaterials(json) {
            try {
                const data = typeof json === 'string' ? JSON.parse(json) : json;
                if (!Array.isArray(data.materials) || !Array.isArray(data.edgeBands))
                    throw new Error('Nieprawidłowy format pliku');
                MATERIALS.length = 0;
                data.materials.forEach(m => MATERIALS.push(m));
                EDGE_BANDS.length = 0;
                data.edgeBands.forEach(e => EDGE_BANDS.push(e));
                return true;
            } catch(e) {
                console.error('Import materials error:', e);
                return false;
            }
        },

        // Expose uid
        uid,
        deepClone,
    };

    FP.Store = Store;
    FP.MATERIALS = MATERIALS;
    FP.EDGE_BANDS = EDGE_BANDS;
    FP.BRACKET_TYPES = BRACKET_TYPES;

})(window.FP);
