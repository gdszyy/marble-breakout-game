# 弹珠编程打砖块游戏 - 核心架构伪代码

## 1. 游戏整体架构

```
游戏主循环
├── 事件管理器 (EventManager)
│   ├── 砖块生成阶段 (BRICK_SPAWN)
│   ├── 子弹装填阶段 (BULLET_LOADING)
│   ├── 玩家行动阶段 (PLAYER_ACTION)
│   └── 砖块行动阶段 (BRICK_ACTION)
├── 游戏状态 (GameState)
│   ├── 玩家数据
│   ├── 砖块列表
│   ├── 子弹列表
│   ├── 弹珠列表
│   └── 缓冲器阵列
├── 游戏引擎 (GameEngine)
│   ├── 物理更新
│   ├── 碰撞检测
│   └── 状态转换
└── 渲染器 (Renderer)
    ├── Canvas绘制
    └── UI显示
```

## 2. 核心数据结构

### 2.1 游戏状态 (GameState)
```
结构体 GameState:
    // 事件系统
    当前事件: GameEventType
    
    // 游戏实体
    玩家: Player
    砖块列表: Array<Brick>
    子弹列表: Array<Bullet>
    AOE圆环列表: Array<AOERing>
    
    // 子弹装填系统
    缓冲器阵列: Array<Bumper>
    奖励缓冲器列表: Array<RewardBumper>
    子弹槽列表: Array<BulletSlot>
    弹珠列表: Array<Marble>
    当前缓冲器模板: BumperArrayTemplate
    
    // 模块库存
    模块库存: Map<BulletModuleType, 数量>
    
    // 游戏进度
    回合数: 整数
    分数: 整数
    游戏结束标志: 布尔值
    
    // 配置
    网格大小: 整数
    弹珠发射模式: '自动' | '手动'
    
    // 抽奖系统
    抽奖状态: {
        是否激活: 布尔值
        奖池模块列表: Array<BulletModule>
    }
```

### 2.2 玩家 (Player)
```
结构体 Player:
    位置: Vector2 {x, y}
    生命值: 整数
    最大生命值: 整数
    当前子弹槽索引: 整数
```

### 2.3 砖块 (Brick)
```
结构体 Brick:
    ID: 字符串
    位置: Vector2 {x, y}
    尺寸: Size {宽度, 高度}
    生命值: 整数
    最大生命值: 整数
    所在行: 整数
```

### 2.4 子弹 (Bullet)
```
结构体 Bullet:
    ID: 字符串
    位置: Vector2 {x, y}
    速度: Vector2 {x, y}
    编程序列: BulletProgram
    剩余反弹次数: 整数
    伤害: 整数
    半径: 整数
    上次伤害时间: 时间戳 (可选)
```

### 2.5 弹珠 (Marble)
```
结构体 Marble:
    ID: 字符串
    位置: Vector2 {x, y}
    速度: Vector2 {x, y}
    半径: 整数
    状态: MarbleState (掉落中|落入槽位|越界)
    收集的模块列表: Array<BulletModule>
    碰撞次数: 整数
    目标槽位ID: 字符串 (可选)
```

### 2.6 缓冲器 (Bumper)
```
结构体 Bumper:
    ID: 字符串
    位置: Vector2 {x, y}
    模块: BulletModule
    当前冷却时间: 整数 (毫秒)
    基础冷却时间: 整数 (毫秒)
    被击中次数: 整数
```

### 2.7 子弹槽 (BulletSlot)
```
结构体 BulletSlot:
    ID: 字符串
    名称: 字符串
    位置: Vector2 {x, y}
    宽度: 整数
    编程序列: BulletProgram
    当前能量: 整数
    单次发射能量消耗: 整数
```

### 2.8 子弹编程 (BulletProgram)
```
结构体 BulletProgram:
    模块列表: Array<BulletModule>

结构体 BulletModule:
    ID: 字符串
    类型: BulletModuleType
    名称: 字符串
    描述: 字符串
    是否为修饰模块: 布尔值
    稀有度: ModuleRarity

枚举 BulletModuleType:
    // 基础子弹
    NORMAL          // 普通子弹
    PIERCING        // 穿透子弹
    AOE             // 范围伤害子弹
    
    // 修饰模块
    BOUNCE_PLUS     // 反弹+1
    SCATTER_PLUS    // 散射+1
    VOLLEY_PLUS     // 齐射+1
    COLLISION_TRIGGER // 碰撞触发

枚举 ModuleRarity:
    COMMON          // 普通(白色)
    UNCOMMON        // 优秀(绿色)
    RARE            // 稀有(蓝色)
    EPIC            // 史诗(紫色)
    LEGENDARY       // 传说(金色)
```

## 3. 模块注册表

