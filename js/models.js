/* ═══════════════════════════════════════════════════════
   FurniturePro — Furniture Models & Geometry Generators
   ═══════════════════════════════════════════════════════ */

(function(FP) {
    'use strict';

    const { Store, MATERIALS, EDGE_BANDS } = FP;

    // ─── Default edge configuration ───
    function defaultEdges(edgeBandId) {
        return {
            front:  { has: true,  bandId: edgeBandId || 'edge_bialy_2' },
            back:   { has: false, bandId: 'none' },
            left:   { has: false, bandId: 'none' },
            right:  { has: false, bandId: 'none' },
        };
    }

    function allEdges(edgeBandId) {
        const id = edgeBandId || 'edge_bialy_2';
        return {
            front: { has: true, bandId: id },
            back:  { has: true, bandId: id },
            left:  { has: true, bandId: id },
            right: { has: true, bandId: id },
        };
    }

    function noEdges() {
        return {
            front: { has: false, bandId: 'none' },
            back:  { has: false, bandId: 'none' },
            left:  { has: false, bandId: 'none' },
            right: { has: false, bandId: 'none' },
        };
    }

    // ─── Create Element helper ───
    function createElement(opts) {
        const mat = Store.getMaterial(opts.materialId) || MATERIALS[0];
        return {
            id:          Store.uid(),
            name:        opts.name || 'Element',
            type:        opts.type || 'generic',
            length:      opts.length || 100,       // "długość" = dłuższy wymiar formatki
            width:       opts.width || 100,        // "szerokość" = krótszy wymiar formatki
            thickness:   opts.thickness || mat.thickness,
            x:           opts.x || 0,
            y:           opts.y || 0,
            z:           opts.z || 0,
            rotX:        opts.rotX || 0,           // rotation in degrees
            rotY:        opts.rotY || 0,
            rotZ:        opts.rotZ || 0,
            materialId:  opts.materialId || MATERIALS[0].id,
            color:       opts.color || mat.color,
            edges:       opts.edges || defaultEdges(opts.edgeBandId),
            grain:       opts.grain || 'R',         // R = wzdłuż długości, N = brak
            visible:     opts.visible !== undefined ? opts.visible : true,
            deleted:     false,
            locked:      false,
            notes:       opts.notes || '',
            elementNumber: opts.elementNumber || 0,
        };
    }

    // ═══════════════════════════════════════════════════════
    // CABINET GENERATOR (Szafka z półkami)
    // ═══════════════════════════════════════════════════════
    function generateCabinet(params) {
        const {
            name = 'Szafka',
            width = 800,
            height = 720,
            depth = 560,
            materialId = 'lam_bialy_18',
            edgeBandId = 'edge_bialy_2',
            thickness = 18,
            shelfCount = 2,
            hasBack = true,
            backMaterial = 'hdf3',   // 'hdf3' or 'plate18'
            backOffset = 0,
            hasBaseboard = false,
            baseboardType = 'none',   // 'none' | 'maskownica' | 'cokol'
            topOption = 'none',        // 'none' | 'maskownica'
            baseboardHeight = 100,
            hasDoors = false,
            doorCount = 1,
            doorGap = { top: 2, bottom: 2, left: 2, right: 2, between: 3 },
        } = params;

        const mat = Store.getMaterial(materialId) || MATERIALS[0];
        const T = thickness;
        const elements = [];
        let num = 1;

        // Internal dimensions
        const innerW = width - 2 * T;
        const innerH = height - 2 * T;
        const innerD = depth; // backOffset applies only to shelves, not structural panels
        const backT = backMaterial === 'hdf3' ? 3 : T;
        const backMatId = backMaterial === 'hdf3' ? 'hdf_bialy_3' : materialId;
        // frontD = depth consumed by doors in front of structural panels (doors sit at z=0, thickness T).
        // Maskownice are HORIZONTAL panels (Y-axis) — they don't consume Z depth, so only hasDoors triggers this.
        const frontD = hasDoors ? T : 0;
        const depthWithBack = hasBack ? (innerD - backT - frontD) : (innerD - frontD);
        // For HDF (outside wrap) shorten sides/top/bottom; for plate back they stay full depth
        const panelD = (hasBack && backMaterial === 'hdf3') ? (innerD - backT - frontD) : (innerD - frontD);

        const bottomOffset = baseboardType === 'cokol' ? baseboardHeight : (baseboardType === 'maskownica' ? T : 0);
        const sideOffset   = baseboardType === 'maskownica' ? T : 0;  // sides only raised for maskownica overlay
        const topOffset = topOption === 'maskownica' ? T : 0;

        // ── Bottom panel ──
        elements.push(createElement({
            name: 'Dół',
            type: 'bottom',
            length: innerW,
            width: panelD,
            thickness: T,
            x: T,
            y: bottomOffset,
            z: frontD,
            materialId,
            color: mat.color,
            edges: { 
                front: { has: true, bandId: edgeBandId },
                back: { has: false, bandId: 'none' },
                left: { has: false, bandId: 'none' },
                right: { has: false, bandId: 'none' },
            },
            edgeBandId,
            grain: 'R',
            elementNumber: num++,
        }));

        // ── Top panel ──
        elements.push(createElement({
            name: 'Góra',
            type: 'top',
            length: innerW,
            width: panelD,
            thickness: T,
            x: T,
            y: height - T - topOffset,
            z: frontD,
            materialId,
            color: mat.color,
            edges: {
                front: { has: true, bandId: edgeBandId },
                back: { has: false, bandId: 'none' },
                left: { has: false, bandId: 'none' },
                right: { has: false, bandId: 'none' },
            },
            edgeBandId,
            grain: 'R',
            elementNumber: num++,
        }));

        // ── Left side ──
        elements.push(createElement({
            name: 'Bok lewy',
            type: 'side_left',
            length: panelD,
            width: height - sideOffset - topOffset,
            thickness: T,
            x: 0,
            y: sideOffset,
            z: frontD,
            materialId,
            color: mat.color,
            edges: {
                front: { has: true, bandId: edgeBandId },
                back: { has: false, bandId: 'none' },
                left: { has: false, bandId: 'none' },
                right: { has: false, bandId: 'none' },
            },
            edgeBandId,
            grain: 'R',
            elementNumber: num++,
        }));

        // ── Right side ──
        elements.push(createElement({
            name: 'Bok prawy',
            type: 'side_right',
            length: panelD,
            width: height - sideOffset - topOffset,
            thickness: T,
            x: width - T,
            y: sideOffset,
            z: frontD,
            materialId,
            color: mat.color,
            edges: {
                front: { has: true, bandId: edgeBandId },
                back: { has: false, bandId: 'none' },
                left: { has: false, bandId: 'none' },
                right: { has: false, bandId: 'none' },
            },
            edgeBandId,
            grain: 'R',
            elementNumber: num++,
        }));

        // ── Shelves ──
        if (shelfCount > 0) {
            const baseY = bottomOffset + T;
            const availH = height - T - topOffset - baseY;
            const step = availH / (shelfCount + 1);

            for (let i = 0; i < shelfCount; i++) {
                const sy = baseY + step * (i + 1) - T / 2;
                elements.push(createElement({
                    name: `Półka ${i + 1}`,
                    type: 'shelf',
                    length: innerW,
                    width: depthWithBack - backOffset,
                    thickness: T,
                    x: T,
                    y: Math.round(sy),
                    z: frontD + backOffset,
                    materialId,
                    color: mat.color,
                    edges: {
                        front: { has: true, bandId: edgeBandId },
                        back: { has: false, bandId: 'none' },
                        left: { has: false, bandId: 'none' },
                        right: { has: false, bandId: 'none' },
                    },
                    edgeBandId,
                    grain: 'R',
                    elementNumber: num++,
                }));
            }
        }

        // ── Back panel ──
        if (hasBack) {
            const backMat = Store.getMaterial(backMatId);
            const isHdf = backMaterial === 'hdf3';
            // HDF trimmed vertically to hide behind maskownice; plate fits between structural panels
            elements.push(createElement({
                name: 'Plecy',
                type: 'back_panel',
                length: isHdf ? width  : innerW,
                width:  isHdf ? height - sideOffset - topOffset : innerH - bottomOffset - topOffset,
                thickness: backT,
                x: isHdf ? 0 : T,
                y: isHdf ? sideOffset : bottomOffset + T,
                z: depth - backT,
                materialId: backMatId,
                color: backMat ? backMat.color : '#EFEFEF',
                edges: noEdges(),
                grain: 'N',
                elementNumber: num++,
            }));
        }

        // ── Baseboard ──
        if (hasBaseboard) {
            const isCokol = baseboardType === 'cokol';
            if (isCokol) {
                // Cokół = vertical front kickboard (door-type: geoW=length, geoH=width, geoD=thickness)
                elements.push(createElement({
                    name: 'Cokół',
                    type: 'door',
                    length: innerW,
                    width: baseboardHeight,
                    thickness: T,
                    x: T,
                    y: 0,
                    z: 0,
                    materialId,
                    color: mat.color,
                    edges: noEdges(),
                    edgeBandId,
                    grain: 'R',
                    elementNumber: num++,
                }));
            } else {
                // Maskownica dolna = flat horizontal panel below the bottom panel (mirrors maskownica górna)
                // z: 0 = outer front face of furniture; width: innerD covers to outer back face
                elements.push(createElement({
                    name: 'Maskownica dolna',
                    type: 'bottom',
                    length: width,
                    width: innerD,
                    thickness: T,
                    x: 0,
                    y: 0,
                    z: 0,
                    materialId,
                    color: mat.color,
                    edges: defaultEdges(edgeBandId),
                    edgeBandId,
                    grain: 'R',
                    elementNumber: num++,
                }));
            }
        }

        // ── Top maskownica (extra cap plate on top) ──
        if (topOption === 'maskownica') {
            elements.push(createElement({
                name: 'Maskownica górna',
                type: 'top',
                length: width,
                width: innerD,
                thickness: T,
                x: 0,
                y: height - T,
                z: 0,
                materialId,
                color: mat.color,
                edges: defaultEdges(edgeBandId),
                edgeBandId,
                grain: 'R',
                elementNumber: num++,
            }));
        }

        // ── Doors ──
        if (hasDoors) {
            const bbH = bottomOffset;
            const doorH = height - bbH - topOffset - doorGap.top - doorGap.bottom;
            const doorAvailW = width - doorGap.left - doorGap.right;

            if (doorCount === 1) {
                elements.push(createElement({
                    name: 'Drzwi',
                    type: 'door',
                    length: doorAvailW,
                    width: doorH,
                    thickness: T,
                    x: doorGap.left,
                    y: bbH + doorGap.bottom,
                    z: 0,
                    materialId,
                    color: mat.color,
                    edgeBandId,
                    edges: allEdges(edgeBandId),
                    grain: 'R',
                    elementNumber: num++,
                }));
            } else {
                const doorW = Math.round(((doorAvailW - doorGap.between) / 2) * 10) / 10;
                elements.push(createElement({
                    name: 'Drzwi lewe',
                    type: 'door',
                    length: doorW,
                    width: doorH,
                    thickness: T,
                    x: doorGap.left,
                    y: bbH + doorGap.bottom,
                    z: 0,
                    materialId,
                    color: mat.color,
                    edgeBandId,
                    edges: allEdges(edgeBandId),
                    grain: 'R',
                    elementNumber: num++,
                }));
                elements.push(createElement({
                    name: 'Drzwi prawe',
                    type: 'door',
                    length: doorW,
                    width: doorH,
                    thickness: T,
                    x: doorGap.left + doorW + doorGap.between,
                    y: bbH + doorGap.bottom,
                    z: 0,
                    materialId,
                    color: mat.color,
                    edgeBandId,
                    edges: allEdges(edgeBandId),
                    grain: 'R',
                    elementNumber: num++,
                }));
            }
        }

        return {
            name,
            type: 'cabinet',
            width, height, depth,
            materialId, edgeBandId, thickness,
            hasBack, backMaterial, backOffset,
            hasBaseboard,
            baseboardType: baseboardType || (hasBaseboard ? 'maskownica' : 'none'),
            baseboardHeight,
            topOption: topOption || 'none',
            hasDoors, doorCount, doorGap,
            shelfCount,
            elements,
            brackets: [],
            locked: false,
        };
    }

    // ═══════════════════════════════════════════════════════
    // SHELF GENERATOR (Regał)
    // ═══════════════════════════════════════════════════════
    function generateShelf(params) {
        const {
            name = 'Regał',
            width = 800,
            height = 300,
            depth = 250,
            materialId = 'lam_bialy_18',
            edgeBandId = 'edge_bialy_2',
            thickness = 18,
            shelfCount = 1,
            hasBack = false,
            backMaterial = 'hdf3',
            backOffset = 0,
            hasTop = true,
            hasBottom = true,
            baseboardType = 'none',   // 'none' | 'maskownica' | 'cokol'
            topOption = 'none',
            baseboardHeight = 100,
        } = params;

        const mat = Store.getMaterial(materialId) || MATERIALS[0];
        const T = thickness;
        const elements = [];
        let num = 1;
        const innerW = width - 2 * T;
        const backT = hasBack ? (backMaterial === 'hdf3' ? 3 : T) : 0;
        const backMatId = backMaterial === 'hdf3' ? 'hdf_bialy_3' : materialId;
        const hasBaseboard = baseboardType !== 'none';
        const bbH = hasBaseboard ? baseboardHeight : 0;
        // For HDF (outside wrap) shorten sides/top/bottom; for plate back they stay full depth
        // backOffset applies only to shelves, not structural panels
        const panelD = (hasBack && backMaterial === 'hdf3') ? (depth - backT) : depth;

        const bottomOffset = baseboardType === 'cokol' ? bbH : (baseboardType === 'maskownica' ? T : 0);
        const sideOffset   = baseboardType === 'maskownica' ? T : 0;
        const topOffset = topOption === 'maskownica' ? T : 0;

        // Bottom
        if (hasBottom) {
            elements.push(createElement({
                name: 'Dół', type: 'bottom',
                length: innerW, width: panelD, thickness: T,
                x: T, y: bottomOffset, z: 0,
                materialId, color: mat.color, edgeBandId,
                edges: defaultEdges(edgeBandId),
                elementNumber: num++,
            }));
        }

        // Top
        if (hasTop) {
            elements.push(createElement({
                name: 'Góra', type: 'top',
                length: innerW, width: panelD, thickness: T,
                x: T, y: height - T - topOffset, z: 0,
                materialId, color: mat.color, edgeBandId,
                edges: defaultEdges(edgeBandId),
                elementNumber: num++,
            }));
        }

        // Side panels — shortened by maskownica offsets to avoid collision
        const sideH = height - sideOffset - topOffset;
        const sideY = sideOffset;

        // Left side
        elements.push(createElement({
            name: 'Bok lewy', type: 'side_left',
            length: panelD, width: sideH, thickness: T,
            x: 0, y: sideY, z: 0,
            materialId, color: mat.color, edgeBandId,
            edges: defaultEdges(edgeBandId),
            elementNumber: num++,
        }));

        // Right side
        elements.push(createElement({
            name: 'Bok prawy', type: 'side_right',
            length: panelD, width: sideH, thickness: T,
            x: width - T, y: sideY, z: 0,
            materialId, color: mat.color, edgeBandId,
            edges: defaultEdges(edgeBandId),
            elementNumber: num++,
        }));

        // Shelves
        if (shelfCount > 0) {
            const shelfBaseY = bottomOffset + T;
            const shelfTopY = height - T - topOffset;
            const availH = shelfTopY - shelfBaseY;
            const step = availH / (shelfCount + 1);
            for (let i = 0; i < shelfCount; i++) {
                const sy = shelfBaseY + step * (i + 1) - T / 2;
                elements.push(createElement({
                    name: `Półka ${i + 1}`, type: 'shelf',
                    length: innerW, width: depth - backT - backOffset, thickness: T,
                    x: T, y: Math.round(sy), z: backOffset,
                    materialId, color: mat.color, edgeBandId,
                    edges: defaultEdges(edgeBandId),
                    elementNumber: num++,
                }));
            }
        }

        // Back panel
        if (hasBack) {
            const bmat = Store.getMaterial(backMatId);
            const isHdf = backMaterial === 'hdf3';
            const backPanelY = hasBottom ? bottomOffset + T : bottomOffset;
            const backPanelTopY = hasTop ? height - T - topOffset : height - topOffset;
            // HDF trimmed vertically to hide behind maskownice; plate fits between structural panels
            elements.push(createElement({
                name: 'Plecy', type: 'back_panel',
                length: isHdf ? width  : innerW,
                width:  isHdf ? height - sideOffset - topOffset : backPanelTopY - backPanelY,
                thickness: backT,
                x: isHdf ? 0 : T,
                y: isHdf ? sideOffset : backPanelY,
                z: depth - backT,
                materialId: backMatId, color: bmat ? bmat.color : '#EFEFEF',
                edges: noEdges(), grain: 'N',
                elementNumber: num++,
            }));
        }

        // Cokół / Maskownica dolna
        if (hasBaseboard) {
            const isCokol = baseboardType === 'cokol';
            if (isCokol) {
                elements.push(createElement({
                    name: 'Cokół', type: 'door',
                    length: innerW, width: bbH, thickness: T,
                    x: T, y: 0, z: 0,
                    materialId, color: mat.color, edgeBandId,
                    edges: noEdges(),
                    elementNumber: num++,
                }));
            } else {
                elements.push(createElement({
                    name: 'Maskownica dolna', type: 'bottom',
                    length: width, width: depth, thickness: T,
                    x: 0, y: 0, z: 0,
                    materialId, color: mat.color, edgeBandId,
                    edges: defaultEdges(edgeBandId),
                    elementNumber: num++,
                }));
            }
        }

        // Maskownica górna
        if (topOption === 'maskownica') {
            elements.push(createElement({
                name: 'Maskownica górna', type: 'top',
                length: width, width: depth, thickness: T,
                x: 0, y: height - T, z: 0,
                materialId, color: mat.color, edgeBandId,
                edges: defaultEdges(edgeBandId),
                elementNumber: num++,
            }));
        }

        return {
            name, type: 'shelf',
            width, height, depth,
            materialId, edgeBandId, thickness,
            hasBack, backMaterial, backOffset,
            hasBaseboard: baseboardType !== 'none',
            baseboardType,
            baseboardHeight: bbH,
            topOption: topOption || 'none',
            hasTop, hasBottom,
            shelfCount,
            elements, brackets: [], locked: false,
        };
    }

    // ═══════════════════════════════════════════════════════
    // DRAWER UNIT GENERATOR (Komoda z szufladami)
    // ═══════════════════════════════════════════════════════
    function generateDrawerUnit(params) {
        const {
            name = 'Komoda',
            width = 600,
            height = 720,
            depth = 500,
            materialId = 'lam_bialy_18',
            edgeBandId = 'edge_bialy_2',
            thickness = 18,
            drawerCount = 3,
            drawerFrontH = 200,
            hasBack = true,
            backMaterial = 'hdf3',
            backOffset = 0,
            hasBaseboard = false,
            baseboardType = 'none',   // 'none' | 'maskownica' | 'cokol'
            baseboardHeight = 100,
            topOption = 'none',
        } = params;

        const mat = Store.getMaterial(materialId) || MATERIALS[0];
        const T = thickness;
        const elements = [];
        let num = 1;
        const innerW = width - 2 * T;
        const backT = backMaterial === 'hdf3' ? 3 : T;
        const backMatId = backMaterial === 'hdf3' ? 'hdf_bialy_3' : materialId;
        const baseY = baseboardType === 'cokol' ? baseboardHeight : (baseboardType === 'maskownica' ? T : 0);
        const sideY = baseboardType === 'maskownica' ? T : 0;  // sides only raised for maskownica overlay
        const topOffset = topOption === 'maskownica' ? T : 0;
        // For HDF (outside wrap) shorten sides/top/bottom; for plate back they stay full depth
        const panelD = (hasBack && backMaterial === 'hdf3') ? (depth - backOffset - backT) : (depth - backOffset);

        // Bottom
        elements.push(createElement({
            name: 'Dół', type: 'bottom',
            length: innerW, width: panelD, thickness: T,
            x: T, y: baseY, z: 0,
            materialId, color: mat.color, edgeBandId,
            edges: { front: { has: true, bandId: edgeBandId }, back: { has: false, bandId: 'none' }, left: { has: false, bandId: 'none' }, right: { has: false, bandId: 'none' } },
            elementNumber: num++,
        }));

        // Top
        elements.push(createElement({
            name: 'Góra', type: 'top',
            length: innerW, width: panelD, thickness: T,
            x: T, y: height - T - topOffset, z: 0,
            materialId, color: mat.color, edgeBandId,
            edges: { front: { has: true, bandId: edgeBandId }, back: { has: false, bandId: 'none' }, left: { has: false, bandId: 'none' }, right: { has: false, bandId: 'none' } },
            elementNumber: num++,
        }));

        // Left side
        elements.push(createElement({
            name: 'Bok lewy', type: 'side_left',
            length: panelD, width: height - sideY - topOffset, thickness: T,
            x: 0, y: sideY, z: 0,
            materialId, color: mat.color, edgeBandId,
            edges: { front: { has: true, bandId: edgeBandId }, back: { has: false, bandId: 'none' }, left: { has: false, bandId: 'none' }, right: { has: false, bandId: 'none' } },
            elementNumber: num++,
        }));

        // Right side
        elements.push(createElement({
            name: 'Bok prawy', type: 'side_right',
            length: panelD, width: height - sideY - topOffset, thickness: T,
            x: width - T, y: sideY, z: 0,
            materialId, color: mat.color, edgeBandId,
            edges: { front: { has: true, bandId: edgeBandId }, back: { has: false, bandId: 'none' }, left: { has: false, bandId: 'none' }, right: { has: false, bandId: 'none' } },
            elementNumber: num++,
        }));

        // Drawer fronts and boxes
        const gap = 3; // gap between drawer fronts
        const totalGaps = (drawerCount - 1) * gap;
        const availH = height - baseY - 2 * T - topOffset;
        const frontH = Math.round(((availH - totalGaps) / drawerCount) * 10) / 10;
        const drawerBoxH = frontH - 30;
        const drawerBoxD = depth - backOffset - 50;
        const drawerBoxW = innerW - 26; // szyny po 13mm z każdej strony

        for (let i = 0; i < drawerCount; i++) {
            const frontY = baseY + T + i * (frontH + gap);

            // Czoło szuflady
            elements.push(createElement({
                name: `Czoło szuflady ${i + 1}`, type: 'drawer_front',
                length: innerW, width: frontH, thickness: T,
                x: T, y: frontY, z: -2,
                materialId, color: mat.color, edgeBandId,
                edges: allEdges(edgeBandId),
                elementNumber: num++,
            }));

            // Bok lewy szuflady
            elements.push(createElement({
                name: `Szuflada ${i + 1} - bok L`, type: 'drawer_side',
                length: drawerBoxD, width: drawerBoxH > 0 ? drawerBoxH : 80, thickness: T,
                x: T + 13, y: frontY + 15, z: 10,
                materialId, color: mat.color, edgeBandId,
                edges: defaultEdges(edgeBandId),
                elementNumber: num++,
                notes: `Szuflada ${i+1}`,
            }));

            // Bok prawy szuflady
            elements.push(createElement({
                name: `Szuflada ${i + 1} - bok P`, type: 'drawer_side',
                length: drawerBoxD, width: drawerBoxH > 0 ? drawerBoxH : 80, thickness: T,
                x: width - T - 13 - T, y: frontY + 15, z: 10,
                materialId, color: mat.color, edgeBandId,
                edges: defaultEdges(edgeBandId),
                elementNumber: num++,
                notes: `Szuflada ${i+1}`,
            }));

            // Tył szuflady
            elements.push(createElement({
                name: `Szuflada ${i + 1} - tył`, type: 'drawer_back',
                length: drawerBoxW - 2 * T, width: drawerBoxH > 0 ? drawerBoxH : 80, thickness: T,
                x: T + 13 + T, y: frontY + 15, z: drawerBoxD - T + 10,
                materialId, color: mat.color, edgeBandId,
                edges: noEdges(),
                elementNumber: num++,
                notes: `Szuflada ${i+1}`,
            }));

            // Dno szuflady (HDF 3mm)
            elements.push(createElement({
                name: `Szuflada ${i + 1} - dno`, type: 'drawer_bottom',
                length: drawerBoxW, width: drawerBoxD - T, thickness: 3,
                x: T + 13, y: frontY + 10, z: 10,
                materialId: 'hdf_bialy_3',
                color: '#EFEFEF',
                edges: noEdges(),
                grain: 'N',
                elementNumber: num++,
                notes: `Szuflada ${i+1}`,
            }));
        }

        // Back panel
        if (hasBack) {
            const bmat = Store.getMaterial(backMatId);
            const isHdf = backMaterial === 'hdf3';
            // HDF trimmed vertically to hide behind maskownice; plate fits between structural panels
            elements.push(createElement({
                name: 'Plecy', type: 'back_panel',
                length: isHdf ? width  : innerW,
                width:  isHdf ? height - sideY - topOffset : height - 2 * T - baseY - topOffset,
                thickness: backT,
                x: isHdf ? 0 : T,
                y: isHdf ? sideY : baseY + T,
                z: depth - backOffset - backT,
                materialId: backMatId, color: bmat ? bmat.color : '#EFEFEF',
                edges: noEdges(), grain: 'N',
                elementNumber: num++,
            }));
        }

        // Cokół / Maskownica dolna (drawer unit)
        if (hasBaseboard) {
            const isCokol = baseboardType === 'cokol';
            if (isCokol) {
                elements.push(createElement({
                    name: 'Cokół', type: 'door',
                    length: innerW, width: baseboardHeight, thickness: T,
                    x: T, y: 0, z: 0,
                    materialId, color: mat.color, edgeBandId,
                    edges: noEdges(),
                    elementNumber: num++,
                }));
            } else {
                elements.push(createElement({
                    name: 'Maskownica dolna', type: 'bottom',
                    length: width, width: depth, thickness: T,
                    x: 0, y: 0, z: 0,
                    materialId, color: mat.color, edgeBandId,
                    edges: defaultEdges(edgeBandId),
                    elementNumber: num++,
                }));
            }
        }

        // Maskownica górna (drawer unit)
        if (topOption === 'maskownica') {
            elements.push(createElement({
                name: 'Maskownica górna', type: 'top',
                length: width, width: depth, thickness: T,
                x: 0, y: height - T, z: 0,
                materialId, color: mat.color, edgeBandId,
                edges: defaultEdges(edgeBandId),
                elementNumber: num++,
            }));
        }

        return {
            name, type: 'drawer_unit',
            width, height, depth,
            materialId, edgeBandId, thickness,
            hasBack, backMaterial, backOffset,
            hasBaseboard,
            baseboardType: baseboardType || (hasBaseboard ? 'maskownica' : 'none'),
            baseboardHeight,
            topOption: topOption || 'none',
            drawerCount, drawerFrontH,
            shelfCount: 0,
            elements, brackets: [], locked: false,
        };
    }

    // ═══════════════════════════════════════════════════════
    // SINGLE PANEL GENERATOR (Pojedyncza płyta)
    // ═══════════════════════════════════════════════════════
    function generatePanel(params) {
        const {
            name = 'Płyta',
            width = 800,
            height = 400,
            materialId = 'lam_bialy_18',
            edgeBandId = 'edge_bialy_2',
            thickness = 18,
        } = params;

        const mat = Store.getMaterial(materialId) || MATERIALS[0];
        const elements = [];

        elements.push(createElement({
            name: name,
            type: 'panel',
            length: width,
            width: height,
            thickness: thickness,
            x: 0, y: 0, z: 0,
            materialId, color: mat.color, edgeBandId,
            edges: allEdges(edgeBandId),
            grain: 'R',
            elementNumber: 1,
        }));

        return {
            name, type: 'panel',
            width, height, depth: thickness,
            materialId, edgeBandId, thickness,
            hasBack: false, backMaterial: 'hdf3', backOffset: 0,
            hasBaseboard: false, baseboardHeight: 0,
            shelfCount: 0,
            elements, brackets: [], locked: false,
        };
    }

    // ═══════════════════════════════════════════════════════
    // Validation
    // ═══════════════════════════════════════════════════════
    function validateFurniture(furniture) {
        const warnings = [];
        const errors = [];
        const { width, height, depth, elements, thickness } = furniture;

        if (width < 100) errors.push('Szerokość mniejsza niż 100mm');
        if (width > 3000) warnings.push('Szerokość przekracza 3000mm - trudne w transporcie');
        if (height < 100) errors.push('Wysokość mniejsza niż 100mm');
        if (height > 3000) warnings.push('Wysokość przekracza 3000mm');
        if (furniture.type !== 'panel') {
            if (depth < 100) errors.push('Głębokość mniejsza niż 100mm');
            if (depth > 1200) warnings.push('Głębokość przekracza 1200mm');
        }

        const activeElements = elements.filter(e => !e.deleted && e.visible);

        // Check shelf fits inside cabinet
        activeElements.forEach(el => {
            if (el.type === 'shelf') {
                if (el.length > width - 2 * thickness + 1) {
                    warnings.push(`${el.name}: szerokość półki (${el.length}mm) przekracza wymiar wewnętrzny`);
                }
                if (el.y < thickness || el.y + el.thickness > height - thickness) {
                    warnings.push(`${el.name}: pozycja poza bryłą mebla`);
                }
            }
            if (el.type === 'drawer_front') {
                if (el.width < 80) warnings.push(`${el.name}: zbyt niskie czoło szuflady`);
            }
        });

        // Check for 3D bounding-box collisions between all elements
        function getAABB(el) {
            let geoW, geoH, geoD;
            switch (el.type) {
                case 'side_left':
                case 'side_right':
                    geoW = el.thickness; geoH = el.width; geoD = el.length; break;
                case 'bottom':
                case 'top':
                case 'shelf':
                case 'baseboard':
                case 'panel':
                case 'drawer_bottom':
                    geoW = el.length; geoH = el.thickness; geoD = el.width; break;
                case 'back_panel':
                case 'door':
                case 'drawer_front':
                case 'drawer_back':
                    geoW = el.length; geoH = el.width; geoD = el.thickness; break;
                case 'drawer_side':
                    geoW = el.thickness; geoH = el.width; geoD = el.length; break;
                default:
                    geoW = el.length; geoH = el.thickness; geoD = el.width;
            }
            return {
                minX: el.x, maxX: el.x + geoW,
                minY: el.y, maxY: el.y + geoH,
                minZ: el.z, maxZ: el.z + geoD,
            };
        }
        const EPS = 1; // 1mm tolerance — touching panels don't count
        // Check all structural carcass elements including back panel and maskownicy
        const structuralTypes = new Set(['side_left','side_right','top','bottom','shelf','back_panel']);
        const checkEls = activeElements.filter(e => structuralTypes.has(e.type));
        for (let i = 0; i < checkEls.length; i++) {
            for (let j = i + 1; j < checkEls.length; j++) {
                const a = getAABB(checkEls[i]);
                const b = getAABB(checkEls[j]);
                const overlapX = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) > EPS;
                const overlapY = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY) > EPS;
                const overlapZ = Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ) > EPS;
                if (overlapX && overlapY && overlapZ) {
                    errors.push(`Kolizja 3D: "${checkEls[i].name}" i "${checkEls[j].name}" nachodzą na siebie`);
                }
            }
        }

        return { warnings, errors, isValid: errors.length === 0 };
    }

    // ═══════════════════════════════════════════════════════
    // Re-generate elements (rebuild after parameter changes)
    // ═══════════════════════════════════════════════════════
    function regenerateFurniture(furniture, preserveEdges = true) {
        // Snapshot manually-edited edges keyed by "type|name" before regeneration
        const edgeSnapshot = new Map();
        if (preserveEdges) {
            (furniture.elements || []).forEach(el => {
                if (!el.deleted) {
                    edgeSnapshot.set(`${el.type}|${el.name}`, el.edges);
                }
            });
        }

        const params = {
            name: furniture.name,
            width: furniture.width,
            height: furniture.height,
            depth: furniture.depth,
            materialId: furniture.materialId,
            edgeBandId: furniture.edgeBandId,
            thickness: furniture.thickness,
            shelfCount: furniture.shelfCount || 0,
            hasBack: furniture.hasBack,
            backMaterial: furniture.backMaterial,
            backOffset: furniture.backOffset || 0,
            hasBaseboard: furniture.hasBaseboard,
            baseboardType: furniture.baseboardType || (furniture.hasBaseboard ? 'maskownica' : 'none'),
            topOption: furniture.topOption || 'none',
            baseboardHeight: furniture.baseboardHeight || 100,
            hasTop: furniture.hasTop !== undefined ? furniture.hasTop : true,
            hasBottom: furniture.hasBottom !== undefined ? furniture.hasBottom : true,
            drawerCount: furniture.drawerCount || 3,
            drawerFrontH: furniture.drawerFrontH || 200,
            hasDoors: furniture.hasDoors || false,
            doorCount: furniture.doorCount || 1,
            doorGap: furniture.doorGap || { top: 2, bottom: 2, left: 2, right: 2, between: 3 },
        };

        let result;
        switch (furniture.type) {
            case 'cabinet':     result = generateCabinet(params); break;
            case 'shelf':       result = generateShelf(params); break;
            case 'drawer_unit': result = generateDrawerUnit(params); break;
            case 'panel':       result = generatePanel(params); break;
            default:            result = generateCabinet(params);
        }

        // Restore manually-edited edges: match new elements by "type|name"
        result.elements = result.elements.map(el => {
            const key = `${el.type}|${el.name}`;
            if (edgeSnapshot.has(key)) {
                return { ...el, edges: edgeSnapshot.get(key) };
            }
            return el;
        });

        return result;
    }

    // Export
    FP.Models = {
        generateCabinet,
        generateShelf,
        generateDrawerUnit,
        generatePanel,
        regenerateFurniture,
        validateFurniture,
        createElement,
        defaultEdges,
        allEdges,
        noEdges,
    };

})(window.FP);
