/* ═══════════════════════════════════════════════════════
   FurniturePro — Export: Cutting List & CSV PRO100
   ═══════════════════════════════════════════════════════ */

(function(FP) {
    'use strict';

    const { Store, MATERIALS, EDGE_BANDS } = FP;

    // ─── Generate cutting list from furniture ───
    function generateCuttingList(furnitureList, options = {}) {
        const { aggregate = true, furnitureId = null } = options;

        let sourceFurniture = furnitureList || Store.getState().furniture;
        if (furnitureId) {
            sourceFurniture = sourceFurniture.filter(f => f.id === furnitureId);
        }

        const items = [];

        sourceFurniture.forEach((furniture, fIdx) => {
            let elIdx = 0;
            furniture.elements.forEach(el => {
                if (el.deleted) return;
                if (!el.visible) return;
                elIdx++;

                const mat = Store.getMaterial(el.materialId) || MATERIALS[0];
                const edges = el.edges || {};

                const getEdgeBand = (side) => {
                    const e = edges[side];
                    if (!e || !e.has) return { has: false, thickness: 0, code: 'NONE', color: '' };
                    if (!e.bandId || e.bandId === 'none') return { has: false, thickness: 0, code: 'NONE', color: '' };
                    const band = Store.getEdgeBand(e.bandId)
                        // Fallback: find 2mm band if custom band not found after project import
                        || EDGE_BANDS.find(b => b.thickness === 2 && b.id !== 'none')
                        || EDGE_BANDS.find(b => b.id !== 'none' && b.thickness > 0);
                    if (!band || band.thickness === 0) return { has: false, thickness: 0, code: 'NONE', color: '' };
                    return { has: true, thickness: band.thickness, code: band.code, color: band.color };
                };

                const eFront = getEdgeBand('front');
                const eBack  = getEdgeBand('back');
                const eLeft  = getEdgeBand('left');
                const eRight = getEdgeBand('right');

                // Cutting dimensions: final size minus edge band thicknesses
                // Front/back edges run along length → they reduce width
                // Left/right edges run along width → they reduce length
                const cutLength = el.length - eLeft.thickness - eRight.thickness;
                const cutWidth  = el.width  - eFront.thickness - eBack.thickness;

                // Determine which edges sit at the ends of the length axis vs width axis.
                // Horizontal panels (bottom/top/shelf/back_panel): length=innerW, so front/back run
                // along length and left/right sit at ends of length. Depth=width, front/back at ends of width.
                // Vertical panels (side_left/side_right/door/panel/maskownica*): length=depth,
                // so front/back sit at ends of length; left/right sit at ends of width.
                const verticalTypes = ['side_left','side_right','door','panel','maskownica','maskownica_dolna','maskownica_gorna'];
                const isVertical = verticalTypes.includes(el.type);
                // meble.pl "Oklejanie szerokości" = edge on the Szerokość(=item.length) axis visible from outside
                // For all panels: front/back edges run along the length axis → they are the "szerokości" edges
                //                 left/right edges run along the width axis  → they are the "wysokość" edges
                const edgeAlongLen = { near: eFront, far: eBack };
                const edgeAlongWid = { near: eLeft,  far: eRight };

                items.push({
                    furnitureName: furniture.name,
                    furnitureId: furniture.id,
                    furnitureIndex: fIdx + 1,
                    elementId: el.id,
                    elementName: el.name,
                    elementIndex: elIdx,
                    elementType: el.type,
                    length: el.length,
                    width: el.width,
                    cutLength: Math.round(cutLength * 10) / 10,
                    cutWidth:  Math.round(cutWidth  * 10) / 10,
                    thickness: el.thickness,
                    quantity: 1,
                    materialName: mat.name,
                    materialCode: mat.code,
                    materialColor: mat.color,
                    grain: el.grain || 'R',
                    edgeFront: eFront,
                    edgeBack:  eBack,
                    edgeLeft:  eLeft,
                    edgeRight: eRight,
                    edgeAlongLen,
                    edgeAlongWid,
                    notes: el.notes || '',
                    room: Store.getState().project.room || '',
                });
            });
        });

        // Aggregate identical pieces
        if (aggregate) {
            const map = new Map();
            items.forEach(item => {
                const key = [
                    item.materialCode,
                    item.length,
                    item.width,
                    item.thickness,
                    item.edgeFront.has, item.edgeFront.code,
                    item.edgeBack.has, item.edgeBack.code,
                    item.edgeLeft.has, item.edgeLeft.code,
                    item.edgeRight.has, item.edgeRight.code,
                    item.grain,
                    item.elementType,
                ].join('|');

                if (map.has(key)) {
                    const existing = map.get(key);
                    existing.quantity += 1;
                    if (!existing.elementName.includes(item.elementName)) {
                        existing.elementName += `, ${item.elementName}`;
                    }
                    if (existing.furnitureName !== item.furnitureName) {
                        if (!existing.furnitureName.includes(item.furnitureName)) {
                            existing.furnitureName += `, ${item.furnitureName}`;
                        }
                    }
                } else {
                    map.set(key, { ...item });
                }
            });
            return Array.from(map.values());
        }

        return items;
    }

    // ─── Generate material summary ───
    function generateMaterialSummary(cuttingList) {
        const plateSummary = {};  // key: materialCode -> { name, area_mm2, count }
        const edgeSummary = {};   // key: edgeCode -> { name, length_mm }

        cuttingList.forEach(item => {
            // Plates
            const pKey = item.materialCode;
            if (!plateSummary[pKey]) {
                plateSummary[pKey] = {
                    name: item.materialName,
                    code: pKey,
                    color: item.materialColor,
                    thickness: item.thickness,
                    areaM2: 0,
                    count: 0,
                };
            }
            plateSummary[pKey].areaM2 += (item.length * item.width * item.quantity) / 1000000;
            plateSummary[pKey].count += item.quantity;

            // Edges
            const addEdge = (edge, lengthMm) => {
                if (!edge.has) return;
                const eKey = edge.code;
                if (!edgeSummary[eKey]) {
                    const band = Store.getEdgeBand(eKey === 'NONE' ? 'none' : EDGE_BANDS.find(b => b.code === edge.code)?.id);
                    edgeSummary[eKey] = {
                        name: band ? band.name : edge.code,
                        code: eKey,
                        color: edge.color,
                        thickness: edge.thickness,
                        lengthM: 0,
                    };
                }
                edgeSummary[eKey].lengthM += (lengthMm * item.quantity) / 1000;
            };

            // Front/back edges = length of piece, left/right edges = width of piece
            addEdge(item.edgeFront, item.length);
            addEdge(item.edgeBack, item.length);
            addEdge(item.edgeLeft, item.width);
            addEdge(item.edgeRight, item.width);
        });

        return {
            plates: Object.values(plateSummary),
            edges: Object.values(edgeSummary),
        };
    }

    // ═══════════════════════════════════════════════════════
    // MEBLE.PL ROZKRÓJ CSV (per material)
    // ═══════════════════════════════════════════════════════
    // Format: Nazwa;Szerokość;Oklejanie szer.;Wysokość;Oklejanie wys.;Grubość;Ilość;Słoje
    // Oklejanie: '=' = tak, '-' = nie
    // Słoje: 0=bez znaczenia, 1=po wysokości, 2=po szerokości (po pierwszym wymiarze)

    const MEBLEPL_HEADER = 'Nazwa (nie wpływa na rozkrój);Szerokość;Oklejanie szerokości;Wysokość;Oklejanie wysokość;Grubość płyty;Ilość sztuk;Słoje [0 = bez znaczenia / 1 = po drugim wymiarze (po wysokości) /  2 lub puste = po pierwszym wymiarze (po szerokości) ]';

    function toAsciiUpper(str) {
        return (str || '')
            .replace(/ą/g,'a').replace(/Ą/g,'A')
            .replace(/ć/g,'c').replace(/Ć/g,'C')
            .replace(/ę/g,'e').replace(/Ę/g,'E')
            .replace(/ł/g,'l').replace(/Ł/g,'L')
            .replace(/ń/g,'n').replace(/Ń/g,'N')
            .replace(/ó/g,'o').replace(/Ó/g,'O')
            .replace(/ś/g,'s').replace(/Ś/g,'S')
            .replace(/ź/g,'z').replace(/Ź/g,'Z')
            .replace(/ż/g,'z').replace(/Ż/g,'Z')
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '');
    }

    function formatMeblePlName(item) {
        const fi = String(item.furnitureIndex || 1);
        const ei = String(item.elementIndex || 1);
        const fn = toAsciiUpper(item.furnitureName).substring(0, 7);
        const en = toAsciiUpper(item.elementName).substring(0, 6);
        return `${fi}/${ei}/${fn}/${en}`.substring(0, 20);
    }

    function generateMeblePlCSV(items) {
        // items: all cuttingList entries for ONE material
        const sep = ';';
        const lines = [MEBLEPL_HEADER];
        items.forEach(item => {
            // meble.pl edge coding: '=' = both sides, '-' = one side, '' = none
            const L1 = item.edgeAlongLen?.near, L2 = item.edgeAlongLen?.far;
            const lenCount = (L1?.has ? 1 : 0) + (L2?.has ? 1 : 0);
            const edgeSzer = lenCount === 2 ? '=' : lenCount === 1 ? '-' : '';

            const W1 = item.edgeAlongWid?.near, W2 = item.edgeAlongWid?.far;
            const widCount = (W1?.has ? 1 : 0) + (W2?.has ? 1 : 0);
            const edgeWys  = widCount === 2 ? '=' : widCount === 1 ? '-' : '';

            const nameOut = formatMeblePlName(item);
            // Grain: R → 2 (along first dim/szerokość), N → 0
            const sloje = item.grain === 'R' ? '2' : '0';
            // Use cut dimensions (finished size minus edge band thicknesses)
            const row = [
                nameOut,
                parseFloat(item.cutLength).toFixed(1),
                edgeSzer,
                parseFloat(item.cutWidth).toFixed(1),
                edgeWys,
                parseFloat(item.thickness).toFixed(1),
                item.quantity,
                sloje,
            ];
            lines.push(row.join(sep));
        });
        return lines.join('\r\n');
    }

    // Groups cutting list by materialCode and returns array of { materialName, materialCode, csv }
    function generateMeblePlPerMaterial(cuttingList) {
        const groups = new Map();
        cuttingList.forEach(item => {
            if (!groups.has(item.materialCode)) {
                groups.set(item.materialCode, { materialName: item.materialName, materialCode: item.materialCode, items: [] });
            }
            groups.get(item.materialCode).items.push(item);
        });
        return Array.from(groups.values()).map(g => ({
            materialName: g.materialName,
            materialCode: g.materialCode,
            csv: generateMeblePlCSV(g.items),
        }));
    }

    // ═══════════════════════════════════════════════════════
    // CSV PRO100 EXPORT (legacy, kept for reference)
    // ═══════════════════════════════════════════════════════

    const CSV_HEADERS = [
        'Typ pola',
        'Nazwa elementu',
        'Nazwa płyty',
        'Długość',
        'Szerokość',
        'Wymiar cięcia dł.',
        'Wymiar cięcia szer.',
        'Ilość',
        'Okleina przód - czy istnieje',
        'Okleina tył - czy istnieje',
        'Okleina lewo - czy istnieje',
        'Okleina prawo - czy istnieje',
        'Okleina przód - grubość',
        'Okleina tył - grubość',
        'Okleina lewo - grubość',
        'Okleina prawo - grubość',
        'Okleina przód - Kod',
        'Okleina tył - Kod',
        'Okleina lewo - Kod',
        'Okleina prawo - Kod',
        'Kod materiału',
        'Usłojenie',
        'Info 1',
        'Info 2',
    ];

    function generateCSV(cuttingList, options = {}) {
        const separator = options.separator || ';';
        const projectName = Store.getState().project.name || '';
        const room = Store.getState().project.room || '';

        const lines = [CSV_HEADERS.join(separator)];

        cuttingList.forEach(item => {
            const row = [
                'Element',
                item.elementName,
                item.materialName,
                parseFloat(item.length).toFixed(1),
                parseFloat(item.width).toFixed(1),
                parseFloat(item.cutLength).toFixed(1),
                parseFloat(item.cutWidth).toFixed(1),
                item.quantity,
                item.edgeFront.has ? '1' : '0',
                item.edgeBack.has ? '1' : '0',
                item.edgeLeft.has ? '1' : '0',
                item.edgeRight.has ? '1' : '0',
                item.edgeFront.has ? parseFloat(item.edgeFront.thickness).toFixed(1) : '',
                item.edgeBack.has ? parseFloat(item.edgeBack.thickness).toFixed(1) : '',
                item.edgeLeft.has ? parseFloat(item.edgeLeft.thickness).toFixed(1) : '',
                item.edgeRight.has ? parseFloat(item.edgeRight.thickness).toFixed(1) : '',
                item.edgeFront.has ? item.edgeFront.code : '',
                item.edgeBack.has ? item.edgeBack.code : '',
                item.edgeLeft.has ? item.edgeLeft.code : '',
                item.edgeRight.has ? item.edgeRight.code : '',
                item.materialCode,
                item.grain,
                item.furnitureName || projectName,
                room,
            ];
            lines.push(row.join(separator));
        });

        return lines.join('\r\n');
    }

    // ─── Download CSV ───
    function downloadCSV(csvContent, filename) {
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'formatki_pro100.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ─── Render cutting list HTML table ───
    function renderCuttingListHTML(cuttingList) {
        if (!cuttingList || cuttingList.length === 0) {
            return '<div style="padding:40px;text-align:center;color:#8690a2">Brak formatek do wyświetlenia. Dodaj mebel do projektu.</div>';
        }

        const edgeCell = (edge) => {
            if (!edge.has) return '<span class="cl-edge no">—</span>';
            return `<span class="cl-edge yes" title="${edge.code} ${edge.thickness}mm">✓</span>`;
        };

        let html = '<table class="cl-table"><thead><tr>';
        html += '<th>#</th>';
        html += '<th>Mebel</th>';
        html += '<th>Element</th>';
        html += '<th>Materiał</th>';
        html += '<th class="num">Dł.</th>';
        html += '<th class="num">Szer.</th>';
        html += '<th class="num" title="Wymiar cięcia (dł.)">Cięcie dł.</th>';
        html += '<th class="num" title="Wymiar cięcia (szer.)">Cięcie szer.</th>';
        html += '<th class="num">Ilość</th>';
        html += '<th>P</th><th>T</th><th>L</th><th>R</th>';
        html += '<th>Usł.</th>';
        html += '<th>Kod</th>';
        html += '</tr></thead><tbody>';

        cuttingList.forEach((item, idx) => {
            html += `<tr>`;
            html += `<td>${idx + 1}</td>`;
            html += `<td title="${item.furnitureName}">${item.furnitureName.substring(0, 20)}</td>`;
            html += `<td><strong>${item.elementName}</strong></td>`;
            html += `<td><span class="color-swatch" style="background:${item.materialColor};width:14px;height:14px;display:inline-block;border-radius:3px;border:1px solid #ddd;vertical-align:middle;margin-right:4px"></span>${item.materialName}</td>`;
            html += `<td class="num">${parseFloat(item.length).toFixed(1)}</td>`;
            html += `<td class="num">${parseFloat(item.width).toFixed(1)}</td>`;
            html += `<td class="num" style="color:#6b7280">${parseFloat(item.cutLength).toFixed(1)}</td>`;
            html += `<td class="num" style="color:#6b7280">${parseFloat(item.cutWidth).toFixed(1)}</td>`;
            html += `<td class="num"><strong>${item.quantity}</strong></td>`;
            html += `<td>${edgeCell(item.edgeFront)}</td>`;
            html += `<td>${edgeCell(item.edgeBack)}</td>`;
            html += `<td>${edgeCell(item.edgeLeft)}</td>`;
            html += `<td>${edgeCell(item.edgeRight)}</td>`;
            html += `<td>${item.grain}</td>`;
            html += `<td><code style="font-size:10px">${item.materialCode}</code></td>`;
            html += `</tr>`;
        });

        html += '</tbody></table>';
        return html;
    }

    // ─── Render summary HTML ───
    function renderSummaryHTML(summary) {
        let html = '';
        html += `<strong>Płyty:</strong> ${summary.plates.map(p => `${p.name}: ${p.areaM2.toFixed(2)}m² (${p.count} szt.)`).join(' | ')}`;
        html += ` &nbsp; <strong>Obrzeża:</strong> ${summary.edges.map(e => `${e.name}: ${e.lengthM.toFixed(1)}m`).join(' | ')}`;
        return html;
    }

    // ─── Render order HTML ───
    function renderOrderHTML(cuttingList) {
        const summary = generateMaterialSummary(cuttingList);
        const cost = estimateCost(summary);

        let html = '<div style="padding:16px">';

        // Plate summary
        html += '<h3 style="margin-bottom:12px"><i class="fas fa-th-large"></i> Podsumowanie płyt</h3>';
        html += '<table class="cl-table"><thead><tr><th>Materiał</th><th>Kod</th><th class="num">Grubość</th><th class="num">Powierzchnia</th><th class="num">Szt.</th></tr></thead><tbody>';
        summary.plates.forEach(p => {
            html += `<tr><td><span class="color-swatch" style="background:${p.color}"></span> ${p.name}</td><td><code>${p.code}</code></td><td class="num">${p.thickness}mm</td><td class="num">${p.areaM2.toFixed(2)} m²</td><td class="num">${p.count}</td></tr>`;
        });
        html += '</tbody></table>';

        // Edge summary
        html += '<h3 style="margin:20px 0 12px"><i class="fas fa-ruler-horizontal"></i> Podsumowanie obrzeży</h3>';
        html += '<table class="cl-table"><thead><tr><th>Obrzeże</th><th>Kod</th><th class="num">Grubość</th><th class="num">Długość</th></tr></thead><tbody>';
        summary.edges.forEach(e => {
            html += `<tr><td><span class="color-swatch" style="background:${e.color}"></span> ${e.name}</td><td><code>${e.code}</code></td><td class="num">${e.thickness}mm</td><td class="num">${e.lengthM.toFixed(1)} m</td></tr>`;
        });
        html += '</tbody></table>';

        html += '</div>';
        return html;
    }

    // Export
    FP.Export = {
        generateCuttingList,
        generateMaterialSummary,
        generateMeblePlCSV,
        generateMeblePlPerMaterial,
        generateCSV,
        downloadCSV,
        renderCuttingListHTML,
        renderSummaryHTML,
        renderOrderHTML,
        CSV_HEADERS,
    };

})(window.FP);
