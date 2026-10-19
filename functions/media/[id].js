// 관리자에서 올린 이미지 — /media/:id
import { serveMedia } from '../../cms/core.js';

export const onRequestGet = ({ env, params }) => (/^\d+$/.test(params.id) ? serveMedia(env, +params.id) : new Response('Not found', { status: 404 }));
