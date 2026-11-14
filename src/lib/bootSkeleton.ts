/**
 * 首屏真实 DOM 骨架
 *
 * 不预先绘制任何骨架形状：字体分片加载期间，直接把真实页面里承载文本的元素
 * 变成占位块（文字透明 + 米色底），位置完全来自浏览器真实排版，
 * 因此与页面实际元素天然对齐，数据变化时也会跟随更新。
 * 字体就绪后移除 html 上的 boot-sk-active 类即可恢复原样。
 */

const ACTIVE_CLASS = 'boot-sk-active';
const TEXT_CLASS = 'boot-sk-text';
const POS_CLASS = 'boot-sk-pos';
const DARK_CLASS = 'boot-sk-dark';
const ICON_CLASS = 'boot-sk-icon';
const IMG_CLASS = 'boot-sk-img';
const INPUT_CLASS = 'boot-sk-input';

/** 不参与占位的标签（无文本意义或已有独立视觉） */
const SKIP_TAGS = new Set([
  'SCRIPT',
  'STYLE',
  'NOSCRIPT',
  'OPTION',
  'SVG',
  'PATH',
  'IMG',
  'VIDEO',
  'CANVAS',
  'INPUT',
  'TEXTAREA',
]);

let observer: MutationObserver | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let frame = 0;

/** 取元素所处背景的有效亮度（0 黑 - 1 白），用于区分深色侧栏上的占位色 */
function backgroundLuminance(el: Element): number {
  let node: Element | null = el;
  while (node) {
    const bg = getComputedStyle(node).backgroundColor;
    const m = bg.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const [r, g, b, a = 1] = m[1].split(',').map((v) => parseFloat(v));
      if (a > 0.5) return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    }
    node = node.parentElement;
  }
  return 1;
}

/** 元素是否直接包含非空文本（避免把纯容器整块涂灰） */
function hasDirectText(el: Element): boolean {
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE && child.nodeValue?.trim()) return true;
  }
  return false;
}

/** 取元素内文本的实际渲染矩形（多行取并集），返回相对元素边框盒的偏移与尺寸 */
function textBox(el: Element): { x: number; y: number; w: number; h: number } | null {
  const range = document.createRange();
  range.selectNodeContents(el);
  const rects = Array.from(range.getClientRects()).filter((r) => r.width > 1 && r.height > 1);
  if (!rects.length) return null;
  const left = Math.min(...rects.map((r) => r.left));
  const top = Math.min(...rects.map((r) => r.top));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  const box = el.getBoundingClientRect();
  return {
    x: left - box.left,
    y: top - box.top,
    w: right - left,
    h: bottom - top,
  };
}

function markText(el: HTMLElement): void {
  if (SKIP_TAGS.has(el.tagName)) return;
  if (el.closest('svg')) return;
  const box = textBox(el);
  if (!box) return;
  // 占位块尺寸严格取自文本实际排版矩形，位置与文字逐像素一致
  el.style.setProperty('--sk-x', `${box.x}px`);
  el.style.setProperty('--sk-y', `${box.y}px`);
  el.style.setProperty('--sk-w', `${box.w}px`);
  el.style.setProperty('--sk-h', `${box.h}px`);
  if (el.classList.contains(TEXT_CLASS)) return;
  const style = getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none') return;
  if (style.position === 'static') el.classList.add(POS_CLASS);
  el.classList.add(TEXT_CLASS);
  if (backgroundLuminance(el) < 0.4) el.classList.add(DARK_CLASS);
}

/** 仅图标控件（快照/历史/公告/头像等）：无文本但承载图形，用占位块替代 */
function markIconControl(el: HTMLElement): void {
  if (el.innerText.trim()) return;
  if (el.children.length === 0) return;
  const rect = el.getBoundingClientRect();
  if (rect.width < 8 || rect.height < 8) return;
  const style = getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none') return;
  if (style.position === 'static') el.classList.add(POS_CLASS);
  el.classList.add(ICON_CLASS);
  if (backgroundLuminance(el) < 0.4) el.classList.add(DARK_CLASS);
}

function markAll(): void {
  frame = 0;
  const root = document.getElementById('root');
  if (!root) return;

  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    if (hasDirectText(el)) markText(el);
  });
  root.querySelectorAll<HTMLElement>('button, a, [role="button"]').forEach(markIconControl);
  root.querySelectorAll('input, textarea').forEach((el) => {
    const rect = el.getBoundingClientRect();
    if (rect.width >= 4 && rect.height >= 4) el.classList.add(INPUT_CLASS);
  });
  root.querySelectorAll('img').forEach((el) => el.classList.add(IMG_CLASS));
}

function schedule(): void {
  if (frame) return;
  frame = requestAnimationFrame(markAll);
}

/** 开始用真实 DOM 生成骨架占位 */
export function startDomSkeleton(): void {
  const root = document.getElementById('root');
  if (!root) return;
  document.documentElement.classList.add(ACTIVE_CLASS);
  markAll();
  observer = new MutationObserver(schedule);
  observer.observe(root, { childList: true, subtree: true, characterData: true });
  // 数据加载、布局变化不一定产生可观察的 DOM 变化，周期性补扫保证占位始终覆盖真实元素
  timer = setInterval(schedule, 300);
}

/** 结束占位，恢复真实文本 */
export function stopDomSkeleton(): void {
  document.documentElement.classList.remove(ACTIVE_CLASS);
  observer?.disconnect();
  observer = null;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (frame) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
}
