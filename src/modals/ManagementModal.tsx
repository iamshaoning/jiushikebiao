/**
 * 机构/年级管理模态框
 *
 * 重写自课表 managementModal.js
 * 增删改 + 颜色选择 + 级联更新学生/课程冗余字段
 */
import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import ColorPickerModal from '@/modals/ColorPickerModal';
import { useStore } from '@/stores/useStore';
import { useToast } from '@/components/Toast';
import {
  generateColor,
  setColorAssignment,
  removeColorAssignment,
} from '@/lib/utils';
import {
  School,
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';

interface ManagementModalProps {
  open: boolean;
  onClose: () => void;
  type: 'organization' | 'grade';
}

/** 解析批量输入（空格/逗号/顿号分隔） */
function parseNames(input: string): string[] {
  return input
    .split(/[\s,，、]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function ManagementModal({ open, onClose, type }: ManagementModalProps) {
  const isOrg = type === 'organization';
  const organizations = useStore((s) => s.organizations);
  const grades = useStore((s) => s.grades);
  const organizationColors = useStore((s) => s.organizationColors);
  const gradeColors = useStore((s) => s.gradeColors);
  const students = useStore((s) => s.students);
  const mutateData = useStore((s) => s.mutateData);
  const toast = useToast();

  const items = isOrg ? organizations : grades;
  const colors = isOrg ? organizationColors : gradeColors;
  const itemName = isOrg ? '机构' : '年级';
  const stateListKey = isOrg ? 'organizations' : 'grades';
  const colorsKey = isOrg ? 'organizationColors' : 'gradeColors';

  const [newItem, setNewItem] = useState('');
  const [editing, setEditing] = useState<{ oldVal: string; newVal: string } | null>(null);
  const [colorPicker, setColorPicker] = useState<{ item: string; color: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setNewItem('');
      setEditing(null);
      setColorPicker(null);
      setDeleteTarget(null);
      // 清理颜色映射中不在列表里的脏数据（如已删除的年级/机构残留）
      const validKeys = new Set(items);
      const dirtyKeys = Object.keys(colors).filter((k) => !validKeys.has(k));
      if (dirtyKeys.length > 0) {
        mutateData((draft) => {
          const cm = (draft as any)[colorsKey] as Record<string, string>;
          dirtyKeys.forEach((k) => delete cm[k]);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, type]);

  const getItemColor = (item: string): string => colors[item] || generateColor(item, type);

  /* 添加（支持批量） */
  const handleAdd = () => {
    const names = parseNames(newItem);
    if (names.length === 0) {
      toast.warning(`请输入${itemName}名称`);
      return;
    }
    let added = 0;
    let skipped = 0;
    mutateData((draft) => {
      const list = (draft as any)[stateListKey] as string[];
      const colorMap = (draft as any)[colorsKey] as Record<string, string>;
      names.forEach((n) => {
        if (list.includes(n)) {
          skipped++;
        } else {
          list.push(n);
          const color = generateColor(n, type);
          colorMap[n] = color;
          added++;
        }
      });
    });
    if (added > 0) {
      toast.success(added > 1 ? `已添加 ${added} 个${itemName}` : `已添加${itemName}`);
    }
    if (skipped > 0) {
      toast.info(`${skipped} 个${itemName}已存在，已跳过`);
    }
    setNewItem('');
  };

  /* 编辑名称（内联 input） */
  const handleEditStart = (item: string) => {
    setEditing({ oldVal: item, newVal: item });
  };

  const handleEditSubmit = () => {
    if (!editing) return;
    const { oldVal, newVal } = editing;
    const trimmed = newVal.trim();
    if (!trimmed || trimmed === oldVal) {
      setEditing(null);
      return;
    }
    if (items.includes(trimmed)) {
      toast.warning(`${itemName}「${trimmed}」已存在`);
      return;
    }

    removeColorAssignment(oldVal, type);
    const newColor = generateColor(trimmed, type);

    mutateData((draft) => {
      const list = (draft as any)[stateListKey] as string[];
      const idx = list.indexOf(oldVal);
      if (idx >= 0) list[idx] = trimmed;

      const colorMap = (draft as any)[colorsKey] as Record<string, string>;
      delete colorMap[oldVal];
      colorMap[trimmed] = newColor;

      // 级联更新学生
      draft.students.forEach((s) => {
        if (isOrg && s.organization === oldVal) s.organization = trimmed;
        else if (!isOrg && s.grade === oldVal) s.grade = trimmed;
      });

      // 机构级联更新课程的 organizations/colors，年级级联更新课程的 grades
      if (isOrg) {
        draft.courses.forEach((c) => {
          let changed = false;
          const newOrgs = c.organizations.map((o) => {
            if (o === oldVal) {
              changed = true;
              return trimmed;
            }
            return o;
          });
          if (changed) {
            const newColors = [...(c.colors || [])];
            c.organizations.forEach((o, idx) => {
              if (o === oldVal) newColors[idx] = newColor;
            });
            c.organizations = newOrgs;
            c.colors = newColors;
          }
        });
      } else {
        draft.courses.forEach((c) => {
          if (!c.grades) return;
          let changed = false;
          const newGrades = c.grades.map((g) => {
            if (g === oldVal) {
              changed = true;
              return trimmed;
            }
            return g;
          });
          if (changed) c.grades = newGrades;
        });
      }
    });

    toast.success(`已更新${itemName}名称`);
    setEditing(null);
  };

  /* 删除（不级联清空学生/课程字段，仅从列表移除+清颜色映射） */
  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const val = deleteTarget;
    removeColorAssignment(val, type);
    mutateData((draft) => {
      const list = (draft as any)[stateListKey] as string[];
      const idx = list.indexOf(val);
      if (idx >= 0) list.splice(idx, 1);
      const colorMap = (draft as any)[colorsKey] as Record<string, string>;
      delete colorMap[val];
    });
    toast.success(`已删除${itemName}「${val}」`);
    setDeleteTarget(null);
  };

  /* 颜色选择 */
  const handleColorPick = (newColor: string) => {
    if (!colorPicker) return;
    const item = colorPicker.item;
    setColorAssignment(item, newColor, type);
    mutateData((draft) => {
      const colorMap = (draft as any)[colorsKey] as Record<string, string>;
      colorMap[item] = newColor;
      // 机构级联更新课程 colors
      if (isOrg) {
        draft.courses.forEach((c) => {
          let changed = false;
          const newColors = [...(c.colors || [])];
          c.organizations.forEach((o, idx) => {
            if (o === item) {
              newColors[idx] = newColor;
              changed = true;
            }
          });
          if (changed) c.colors = newColors;
        });
      }
    });
    setColorPicker(null);
    toast.success(`已更新${itemName}颜色`);
  };

  // 仅统计当前列表中存在的条目颜色，忽略已删除年级/机构的残留脏数据
  const usedColors = items
    .map((item) => colors[item])
    .filter((c) => !!c && c !== colorPicker?.color);
  const deleteRefCount = deleteTarget
    ? students.filter((s) =>
        isOrg ? s.organization === deleteTarget : s.grade === deleteTarget,
      ).length
    : 0;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={
          <span className="flex items-center gap-1.5">
            {isOrg ? <School className="w-4 h-4" /> : <GraduationCap className="w-4 h-4" />}
            {itemName}管理
          </span>
        }
      >
        <div className="space-y-4">
          {/* 批量添加 */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">
              名称 <span className="text-gray-400">（支持批量，用空格/逗号/顿号分隔）</span>
            </label>
            <div className="flex gap-2">
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                className="input-field flex-1"
                placeholder={`输入${itemName}名称`}
                autoFocus
              />
              <button onClick={handleAdd} className="btn-primary shrink-0">
                <Plus className="w-4 h-4" />
                添加
              </button>
            </div>
          </div>

          {/* 已有列表 */}
          <div>
            <h4 className="text-xs text-gray-500 mb-2">
              已有{itemName} <span className="text-gray-400">（点击颜色标签可修改颜色）</span>
            </h4>
            {items.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">
                暂无{itemName}，请在上方添加
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {items.map((item) => {
                  const color = getItemColor(item);
                  const isEditing = editing?.oldVal === item;
                  // 统计使用该机构/年级的学生数，有学生使用时禁止删除
                  const usedCount = students.filter((s) =>
                    isOrg ? s.organization === item : s.grade === item,
                  ).length;
                  const deleteDisabled = usedCount > 0;
                  return (
                    <div
                      key={item}
                      className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-content)]"
                    >
                      {isEditing ? (
                        <input
                          value={editing!.newVal}
                          onChange={(e) =>
                            setEditing({ ...editing!, newVal: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditSubmit();
                            else if (e.key === 'Escape') setEditing(null);
                          }}
                          onBlur={handleEditSubmit}
                          className="input-field flex-1 mr-2 py-1"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => setColorPicker({ item, color })}
                          className="px-2 py-1 text-xs font-medium rounded-full hover:opacity-80 transition-opacity"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
                            color,
                          }}
                        >
                          {item}
                        </button>
                      )}
                      <div className="flex items-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleEditSubmit}
                              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-ink-50 transition-colors text-green-600"
                              title="确认"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-ink-50 transition-colors text-gray-400"
                              title="取消"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEditStart(item)}
                              className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-ink-50 transition-colors text-green-600"
                              title="编辑"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(item)}
                              disabled={deleteDisabled}
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                                deleteDisabled
                                  ? 'text-gray-300 cursor-not-allowed bg-gray-100 border border-gray-200'
                                  : 'text-red-500 hover:bg-red-50'
                              }`}
                              title={deleteDisabled ? `有 ${usedCount} 名学生正在使用，无法删除` : '删除'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* 颜色选择器（nested） */}
      <ColorPickerModal
        open={!!colorPicker}
        onClose={() => setColorPicker(null)}
        currentColor={colorPicker?.color}
        usedColors={usedColors}
        onPick={handleColorPick}
        title={`选择${itemName}颜色`}
      />

      {/* 删除确认（nested） */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={`删除${itemName}`}
        nested
        width="max-w-sm"
        footer={
          <>
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary">
              取消
            </button>
            <button onClick={handleDeleteConfirm} className="btn-danger">
              确认删除
            </button>
          </>
        }
      >
        <p>
          确定删除{itemName}「<b>{deleteTarget}</b>」吗？
        </p>
        {deleteRefCount > 0 && (
          <p className="mt-2 text-sm text-amber-600">
            有 {deleteRefCount} 名学生正在使用此{itemName}，无法删除。
          </p>
        )}
      </Modal>
    </>
  );
}
