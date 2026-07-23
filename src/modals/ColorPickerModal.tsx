/**
 * 颜色选择器模态框
 *
 * 重写自课表 colorPickerModal
 * 调色板选择，已用色锁定，当前色标记，底部预览
 */
import Modal from '@/components/Modal';
import { COLOR_PALETTE, isLightColor } from '@/lib/utils';

interface ColorPickerModalProps {
  open: boolean;
  onClose: () => void;
  currentColor?: string;
  usedColors?: string[];
  onPick: (color: string) => void;
  title?: string;
}

export default function ColorPickerModal({
  open,
  onClose,
  currentColor,
  usedColors = [],
  onPick,
  title = '选择颜色',
}: ColorPickerModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} nested width="max-w-sm" hideHeader>
      {/* 标题区 */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-ink-700 flex items-center gap-1.5">
          {title}
        </h3>
        <p className="text-sm text-gray-500">选择一个颜色</p>
      </div>

      {/* 调色板网格 */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        {COLOR_PALETTE.map((color) => {
          const isUsed = usedColors.includes(color) && color !== currentColor;
          const isSelected = color === currentColor;
          const light = isLightColor(color);
          return (
            <button
              key={color}
              type="button"
              disabled={isUsed}
              onClick={() => {
                if (!isUsed) {
                  onPick(color);
                  onClose();
                }
              }}
              className={`h-8 rounded transition-all duration-200 flex items-center justify-center font-mono text-xs font-bold relative ${
                isUsed
                  ? 'opacity-40 cursor-not-allowed'
                  : 'cursor-pointer hover:scale-110'
              } ${isSelected ? 'ring-2 ring-offset-2 ring-ink-700' : ''}`}
              style={{
                backgroundColor: color,
                color: light ? '#000' : '#fff',
              }}
            >
              {color.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* 底部：当前颜色预览 + 取消 */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded border border-ink-200"
            style={{ backgroundColor: currentColor || '#ccc' }}
          />
          <span className="text-sm font-mono text-gray-500">
            {currentColor ? currentColor.toUpperCase() : '未选择'}
          </span>
        </div>
        <button type="button" onClick={onClose} className="btn btn-secondary">
          取消
        </button>
      </div>
    </Modal>
  );
}
