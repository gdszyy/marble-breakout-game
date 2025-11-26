// 子弹编辑器 - 让玩家组合模块编程子弹

import { useState } from 'react';
import { BulletModuleType } from '../types/game';
import type { BulletSlot, BulletModule } from '../types/game';
import { ModuleRegistry } from '../game/ModuleRegistry';
import { BulletProgramProcessor } from '../game/BulletProgramProcessor';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

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
    onUpdateSlot(currentSlot.id, []);
  };

  const handleSwitchSlot = (index: number) => {
    setSelectedSlot(index);
    onSwitchSlot(index);
  };

  const energyCost = BulletProgramProcessor.calculateEnergyCost(currentSlot.program);
  const canFire = currentSlot.energy >= energyCost;
  const fireCount = energyCost > 0 ? Math.floor(currentSlot.energy / energyCost) : 0;

  const getModuleColor = (moduleType: BulletModuleType): string => {
    const module = ModuleRegistry.getModule(moduleType);
    switch (module.rarity) {
      case 'common':
        return 'bg-gray-500';
      case 'uncommon':
        return 'bg-green-500';
      case 'rare':
        return 'bg-blue-500';
      case 'epic':
        return 'bg-purple-500';
      case 'legendary':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">子弹编程</DialogTitle>
        </DialogHeader>

        {/* 子弹槽选择 */}
        <div className="flex gap-2 mb-4">
          {bulletSlots.map((slot, index) => (
            <button
              key={slot.id}
              onClick={() => handleSwitchSlot(index)}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                selectedSlot === index
                  ? 'border-yellow-500 bg-yellow-500/20'
                  : 'border-gray-600 bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <div className="font-bold">{slot.name}</div>
              <div className="text-sm text-gray-400">
                能量: {Math.floor(slot.energy)}/{energyCost}
              </div>
              <div className="text-xs text-gray-500">可发射: {fireCount}次</div>
            </button>
          ))}
        </div>

        {/* 当前槽位编程 */}
        <div className="bg-gray-800 p-4 rounded-lg mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">当前配置</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearSlot}
              disabled={currentSlot.program.modules.length === 0}
            >
              清空
            </Button>
          </div>

          <div className="min-h-[60px] bg-gray-900 rounded-lg p-3 flex flex-wrap gap-2">
            {currentSlot.program.modules.length === 0 ? (
              <div className="text-gray-500 text-sm">点击下方模块添加到配置</div>
            ) : (
              currentSlot.program.modules.map((module, index) => (
                <div
                  key={module.id}
                  className={`${getModuleColor(module.type)} px-3 py-2 rounded-lg text-white text-sm font-semibold cursor-pointer hover:opacity-80 transition-opacity`}
                  onClick={() => handleRemoveModule(index)}
                  title={`${module.name}\n${module.description}\n点击移除`}
                >
                  {module.name}
                </div>
              ))
            )}
          </div>

          {/* 能量信息 */}
          <div className="mt-3 text-sm">
            <div className="flex justify-between">
              <span>消耗能量:</span>
              <span className="font-bold">{energyCost}</span>
            </div>
            <div className="flex justify-between">
              <span>当前能量:</span>
              <span className={canFire ? 'text-green-400 font-bold' : 'text-red-400'}>
                {Math.floor(currentSlot.energy)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>可发射次数:</span>
              <span className="font-bold text-yellow-400">{fireCount}</span>
            </div>
          </div>
        </div>

        {/* 模块库存 */}
        <div>
          <h3 className="font-bold mb-2">模块库存</h3>

          {/* 基础子弹 */}
          <div className="mb-3">
            <div className="text-sm text-gray-400 mb-1">基础子弹</div>
            <div className="flex flex-wrap gap-2">
              {ModuleRegistry.getBaseModules().map((module) => {
                const count = moduleInventory[module.type] || 0;
                return (
                  <button
                    key={module.type}
                    onClick={() => handleAddModule(module.type)}
                    disabled={count <= 0}
                    className={`${getModuleColor(module.type)} px-4 py-2 rounded-lg text-white font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80 transition-opacity relative`}
                    title={`${module.name}\n${module.description}`}
                  >
                    {module.name}
                    <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 修饰模块 */}
          <div>
            <div className="text-sm text-gray-400 mb-1">修饰模块</div>
            <div className="flex flex-wrap gap-2">
              {ModuleRegistry.getModifierModules().map((module) => {
                const count = moduleInventory[module.type] || 0;
                return (
                  <button
                    key={module.type}
                    onClick={() => handleAddModule(module.type)}
                    disabled={count <= 0}
                    className={`${getModuleColor(module.type)} px-4 py-2 rounded-lg text-white font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-80 transition-opacity relative`}
                    title={`${module.name}\n${module.description}`}
                  >
                    {module.name}
                    <span className="absolute -top-1 -right-1 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 说明 */}
        <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-3 text-sm">
          <div className="font-bold mb-1">💡 编程规则</div>
          <ul className="list-disc list-inside space-y-1 text-gray-300">
            <li>至少需要一个基础子弹模块才能发射</li>
            <li>修饰模块必须在基础子弹左侧才生效</li>
            <li>多个修饰模块可叠加产生组合效果</li>
            <li>点击已添加的模块可移除</li>
          </ul>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
