/* 滚动叙事控制：章节进度决定模型姿态；微动只补充风与呼吸感。 */
(() => {
  'use strict';
  const chapters = [...document.querySelectorAll('.chapter')],
    links = [...document.querySelectorAll('.chapter-nav a')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let ambientPaused = reduced.matches,
    progress = 0,
    target = 0,
    active = -1,
    offsets = [],
    raf = 0,
    last = performance.now(),
    time = 0;
  // 所有文字沿用模型的平滑进度；不排队播放动画，反向滚动也能原路返回。
  const copies = chapters.map((chapter) => chapter.querySelector('.chapter-copy'));
  const caption = document.querySelector('#scene-caption');
  const captionCues = [
    [0, '一朵完整的蒲公英，等待风来。'],
    [0.14, '风来了，白色的小星球轻轻摇晃。'],
    [0.46, '我松开了手，把自己交给风。'],
    [1.1, '身后的白色星球，渐渐远去。'],
    [1.8, '掠过草尖，风带我继续向前。'],
    [2.5, '风慢了下来，土地渐渐靠近。'],
    [2.84, '轻轻落稳，等待一场雨。'],
    [3.08, '旅途暂时安静，变化藏在泥土里。'],
    [3.27, '这一次，我向下出发。'],
    [3.55, '再向上，去寻找光。'],
    [3.84, '叶片舒展，另一段旅行开始了。'],
  ];
  let textReady = false;
  const easeText = (value) => {
    const x = Math.max(0, Math.min(1, value));
    return x * x * (3 - 2 * x);
  };
  function layoutText() {
    if (!textReady) return;
    const body = document.body;
    body.classList.add('story-pinned');
    const mobile = innerWidth <= 650;
    const tallest = Math.max(...copies.map((copy) => copy.offsetHeight));
    const available = mobile ? innerHeight * 0.6 - 138 : innerHeight - 200;
    // 视窗太矮或文字放大时，恢复普通文档阅读，避免固定文字被裁切。
    const pinned = !reduced.matches && tallest <= available;
    body.classList.toggle('story-pinned', pinned);
    copies.forEach((copy) => {
      copy.inert = false;
      copy.removeAttribute('aria-hidden');
      copy.style.removeProperty('opacity');
      copy.style.removeProperty('visibility');
      [...copy.children].forEach((child) => {
        child.style.removeProperty('opacity');
        child.style.removeProperty('transform');
      });
    });
  }
  function updateStoryText(value) {
    if (document.body.classList.contains('story-pinned')) {
      copies.forEach((copy, index) => {
        const enterStart = index === 4 ? 3.38 : index - 0.28;
        const enterEnd = index === 4 ? 3.61 : index;
        const exitStart = index === 3 ? 3.12 : index + 0.44;
        const exitEnd = index === 3 ? 3.34 : index + 0.7;
        const leave = index === 4 ? 0 : easeText((value - exitStart) / (exitEnd - exitStart));
        const entering = index === 0 ? 1 : easeText((value - enterStart) / (enterEnd - enterStart));
        const visible = entering > 0.001 && leave < 0.999;
        copy.style.visibility = visible ? 'visible' : 'hidden';
        copy.inert = !visible || entering * (1 - leave) < 0.5;
        copy.setAttribute('aria-hidden', String(!visible));
        [...copy.children].forEach((child) => {
          const delay = child.matches('.prose, .hero-subtitle')
            ? 0.035
            : child.matches(
                  '.field-note, .closing-line, .start-link, .reading-hint, .interaction-hint',
                )
              ? 0.065
              : 0;
          const arrive =
            index === 0
              ? 1
              : easeText((value - enterStart - delay) / (enterEnd - enterStart - delay));
          child.style.opacity = String(arrive * (1 - leave));
          child.style.transform = `translateY(${(1 - arrive) * 12 - leave * 10}px)`;
        });
      });
    }
    let cue = captionCues.length - 1;
    while (cue > 0 && value < captionCues[cue][0]) cue--;
    const [start, text] = captionCues[cue];
    const end = captionCues[cue + 1]?.[0] ?? Infinity;
    const fadeIn =
      cue === 0 ? 1 : easeText((value - start) / Math.min(0.065, (end - start) * 0.25));
    const fadeOut = Number.isFinite(end)
      ? easeText((end - value) / Math.min(0.065, (end - start) * 0.25))
      : 1;
    if (caption.textContent !== text) caption.textContent = text;
    caption.style.opacity = String(reduced.matches ? 1 : fadeIn * fadeOut);
    caption.style.transform = reduced.matches
      ? 'none'
      : `translateY(${(1 - fadeIn) * 4 - (1 - fadeOut) * 4}px)`;
  }
  const pointer = { x: 0, y: 0 };
  function measure() {
    layoutText();
    offsets = chapters.map((s) => s.offsetTop);
    updateTarget();
  }
  function updateTarget() {
    const y = scrollY;
    let i = 0;
    while (i < offsets.length - 2 && y >= offsets[i + 1]) i++;
    target = Math.max(
      0,
      Math.min(4, i + (y - offsets[i]) / Math.max(1, offsets[i + 1] - offsets[i])),
    );
  }
  function updateUI(value = target) {
    const i = Math.max(0, Math.min(4, Math.round(value)));
    document.querySelector('.reading-progress span').style.transform = `scaleX(${target / 4})`;
    if (i !== active) {
      active = i;
      links.forEach((a, j) =>
        j === i ? a.setAttribute('aria-current', 'step') : a.removeAttribute('aria-current'),
      );
      document.querySelector('#chapter-number').textContent = String(i + 1).padStart(2, '0');
      document.body.dataset.chapter = String(i);
    }
  }
  let lastReduced = reduced.matches;
  function syncMotionPreference() {
    if (lastReduced === reduced.matches) return;
    lastReduced = reduced.matches;
    measure();
    ambientPaused = lastReduced;
  }
  reduced.addEventListener('change', syncMotionPreference);
  window.addEventListener(
    'scroll',
    () => {
      updateTarget();
      if (!textReady) updateUI();
    },
    { passive: true },
  );
  window.addEventListener('resize', measure);
  window.addEventListener(
    'pointermove',
    (e) => {
      if (ambientPaused || dialog.open) return;
      pointer.x = (e.clientX / innerWidth) * 2 - 1;
      pointer.y = (e.clientY / innerHeight) * 2 - 1;
    },
    { passive: true },
  );
  measure();
  updateUI();
  const dialog = document.querySelector('#science-notes');
  let renderer;
  const host = document.querySelector('#seed-canvas');
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch (e) {
    document.querySelector('#render-fallback').hidden = false;
    return;
  }
  textReady = true;
  measure();
  const T = THREE,
    scene = new T.Scene(),
    camera = new T.PerspectiveCamera(36, 1, 0.1, 80),
    models = SeedModels(T);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.setClearColor(0, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  scene.add(new T.HemisphereLight('#ffffec', '#b0b79d', 2.3));
  const key = new T.DirectionalLight('#fff7dc', 2.5);
  key.position.set(-3, 5, 6);
  scene.add(key);
  const rim = new T.DirectionalLight('#fffef5', 1.7);
  rim.position.set(3, 2, -4);
  scene.add(rim);
  const seed = models.seed(),
    mother = models.mother(),
    soil = models.soil(),
    sprout = models.sprout();
  scene.add(seed, mother, soil, sprout);
  mother.position.set(0, 0.35, -0.2);
  mother.scale.setScalar(1.6);
  const launches = mother.userData.launches;
  const motherMaterials = [];
  mother.traverse((object) => {
    if (object.material) {
      motherMaterials.push({ material: object.material, opacity: object.material.opacity });
      object.material.transparent = true;
    }
  });
  const companions = launches.slice(1).map(() => {
    const traveler = seed.clone(true);
    traveler.userData.materials = [];
    traveler.traverse((object) => {
      if (!object.material) return;
      object.material = object.material.clone();
      const material = object.material;
      traveler.userData.materials.push({ material, opacity: material.opacity });
      material.transparent = true;
      if (material.color?.getHexString() === '665036') traveler.userData.fruitMaterial = material;
    });
    scene.add(traveler);
    return traveler;
  });
  // 风的轨迹位于果序后方，先出现，再带动种子脱离。
  const windVertices = [];
  for (let strand = 0; strand < 5; strand++) {
    for (let i = 0; i < 32; i++) {
      for (const j of [i, i + 1]) {
        const x = -4 + (j / 32) * 8;
        windVertices.push(x, 0.25 + strand * 0.22 + Math.sin(x * 0.7 + strand) * 0.15, -1.4);
      }
    }
  }
  const windGeometry = new T.BufferGeometry();
  windGeometry.setAttribute('position', new T.Float32BufferAttribute(windVertices, 3));
  const gust = new T.LineSegments(
    windGeometry,
    new T.LineBasicMaterial({ color: '#fffdeb', transparent: true, opacity: 0, depthWrite: false }),
  );
  scene.add(gust);
  let baseCameraDistance = 8,
    openingFocus = 0;
  const aim = new T.Vector3(),
    anchor = new T.Vector3(),
    attachQuaternion = new T.Quaternion();
  soil.position.set(0, 0, -0.1);
  const contact = sprout.position.clone();
  const fruitTip = new T.Vector3(),
    landingOffset = new T.Vector3();
  const materialStates = (group) => {
    const result = [];
    group.traverse((object) => {
      if (!object.material) return;
      object.material.transparent = true;
      result.push({ material: object.material, opacity: object.material.opacity });
    });
    return result;
  };
  const plumeMaterials = materialStates(seed.userData.plume);
  const coatMaterials = materialStates(seed.userData.coat);
  let plumeOpacity = 1,
    coatOpacity = 1;
  const dustGeo = new T.BufferGeometry(),
    dust = [];
  for (let i = 0; i < 55; i++)
    dust.push(
      Math.sin(i * 14.33) * 4,
      Math.cos(i * 5.29) * 3,
      -2 - Math.abs(Math.sin(i * 7.8)) * 2,
    );
  dustGeo.setAttribute('position', new T.Float32BufferAttribute(dust, 3));
  const motes = new T.Points(
    dustGeo,
    new T.PointsMaterial({
      color: '#fffce5',
      size: 0.025,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  scene.add(motes);
  const rainGeo = new T.BufferGeometry(),
    rainVertices = [];
  for (let i = 0; i < 24; i++) {
    const x = Math.sin(i * 8.7) * 2.3,
      y = (i / 24) * 5 - 1;
    rainVertices.push(x, y, -0.4, x - 0.035, y - 0.13, -0.4);
  }
  rainGeo.setAttribute('position', new T.Float32BufferAttribute(rainVertices, 3));
  const rain = new T.LineSegments(
    rainGeo,
    new T.LineBasicMaterial({ color: '#dbe7dd', transparent: true, opacity: 0.55 }),
  );
  scene.add(rain);
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    baseCameraDistance = width / height < 0.8 ? 9.8 : 8;
    camera.position.set(0, 0.5, baseCameraDistance);
    camera.lookAt(0, -0.1, 0);
    measure();
  }
  new ResizeObserver(resize).observe(host);
  resize();
  const clamp = (x) => Math.max(0, Math.min(1, x)),
    smooth = (x) => {
      x = clamp(x);
      return x * x * (3 - 2 * x);
    };
  function blend(a, b, t) {
    return a + (b - a) * t;
  }
  // 四个相邻区间连续插值；向上滚动时，所有生长动作均可逆。
  const poses = [
    { x: 0.35, y: 0.3, z: 0, rz: -0.16, ry: 0.15, s: 1.2 },
    { x: 1.05, y: 0.48, z: 0.3, rz: 0.38, ry: 0.8, s: 0.78 },
    { x: -0.15, y: 0.36, z: 0.65, rz: -0.3, ry: 2, s: 1.22 },
    { x: 0, y: 0.07, z: 0.16, rz: 0.08, ry: 2.7, s: 0.63 },
    { x: 0, y: 0.07, z: 0.16, rz: 0.08, ry: 2.7, s: 0.63 },
  ];
  function render(now) {
    // 部分嵌入式浏览器切换偏好时不派发 change，渲染前再同步一次。
    syncMotionPreference();
    raf = 0;
    const dt = Math.min(0.06, (now - last) / 1000);
    last = now;
    // 阅读手记时停在当前画面；关闭后继续，避免背景抢走注意力。
    if (dialog.open) {
      if (!document.hidden) raf = requestAnimationFrame(render);
      return;
    }
    if (!ambientPaused) time += dt;
    progress = reduced.matches ? target : blend(progress, target, Math.min(1, dt * 9));
    updateUI(progress);
    updateStoryText(progress);
    const i = Math.min(3, Math.floor(progress)),
      t = smooth(progress - i),
      a = poses[i],
      b = poses[i + 1];
    const wind = reduced.matches ? 0 : 1;
    const flying = 1 - smooth((progress - 2.5) / 0.5);
    seed.position.set(
      blend(a.x, b.x, t) + Math.sin(time * 0.7) * 0.09 * flying * wind * smooth(progress - 1),
      blend(a.y, b.y, t) + Math.sin(time * 0.9) * 0.07 * flying * wind * smooth(progress - 1),
      blend(a.z, b.z, t),
    );
    seed.rotation.set(
      pointer.y * 0.07 * flying * wind * smooth(progress - 1),
      blend(a.ry, b.ry, t) + Math.sin(time * 0.3) * 0.08 * flying * wind * smooth(progress - 1),
      blend(a.rz, b.rz, t) +
        (Math.sin(time * 0.65) * 0.06 + pointer.x * 0.07) * flying * wind * smooth(progress - 1),
    );
    seed.scale.setScalar(blend(a.s, b.s, t));
    const growth = smooth((progress - 3.23) / 0.77);
    // 落地后围绕果实下端轻轻倾斜、沉入浅土，接触点不再滑动。
    const settle = smooth((progress - 2.78) / 0.22);
    const nestle = smooth((progress - 3) / 0.2);
    if (progress > 2.78) {
      seed.rotation.z = blend(seed.rotation.z, 0.14 + nestle * 0.28, settle);
      landingOffset.set(0, -1.46, 0).multiply(seed.scale).applyQuaternion(seed.quaternion);
      fruitTip.copy(contact);
      fruitTip.y += 0.07 * (1 - nestle);
      seed.position.lerp(fruitTip.sub(landingOffset), settle);
    }
    // 冠毛先弯折，再被余风带走；保留大小，用距离和透明度完成离场。
    const fold = smooth((progress - 3.06) / 0.24);
    const release = smooth((progress - 3.22) / 0.4);
    const plume = seed.userData.plume;
    plume.rotation.z = -fold * 0.65 - release * 0.4;
    plume.rotation.x = release * 0.3;
    plume.position.set(-release * 2.7, -0.72 + release * 0.55, -release * 0.35);
    seed.userData.canopy.scale.set(1 - fold * 0.25, 1, 1 - fold * 0.25);
    plumeOpacity = 1 - smooth((progress - 3.37) / 0.29);
    coatOpacity = 1 - smooth((progress - 3.56) / 0.35);
    plumeMaterials.forEach(({ material, opacity }) => {
      material.opacity = opacity * plumeOpacity;
    });
    coatMaterials.forEach(({ material, opacity }) => {
      material.opacity = opacity * coatOpacity;
    });
    seed.visible = plumeOpacity > 0 || coatOpacity > 0;
    plume.visible = plumeOpacity > 0;
    // 开场分为三段：完整果序 → 风吹散种子 → 跟随同一粒种子拉近。
    const detach = smooth((progress - 0.18) / 0.65);
    openingFocus = smooth((progress - 0.42) / 0.58) * (1 - smooth(progress - 1));
    mother.visible = progress < 1;
    const motherFade = 1 - smooth((progress - 0.55) / 0.45);
    motherMaterials.forEach((item) => {
      item.material.opacity = item.opacity * motherFade;
    });
    mother.position.set(
      -2.5 * smooth((progress - 0.4) / 0.7),
      0.35,
      -0.2 - 4 * smooth((progress - 0.4) / 0.7),
    );
    mother.scale.setScalar(1.6);
    mother.rotation.z =
      -Math.sin(clamp(progress / 0.8) * Math.PI) * 0.065 + Math.sin(time * 0.35) * 0.008 * wind;
    mother.updateMatrixWorld(true);
    const worldQuaternion = mother.getWorldQuaternion(new T.Quaternion());
    function attachment(info) {
      anchor.copy(info.position).applyMatrix4(mother.matrixWorld);
      attachQuaternion.copy(worldQuaternion).multiply(info.quaternion);
    }
    if (progress < 1) {
      attachment(launches[0]);
      const destination = new T.Vector3(poses[1].x, poses[1].y, poses[1].z);
      seed.position.lerpVectors(anchor, destination, detach);
      seed.position.y += Math.sin(detach * Math.PI) * 0.3;
      seed.position.z += Math.sin(detach * Math.PI) * 0.38;
      const flyingQuaternion = new T.Quaternion().setFromEuler(
        new T.Euler(0, poses[1].ry, poses[1].rz),
      );
      seed.quaternion.slerpQuaternions(attachQuaternion, flyingQuaternion, detach);
      const closeup = smooth((progress - 0.42) / 0.58);
      seed.scale
        .copy(launches[0].scale)
        .multiplyScalar(1.6)
        .lerp(new T.Vector3(poses[1].s, poses[1].s, poses[1].s), closeup);
    }
    seed.userData.fruit.material.color.set('#665036').lerp(new T.Color('#b6b39a'), 1 - detach);
    companions.forEach((traveler, j) => {
      attachment(launches[j + 1]);
      const flight = smooth((progress - 0.12 - j * 0.018) / 0.75);
      traveler.visible = progress < 1;
      const companionFade = 1 - smooth((progress - 0.6) / 0.4);
      traveler.userData.materials.forEach((item) => {
        item.material.opacity = item.opacity * companionFade;
      });
      traveler.userData.fruitMaterial?.color
        .set('#665036')
        .lerp(new T.Color('#b6b39a'), 1 - flight);
      traveler.position
        .copy(anchor)
        .add(
          new T.Vector3(
            flight * (4.5 + j * 0.23),
            flight * (0.6 + (j % 4) * 0.34),
            flight * ((j % 3) - 1) * 0.7,
          ),
        );
      traveler.quaternion
        .copy(attachQuaternion)
        .slerp(new T.Quaternion().setFromEuler(new T.Euler(0, j * 0.4, -0.2 + j * 0.07)), flight);
      traveler.scale.copy(launches[j + 1].scale).multiplyScalar(1.6);
    });
    gust.visible = progress > 0.04 && progress < 1.15;
    gust.material.opacity = Math.sin(clamp((progress - 0.04) / 1.11) * Math.PI) * 0.23;
    gust.position.x = progress * 1.5;
    // 相机真实地移动目标和焦距距离；第二幕后平滑接回既有旅行轨迹。
    aim.set(0, -0.1, 0).lerp(seed.position.clone().add(new T.Vector3(0, -0.15, 0)), openingFocus);
    camera.position
      .copy(aim)
      .add(
        new T.Vector3(0, 0.6, blend(baseCameraDistance, baseCameraDistance * 0.73, openingFocus)),
      );
    camera.lookAt(aim);
    soil.visible = progress > 2.35;
    soil.position.y = -2.8 * (1 - smooth((progress - 2.35) / 0.65));
    sprout.visible = progress > 3.23;
    sprout.updateGrowth(progress);
    sprout.userData.shoot.rotation.z =
      Math.sin(time * 0.65) * 0.018 * wind * smooth((progress - 3.8) / 0.2);
    rain.visible = progress > 2.85 && progress < 3.6 && !ambientPaused;
    rain.position.y = -((time * 0.8) % 1.5);
    rain.material.opacity = Math.sin(clamp((progress - 2.85) / 0.75) * Math.PI) * 0.48;
    motes.visible = progress < 3;
    motes.rotation.z = time * 0.012;
    motes.position.x = Math.sin(time * 0.12) * 0.3;
    document.querySelector('.sun-halo').style.transform =
      `translate(${growth * -15}%,${growth * -12}%)`;
    renderer.render(scene, camera);
    if (!document.hidden) raf = requestAnimationFrame(render);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      last = performance.now();
      raf = requestAnimationFrame(render);
    }
  });
  renderer.domElement.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    document.querySelector('#render-fallback').hidden = false;
    textReady = false;
    document.body.classList.remove('story-pinned');
    copies.forEach((copy) => {
      copy.inert = false;
      copy.removeAttribute('aria-hidden');
      copy.style.visibility = '';
      [...copy.children].forEach((child) => {
        child.style.opacity = '';
        child.style.transform = '';
      });
    });
  });
  // 提供只读快照，便于本地验证叙事状态和模型显示。
  window.seedJourney = {
    snapshot: () => ({
      progress,
      target,
      chapter: active,
      paused: ambientPaused || dialog.open,
      ambientTime: time,
      seedVisible: seed.visible,
      openingFocus,
      attached: progress <= 0.18,
      motherVisible: mother.visible,
      companions: companions.filter((s) => s.visible).length,
      cameraDistance: camera.position.distanceTo(aim),
      seedPosition: seed.position.toArray(),
      seedScale: seed.scale.toArray(),
      rootScale: sprout.userData.roots.scale.y,
      shootScale: sprout.userData.shoot.scale.y,
      rootGrowth: sprout.userData.rootGrowth,
      shootGrowth: sprout.userData.shootGrowth,
      leafGrowth: sprout.userData.leafGrowth,
      plumeOpacity,
      coatOpacity,
      fruitTip: seed.localToWorld(new T.Vector3(0, -1.46, 0)).toArray(),
      germinationOrigin: sprout.position.toArray(),
      soilVisible: soil.visible,
      triangles: renderer.info.render.triangles,
    }),
  };
  document.body.dataset.ready = 'true';
  raf = requestAnimationFrame(render);
})();
