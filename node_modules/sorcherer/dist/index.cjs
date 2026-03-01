// src/sorcherer.js

// Dynamically inject Sorcherer styles if not already present.
(function injectMagicalStyle() {
  if (typeof document !== 'undefined' && !document.getElementById('magical-style')) {
    const style = document.createElement('style');
    style.id = 'magical-style';
    style.textContent = `
.sorcherer-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
`;
    document.head.appendChild(style);
  }
})();

const { Vector3, Frustum, Matrix4 } = require('three');

class Sorcherer {
  // All overlay instances (stored in a Set)
  static allLoadedElements = new Set();
  // For frustum culling.
  static frustum = new Frustum();
  static matrix = new Matrix4();
  // Container element for all overlays (null in non-DOM environments).
  static container = (typeof document !== 'undefined')
    ? document.createElement('div')
    : null;
  static autoUpdateRunning = false;
  static _timeoutHandle = null;
  static _containerAttachPending = false;
  // Registry mapping Object3D names to objects.
  static objectRegistry = new Map();
  // Global dictionary mapping idm (i.e. Object3D name) to overlay instance.
  static instancesById = {};
  // Alias for instancesById.
  static get elements() { return Sorcherer.instancesById; }
  // Default scale multiplier (developers can change this via Sorcherer.defaultScaleMultiplier).
  static defaultScaleMultiplier = 1;
  static _tempWorldPos = new Vector3();
  static _tempProjectedPos = new Vector3();
  static _tempFrustumPos = new Vector3();

  static ensureContainerAttached() {
    if (typeof document === 'undefined' || !Sorcherer.container) return;
    Sorcherer.container.classList.add('sorcherer-container');

    if (Sorcherer.container.isConnected) return;

    if (document.body) {
      document.body.appendChild(Sorcherer.container);
      Sorcherer._containerAttachPending = false;
      return;
    }

    if (Sorcherer._containerAttachPending) return;
    Sorcherer._containerAttachPending = true;

    document.addEventListener('DOMContentLoaded', () => {
      Sorcherer._containerAttachPending = false;
      if (document.body && Sorcherer.container && !Sorcherer.container.isConnected) {
        document.body.appendChild(Sorcherer.container);
      }
    }, { once: true });
  }

  static _hideOverlay(instance) {
    if (instance?._parentSpan?.style) {
      instance._parentSpan.style.display = 'none';
    }
  }

  static _readBooleanAttribute(element, name) {
    return (element.getAttribute(name) || '').trim().toLowerCase() === 'true';
  }

  static _parseVector3Attribute(element, name) {
    if (!element.hasAttribute(name)) return new Vector3();
    const raw = element.getAttribute(name);
    if (!raw) return new Vector3();

    const parts = raw.split(',').map((value) => parseFloat(value.trim()));
    if (parts.length < 3 || parts.slice(0, 3).some((value) => Number.isNaN(value))) {
      return new Vector3();
    }

    return new Vector3(parts[0], parts[1], parts[2]);
  }

  static _parseNumberAttribute(element, name) {
    if (!element.hasAttribute(name)) return undefined;
    const raw = element.getAttribute(name);
    if (raw == null) return undefined;
    const value = parseFloat(raw);
    return Number.isFinite(value) ? value : undefined;
  }

  /**
   * @param {THREE.Object3D} object - The target Object3D.
   * @param {THREE.Vector3} [offset=new Vector3()] - Optional offset for the overlay.
   * @param {boolean} [simulate3D=false] - Whether to scale the overlay based on distance.
   * @param {boolean} [simulateRotation=false] - Whether to rotate the overlay with the object.
   * @param {boolean} [autoCenter=false] - Whether to auto-center the overlay relative to its computed screen position.
   * @param {number} [scaleMultiplier] - Multiplier for distance-based scaling (defaults to Sorcherer.defaultScaleMultiplier).
   */
  constructor(object, offset = new Vector3(), simulate3D = false, simulateRotation = false, autoCenter = false, scaleMultiplier) {
    this.object = object;
    this.offset = (offset && typeof offset.clone === 'function') ? offset.clone() : offset;
    this.simulate3D = simulate3D;
    this.simulateRotation = simulateRotation;
    this.autoCenter = autoCenter;
    this.scaleMultiplier = (scaleMultiplier !== undefined) ? scaleMultiplier : Sorcherer.defaultScaleMultiplier;
    this._parentSpan = this.createSpan();
    this.template = '';
    this.dynamicVars = {};
    this._dynamicVarNames = new Set();
    this._disposed = false;
    this._removedListener = null;

    if (typeof document !== 'undefined' && Sorcherer.container) {
      Sorcherer.ensureContainerAttached();
      Sorcherer.container.appendChild(this._parentSpan);
      Sorcherer.allLoadedElements.add(this);
    }

    // Auto-remove overlay when the Object3D is removed from its parent.
    if (this.object && typeof this.object.addEventListener === 'function') {
      this._removedListener = (event) => {
        if (event?.target === this.object) {
          this.dispose();
        }
      };
      this.object.addEventListener('removed', this._removedListener);
    }
  }

