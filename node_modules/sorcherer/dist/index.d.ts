import type { Camera, Object3D, Vector3 } from 'three';

export interface SorchererBootstrapOptions {
  interval?: number;
  autoAttach?: boolean;
  autoRegister?: boolean;
}

export declare class Sorcherer {
  static allLoadedElements: Set<Sorcherer>;
  static objectRegistry: Map<string, Object3D>;
  static instancesById: Record<string, Sorcherer>;
  static readonly elements: Record<string, Sorcherer>;
  static defaultScaleMultiplier: number;
  static container: HTMLDivElement | null;
  static autoUpdateRunning: boolean;

  object: Object3D | null;
  offset: Vector3;
  simulate3D: boolean;
  simulateRotation: boolean;
  autoCenter: boolean;
  scaleMultiplier: number;
  template: string;
  dynamicVars: Record<string, string>;

  [key: string]: any;

  constructor(
    object: Object3D,
    offset?: Vector3,
    simulate3D?: boolean,
    simulateRotation?: boolean,
    autoCenter?: boolean,
    scaleMultiplier?: number
  );

  createSpan(): HTMLElement | { style: Record<string, string>; classList: { add(): void }; innerHTML: string; parentElement: null };
  attach(innerHTML: string): void;
  renderDynamicVars(): void;
  setDynamicVar(varName: string, value: string): void;
  getDynamicVar(varName: string): string | undefined;
  bufferInstance(camera: Camera, renderer: { domElement: { clientWidth?: number; clientHeight?: number; width?: number; height?: number } }): void;
  dispose(): void;
  attachClone(targetObject: Object3D, newName?: string): Sorcherer;

  static ensureContainerAttached(): void;
  static bufferAll(camera: Camera, renderer: { domElement: { clientWidth?: number; clientHeight?: number; width?: number; height?: number } }): void;
  static autoSetup(camera: Camera, renderer: { domElement: any }, interval?: number): void;
  static stopAutoSetup(): void;
  static registerObject3D(object: Object3D): void;
  static registerScene(scene: Object3D): void;
  static bootstrap(scene: Object3D, camera: Camera, renderer: { domElement: any }, options?: SorchererBootstrapOptions): void;
  static attachFromRealm(root?: Document | Element): void;
}
