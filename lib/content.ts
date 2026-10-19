import fs from 'node:fs';
import path from 'node:path';
import badges from './badges.json';

/** 서브페이지 원고(content/*.json) — 원본 통이미지의 글을 그대로 옮긴 것 */
export type Item = { num?: string; title?: string; text?: string; photo?: string; eyebrow?: string; href?: string };
export type Section = {
  id: string;
  kind: 'intro' | 'disease' | 'cards' | 'steps' | 'feature' | 'list' | 'text' | 'quote';
  tab?: string;
  num?: string;
  eyebrow?: string;
  title?: string;
  lead?: string;
  body?: string[];
  tags?: string[];
  badge?: string;
  checklist?: string[];
  checklistTitle?: string;
  callout?: { eyebrow?: string; title?: string; text?: string };
  photo?: string;
  photos?: string[];
  items?: Item[];
  itemsTitle?: string;
  itemsEyebrow?: string;
  note?: string;
  cta?: { label: string; href: string };
};
export type Page = { slug: string; title: string; sections: Section[] };

const DIR = path.join(process.cwd(), 'content');

export function loadPage(slug: string): Page {
  return JSON.parse(fs.readFileSync(path.join(DIR, `${slug}.json`), 'utf8'));
}

export function contentSlugs() {
  return fs
    .readdirSync(DIR)
    .filter((f) => f.startsWith('sub_'))
    .map((f) => f.replace(/\.json$/, ''));
}

/** 원고의 사진 이름 → 공개 경로 */
export function photoSrc(p?: string) {
  if (!p) return undefined;
  return `/img/content/${p.split('/').pop()}`;
}

const BADGED = new Set<string>(badges as string[]);
/** 원본 카드 사진 왼쪽 위에 금색 번호 배지가 박혀 있는지 */
export function isBadged(p?: string) {
  return !!p && BADGED.has(p.split('/').pop() as string);
}