  createSpan() {
    if (typeof document === 'undefined') {
      // Minimal stub for non-DOM environments.
      return {
        style: {},
        classList: { add() {} },
        innerHTML: '',
        parentElement: null
      };
    }
    const span = document.createElement('span');
    span.classList.add('magic-MinusOne');
    span.style.position = 'absolute';
    span.style.display = 'none';
    span.style.transformOrigin = 'top left';
    return span;
  }

  _clearDynamicVarProperties() {
    for (const varName of this._dynamicVarNames) {
      delete this[varName];
    }
    this._dynamicVarNames.clear();
  }

  _defineDynamicVarAccessor(varName) {
    if (this._dynamicVarNames.has(varName)) return;
    this._dynamicVarNames.add(varName);
    Object.defineProperty(this, varName, {
      get: () => this.getDynamicVar(varName),
      set: (value) => { this.setDynamicVar(varName, value); },
      enumerable: true,
      configurable: true
    });
  }

  /**
   * Attaches HTML content to the overlay.
   * Dynamic variable placeholders follow the syntax:
   *    $varName$  or  $varName=defaultValue$
   *
   * This method parses the template, stores dynamic variables, and renders the content.
   * @param {string} innerHTML - The HTML content to display.
   */
  attach(innerHTML) {
    this.template = String(innerHTML ?? '');
    this.dynamicVars = {};
    this._clearDynamicVarProperties();

    const regex = /\$([a-zA-Z0-9_]+)(?:=([^$]+))?\$/g;
    this.template.replace(regex, (match, varName, defaultVal) => {
      if (!(varName in this.dynamicVars)) {
        this.dynamicVars[varName] = (defaultVal !== undefined) ? defaultVal : '';
      }
      this._defineDynamicVarAccessor(varName);
      return match;
    });

    this.renderDynamicVars();
    this._parentSpan.style.display = 'block';
  }

  /**
   * Renders the overlay content by replacing placeholders with current dynamic variable values.
   */
  renderDynamicVars() {
    const rendered = this.template.replace(/\$([a-zA-Z0-9_]+)(?:=[^$]+)?\$/g, (match, varName) => {
      return (this.dynamicVars[varName] !== undefined) ? this.dynamicVars[varName] : '';
    });
    this._parentSpan.innerHTML = rendered;
  }

  /**
   * Sets the value of a dynamic variable and re-renders the overlay.
   * @param {string} varName - The variable name.
   * @param {string} value - The new value.
   */
  setDynamicVar(varName, value) {
    this.dynamicVars[varName] = value;
    this.renderDynamicVars();
  }

  /**
   * Gets the current value of a dynamic variable.
   * @param {string} varName - The variable name.
   * @returns {string} The value.
   */
  getDynamicVar(varName) {
    return this.dynamicVars[varName];
  }

  /**
   * Updates the overlay's position, scaling (based on distance), and rotation.
   * @param {THREE.Camera} camera - The active camera.
   * @param {THREE.Renderer} renderer - The active renderer.
   */
  bufferInstance(camera, renderer) {
    if (!this.object || !camera || !renderer?.domElement) return;
    if (!this.object.visible) {
      Sorcherer._hideOverlay(this);
      return;
    }

    const domElement = renderer.domElement;
    const viewportWidth = domElement.clientWidth || domElement.width || 0;
    const viewportHeight = domElement.clientHeight || domElement.height || 0;
    if (!viewportWidth || !viewportHeight) {
      Sorcherer._hideOverlay(this);
      return;
    }

    const objectWorldPos = Sorcherer._tempWorldPos;
    this.object.getWorldPosition(objectWorldPos);
    if (this.offset) objectWorldPos.add(this.offset);

    let distance = camera.position.distanceTo(objectWorldPos);
    if (!Number.isFinite(distance) || distance <= 0) distance = 0.0001;

    const projectedPos = Sorcherer._tempProjectedPos;
    projectedPos.copy(objectWorldPos).project(camera);

    const widthHalf = viewportWidth / 2;
    const heightHalf = viewportHeight / 2;
    const x = widthHalf * (projectedPos.x + 1);
    const y = heightHalf * (1 - projectedPos.y);

    let transform = `translate(${x}px, ${y}px)`;
    if (this.autoCenter) {
      transform += ' translate(-50%, -50%)';
    }

    if (this.simulate3D) {
      const referenceDistance = 5;
      const scale = Math.max(0.1, this.scaleMultiplier * (referenceDistance / distance));
      transform += ` scale(${scale})`;
    }

    if (this.simulateRotation) {
      const angleDeg = (this.object.rotation?.z || 0) * (180 / Math.PI);
      transform += ` rotate(${angleDeg}deg)`;
    }

    this._parentSpan.style.transform = transform;
    this._parentSpan.style.zIndex = Math.round(1000 / distance).toString();
    this._parentSpan.style.display = 'block';
  }

