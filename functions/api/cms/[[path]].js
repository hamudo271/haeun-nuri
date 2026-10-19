// 관리자 API — /api/cms/* (cms/core.js)
import { handleApi } from '../../../cms/core.js';
import { SITE } from '../../../cms/site.js';

export const onRequest = ({ request, env }) => handleApi(request, env, SITE);
