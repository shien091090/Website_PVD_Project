import { serveImage } from '../../lib/logo.js';

// 工作室 LOGO(存在 R2)
export const onRequestGet = ({ params, env }) => serveImage(env, 'logo', params.name);
