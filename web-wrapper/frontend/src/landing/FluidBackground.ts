// FluidBackground — 랜딩 전용 셰이더 배경.
//
// 단일 풀스크린 쿼드 + 도메인 워핑 fbm 노이즈로 "잉크가 번진 종이" 질감의
// 유동 그라디언트를 그린다. 드로우콜 1개, 지오메트리 정점 4개가 전부라
// 모바일에서도 가볍다.
//  - 커서를 따라 워프 중심이 천천히 기운다 (lerp 0.045 — 절제된 반응)
//  - 스크롤 지휘자(Landing.tsx)가 챕터 팔레트를 setColors로 흘려보내면
//    프레임마다 부드럽게 색이 섞인다
//  - prefers-reduced-motion: 루프 없이 정지 프레임 한 장만 렌더
//  - 탭이 숨겨지면 rAF를 멈춘다 / dispose로 완전 정리

import * as THREE from 'three';

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;

varying vec2 vUv;

uniform float uTime;
uniform vec2 uRes;
uniform vec2 uPointer;
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform float uDark;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += amp * vnoise(p);
    p = rot * p * 2.03;
    amp *= 0.55;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  vec2 p = (uv - 0.5) * vec2(uRes.x / max(uRes.y, 1.0), 1.0) * 2.4;
  float t = uTime * 0.04;

  // 커서가 잉크의 흐름을 살짝 기울인다
  vec2 drift = uPointer * 0.28;

  vec2 q = vec2(
    fbm(p + t + drift * 0.6),
    fbm(p + vec2(2.4, 1.7) - t * 0.85)
  );
  vec2 r = vec2(
    fbm(p + 1.7 * q + drift + vec2(1.2, 4.5)),
    fbm(p + 1.5 * q - drift * 0.7 + vec2(7.1, 2.3))
  );
  float f = fbm(p + 1.9 * r);

  vec3 col = mix(uColA, uColB, smoothstep(0.22, 0.82, f));
  col = mix(col, uColC, 0.6 * smoothstep(0.52, 0.96, 0.5 * q.y + 0.5 * r.x));

  // 위쪽이 살짝 밝은 소프트 비네트 — 무대 조명 느낌
  float vig = smoothstep(1.35, 0.3, distance(uv, vec2(0.5, 0.42)));
  col *= mix(0.982, 1.018, vig);

  // 종이 그레인 (다크 챕터에서 약간 더 거칠게)
  float grain = hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5;
  col += grain * mix(0.016, 0.03, uDark);

  gl_FragColor = vec4(col, 1.0);
}
`;

export class FluidBackground {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private geometry = new THREE.PlaneGeometry(2, 2);
  private material: THREE.ShaderMaterial;
  private clock = new THREE.Clock();
  private elapsed = Math.random() * 40; // 매 방문마다 다른 잉크 무늬에서 시작
  private frame = 0;
  private running = false;
  private readonly reduced: boolean;
  private pointerTarget = new THREE.Vector2(0, 0);
  private colorA = new THREE.Color('#fafafa');
  private colorB = new THREE.Color('#ededf6');
  private colorC = new THREE.Color('#c7c7ee');
  private darkTarget = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
    });
    const mobile = window.innerWidth < 768;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.75));

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTime: { value: this.elapsed },
        uRes: { value: new THREE.Vector2(1, 1) },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uColA: { value: this.colorA.clone() },
        uColB: { value: this.colorB.clone() },
        uColC: { value: this.colorC.clone() },
        uDark: { value: 0 },
      },
    });

    const mesh = new THREE.Mesh(this.geometry, this.material);
    mesh.frustumCulled = false;
    this.scene.add(mesh);

    this.resize();
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', this.onVisibility);
    if (window.matchMedia('(pointer: fine)').matches) {
      window.addEventListener('pointermove', this.onPointer, { passive: true });
    }

    if (this.reduced) this.renderOnce();
    else this.start();
  }

  /** 스크롤 지휘자가 챕터 사이를 지날 때 이미 보간된 색을 흘려보낸다. */
  setColors(a: string, b: string, c: string, dark: number): void {
    this.colorA.setStyle(a);
    this.colorB.setStyle(b);
    this.colorC.setStyle(c);
    this.darkTarget = dark;
    if (this.reduced) {
      this.snapColors();
      this.renderOnce();
    }
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.resize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('pointermove', this.onPointer);
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
  }

  private start(): void {
    if (this.running) return;
    this.running = true;
    this.clock.getDelta(); // 일시정지 동안 쌓인 델타를 비운다
    this.frame = requestAnimationFrame(this.loop);
  }

  private stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
  }

  private snapColors(): void {
    const u = this.material.uniforms;
    (u.uColA.value as THREE.Color).copy(this.colorA);
    (u.uColB.value as THREE.Color).copy(this.colorB);
    (u.uColC.value as THREE.Color).copy(this.colorC);
    u.uDark.value = this.darkTarget;
  }

  private renderOnce(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private loop = (): void => {
    if (!this.running) return;
    this.frame = requestAnimationFrame(this.loop);

    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.elapsed += dt;

    const u = this.material.uniforms;
    u.uTime.value = this.elapsed;
    (u.uPointer.value as THREE.Vector2).lerp(this.pointerTarget, 0.045);
    (u.uColA.value as THREE.Color).lerp(this.colorA, 0.085);
    (u.uColB.value as THREE.Color).lerp(this.colorB, 0.085);
    (u.uColC.value as THREE.Color).lerp(this.colorC, 0.085);
    u.uDark.value += (this.darkTarget - (u.uDark.value as number)) * 0.085;

    this.renderOnce();
  };

  private resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    (this.material.uniforms.uRes.value as THREE.Vector2).set(w, h);
    if (this.reduced) this.renderOnce();
  };

  private onPointer = (e: PointerEvent): void => {
    this.pointerTarget.set(
      (e.clientX / window.innerWidth) * 2 - 1,
      -((e.clientY / window.innerHeight) * 2 - 1),
    );
  };

  private onVisibility = (): void => {
    if (document.hidden) this.stop();
    else if (!this.reduced) this.start();
  };
}
