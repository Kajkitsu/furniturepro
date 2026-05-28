/* ═══════════════════════════════════════════════════════
   FurniturePro — 3D Viewport (Three.js)
   ═══════════════════════════════════════════════════════ */

(function(FP) {
    'use strict';

    const { Store } = FP;

    let scene, camera, renderer, controls;
    let meshMap = {};              // elementId -> THREE.Mesh (for selection/highlight)
    let sceneObjMap = {};          // elementId -> scene object (Mesh or Group) added to scene
    let outlineMesh = null;        // highlight outline
    let gridHelper = null;
    let labels = [];               // CSS2D labels (we'll use sprites)
    let labelSprites = [];
    let explodeOffset = 0;
    let container, canvas;
    let raycaster, mouse;
    let animId = null;
    let _hasUserCamera = false;  // once user manually moves camera, stop auto-fitting
    let _lastActiveFurnitureId = null; // track switches to re-fit on new furniture
    let _programmingCamera = false; // suppress _hasUserCamera during programmatic moves

    const SCALE = 0.001;          // mm -> Three.js units (1mm = 0.001 unit, so 1000mm = 1 unit)

    // ─── Color helpers ───
    function hexToThreeColor(hex) {
        return new THREE.Color(hex || '#CCCCCC');
    }

    // ─── Init ───
    function init() {
        container = document.getElementById('viewport-container');
        canvas = document.getElementById('viewport-canvas');
        if (!container || !canvas) return;

        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0xe8ecf1);

        // Camera
        camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.01, 100);
        camera.position.set(1.5, 1.2, 1.5);

        // Renderer
        renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
        // updateStyle=false: let CSS (position:absolute; inset:0) handle sizing, not inline px values
        renderer.setSize(container.clientWidth, container.clientHeight, false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;

        // OrbitControls
        if (THREE.OrbitControls) {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.08;
            controls.minDistance = 0.1;
            controls.maxDistance = 20;
            controls.mouseButtons = {
                LEFT:   THREE.MOUSE.ROTATE,
                MIDDLE: THREE.MOUSE.DOLLY,
                RIGHT:  THREE.MOUSE.PAN,
            };
            controls.target.set(0, 0, 0);
            controls.update();

            // Mark that user has taken manual control of camera (only on actual movement)
            controls.addEventListener('change', () => {
                if (!_programmingCamera) _hasUserCamera = true;
            });
        }

        // Prevent browser context menu on canvas (needed for right-click pan)
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.55);
        scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
        dirLight.position.set(4, 6, 3);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(1024, 1024);
        dirLight.shadow.camera.near = 0.1;
        dirLight.shadow.camera.far = 20;
        dirLight.shadow.camera.left = -3;
        dirLight.shadow.camera.right = 3;
        dirLight.shadow.camera.top = 3;
        dirLight.shadow.camera.bottom = -3;
        scene.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0xb0c4de, 0.3);
        fillLight.position.set(-3, 2, -2);
        scene.add(fillLight);

        // Grid
        gridHelper = new THREE.GridHelper(4, 40, 0xc0c8d4, 0xdce0e8);
        gridHelper.position.y = -0.001;
        scene.add(gridHelper);

        // Floor
        const floorGeo = new THREE.PlaneGeometry(4, 4);
        const floorMat = new THREE.ShadowMaterial({ opacity: 0.08 });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        // Raycaster
        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();

        // Events
        renderer.domElement.addEventListener('click', onCanvasClick);
        renderer.domElement.addEventListener('dblclick', onCanvasDblClick);
        window.addEventListener('resize', onResize);

        // Start loop
        animate();

        // Force correct sizing after first paint (in case layout wasn't settled at DOMContentLoaded)
        requestAnimationFrame(() => onResize());
    }

    // ─── Render loop ───
    function animate() {
        animId = requestAnimationFrame(animate);
        if (controls) controls.update();
        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    // ─── Resize ───
    function onResize() {
        if (!container || !renderer || !camera) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
    }

    // ─── Click selection ───
    function onCanvasClick(event) {
        if (!renderer || !camera) return;
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const meshes = Object.values(meshMap);
        const intersects = raycaster.intersectObjects(meshes, false);

        if (intersects.length > 0) {
            const hit = intersects[0].object;
            const elId = hit.userData.elementId;
            Store.selectElement(elId);
        } else {
            Store.selectElement(null);
        }
    }

    function onCanvasDblClick(event) {
        // Double click = fit view to selected or all
        fitView();
    }

    // ─── Build furniture 3D ───
    function buildScene() {
        // Clear old meshes — use sceneObjMap to remove what was actually added to the scene
        // (could be a pivot Group when doors are open, not the mesh itself)
        Object.values(sceneObjMap).forEach(obj => {
            scene.remove(obj);
            obj.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => { if (mat) mat.dispose(); });
                    } else {
                        child.material.dispose();
                    }
                }
            });
        });
        meshMap = {};
        sceneObjMap = {};

        // Clear outline
        if (outlineMesh) {
            scene.remove(outlineMesh);
            outlineMesh = null;
        }

        // Clear labels
        labelSprites.forEach(s => scene.remove(s));
        labelSprites = [];

        const state = Store.getState();
        const furniture = Store.getActiveFurniture();
        if (!furniture) return;

        // Reset camera auto-fit when switching to a different furniture
        if (furniture.id !== _lastActiveFurnitureId) {
            _lastActiveFurnitureId = furniture.id;
            _hasUserCamera = false;
        }

        const elements = furniture.elements.filter(e => !e.deleted);

        elements.forEach((el, idx) => {
            if (!el.visible) return;

            // Hide back panels if toggle is off
            if (el.type === 'back_panel' && !state.showBackPanels) return;

            try {
                const sceneObj = createElementMesh(el, furniture, idx);
                if (sceneObj) {
                    scene.add(sceneObj);
                    sceneObjMap[el.id] = sceneObj;
                    // If a pivot group was returned, store the actual mesh (first child) in meshMap
                    // so that selection/highlight still works correctly
                    if (sceneObj instanceof THREE.Group && sceneObj.children[0] instanceof THREE.Mesh) {
                        meshMap[el.id] = sceneObj.children[0];
                    } else {
                        meshMap[el.id] = sceneObj;
                    }
                }
            } catch (err) {
                console.error('FurniturePro: failed to create mesh for element', el.id, el.type, err);
            }
        });

        // Highlight selected
        highlightSelected();

        // Update grid visibility
        if (gridHelper) gridHelper.visible = state.showGrid;

        // Auto-fit view if user hasn't manually moved the camera yet
        if (Object.keys(meshMap).length > 0) {
            if (!_hasUserCamera) {
                fitView();
            } else {
                // Still center the orbit target even if user has moved camera
                const box = new THREE.Box3();
                Object.values(meshMap).forEach(m => box.expandByObject(m));
                if (!box.isEmpty() && controls) {
                    const center = box.getCenter(new THREE.Vector3());
                    _programmingCamera = true;
                    controls.target.copy(center);
                    controls.update();
                    _programmingCamera = false;
                }
            }
        }

        // Update status
        updateStatus(furniture);
    }

    // ─── Chipboard texture (single shared instance) ───
    // Raw chipboard cross-section is always the same sandy/beige wood-chip color
    // regardless of what laminate is on the flat faces.
    let _chipboardTexture = null;

    function createChipboardTexture() {
        if (_chipboardTexture) return _chipboardTexture;

        // Realistic particle-board colours: sandy base with light/dark wood chips
        const BASE   = { r: 185, g: 155, b: 110 };  // medium tan
        const LIGHT  = { r: 220, g: 195, b: 155 };  // light pine chip
        const DARK   = { r: 110, g:  80, b:  45 };  // dark wood chip

        const SIZE = 256;
        const canvas2d = document.createElement('canvas');
        canvas2d.width  = SIZE;
        canvas2d.height = SIZE;
        const ctx = canvas2d.getContext('2d');

        // Solid base
        ctx.fillStyle = `rgb(${BASE.r},${BASE.g},${BASE.b})`;
        ctx.fillRect(0, 0, SIZE, SIZE);

        // Scattered wood chips — short elongated rectangles at random angles
        for (let i = 0; i < 1200; i++) {
            const x  = Math.random() * SIZE;
            const y  = Math.random() * SIZE;
            const len = Math.random() * 8 + 2;
            const wid = Math.random() * 2 + 0.5;
            const ang = Math.random() * Math.PI;

            // Pick colour: mostly base-toned, occasionally light or dark chip
            const rnd = Math.random();
            let col;
            if (rnd < 0.25)       col = LIGHT;
            else if (rnd < 0.45)  col = DARK;
            else                  col = BASE;

            const vari = (Math.random() - 0.5) * 40;
            const r = Math.min(255, Math.max(0, col.r + vari));
            const g = Math.min(255, Math.max(0, col.g + vari));
            const b = Math.min(255, Math.max(0, col.b + vari));
            const a = 0.5 + Math.random() * 0.5;

            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(ang);
            ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${a})`;
            ctx.fillRect(-len / 2, -wid / 2, len, wid);
            ctx.restore();
        }

        const texture = new THREE.CanvasTexture(canvas2d);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(4, 4);
        _chipboardTexture = texture;
        return texture;
    }

    /**
     * Map element edges (front/back/left/right) to BoxGeometry face groups.
     * BoxGeometry face order: [+X, -X, +Y, -Y, +Z, -Z]
     *
     * Furniture coordinate system: z=0 is the FRONT, z=depth is the BACK.
     * For a box centered at depth/2:
     *   -Z face (index 5) = z=0 = FRONT of furniture
     *   +Z face (index 4) = z=depth = BACK of furniture
     *
     * Returns an array of 6 items indicating the edge for each face,
     * or null if the face is a laminate surface (large flat face, not an edge).
     */
    function mapEdgesToFaces(el) {
        const edges = el.edges || {};
        switch (el.type) {
            case 'side_left':
            case 'side_right':
                // geoW=thickness(X), geoH=height(Y), geoD=depth(Z)
                // Large flat faces: +X, -X (visible inner/outer surfaces)
                // +Y = top edge, -Y = bottom edge
                // -Z (index 5) = front of furniture, +Z (index 4) = back
                return [
                    null,          // +X = laminate
                    null,          // -X = laminate
                    edges.left,    // +Y = top edge
                    edges.right,   // -Y = bottom edge
                    edges.back,    // +Z = back of furniture
                    edges.front,   // -Z = front of furniture
                ];

            case 'bottom':
            case 'top':
            case 'shelf':
            case 'baseboard':
                // geoW=length(X), geoH=thickness(Y), geoD=width(Z)
                // Large flat faces: +Y, -Y (top/bottom laminate surfaces)
                // -Z (index 5) = front of furniture, +Z (index 4) = back
                return [
                    edges.right,   // +X = right edge
                    edges.left,    // -X = left edge
                    null,          // +Y = laminate surface
                    null,          // -Y = laminate surface
                    edges.back,    // +Z = back of furniture
                    edges.front,   // -Z = front of furniture
                ];

            case 'back_panel':
                // geoW=length(X), geoH=height(Y), geoD=thickness(Z)
                // Large flat faces: +Z, -Z
                return [
                    edges.right,   // +X
                    edges.left,    // -X
                    edges.front,   // +Y = top edge
                    edges.back,    // -Y = bottom edge
                    null,          // +Z = laminate
                    null,          // -Z = laminate
                ];

            case 'drawer_front':
            case 'door':
                // geoW=length(X), geoH=height(Y), geoD=thickness(Z)
                // Large flat faces: +Z, -Z
                return [
                    edges.right,   // +X
                    edges.left,    // -X
                    edges.front,   // +Y = top edge
                    edges.back,    // -Y = bottom edge
                    null,          // +Z = laminate front
                    null,          // -Z = laminate back
                ];

            case 'drawer_side':
                // geoW=thickness(X), geoH=height(Y), geoD=length(Z)
                return [
                    null, null,    // +X, -X = laminate
                    edges.left,    // +Y = top edge
                    edges.right,   // -Y = bottom edge
                    edges.back,    // +Z
                    edges.front,   // -Z
                ];

            case 'drawer_back':
                // geoW=length(X), geoH=height(Y), geoD=thickness(Z)
                return [
                    edges.right,
                    edges.left,
                    edges.front,
                    edges.back,
                    null, null,
                ];

            case 'drawer_bottom':
            case 'panel':
                // geoW=length(X), geoH=thickness(Y), geoD=width(Z)
                return [
                    edges.right,
                    edges.left,
                    null, null,    // laminate
                    edges.back,    // +Z
                    edges.front,   // -Z
                ];

            default:
                return [
                    edges.right, edges.left,
                    null, null,
                    edges.back, edges.front,
                ];
        }
    }

    function createElementMaterials(el) {
        const faceMapping = mapEdgesToFaces(el);
        const panelColor  = hexToThreeColor(el.color);
        const chipboardTex = createChipboardTexture(); // fixed raw chipboard colour

        // Build 6 materials for 6 face groups
        const materials = faceMapping.map(edge => {
            if (edge === null) {
                // Laminate surface — smooth panel color
                return new THREE.MeshStandardMaterial({
                    color: panelColor,
                    roughness: 0.5,
                    metalness: 0.0,
                });
            }
            if (edge && edge.has && edge.bandId && edge.bandId !== 'none') {
                // Edgebanded face — use edge band color
                const band = Store.getEdgeBand(edge.bandId);
                const edgeColor = band ? hexToThreeColor(band.color) : panelColor;
                return new THREE.MeshStandardMaterial({
                    color: edgeColor,
                    roughness: 0.45,
                    metalness: 0.0,
                });
            }
            // Raw chipboard — no edge band
            return new THREE.MeshStandardMaterial({
                map: chipboardTex,
                roughness: 0.85,
                metalness: 0.0,
            });
        });

        return materials;
    }

    // ─── Create mesh for one element ───
    function createElementMesh(el, furniture, idx) {
        // Determine 3D box dimensions based on element type
        let geoW, geoH, geoD;
        let posX, posY, posZ;

        const state = Store.getState();
        const explode = state.explodedView ? 0.03 : 0;

        switch (el.type) {
            case 'side_left':
            case 'side_right':
                // Side panels: thickness in X, height(=width) in Y, depth(=length) in Z
                geoW = el.thickness * SCALE;
                geoH = el.width * SCALE;      // width of side = height of furniture
                geoD = el.length * SCALE;      // length of side = depth of furniture
                posX = el.x * SCALE + geoW / 2;
                posY = el.y * SCALE + geoH / 2;
                posZ = el.z * SCALE + geoD / 2;
                if (el.type === 'side_left') posX -= explode;
                if (el.type === 'side_right') posX += explode;
                break;

            case 'bottom':
            case 'top':
            case 'shelf':
            case 'baseboard':
                // Horizontal panels: length in X, thickness in Y, width in Z
                geoW = el.length * SCALE;
                geoH = el.thickness * SCALE;
                geoD = el.width * SCALE;
                posX = el.x * SCALE + geoW / 2;
                posY = el.y * SCALE + geoH / 2;
                posZ = el.z * SCALE + geoD / 2;
                if (el.type === 'top') posY += explode;
                if (el.type === 'bottom') posY -= explode;
                if (el.type === 'shelf') posY += explode * (idx * 0.5);
                break;

            case 'back_panel':
                // Back panel: length in X, width(=height) in Y, thickness in Z
                geoW = el.length * SCALE;
                geoH = el.width * SCALE;
                geoD = el.thickness * SCALE;
                posX = el.x * SCALE + geoW / 2;
                posY = el.y * SCALE + geoH / 2;
                posZ = el.z * SCALE + geoD / 2;
                posZ += explode;
                break;

            case 'drawer_front':
                geoW = el.length * SCALE;
                geoH = el.width * SCALE;
                geoD = el.thickness * SCALE;
                posX = el.x * SCALE + geoW / 2;
                posY = el.y * SCALE + geoH / 2;
                posZ = el.z * SCALE + geoD / 2;
                posZ -= explode * 2;
                break;

            case 'door':
                geoW = el.length * SCALE;
                geoH = el.width * SCALE;
                geoD = el.thickness * SCALE;
                posX = el.x * SCALE + geoW / 2;
                posY = el.y * SCALE + geoH / 2;
                posZ = el.z * SCALE + geoD / 2;
                posZ -= explode * 2;
                break;

            case 'drawer_side':
                geoW = el.thickness * SCALE;
                geoH = el.width * SCALE;
                geoD = el.length * SCALE;
                posX = el.x * SCALE + geoW / 2;
                posY = el.y * SCALE + geoH / 2;
                posZ = el.z * SCALE + geoD / 2;
                break;

            case 'drawer_back':
                geoW = el.length * SCALE;
                geoH = el.width * SCALE;
                geoD = el.thickness * SCALE;
                posX = el.x * SCALE + geoW / 2;
                posY = el.y * SCALE + geoH / 2;
                posZ = el.z * SCALE + geoD / 2;
                break;

            case 'drawer_bottom':
                geoW = el.length * SCALE;
                geoH = el.thickness * SCALE;
                geoD = el.width * SCALE;
                posX = el.x * SCALE + geoW / 2;
                posY = el.y * SCALE + geoH / 2;
                posZ = el.z * SCALE + geoD / 2;
                break;

            case 'panel':
                geoW = el.length * SCALE;
                geoH = el.thickness * SCALE;
                geoD = el.width * SCALE;
                posX = el.x * SCALE + geoW / 2;
                posY = el.y * SCALE + geoH / 2;
                posZ = el.z * SCALE + geoD / 2;
                break;

            default:
                geoW = el.length * SCALE;
                geoH = el.thickness * SCALE;
                geoD = el.width * SCALE;
                posX = el.x * SCALE + geoW / 2;
                posY = el.y * SCALE + geoH / 2;
                posZ = el.z * SCALE + geoD / 2;
        }

        const geo = new THREE.BoxGeometry(geoW, geoH, geoD);

        // Per-face materials: laminate surface, edge band color, or chipboard texture
        const faceMaterials = createElementMaterials(el);
        const mesh = new THREE.Mesh(geo, faceMaterials);
        mesh.position.set(posX, posY, posZ);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.elementId = el.id;
        mesh.userData.elementType = el.type;

        // Add edge lines
        const edges = new THREE.EdgesGeometry(geo);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x999999, opacity: 0.3, transparent: true });
        const edgeLines = new THREE.LineSegments(edges, lineMat);
        mesh.add(edgeLines);

        // Label sprite
        if (state && state.showLabels) {
            const sprite = createTextSprite(`${el.elementNumber || idx + 1}`, 0.025);
            sprite.position.set(0, geoH / 2 + 0.015, 0);
            mesh.add(sprite);
            labelSprites.push(sprite);
        }

        // ── Door open/close rotation ──
        if (el.type === 'door' && el.name && el.name.startsWith('Drzwi') && state && state.doorsOpen) {
            const DOOR_OPEN_ANGLE = 110 * (Math.PI / 180);
            const isRight = el.name === 'Drzwi prawe';
            const pivot = new THREE.Group();
            pivot.userData.elementId = el.id;
            pivot.userData.elementType = el.type;

            if (isRight) {
                // Pivot at right edge of door — opens to the right (rotation -110° around Y)
                const hingeX = (el.x + el.length) * SCALE;
                const hingeY = el.y * SCALE + geoH / 2;
                const hingeZ = posZ;
                pivot.position.set(hingeX, hingeY, hingeZ);
                // Mesh center is geoW/2 to the LEFT of right edge
                mesh.position.set(-geoW / 2, 0, 0);
                pivot.rotation.y = -DOOR_OPEN_ANGLE;
            } else {
                // Pivot at left edge of door (single or left door) — opens to the left (rotation +110° around Y)
                const hingeX = el.x * SCALE;
                const hingeY = el.y * SCALE + geoH / 2;
                const hingeZ = posZ;
                pivot.position.set(hingeX, hingeY, hingeZ);
                // Mesh center is geoW/2 to the RIGHT of left edge
                mesh.position.set(geoW / 2, 0, 0);
                pivot.rotation.y = DOOR_OPEN_ANGLE;
            }

            pivot.add(mesh);
            return pivot;
        }

        return mesh;
    }

    // ─── Text sprite for labels ───
    function createTextSprite(text, size) {
        const canvas2d = document.createElement('canvas');
        canvas2d.width = 64;
        canvas2d.height = 32;
        const ctx = canvas2d.getContext('2d');
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(0, 0, 64, 32);
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, 32, 16);

        const texture = new THREE.CanvasTexture(canvas2d);
        const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(size * 2, size, 1);
        return sprite;
    }

    // ─── Highlight selected element ───
    function highlightSelected() {
        if (outlineMesh) {
            scene.remove(outlineMesh);
            outlineMesh = null;
        }

        const state = Store.getState();
        const selId = state.selectedElementId;
        if (!selId || !meshMap[selId]) return;

        const mesh = meshMap[selId];

        // Create outline effect
        const outlineGeo = mesh.geometry.clone();
        const outlineMat = new THREE.MeshBasicMaterial({
            color: 0x2563eb,
            side: THREE.BackSide,
            transparent: true,
            opacity: 0.3,
        });
        outlineMesh = new THREE.Mesh(outlineGeo, outlineMat);
        // Use world position/quaternion in case mesh is inside a pivot group (e.g. open door)
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        mesh.getWorldPosition(worldPos);
        mesh.getWorldQuaternion(worldQuat);
        outlineMesh.position.copy(worldPos);
        outlineMesh.quaternion.copy(worldQuat);
        outlineMesh.scale.multiplyScalar(1.04);
        scene.add(outlineMesh);

        // Also color the original mesh edges
        mesh.children.forEach(child => {
            if (child instanceof THREE.LineSegments) {
                child.material.color.set(0x2563eb);
                child.material.opacity = 1;
            }
        });
    }

    // ─── Fit camera to all objects ───
    function fitView() {
        if (!camera || !controls) return;

        const box = new THREE.Box3();
        Object.values(meshMap).forEach(m => box.expandByObject(m));

        if (box.isEmpty()) return;

        const center = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov    = camera.fov * (Math.PI / 180);
        let dist     = (maxDim / (2 * Math.tan(fov / 2))) * 1.8;

        // Position camera at isometric-ish angle around the center
        _programmingCamera = true;
        camera.position.set(
            center.x + dist * 0.65,
            center.y + dist * 0.55,
            center.z + dist * 0.65
        );
        controls.target.copy(center);
        controls.update();
        _programmingCamera = false;
    }

    // ─── Camera preset views ───
    function setView(viewName) {
        if (!camera || !controls) return;

        const box = new THREE.Box3();
        Object.values(meshMap).forEach(m => box.expandByObject(m));
        if (box.isEmpty()) return;

        const center = box.getCenter(new THREE.Vector3());
        const size   = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) * 1.8;

        _hasUserCamera = false;  // allow auto-fit again after explicit view reset
        _programmingCamera = true;

        switch (viewName) {
            case 'front':
                camera.position.set(center.x, center.y, center.z - maxDim);
                break;
            case 'top':
                camera.position.set(center.x, center.y + maxDim, center.z);
                break;
            case 'right':
                camera.position.set(center.x + maxDim, center.y, center.z);
                break;
            case 'perspective':
            default:
                camera.position.set(center.x + maxDim * 0.6, center.y + maxDim * 0.4, center.z + maxDim * 0.6);
                break;
        }

        controls.target.copy(center);
        controls.update();
        _programmingCamera = false;
    }

    // ─── Update status bar ───
    function updateStatus(furniture) {
        const dimsEl = document.getElementById('vp-status-dims');
        const infoEl = document.getElementById('vp-status-info');
        if (!dimsEl || !infoEl) return;

        if (furniture) {
            dimsEl.textContent = `${furniture.width} × ${furniture.height} × ${furniture.depth} mm`;
            const active = furniture.elements.filter(e => !e.deleted).length;
            infoEl.textContent = `${furniture.name} — ${active} elementów`;
        } else {
            dimsEl.textContent = '—';
            infoEl.textContent = 'Brak aktywnego mebla';
        }
    }

    // ─── Refresh just highlight (no full rebuild) ───
    function refreshHighlight() {
        // Reset all edge colors
        Object.values(meshMap).forEach(m => {
            m.children.forEach(child => {
                if (child instanceof THREE.LineSegments) {
                    child.material.color.set(0x999999);
                    child.material.opacity = 0.3;
                }
            });
        });
        highlightSelected();
    }

    // ─── Public API ───
    FP.Viewport = {
        init,
        buildScene,
        fitView,
        setView,
        refreshHighlight,
        onResize,
        getScene: () => scene,
        getCamera: () => camera,
    };

})(window.FP);
