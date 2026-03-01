# Sorcherer

![Osciliating Cat Demo](https://raw.githubusercontent.com/yepistream/sorcherer/refs/heads/main/osciliating_cat.gif)

Sorcherer attaches HTML overlays to Three.js `Object3D` instances and keeps them positioned in screen space with optional distance scaling, rotation, auto-centering, and frustum culling.

## Features

- HTML overlays mapped to `Object3D.name`
- Declarative `<realm>` markup support
- Dynamic template variables (`$value$`, `$value=default$`)
- Distance-based scaling (`simulate3D`)
- CSS rotation from object Z rotation (`simulateRotation`)
- Auto-centering and world-space offsets
- Frustum culling + throttled auto-update loop
- ESM, CJS, and UMD builds

## Install

```bash
npm i sorcherer three
```

## Quick Start (ESM)

```js
import * as THREE from 'three';
import { Sorcherer } from 'sorcherer';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 1.5, 4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

const cube = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshNormalMaterial());
cube.name = 'cube';
scene.add(cube);

document.body.insertAdjacentHTML('beforeend', `
  <realm>
    <div idm="cube" autoCenter="true" simulate3D="true">
      Cube: $label=ready$
    </div>
  </realm>
`);

Sorcherer.bootstrap(scene, camera, renderer);

function animate() {
  requestAnimationFrame(animate);
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);
}
animate();
```

## CommonJS

```js
const THREE = require('three');
const { Sorcherer } = require('sorcherer');
```

## `<realm>` Markup

Each child element with `idm="..."` maps to a registered `Object3D` with the same `.name`.

Supported attributes:

- `idm="cube"`
- `simulate3D="true"`
- `simulateRotation="true"`
- `autoCenter="true"`
- `offset="x,y,z"`
- `scaleMultiplier="1.5"`

Dynamic placeholders inside overlay HTML:

- `$varName$`
- `$varName=defaultValue$`

Example:

```html
<realm>
  <div idm="cube" simulate3D="true" autoCenter="true" offset="0,0.8,0">
    <div>$label=Magic Cube$</div>
    <div>Distance: $distance=0.00$</div>
  </div>
</realm>
```

## API

### Static

- `Sorcherer.bootstrap(scene, camera, renderer, options?)`
- `Sorcherer.registerScene(scene)`
- `Sorcherer.registerObject3D(object)`
- `Sorcherer.attachFromRealm(root?)`
- `Sorcherer.autoSetup(camera, renderer, interval?)`
- `Sorcherer.stopAutoSetup()`
- `Sorcherer.bufferAll(camera, renderer)`
- `Sorcherer.instancesById` / `Sorcherer.elements`
- `Sorcherer.defaultScaleMultiplier`

### Instance

- `new Sorcherer(object, offset?, simulate3D?, simulateRotation?, autoCenter?, scaleMultiplier?)`
- `attach(innerHTML)`
- `setDynamicVar(name, value)` / `getDynamicVar(name)`
- `renderDynamicVars()`
- `bufferInstance(camera, renderer)`
- `dispose()`
- `attachClone(targetObject, newName?)`

## Styling

Sorcherer injects only minimal logic-required styles at runtime (overlay container positioning/pointer behavior). Visual styling should live in your app CSS (for example `.magic-MinusOne`).

`magicalStyle.css` is still included in the package for custom/manual styling workflows, but core behavior no longer depends on loading it separately.

## Build

```bash
npm install
npm run build
```

Build outputs:

- `dist/index.mjs`
- `dist/index.cjs`
- `dist/index.d.ts`
- `dist/sorcherer.umd.js`
- `dist/sorcherer.umd.min.js`

## Package (local tarball)

```bash
npm pack
```

This produces a tarball like `sorcherer-<version>.tgz` for local install/testing.

## Browser UMD

Load Three.js first, then Sorcherer:

```html
<script src="https://unpkg.com/three@0.152.2/build/three.min.js"></script>
<script src="./dist/sorcherer.umd.js"></script>
<script>
  const OverlayCtor = window.Sorcherer.Sorcherer;
</script>
```

## License

MIT
