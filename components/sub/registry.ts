import type { ComponentType } from 'react';
import HoursPage from './HoursPage';
import DoctorsPage from './DoctorsPage';
import WardPage from './WardPage';
import AdmissionPage from './AdmissionPage';
import AcuPage from './AcuPage';
import ChunaPage from './ChunaPage';
import ThreadPage from './ThreadPage';
import HerbPage from './HerbPage';

/**
 * 코딩으로 다시 그린 서브페이지(통이미지 대신 HTML/CSS).
 * 키: 'group/page' (예: 'treatment/page01'). 여기에 없는 페이지는 기존 방식으로 그린다.
 */
export const CODED: Record<string, ComponentType> = {
  'about/page01': HoursPage,
  'about/page03': DoctorsPage,
  'hospital/page01': WardPage,
  'hospital/page02': AdmissionPage,
  'treatment/page01': AcuPage,
  'treatment/page02': ChunaPage,
  'treatment/page03': ThreadPage,
  'treatment/page04': HerbPage,
};
