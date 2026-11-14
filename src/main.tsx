import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
import { startDomSkeleton, stopDomSkeleton } from './lib/bootSkeleton'

createRoot(document.getElementById('root')!).render(<App />)

/* ---------- 首屏加载：字体未就绪时用真实 DOM 生成骨架 ---------- */

/** 字体等待上限：超时（CDN 异常等）直接显示页面 */
const FONT_WAIT_MAX = 4000
/** 启动遮罩最短展示时间，避免快速加载时一闪而过 */
const COVER_MIN_SHOW = 250
const COVER_FADE = 260
/** 字体是否在加载的观察窗口：这段时间内就绪则不显示骨架，避免“闪一下” */
const SKELETON_CHECK_DELAY = 150
/** 骨架最短展示时间（从遮罩开始淡出算起），避免刚出现就消失 */
const SKELETON_MIN_SHOW = 450

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** 等 React 首次提交（#root 出现子节点） */
function waitForMount(timeout: number): Promise<void> {
  const root = document.getElementById('root')
  if (!root || root.childElementCount > 0) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const observer = new MutationObserver(() => {
      if (root.childElementCount === 0) return
      observer.disconnect()
      clearTimeout(timer)
      resolve()
    })
    const timer = setTimeout(() => {
      observer.disconnect()
      resolve()
    }, timeout)
    observer.observe(root, { childList: true })
  })
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * 主动触发当前页面文本所需的字体分片加载（不依赖返回值，仅用于确保请求发出）。
 */
function nudgeFontLoad(root: HTMLElement | null): void {
  if (!document.fonts || !root) return
  const text = (root.innerText || '').slice(0, 4000)
  if (!text) return
  document.fonts.load('700 16px "LXGW WenKai"', text).catch(() => undefined)
}

/**
 * 观察字体是否真的在加载。
 * 已缓存时字体请求瞬间完成，此时没必要显示骨架（否则骨架会一闪而过）。
 */
function fontsAreLoading(): boolean {
  return !!document.fonts && document.fonts.status === 'loading'
}

function hideCover(cover: HTMLElement | null): void {
  if (!cover) return
  cover.classList.add('is-hidden')
  setTimeout(() => cover.remove(), COVER_FADE)
}

async function boot(): Promise<void> {
  const startedAt = performance.now()
  const cover = document.getElementById('boot-skeleton')

  await waitForMount(FONT_WAIT_MAX)
  await nextFrame()

  // 触发当前页面文本所需的字体分片加载，并留出观察窗口
  nudgeFontLoad(document.getElementById('root'))
  await delay(SKELETON_CHECK_DELAY)
  const skeletonNeeded = fontsAreLoading()

  // 真实页面已渲染：需要骨架时先把页面变成骨架，再撤掉启动遮罩
  if (skeletonNeeded) startDomSkeleton()

  const elapsed = performance.now() - startedAt
  if (elapsed < COVER_MIN_SHOW) await delay(COVER_MIN_SHOW - elapsed)
  hideCover(cover)

  if (!skeletonNeeded) return

  // 骨架从遮罩淡出开始计时，保证可见时长，避免闪烁
  const skeletonVisibleAt = performance.now()
  await Promise.race([document.fonts.ready, delay(FONT_WAIT_MAX)])
  const shown = performance.now() - skeletonVisibleAt
  if (shown < SKELETON_MIN_SHOW) await delay(SKELETON_MIN_SHOW - shown)
  stopDomSkeleton()
}

boot()
