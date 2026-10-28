/**
 * 品牌 logo
 *
 * 原始 favicon.svg 是黑色描摹图。这里不修改图片文件，
 * 而是把它当作 CSS mask，用背景色给图标上色（当前为白色）。
 */
import { type CSSProperties } from 'react';

const FAVICON = `${import.meta.env.BASE_URL}favicon.svg`;

const maskStyle: CSSProperties = {
  WebkitMaskImage: `url(${FAVICON})`,
  maskImage: `url(${FAVICON})`,
  WebkitMaskRepeat: 'no-repeat',
  maskRepeat: 'no-repeat',
  WebkitMaskPosition: 'center',
  maskPosition: 'center',
  WebkitMaskSize: 'contain',
  maskSize: 'contain',
};

export default function BrandLogo({ className = '' }: { className?: string }) {
  // 图标为纯装饰，旁边的「玖拾课表」文字已承担可读名称
  return <div aria-hidden="true" className={`bg-white ${className}`} style={maskStyle} />;
}
