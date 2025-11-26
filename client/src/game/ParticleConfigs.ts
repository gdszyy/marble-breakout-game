/**
 * 粒子效果配置文件
 * 使用@pixi/particle-emitter库的配置格式
 */

// 子弹发射火花效果
export const bulletLaunchSparkConfig = {
  lifetime: {
    min: 0.2,
    max: 0.4,
  },
  frequency: 0.001,
  emitterLifetime: 0.1,
  maxParticles: 20,
  addAtBack: false,
  pos: {
    x: 0,
    y: 0,
  },
  behaviors: [
    {
      type: 'alpha',
      config: {
        alpha: {
          list: [
            { time: 0, value: 1 },
            { time: 1, value: 0 },
          ],
        },
      },
    },
    {
      type: 'moveSpeed',
      config: {
        speed: {
          list: [
            { time: 0, value: 200 },
            { time: 1, value: 50 },
          ],
        },
      },
    },
    {
      type: 'scale',
      config: {
        scale: {
          list: [
            { time: 0, value: 0.5 },
            { time: 1, value: 0.1 },
          ],
        },
      },
    },
    {
      type: 'color',
      config: {
        color: {
          list: [
            { time: 0, value: 'ffff00' }, // 黄色
            { time: 0.5, value: 'ff8800' }, // 橙色
            { time: 1, value: 'ff0000' }, // 红色
          ],
        },
      },
    },
    {
      type: 'rotation',
      config: {
        accel: 0,
        minSpeed: 0,
        maxSpeed: 200,
        minStart: 0,
        maxStart: 360,
      },
    },
    {
      type: 'spawnShape',
      config: {
        type: 'torus',
        data: {
          x: 0,
          y: 0,
          radius: 5,
          innerRadius: 0,
          affectRotation: false,
        },
      },
    },
  ],
};

// 子弹飞行拖尾效果
export const bulletTrailConfig = {
  lifetime: {
    min: 0.3,
    max: 0.5,
  },
  frequency: 0.02,
  emitterLifetime: -1, // 持续发射
  maxParticles: 50,
  addAtBack: true,
  pos: {
    x: 0,
    y: 0,
  },
  behaviors: [
    {
      type: 'alpha',
      config: {
        alpha: {
          list: [
            { time: 0, value: 0.8 },
            { time: 1, value: 0 },
          ],
        },
      },
    },
    {
      type: 'scale',
      config: {
        scale: {
          list: [
            { time: 0, value: 0.3 },
            { time: 1, value: 0.1 },
          ],
        },
      },
    },
    {
      type: 'color',
      config: {
        color: {
          list: [
            { time: 0, value: 'ffffff' }, // 白色
            { time: 1, value: '00aaff' }, // 蓝色
          ],
        },
      },
    },
    {
      type: 'moveSpeed',
      config: {
        speed: {
          list: [
            { time: 0, value: 0 },
            { time: 1, value: 0 },
          ],
        },
      },
    },
    {
      type: 'spawnShape',
      config: {
        type: 'point',
        data: {
          x: 0,
          y: 0,
        },
      },
    },
  ],
};

// 子弹碰撞爆炸效果
export const bulletExplosionConfig = {
  lifetime: {
    min: 0.3,
    max: 0.6,
  },
  frequency: 0.001,
  emitterLifetime: 0.1,
  maxParticles: 30,
  addAtBack: false,
  pos: {
    x: 0,
    y: 0,
  },
  behaviors: [
    {
      type: 'alpha',
      config: {
        alpha: {
          list: [
            { time: 0, value: 1 },
            { time: 1, value: 0 },
          ],
        },
      },
    },
    {
      type: 'moveSpeed',
      config: {
        speed: {
          list: [
            { time: 0, value: 300 },
            { time: 1, value: 0 },
          ],
        },
      },
    },
    {
      type: 'scale',
      config: {
        scale: {
          list: [
            { time: 0, value: 0.8 },
            { time: 1, value: 0.2 },
          ],
        },
      },
    },
    {
      type: 'color',
      config: {
        color: {
          list: [
            { time: 0, value: 'ffffff' }, // 白色
            { time: 0.3, value: 'ffaa00' }, // 橙色
            { time: 1, value: 'ff0000' }, // 红色
          ],
        },
      },
    },
    {
      type: 'rotation',
      config: {
        accel: 0,
        minSpeed: 0,
        maxSpeed: 200,
        minStart: 0,
        maxStart: 360,
      },
    },
    {
      type: 'spawnShape',
      config: {
        type: 'burst',
        data: {
          x: 0,
          y: 0,
          radius: 10,
          spacing: 0,
          distance: 0,
        },
      },
    },
  ],
};

// AOE范围指示粒子
export const aoeRingConfig = {
  lifetime: {
    min: 0.5,
    max: 1.0,
  },
  frequency: 0.01,
  emitterLifetime: -1, // 持续发射
  maxParticles: 100,
  addAtBack: true,
  pos: {
    x: 0,
    y: 0,
  },
  behaviors: [
    {
      type: 'alpha',
      config: {
        alpha: {
          list: [
            { time: 0, value: 0.6 },
            { time: 1, value: 0 },
          ],
        },
      },
    },
    {
      type: 'scale',
      config: {
        scale: {
          list: [
            { time: 0, value: 0.2 },
            { time: 1, value: 0.1 },
          ],
        },
      },
    },
    {
      type: 'color',
      config: {
        color: {
          list: [
            { time: 0, value: 'ff00ff' }, // 紫色
            { time: 1, value: '8800ff' }, // 深紫色
          ],
        },
      },
    },
    {
      type: 'moveSpeed',
      config: {
        speed: {
          list: [
            { time: 0, value: 50 },
            { time: 1, value: 20 },
          ],
        },
      },
    },
    {
      type: 'spawnShape',
      config: {
        type: 'ring',
        data: {
          x: 0,
          y: 0,
          radius: 50, // 将根据AOE半径动态调整
          innerRadius: 45,
          affectRotation: false,
        },
      },
    },
  ],
};
