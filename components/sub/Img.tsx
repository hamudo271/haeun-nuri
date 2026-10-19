/** 사진 하나: WebP 가 있으면 먼저, 없으면 JPG/PNG. width/height 로 자리 예약 */
export default function Img({ src, wh, alt = '', eager = false, className }: { src: string; wh: [number, number]; alt?: string; eager?: boolean; className?: string }) {
  return (
    <picture>
      <source srcSet={src.replace(/\.(jpe?g|png)$/i, '.webp')} type="image/webp" />
      <img className={className} src={src} alt={alt} width={wh[0]} height={wh[1]} loading={eager ? 'eager' : 'lazy'} decoding="async" />
    </picture>
  );
}
