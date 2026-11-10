import { serveImage } from '../../lib/logo.js';

// 每一輪的分享圖(存在 R2), 社群平台抓連結預覽時讀這裡
export const onRequestGet = ({ params, env }) => serveImage(env, 'share', params.name);
