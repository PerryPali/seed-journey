/** 蒲公英主题的程序化模型。比例与萌发生长过程为叙事示意。 */
window.SeedModels = function (T) {
  const TAU = Math.PI * 2;
  let randomSeed = 71;
  function random() {
    randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0;
    return randomSeed / 4294967296;
  }
  const mat = (color, extra = {}) =>
    new T.MeshStandardMaterial({ color, roughness: 0.72, metalness: 0, ...extra });
  function add(group, geo, material, position = [0, 0, 0]) {
    const m = new T.Mesh(geo, material);
    m.position.set(...position);
    group.add(m);
    return m;
  }
  function path(group, points, radius, material) {
    return add(
      group,
      new T.TubeGeometry(
        new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p))),
        Math.max(16, points.length * 7),
        radius,
        6,
        false,
      ),
      material,
    );
  }
  function lines(group, positions, color, opacity = 1) {
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    const l = new T.LineSegments(
      g,
      new T.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false }),
    );
    group.add(l);
    return l;
  }

  function seed() {
    const group = new T.Group(),
      plume = new T.Group(),
      coat = new T.Group(),
      canopy = new T.Group();
    group.add(plume, coat);
    // 冠毛绕喙与果实的连接处倾倒，不再围绕模型原点缩小。
    plume.position.y = -0.72;
    canopy.position.y = 1.36;
    plume.add(canopy);
    // 果实呈细长、具纵棱形态；冠毛由喙连接，并非直接长在果实表面。
    const fruit = add(coat, new T.SphereGeometry(1, 24, 20), mat('#665036'), [0, -1.07, 0]);
    fruit.scale.set(0.115, 0.39, 0.1);
    fruit.rotation.z = 0.03;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU;
      path(
        coat,
        Array.from({ length: 9 }, (_, j) => {
          const y = -1.42 + j * 0.087;
          const r = Math.sin((j / 8) * Math.PI) * 0.108;
          return [Math.cos(a) * r, y, Math.sin(a) * r];
        }),
        0.006,
        mat('#ad9162'),
      );
    }
    path(
      plume,
      [
        [0, 0, 0],
        [0.016, 0.56, 0.01],
        [0, 1.36, 0],
      ],
      0.012,
      mat('#e3d7af'),
    );
    const hairs = [];
    // 冠毛是开放的细丝结构，采用细线而不是不透明伞面。
    for (let i = 0; i < 92; i++) {
      const a = (i / 92) * TAU,
        r = 1.03 + random() * 0.3,
        h = 0.2 + random() * 0.22;
      let prev = [0, 0.64, 0];
      for (let j = 1; j <= 6; j++) {
        const t = j / 6,
          p = [Math.cos(a) * r * t, 0.64 + h * Math.sin(t * Math.PI * 0.6), Math.sin(a) * r * t];
        hairs.push(...prev, ...p);
        prev = p;
      }
      for (let j = 0; j < 3; j++) {
        const t = 0.52 + j * 0.16,
          p = [Math.cos(a) * r * t, 0.64 + h * Math.sin(t * Math.PI * 0.6), Math.sin(a) * r * t];
        const b = a + 0.055;
        hairs.push(...p, Math.cos(b) * r * (t + 0.14), p[1] + 0.06, Math.sin(b) * r * (t + 0.14));
      }
    }
    for (let i = 1; i < hairs.length; i += 3) hairs[i] -= 0.64;
    lines(canopy, hairs, '#ffffed', 0.84);
    add(canopy, new T.SphereGeometry(0.035, 12, 8), mat('#ede4c7'));
    group.userData.coat = coat;
    group.userData.canopy = canopy;
    group.userData.plume = plume;
    group.userData.fruit = fruit;
    return group;
  }

  function mother() {
    const group = new T.Group(),
      head = new T.Group();
    group.add(head);
    add(head, new T.SphereGeometry(0.22, 24, 16), mat('#b3b09a'));
    const directions = Array.from({ length: 180 }, (_, i) => {
      const y = 1 - (2 * (i + 0.5)) / 180,
        a = i * 2.39996;
      const r = Math.sqrt(1 - y * y);
      return new T.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
    });
    // 主角在果序上的固定位置；飞走前就在这里，转场中不会另造一粒种子。
    const wanted = new T.Vector3(0.4, 0.54, 0.74).normalize();
    const heroIndex = directions.reduce(
      (best, d, i) => (d.dot(wanted) > directions[best].dot(wanted) ? i : best),
      0,
    );
    const launchIndices = [heroIndex];
    directions.forEach((d, i) => {
      if (launchIndices.length < 13 && i !== heroIndex && d.x > -0.1 && d.z > -0.2 && d.y > -0.25)
        launchIndices.push(i);
    });
    const fluff = [];
    for (let i = 0; i < directions.length; i++) {
      if (launchIndices.includes(i)) continue;
      const v = directions[i],
        start = v.clone().multiplyScalar(0.22),
        end = v.clone().multiplyScalar(0.99);
      fluff.push(...start.toArray(), ...end.toArray());
      const axis = Math.abs(v.y) > 0.9 ? new T.Vector3(1, 0, 0) : new T.Vector3(0, 1, 0);
      const t = new T.Vector3().crossVectors(v, axis).normalize(),
        b = new T.Vector3().crossVectors(v, t);
      for (let k = 0; k < 24; k++) {
        const angle = (k / 24) * TAU;
        const tip = end
          .clone()
          .addScaledVector(t, Math.cos(angle) * 0.24)
          .addScaledVector(b, Math.sin(angle) * 0.24)
          .addScaledVector(v, 0.08);
        fluff.push(...end.toArray(), ...tip.toArray());
      }
    }
    lines(head, fluff, '#fffdec', 0.7);
    // 其余果实也附着在花托周围，避免只有即将飞走的果实聚成一簇。
    const attachedIndices = directions.map((_, i) => i).filter((i) => !launchIndices.includes(i));
    const fruits = new T.InstancedMesh(
      new T.SphereGeometry(1, 8, 8),
      mat('#b6b39a'),
      attachedIndices.length,
    );
    const transform = new T.Object3D();
    attachedIndices.forEach((index, instance) => {
      const direction = directions[index];
      transform.position.copy(direction).multiplyScalar(0.32);
      transform.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), direction);
      transform.scale.set(0.014, 0.1, 0.012);
      transform.updateMatrix();
      fruits.setMatrixAt(instance, transform.matrix);
    });
    head.add(fruits);

    path(
      group,
      [
        [0, -0.2, 0],
        [-0.13, -1.2, 0.1],
        [-0.07, -2.9, 0.15],
      ],
      0.035,
      mat('#789067'),
    );
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU;
      path(
        group,
        [
          [0, -0.19, 0],
          [Math.cos(a) * 0.17, -0.35, Math.sin(a) * 0.17],
          [Math.cos(a) * 0.25, -0.5, Math.sin(a) * 0.25],
        ],
        0.012,
        mat('#8a9c70'),
      );
    }
    group.userData.launches = launchIndices.map((index) => {
      const direction = directions[index];
      return {
        position: direction.clone().multiplyScalar(0.76),
        quaternion: new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), direction),
        scale: new T.Vector3(0.18, 0.36, 0.18),
      };
    });
    return group;
  }

  function soil() {
    const group = new T.Group();
    // 用一块土壤剖面让根系可见，根的前移仅用于教学展示。
    const s = new T.Shape();
    s.moveTo(-2.2, -0.84);
    s.bezierCurveTo(-1.2, -0.67, 0.9, -0.91, 2.15, -0.8);
    s.lineTo(1.95, -2.45);
    s.quadraticCurveTo(0, -2.72, -1.93, -2.45);
    s.closePath();
    const body = add(
      group,
      new T.ExtrudeGeometry(s, {
        depth: 1.1,
        bevelEnabled: true,
        bevelSize: 0.06,
        bevelThickness: 0.06,
        bevelSegments: 2,
        steps: 1,
      }),
      mat('#897158'),
    );
    body.position.z = -1.13;
    const dots = [];
    for (let i = 0; i < 210; i++) {
      const x = (random() - 0.5) * 4,
        y = -0.9 - random() * 1.5;
      dots.push(x, y, 0.012);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(dots, 3));
    group.add(
      new T.Points(
        geo,
        new T.PointsMaterial({ color: '#c8ad83', size: 0.018, transparent: true, opacity: 0.55 }),
      ),
    );
    for (let i = 0; i < 18; i++) {
      const rock = add(
        group,
        new T.DodecahedronGeometry(0.03 + random() * 0.04),
        mat(i % 2 ? '#b39b75' : '#6c604d'),
        [(random() - 0.5) * 4, -0.86 - random() * 1.48, 0.025],
      );
      rock.scale.y = 0.6;
    }
    const top = [];
    for (let i = 0; i < 24; i++) {
      const x = -2.15 + (i / 23) * 4.3;
      top.push([x, -0.81 + 0.025 * Math.sin(x * 4), -0.02]);
    }
    path(group, top, 0.024, mat('#64744a'));
    return group;
  }

  function leaf(side, length, width) {
    const group = new T.Group(),
      v = [],
      idx = [];
    for (let i = 0; i <= 24; i++) {
      const u = i / 24;
      for (let j = 0; j <= 8; j++) {
        const t = j / 4 - 1;
        v.push(
          u * length,
          0.16 * Math.sin(u * Math.PI) + Math.abs(t) * 0.035,
          Math.sin(u * Math.PI) * width * t,
        );
      }
    }
    for (let i = 0; i < 24; i++)
      for (let j = 0; j < 8; j++) {
        const a = i * 9 + j,
          b = a + 9;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(v, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    add(group, geo, mat('#6d944f', { side: T.DoubleSide }));
    path(
      group,
      [
        [0, 0.005, 0],
        [length * 0.4, 0.16, 0],
        [length, 0.005, 0],
      ],
      0.01,
      mat('#b9c37a'),
    );
    for (let i = 1; i < 5; i++) {
      const u = i / 6;
      for (const sign of [-1, 1])
        path(
          group,
          [
            [u * length, 0.16 * Math.sin(u * Math.PI) + 0.008, 0],
            [
              (u + 0.1) * length,
              0.16 * Math.sin((u + 0.1) * Math.PI) + 0.015,
              sign * Math.sin((u + 0.1) * Math.PI) * width * 0.8,
            ],
          ],
          0.003,
          mat('#b0bc73'),
        );
    }
    group.rotation.x = 0.7;
    group.rotation.y = side > 0 ? -0.25 : Math.PI + 0.15;
    group.rotation.z = side > 0 ? 0.23 : -0.15;
    return group;
  }

  // 复用管状网格，移动生长尖端；根的已有部分保持原位，不做整组拉伸。
  function growingTube(parent, radius, material, segments = 40) {
    const initial = new T.LineCurve3(new T.Vector3(), new T.Vector3(0, 1, 0));
    const mesh = add(parent, new T.TubeGeometry(initial, segments, radius, 8, false), material);
    mesh.frustumCulled = false;
    return {
      mesh,
      update(curve, amount) {
        mesh.visible = amount > 0.0001;
        if (!mesh.visible) return;
        const frames = curve.computeFrenetFrames(segments, false);
        const position = mesh.geometry.attributes.position;
        const normal = mesh.geometry.attributes.normal;
        const point = new T.Vector3(),
          offset = new T.Vector3();
        for (let i = 0; i <= segments; i++) {
          const u = i / segments,
            t = u * amount;
          curve.getPointAt(t, point);
          const f = Math.min(segments, Math.round(t * segments));
          const taper = 0.18 + 0.82 * Math.min(1, (1 - u) * 9);
          for (let j = 0; j <= 8; j++) {
            const angle = (j / 8) * TAU,
              index = i * 9 + j;
            offset
              .copy(frames.normals[f])
              .multiplyScalar(Math.cos(angle))
              .addScaledVector(frames.binormals[f], Math.sin(angle));
            position.setXYZ(
              index,
              point.x + offset.x * radius * taper,
              point.y + offset.y * radius * taper,
              point.z + offset.z * radius * taper,
            );
            normal.setXYZ(index, offset.x, offset.y, offset.z);
          }
        }
        position.needsUpdate = true;
        normal.needsUpdate = true;
      },
    };
  }

  function sprout() {
    const group = new T.Group(),
      roots = new T.Group(),
      shoot = new T.Group();
    group.add(roots, shoot);
    // 根、芽和落稳的果实共用同一个接触点；前移用于土壤剖面展示。
    group.position.set(0.06, -0.87, 0.12);
    const rootMat = mat('#e2ceaa');
    const rootCurve = new T.CatmullRomCurve3([
      new T.Vector3(),
      new T.Vector3(-0.03, -0.33, 0.01),
      new T.Vector3(0.04, -0.7, 0),
      new T.Vector3(-0.04, -1.1, 0.02),
      new T.Vector3(0.02, -1.55, 0.02),
    ]);
    const primary = growingTube(roots, 0.025, rootMat);
    const branches = Array.from({ length: 8 }, (_, i) => {
      const along = 0.14 + i * 0.09,
        origin = rootCurve.getPointAt(along);
      const side = i % 2 ? 1 : -1;
      return {
        along,
        tube: growingTube(roots, 0.009, rootMat, 24),
        curve: new T.CatmullRomCurve3([
          origin,
          origin.clone().add(new T.Vector3(side * 0.19, -0.1, 0.01)),
          origin.clone().add(new T.Vector3(side * (0.32 + random() * 0.14), -0.3, 0.015)),
        ]),
      };
    });
    const stem = growingTube(shoot, 0.027, mat('#7f9751'));
    const left = leaf(-1, 0.95, 0.24),
      right = leaf(1, 1.08, 0.27);
    const tiny = leaf(1, 0.48, 0.13);
    shoot.add(left, right, tiny);
    const ease = (x) => {
      x = Math.max(0, Math.min(1, x));
      return x * x * (3 - 2 * x);
    };
    let lastProgress = -1;
    group.userData = { roots, shoot, rootGrowth: 0, shootGrowth: 0, leafGrowth: 0 };
    group.updateGrowth = (progress) => {
      if (Math.abs(progress - lastProgress) < 0.00001) return;
      lastProgress = progress;
      const rootGrowth = ease((progress - 3.23) / 0.52);
      const shootGrowth = ease((progress - 3.44) / 0.48);
      const leafGrowth = ease((progress - 3.67) / 0.33);
      Object.assign(group.userData, { rootGrowth, shootGrowth, leafGrowth });
      primary.update(rootCurve, rootGrowth);
      branches.forEach(({ along, tube, curve }) => {
        const start = 3.38 + along * 0.44;
        tube.update(curve, ease((progress - start) / (4 - start)));
      });
      // 胚轴先带着弯钩顶出，再伸直；叶片始终跟随芽尖。
      const height = 0.035 + shootGrowth * 1.38;
      const hook = Math.sin(shootGrowth * Math.PI) * 0.23;
      const tip = new T.Vector3(0.03 + hook * 0.6, height - hook * 0.9, 0);
      const stemCurve = new T.CatmullRomCurve3([
        new T.Vector3(),
        new T.Vector3(-0.055 * shootGrowth, height * 0.42, 0),
        new T.Vector3(-hook, height * 0.88, 0),
        new T.Vector3(-hook * 0.35, height, 0),
        tip,
      ]);
      stem.update(stemCurve, shootGrowth > 0 ? 1 : 0);
      [left, right, tiny].forEach((blade, i) => {
        const unfold = ease((progress - 3.67 - i * 0.045) / (0.33 - i * 0.045));
        blade.visible = shootGrowth > 0.001;
        // 左叶沿弯曲茎的实际位置附着，避免弯钩阶段悬在茎旁。
        blade.position.copy(i === 0 ? stemCurve.getPointAt(0.93) : tip);
        const size = (0.055 + 0.945 * unfold) * ease(shootGrowth * 4);
        blade.scale.set(size, size, size * (0.12 + 0.88 * unfold));
        blade.rotation.z =
          i === 0 ? -1.42 + unfold * 1.27 : i === 1 ? 1.42 - unfold * 1.19 : 1.5 - unfold * 0.4;
        if (i === 2) {
          blade.rotation.y = 1.3;
          blade.position.z = -0.03;
        }
      });
    };
    group.updateGrowth(0);
    return group;
  }
  return { seed, mother, soil, sprout };
};
