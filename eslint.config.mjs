import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // 원본 사이트의 스크립트·스타일(그대로 옮겨 둔 파일)
    "public/**",
  ]),
  {
    // 원본 마크업을 1:1 로 옮긴 단계라 <a>/<img> 를 그대로 쓴다.
    // (레거시 스크립트가 페이지마다 새로 초기화돼야 해서 next/link 대신 일반 링크로 이동)
    rules: {
      "@next/next/no-html-link-for-pages": "off",
      "@next/next/no-img-element": "off",
      "@next/next/no-css-tags": "off",
      "@next/next/no-page-custom-font": "off",
      "react/no-unescaped-entities": "off",
      "jsx-a11y/alt-text": "off",
    },
  },
]);

export default eslintConfig;
