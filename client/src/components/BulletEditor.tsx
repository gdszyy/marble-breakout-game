// 子弹编辑器 - 让玩家组合模块编程子弹

import { useState, DragEvent } from 'react';
import { BulletModuleType } from '../types/game';
import type { BulletSlot, BulletModule } from '../types/game';
import { ModuleRegistry } from '../game/ModuleRegistry';
import { BulletProgramProcessor } from '../game/BulletProgramProcessor';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { X, Info, Zap, Target, GripVertical } from 'lucide-react';

interface BulletEditorProps {
  isOpen: boolean;
  onClose: () => void;
  bulletSlots: BulletSlot[];
  moduleInventory: Record<BulletModuleType, number>;
  onUpdateSlot: (slotId: string, modules: BulletModule[]) => void;
  currentSlotIndex: number;
  onSwitchSlot: (index: number) => void;
}

export function BulletEditor({
  isOpen,
  onClose,
  bulletSlots,
  moduleInventory,
  onUpdateSlot,
  currentSlotIndex,
  onSwitchSlot,
}: BulletEditorProps) {
  const [selectedSlot, setSelectedSlot] = useState(currentSlotIndex);
  const [hoveredModule, setHoveredModule] = useState<BulletModule | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const currentSlot = bulletSlots[selectedSlot];

  const handleAddModule = (moduleType: BulletModuleType) => {
    if (moduleInventory[moduleType] <= 0) return;

    const newModule = ModuleRegistry.createModuleInstance(moduleType);
    const newModules = [...currentSlot.program.modules, newModule];
    onUpdateSlot(currentSlot.id, newModules);
  };

  const handleRemoveModule = (index: number) => {
    const newModules = currentSlot.program.modules.filter((_, i) => i !== index);
    onUpdateSlot(currentSlot.id, newModules);
  };

  const handleClearSlot = () => {
    // 清空槽位，handleUpdateSlot会自动返还模块到库存
    onUpdateSlot(currentSlot.id, []);
  };

  const handleSwitchSlot = (index: number) => {
    setSelectedSlot(index);
    onSwitchSlot(index);
  };

  // 拖拽开始
  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  // 拖拽经过
  const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  // 拖拽离开
  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  // 放置
  const handleDrop = (e: DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    // 重新排序模块
    const newModules = [...currentSlot.program.modules];
    const [movedModule] = newModules.splice(draggedIndex, 1);
    newModules.splice(dropIndex, 0, movedModule);
    
    onUpdateSlot(currentSlot.id, newModules);
    setDraggedIndex(null);
  };

  // 拖拽结束
  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // 获取预览模块列表（拖拽时显示）
  const getPreviewModules = (): BulletModule[] => {
    if (draggedIndex === null || dragOverIndex === null) {
      return currentSlot.program.modules;
    }

    const modules = [...currentSlot.program.modules];
    const [movedModule] = modules.splice(draggedIndex, 1);
    modules.splice(dragOverIndex, 0, movedModule);
    return modules;
  };

  const energyCost = BulletProgramProcessor.calculateEnergyCost(currentSlot.program);
  const canFire = currentSlot.energy >= energyCost;
  const fireCount = energyCost > 0 ? Math.floor(currentSlot.energy / energyCost) : 0;

  // 验证编程
  const validation = BulletProgramProcessor.validate(currentSlot.program);

  const getModuleColor = (moduleType: BulletModuleType): string => {
    const module = ModuleRegistry.getModule(moduleType);
    switch (module.rarity) {
      case 'common':
        return 'bg-gray-600 border-gray-400';
      case 'uncommon':
        return 'bg-green-600 border-green-400';
      case 'rare':
        return 'bg-blue-600 border-blue-400';
      case 'epic':
        return 'bg-purple-600 border-purple-400';
      case 'legendary':
        return 'bg-yellow-600 border-yellow-400';
      default:
        return 'bg-gray-600 border-gray-400';
    }
  };

  const getRarityBadge = (rarity: string): string => {
    switch (rarity) {
      case 'common':
        return '普通';
      case 'uncommon':
        return '优秀';
      case 'rare':
        return '稀有';
      case 'epic':
        return '史诗';
      case 'legendary':
        return '传说';
      default:
        return '普通';
    }
  };

  const previewModules = getPreviewModules();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto bg-gray-900 text-white border-2 border-blue-500">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            子弹编程工作台
          </DialogTitle>
        </DialogHeader>

        {/* 子弹槽选择 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {bulletSlots.map((slot, index) => {
            const slotEnergyCost = slot.program.modules.length * 10;
            const slotFireCount = slotEnergyCost > 0 ? Math.floor(slot.energy / slotEnergyCost) : 0;
            const energyPercent = slotEnergyCost > 0 ? Math.min((slot.energy / slotEnergyCost) * 100, 100) : 0;
            
            return (
              <button
                key={slot.id}
                onClick={() => handleSwitchSlot(index)}
                className={`p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                  selectedSlot === index
                    ? 'border-yellow-400 bg-gradient-to-br from-yellow-900/40 to-orange-900/40 shadow-lg shadow-yellow-500/50'
                    : 'border-gray-600 bg-gray-800 hover:bg-gray-700 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold text-lg">{slot.name}</div>
                  {selectedSlot === index && (
                    <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></div>
                  )}
                </div>
                
                {/* 能量条 */}
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>能量</span>
                    <span>{Math.floor(slot.energy)}/{slotEnergyCost}</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                      style={{ width: `${energyPercent}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">可发射</span>
                  <span className="font-bold text-cyan-400 flex items-center gap-1">
                    <Zap className="w-4 h-4" />
                    {slotFireCount}次
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 当前槽位编程区域 */}
        <div className="bg-gray-800 border-2 border-gray-700 rounded-xl p-5 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-xl flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-400" />
              当前配置
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSlot}
              disabled={currentSlot.program.modules.length === 0}
              className="border-red-500 text-red-400 hover:bg-red-500/20 transition-all duration-200"
            >
              <X className="w-4 h-4 mr-1" />
              清空
            </Button>
          </div>

          {/* 配置槽 */}
          <div className="min-h-[100px] bg-gray-900 border-2 border-dashed border-gray-600 rounded-lg p-4 mb-4">
            {previewModules.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">点击下方模块添加到配置</p>
                  <p className="text-xs mt-1">修饰模块需在基础子弹左侧</p>
                  <p className="text-xs mt-1">拖动模块可调整顺序</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {previewModules.map((module, index) => {
                  const isBeingDragged = draggedIndex === index;
                  const isOriginalPosition = draggedIndex !== null && currentSlot.program.modules[index]?.id === module.id;
                  const isDragPreview = draggedIndex !== null && dragOverIndex !== null && !isOriginalPosition;
                  
                  return (
                    <div
                      key={`${module.id}-${index}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, currentSlot.program.modules.findIndex(m => m.id === module.id))}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`${getModuleColor(module.type)} border-2 px-4 py-3 rounded-lg text-white font-semibold cursor-move relative group
                        transition-all duration-200 ease-out
                        ${isBeingDragged ? 'opacity-30 scale-95' : isDragPreview ? 'opacity-60 scale-95' : 'hover:opacity-90 hover:scale-105'}
                      `}
                      style={{
                        transform: isBeingDragged ? 'rotate(-2deg)' : isDragPreview ? 'rotate(1deg)' : 'rotate(0deg)',
                      }}
                      onMouseEnter={() => setHoveredModule(module)}
                      onMouseLeave={() => setHoveredModule(null)}
                    >
                      {/* 拖拽手柄 */}
                      <div className="absolute -left-1 top-1/2 -translate-y-1/2 opacity-50 group-hover:opacity-100 transition-opacity duration-200">
                        <GripVertical className="w-4 h-4" />
                      </div>
                      
                      <div className="text-sm">{module.name}</div>
                      <div className="text-xs opacity-75">{module.isModifier ? '修饰' : '基础'}</div>
                      
                      {/* 删除按钮 - 只在原始模块上显示 */}
                      {!isDragPreview && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const originalIndex = currentSlot.program.modules.findIndex(m => m.id === module.id);
                            handleRemoveModule(originalIndex);
                          }}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-600 hover:scale-110"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 配置信息 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-900 rounded-lg p-3 transition-all duration-300 hover:bg-gray-800">
              <div className="text-sm text-gray-400 mb-1">能量消耗</div>
              <div className="text-2xl font-bold text-yellow-400 transition-all duration-300">{energyCost}</div>
            </div>
            <div className="bg-gray-900 rounded-lg p-3 transition-all duration-300 hover:bg-gray-800">
              <div className="text-sm text-gray-400 mb-1">可发射次数</div>
              <div className={`text-2xl font-bold transition-all duration-300 ${canFire ? 'text-green-400' : 'text-red-400'}`}>
                {fireCount}
              </div>
            </div>
          </div>

          {/* 验证状态 */}
          {!validation.valid && (
            <div className="mt-3 bg-red-900/30 border border-red-500 rounded-lg p-3 text-sm text-red-300 animate-pulse">
              ⚠️ {validation.error}
            </div>
          )}
        </div>

        {/* 模块库存 */}
        <div>
          <h3 className="font-bold text-xl mb-4 flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-500 rounded"></div>
            模块库存
          </h3>

          {/* 基础子弹 */}
          <div className="mb-5">
            <div className="text-sm text-gray-400 mb-3 font-semibold">⚔️ 基础子弹</div>
            <div className="grid grid-cols-3 gap-3">
              {ModuleRegistry.getBaseModules().map((module) => {
                const count = moduleInventory[module.type] || 0;
                const isHovered = hoveredModule?.type === module.type;
                
                return (
                  <button
                    key={module.type}
                    onClick={() => handleAddModule(module.type)}
                    onMouseEnter={() => setHoveredModule(module)}
                    onMouseLeave={() => setHoveredModule(null)}
                    disabled={count <= 0}
                    className={`${getModuleColor(module.type)} border-2 p-4 rounded-xl font-semibold disabled:opacity-30 disabled:cursor-not-allowed 
                      transition-all duration-200 transform hover:scale-105 hover:opacity-90 active:scale-95
                      relative ${isHovered ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}
                    `}
                  >
                    <div className="text-sm mb-1">{module.name}</div>
                    <div className="text-xs opacity-75">{getRarityBadge(module.rarity)}</div>
                    
                    {/* 库存数量 */}
                    <div className="absolute -top-2 -right-2 bg-black text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center border-2 border-current transition-transform duration-200 group-hover:scale-110">
                      {count}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 修饰模块 */}
          <div>
            <div className="text-sm text-gray-400 mb-3 font-semibold">✨ 修饰模块</div>
            <div className="grid grid-cols-3 gap-3">
              {ModuleRegistry.getModifierModules().map((module) => {
                const count = moduleInventory[module.type] || 0;
                const isHovered = hoveredModule?.type === module.type;
                
                return (
                  <button
                    key={module.type}
                    onClick={() => handleAddModule(module.type)}
                    onMouseEnter={() => setHoveredModule(module)}
                    onMouseLeave={() => setHoveredModule(null)}
                    disabled={count <= 0}
                    className={`${getModuleColor(module.type)} border-2 p-4 rounded-xl font-semibold disabled:opacity-30 disabled:cursor-not-allowed 
                      transition-all duration-200 transform hover:scale-105 hover:opacity-90 active:scale-95
                      relative ${isHovered ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}
                    `}
                  >
                    <div className="text-sm mb-1">{module.name}</div>
                    <div className="text-xs opacity-75">{getRarityBadge(module.rarity)}</div>
                    
                    {/* 库存数量 */}
                    <div className="absolute -top-2 -right-2 bg-black text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center border-2 border-current transition-transform duration-200 group-hover:scale-110">
                      {count}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 模块详情悬浮提示 */}
        {hoveredModule && (
          <div className="mt-4 bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-2 border-blue-400 rounded-xl p-4 transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-bold text-lg text-blue-300">{hoveredModule.name}</h4>
                <span className="text-xs text-gray-400">{getRarityBadge(hoveredModule.rarity)}</span>
              </div>
              <span className="text-xs bg-blue-500 px-2 py-1 rounded">
                {hoveredModule.isModifier ? '修饰模块' : '基础子弹'}
              </span>
            </div>
            <p className="text-sm text-gray-300">{hoveredModule.description}</p>
          </div>
        )}

        {/* 操作说明 */}
        <div className="bg-blue-900/20 border border-blue-500/50 rounded-xl p-4 text-sm">
          <div className="font-bold mb-2 text-blue-300">💡 编程规则</div>
          <ul className="space-y-1 text-gray-300">
            <li>• 至少需要一个基础子弹模块才能发射</li>
            <li>• 修饰模块必须在基础子弹<span className="text-yellow-400 font-bold">左侧</span>才生效</li>
            <li>• 多个修饰模块可叠加产生组合效果</li>
            <li>• <span className="text-green-400 font-bold">拖动</span>模块可调整顺序，拖拽时会实时预览效果</li>
            <li>• 每个模块消耗10点能量</li>
          </ul>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            className="border-gray-500 hover:bg-gray-700 transition-all duration-200"
          >
            关闭
          </Button>
          <Button 
            onClick={onClose}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all duration-200 transform hover:scale-105 active:scale-95"
            disabled={!validation.valid}
          >
            应用配置
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
