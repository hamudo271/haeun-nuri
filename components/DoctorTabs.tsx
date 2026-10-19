'use client';

import { useState } from 'react';
import type { Doctor } from '@/lib/home';
import Pic from './Pic';

const two = (n: number) => String(n).padStart(2, '0');

/**
 * 의료진 3명 탭(원본 메인 구성·원고 유지).
 * 레퍼런스: 골든디아망 의료진(왼쪽 소개 · 가운데 세로 아치 사진 · 오른쪽 금색 번호 경력)
 *         + 더가든피부과(배경 도형 위로 머리가 올라오는 누끼 인물).
 */
export default function DoctorTabs({ doctors }: { doctors: Doctor[] }) {
  const [i, setI] = useState(0);
  return (
    <div className="dc">
      <div className="dc-tabs" role="tablist">
        {doctors.map((d, k) => (
          <button key={d.name} role="tab" aria-selected={k === i} className={k === i ? 'is-on' : ''} onClick={() => setI(k)} type="button">
            <span className="dc-tab-no">{two(k + 1)}</span>
            <span className="dc-tab-name">
              {d.name} <small>{d.role}</small>
            </span>
          </button>
        ))}
      </div>
      {doctors.map((d, k) => (
        // 세 패널을 같은 칸에 겹쳐 두어 탭을 바꿔도 섹션 높이가 흔들리지 않게 한다(가장 긴 목록 기준)
        <div key={d.name} className={`dc-panel ${k === i ? 'is-on' : ''}`} role="tabpanel" aria-hidden={k !== i} inert={k !== i}>
          <div className="dc-intro">
            <p className="dc-eyebrow en">
              Doctor <em>{two(k + 1)}</em>
            </p>
            <h3 className="dc-name">
              {d.name}
              <span>{d.role}</span>
            </h3>
            <p className="dc-motto">“{d.motto}”</p>
            <a className="btn btn-line light dc-more" href="/sub/about/page03/">
              의료진 소개 바로가기 <span className="arr" aria-hidden="true" />
            </a>
          </div>

          <div className="dc-visual">
            <span className="dc-arch" aria-hidden="true" />
            <span className="dc-arch-line" aria-hidden="true" />
            <Pic className="dc-cut" src={d.cut} alt={`${d.name} ${d.role}`} />
          </div>

          <div className="dc-lists">
            <div className="dc-list">
              <p className="dc-list-h">경력</p>
              <ol>
                {d.career.map((c, j) => (
                  <li key={c}>
                    <span className="dc-no">{two(j + 1)}</span>
                    {c}
                  </li>
                ))}
              </ol>
            </div>
            <div className="dc-list">
              <p className="dc-list-h">학력 · 학회</p>
              <ol>
                {d.edu.map((c, j) => (
                  <li key={c}>
                    <span className="dc-no">{two(j + 1)}</span>
                    {c}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
