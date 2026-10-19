import sizes from '@/lib/imgsize.json';

/**
 * 사진 하나 = <picture>: WebP 가 있으면 먼저, 없으면 원본 JPG/PNG.
 * width/height 는 tools/imgsize.py 가 만든 lib/imgsize.json 에서 채워 레이아웃 흔들림을 막는다.
 */
const SIZES = sizes as unknown as Record<string, [number, number]>;

export function webpOf(src: string) {
  return src.replace(/\.(jpe?g|png)$/i, '.webp');
}

export default function Pic({
  src,
  alt = '',
  className,
  eager = false,
  draggable,
  ariaHidden,
}: {
  src: string;
  alt?: string;
  className?: string;
  eager?: boolean;
  draggable?: boolean;
  ariaHidden?: boolean;
}) {
  const s = SIZES[src];
  const webp = webpOf(src);
  return (
    <picture>
      {webp !== src && <source srcSet={webp} type="image/webp" />}
      <img
        className={className}
        src={src}
        alt={alt}
        width={s?.[0]}
        height={s?.[1]}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        draggable={draggable}
        aria-hidden={ariaHidden ? 'true' : undefined}
      />
    </picture>
  );
}