```
类 BulletModuleRegistry:
    静态方法 获取所有模块() -> Array<BulletModule>:
        返回 [
            {
                ID: "normal",
                类型: NORMAL,
                名称: "烈焰酊剂",
                描述: "基础攻击魔药",
                是否为修饰模块: false,
                稀有度: COMMON
            },
            {
                ID: "piercing",
                类型: PIERCING,
                名称: "穿刺精粹",
                描述: "穿透敌人的魔药",
                是否为修饰模块: false,
                稀有度: UNCOMMON
            },
            {
                ID: "aoe",
                类型: AOE,
                名称: "爆裂灵液",
                描述: "范围伤害魔药",
                是否为修饰模块: false,
                稀有度: RARE
            },
            {
                ID: "bounce_plus",
                类型: BOUNCE_PLUS,
                名称: "弹射药剂",
                描述: "增加反弹次数",
                是否为修饰模块: true,
                稀有度: COMMON
            },
            {
                ID: "scatter_plus",
                类型: SCATTER_PLUS,
                名称: "分裂粉末",
                描述: "发射时分裂",
                是否为修饰模块: true,
                稀有度: UNCOMMON
            },
            {
                ID: "volley_plus",
                类型: VOLLEY_PLUS,
                名称: "齐射晶体",
                描述: "同时发射多个",
                是否为修饰模块: true,
                稀有度: RARE
            }
        ]
    
    静态方法 根据类型获取模块(类型: BulletModuleType) -> BulletModule:
        所有模块 = 获取所有模块()
        返回 所有模块.查找(模块 => 模块.类型 == 类型)
    
    静态方法 是否为基础子弹(类型: BulletModuleType) -> 布尔值:
        返回 类型 在 [NORMAL, PIERCING, AOE] 中
    
    静态方法 是否为修饰模块(类型: BulletModuleType) -> 布尔值:
        返回 类型 在 [BOUNCE_PLUS, SCATTER_PLUS, VOLLEY_PLUS, COLLISION_TRIGGER] 中
```

## 4. 能量计算器

```
类 EnergyCalculator:
    常量 每个模块基础能量 = 10
    常量 满槽充能效率 = 0.8
    
    静态方法 计算编程消耗(编程: BulletProgram) -> 整数:
        如果 编程.模块列表.长度 == 0:
            返回 0
        返回 编程.模块列表.长度 * 每个模块基础能量
    
    静态方法 计算装填获得能量(收集的模块: Array<BulletModule>, 槽位是否为空: 布尔值) -> 整数:
        基础能量 = 收集的模块.长度 * 每个模块基础能量
        
        如果 槽位是否为空:
            // 空槽充能: 100%效率
            返回 基础能量
        否则:
            // 满槽充能: 80%效率
            返回 向下取整(基础能量 * 满槽充能效率)
    
    静态方法 计算可发射次数(当前能量: 整数, 单次消耗: 整数) -> 整数:
        如果 单次消耗 <= 0:
            返回 0
        返回 向下取整(当前能量 / 单次消耗)
    
    静态方法 计算能量进度(当前能量: 整数, 单次消耗: 整数) -> 浮点数:
        如果 单次消耗 <= 0:
            返回 0
        剩余能量 = 当前能量 % 单次消耗
        返回 剩余能量 / 单次消耗
```

## 5. 子弹编程处理器

```
类 BulletProgramProcessor:
    静态方法 验证编程(编程: BulletProgram) -> {有效: 布尔值, 错误: 字符串}:
        如果 编程.模块列表.长度 == 0:
            返回 {有效: false, 错误: "编程不能为空"}
        
        // 检查是否至少有一个基础子弹
        有基础子弹 = false
        对于 编程.模块列表 中的每个 模块:
            如果 BulletModuleRegistry.是否为基础子弹(模块.类型):
                有基础子弹 = true
                跳出循环
        
        如果 not 有基础子弹:
            返回 {有效: false, 错误: "至少需要一个基础子弹模块"}
        
        // 检查修饰模块是否在基础子弹左侧
        遇到基础子弹 = false
        对于 编程.模块列表 中的每个 模块:
            如果 BulletModuleRegistry.是否为基础子弹(模块.类型):
                遇到基础子弹 = true
            否则如果 遇到基础子弹 且 BulletModuleRegistry.是否为修饰模块(模块.类型):
                返回 {有效: false, 错误: "修饰模块必须在基础子弹左侧"}
        
        返回 {有效: true, 错误: null}
    
    静态方法 解析编程(编程: BulletProgram) -> 解析结果:
        解析结果 = {
            基础子弹类型: null,
            修饰模块列表: [],
            反弹次数: 0,
            散射数量: 0,
            齐射数量: 0,
            有碰撞触发: false
        }
        
        对于 编程.模块列表 中的每个 模块:
            根据 模块.类型:
                当 NORMAL, PIERCING, AOE:
                    解析结果.基础子弹类型 = 模块.类型
                当 BOUNCE_PLUS:
                    解析结果.反弹次数 += 1
                当 SCATTER_PLUS:
                    解析结果.散射数量 += 1
                当 VOLLEY_PLUS:
                    解析结果.齐射数量 += 1
                当 COLLISION_TRIGGER:
                    解析结果.有碰撞触发 = true
        
        返回 解析结果
```

## 6. 缓冲器模板配置

```
类 BumperTemplateFactory:
    静态方法 创建默认模板() -> BumperArrayTemplate:
        返回 {
            ID: "default",
            名称: "标准阵列",
            默认缓冲器列表: [
                // 第一层 (3个)
                {位置: {x: 100, y: 100}, 模块: NORMAL模块},
                {位置: {x: 200, y: 100}, 模块: BOUNCE_PLUS模块},
                {位置: {x: 300, y: 100}, 模块: NORMAL模块},
                
                // 第二层 (3个)
                {位置: {x: 150, y: 200}, 模块: SCATTER_PLUS模块},
                {位置: {x: 250, y: 200}, 模块: PIERCING模块},
                {位置: {x: 350, y: 200}, 模块: SCATTER_PLUS模块},
                
                // 第三层 (2个)
                {位置: {x: 200, y: 300}, 模块: AOE模块},
                {位置: {x: 300, y: 300}, 模块: VOLLEY_PLUS模块}
            ],
            奖励缓冲器位置列表: [
                {x: 50, y: 350, 类型: BASIC, 描述: "左下角"},
                {x: 400, y: 350, 类型: BASIC, 描述: "右下角"}
            ]
        }
```

这是第一部分的核心架构和数据结构伪代码。接下来我会继续记录游戏引擎、物理系统和渲染逻辑。
