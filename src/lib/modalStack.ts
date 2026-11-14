/**
 * 弹窗栈
 *
 * 用于判断「最上层弹窗」：点击弹窗外区域、按 Esc 时只关闭最上层，
 * 避免嵌套弹窗（如 Modal + ConfirmDialog）被同时关闭。
 */
const stack: symbol[] = [];

export function pushModal(id: symbol): void {
  stack.push(id);
}

export function popModal(id: symbol): void {
  const index = stack.lastIndexOf(id);
  if (index !== -1) stack.splice(index, 1);
}

export function isTopModal(id: symbol): boolean {
  return stack.length > 0 && stack[stack.length - 1] === id;
}