  /**
   * Updates all overlays based on the active camera and renderer.
   * Performs frustum culling.
   * @param {THREE.Camera} camera - The active camera.
   * @param {THREE.Renderer} renderer - The active renderer.
   */
  static bufferAll(camera, renderer) {
    if (!camera || !renderer) return;
    Sorcherer.ensureContainerAttached();

    Sorcherer.matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    Sorcherer.frustum.setFromProjectionMatrix(Sorcherer.matrix);

    for (const element of Sorcherer.allLoadedElements) {
      if (!element.object) {
        Sorcherer._hideOverlay(element);
        continue;
      }

      const worldPos = Sorcherer._tempFrustumPos;
      element.object.getWorldPosition(worldPos);
      if (Sorcherer.frustum.containsPoint(worldPos)) {
        element.bufferInstance(camera, renderer);
      } else {
        Sorcherer._hideOverlay(element);
      }
    }
  }

  /**
   * Starts the auto-update loop.
   * @param {THREE.Camera} camera - The active camera.
   * @param {THREE.Renderer} renderer - The active renderer.
   * @param {number} [interval=16] - Minimum milliseconds between updates.
   */
  static autoSetup(camera, renderer, interval = 16) {
    if (Sorcherer.autoUpdateRunning || !camera || !renderer) return;
    Sorcherer.autoUpdateRunning = true;

    const tickInterval = Number.isFinite(interval) ? Math.max(0, interval) : 16;
    const useRaf = (typeof requestAnimationFrame === 'function');

    if (useRaf) {
      let lastTime = 0;
      const loop = (time) => {
        if (!Sorcherer.autoUpdateRunning) return;
        if (!lastTime || time - lastTime >= tickInterval) {
          lastTime = time;
          Sorcherer.bufferAll(camera, renderer);
        }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    } else {
      const loop = () => {
        if (!Sorcherer.autoUpdateRunning) return;
        Sorcherer.bufferAll(camera, renderer);
        Sorcherer._timeoutHandle = setTimeout(loop, tickInterval);
      };
      loop();
    }
  }

  static stopAutoSetup() {
    Sorcherer.autoUpdateRunning = false;
    if (Sorcherer._timeoutHandle) {
      clearTimeout(Sorcherer._timeoutHandle);
      Sorcherer._timeoutHandle = null;
    }
  }

  /**
   * Removes the overlay and cleans up references.
   */
  dispose() {
    if (this._disposed) return;
    this._disposed = true;

    const object = this.object;
    if (object && this._removedListener && typeof object.removeEventListener === 'function') {
      object.removeEventListener('removed', this._removedListener);
    }

    if (this._parentSpan.parentElement) {
      this._parentSpan.parentElement.removeChild(this._parentSpan);
    }

    Sorcherer.allLoadedElements.delete(this);
    if (object && object.name && Sorcherer.instancesById[object.name] === this) {
      delete Sorcherer.instancesById[object.name];
    }

    this._removedListener = null;
    this.object = null;
  }

  /**
   * Registers a Three.js Object3D using its name as the key.
   * @param {THREE.Object3D} object - The object to register.
   */
  static registerObject3D(object) {
    if (object && object.name) {
      Sorcherer.objectRegistry.set(object.name, object);
    }
  }

  /**
   * Convenience: register all named objects in a scene (or any Object3D subtree).
   * @param {THREE.Object3D} scene - Root to traverse.
   */
  static registerScene(scene) {
    if (!scene || typeof scene.traverse !== 'function') return;
    scene.traverse((obj) => {
      if (obj && obj.name) {
        Sorcherer.registerObject3D(obj);
      }
    });
  }

  /**
   * High-level convenience: register all named objects in a scene,
   * attach overlays from <realm>, and start the auto-update loop.
   *
   * This replaces manual calls to:
   *   Sorcherer.registerObject3D(...)
   *   Sorcherer.attachFromRealm()
   *   Sorcherer.autoSetup(camera, renderer)
   *
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   * @param {THREE.Renderer} renderer
   * @param {Object} [options]
   * @param {number} [options.interval=16]  Min ms between updates.
   * @param {boolean} [options.autoAttach=true]  Call attachFromRealm().
   * @param {boolean} [options.autoRegister=true]  Call registerScene().
   */
  static bootstrap(scene, camera, renderer, options = {}) {
    const {
      interval = 16,
      autoAttach = true,
      autoRegister = true,
    } = options;

    if (!camera || !renderer) {
      console.warn('[Sorcherer] bootstrap() requires a camera and renderer.');
      return;
    }

    if (autoRegister) {
      Sorcherer.registerScene(scene);
    }

    if (autoAttach && typeof document !== 'undefined') {
      Sorcherer.attachFromRealm();
    }

    Sorcherer.autoSetup(camera, renderer, interval);
  }

  /**
   * Scans the DOM for custom <realm> tags. For each child element with an "idm" attribute,
   * this method looks up the registered Object3D and reads additional attributes:
   * - simulate3D: "true" enables distance-based scaling.
   * - simulateRotation: "true" enables rotation via CSS transform.
   * - offset: A comma-separated list (e.g., "0,0.5,0") defining a THREE.Vector3 offset.
   * - autoCenter: "true" centers the overlay relative to its computed position.
   * - scaleMultiplier: A number to multiply the computed scale factor.
   * The overlay's content may include dynamic variable placeholders.
   *
   * @param {Document|Element} [root=document] - Optional root node to search within.
   */
  static attachFromRealm(root) {
    if (typeof document === 'undefined') return;

    const rootNode = root || document;
    if (!rootNode || typeof rootNode.querySelectorAll !== 'function') return;

    const realmElements = rootNode.querySelectorAll('realm');
    if (!realmElements.length) return;

    realmElements.forEach((realmElement) => {
      const elements = realmElement.querySelectorAll('[idm]');
      elements.forEach((el) => {
        const idm = el.getAttribute('idm');
        if (!idm) return;

        const object = Sorcherer.objectRegistry.get(idm);
        if (!object) return;

        const simulate3D = Sorcherer._readBooleanAttribute(el, 'simulate3D');
        const simulateRotation = Sorcherer._readBooleanAttribute(el, 'simulateRotation');
        const autoCenter = Sorcherer._readBooleanAttribute(el, 'autoCenter');
        const offset = Sorcherer._parseVector3Attribute(el, 'offset');
        const scaleMultiplier = Sorcherer._parseNumberAttribute(el, 'scaleMultiplier');

        if (object.name && Sorcherer.instancesById[object.name]) {
          Sorcherer.instancesById[object.name].dispose();
        }

        const instance = new Sorcherer(object, offset, simulate3D, simulateRotation, autoCenter, scaleMultiplier);
        instance.attach(el.innerHTML);
        el.remove();
        if (object.name) {
          Sorcherer.instancesById[object.name] = instance;
        }
      });

      if (realmElement.children.length === 0) {
        realmElement.remove();
      }
    });
  }

  /**
   * Clones the current overlay instance and attaches the clone to the specified Object3D.
   * @param {THREE.Object3D} targetObject - The target Object3D to attach the clone.
   * @param {string} newName - The new name for the cloned overlay (and the target Object3D).
   * @returns {Sorcherer} The cloned overlay instance.
   */
  attachClone(targetObject, newName) {
    const clone = new Sorcherer(
      targetObject,
      (this.offset && typeof this.offset.clone === 'function') ? this.offset.clone() : this.offset,
      this.simulate3D,
      this.simulateRotation,
      this.autoCenter,
      this.scaleMultiplier
    );

    clone.attach(this.template);
    for (const [key, value] of Object.entries(this.dynamicVars)) {
      clone.setDynamicVar(key, value);
    }

    if (newName) {
      targetObject.name = newName;
      Sorcherer.instancesById[newName] = clone;
    }

    return clone;
  }
}

module.exports = { Sorcherer };
//# sourceMappingURL=index.cjs.map
