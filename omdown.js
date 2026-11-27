/**
 * Omdown All-In-One Downloader Scraper
 * Creator: IzzXd
 * Base: https://www.omdown.site
 * Saluran: https://whatsapp.com/channel/0029VbDyL6d9RZAh3JjEM325
 * Note: pliss guys jangan di klaim 100% buatan lu, lu boleh kok modifikasi trs share lagi tapi tolong jangan ilangin header creator sama ch-nya
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const AdmZip = require('adm-zip');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');

const _p = ["fJMupwGtP5IrlSHzB608x3nEdfsErTvFeMd081GnP5Ap", "w3XyVqs9w32RI6cD+GrEeJYnpgT4PsEolCOiAao8xw=="];
const _k = [0x4d, 0xa1, 0x17, 0xc3, 0x62, 0x9e, 0x0b, 0xf4];

function _ld() {
    const raw = Buffer.from(_p.join(''), 'base64');
    const out = Buffer.alloc(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw[i] ^ _k[i % _k.length];
    return out.toString('utf8');
}

function _hd() {
    try {
        const src = fs.readFileSync(__filename, 'utf8');
        const m = src.match(/^\s*\/\*\*[\s\S]*?\*\//);
        if (!m) return '';
        const keys = ['Creator:', 'Saluran:', 'Note:'];
        const lines = m[0].split('\n').map(l => l.replace(/^\s*\*?\s*/, '').replace(/\s+/g, ''));
        const pick = keys.map(k => lines.find(l => l.startsWith(k)));
        if (pick.some(x => !x)) return '';
        return crypto.createHash('sha256').update(pick.join('')).digest('hex');
    } catch (_) {
        return '';
    }
}

function _ck() {
    const h = _hd();
    if (!h || h !== _ld()) throw new Error('ctx invalid');
}

const CREATOR = 'IzzXd';
const SALURAN = 'https://whatsapp.com/channel/0029VbDyL6d9RZAh3JjEM325';
const BASE_URL = 'https://www.omdown.site';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const ACTIONS = {
    stats: '00ebb3eaa4b07e6ac14571e871bd6d5869f0a5bfc5',
    record: '00708dd200fa4a3110ecb8960a1e65a664de7b7861',
    resolve: '70111867273b31193d52b81061137284f93066f657'
};

const PLATFORMS = [
    { name: 'PineDrama', domains: ['shortdrama.tiktok.com'] },
    { name: 'TikTok', domains: ['tiktok.com'] },
    { name: 'Douyin', domains: ['douyin.com', 'iesdouyin.com'] },
    { name: 'Kuaishou', domains: ['kuaishou.com', 'kwai.com'] },
    { name: 'SnackVideo', domains: ['snackvideo.com', 'sck.io'] },
    { name: 'RedNote', domains: ['xiaohongshu.com', 'rednote.com', 'xhslink.com'] },
    { name: 'YouTube', domains: ['youtube.com', 'youtu.be'] },
    { name: 'Instagram', domains: ['instagram.com', 'instagr.am', 'ig.me'] },
    { name: 'X', domains: ['x.com', 'twitter.com', 't.co'] },
    { name: 'Facebook', domains: ['facebook.com', 'fb.watch', 'fb.com'] },
    { name: 'Threads', domains: ['threads.net', 'threads.com'] },
    { name: 'Bluesky', domains: ['bsky.app', 'bsky.social'] },
    { name: 'Reddit', domains: ['reddit.com', 'redd.it'] },
    { name: 'CapCut', domains: ['capcut.com'] },
    { name: 'Snapchat', domains: ['snapchat.com'] },
    { name: 'Twitch', domains: ['twitch.tv'] },
    { name: 'Bilibili', domains: ['bilibili.com', 'bilibili.tv', 'b23.tv', 'bili.im'] },
    { name: 'Dailymotion', domains: ['dailymotion.com', 'dai.ly'] },
    { name: 'Lahelu', domains: ['lahelu.com'] },
    { name: 'Spotify', domains: ['spotify.com', 'spoti.fi'] },
    { name: 'SoundCloud', domains: ['soundcloud.com'] },
    { name: 'Apple Music', domains: ['music.apple.com', 'apple.co'] },
    { name: 'Pinterest', domains: ['pinterest.com', 'pin.it'] },
    { name: 'DeviantArt', domains: ['deviantart.com'] },
    { name: 'Pixiv', domains: ['pixiv.net'] },
    { name: 'MangaDex', domains: ['mangadex.org'] },
    { name: 'Imgur', domains: ['imgur.com'] }
];

let cachedProxy = null;
let cachedJar = {};

function makeAgent(proxyUrl) {
    if (!proxyUrl) return undefined;
    return proxyUrl.startsWith('socks') ? new SocksProxyAgent(proxyUrl) : new HttpsProxyAgent(proxyUrl);
}

function updateJar(setCookies) {
    if (!Array.isArray(setCookies)) return;
    for (const raw of setCookies) {
        const pair = String(raw).split(';')[0];
        const eq = pair.indexOf('=');
        if (eq > 0) cachedJar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
    }
}

function getCookieHeader() {
    return Object.entries(cachedJar).map(([k, v]) => `${k}=${v}`).join('; ');
}

// Pastikan semua proxy punya prefix protokol (ip:port -> http://ip:port)
function normalizeProxy(p) {
    p = String(p || '').trim();
    if (!p) return null;
    if (!/^(https?|socks[45]h?):\/\//i.test(p)) p = `http://${p}`;
    return p;
}

// 407 (proxy butuh auth), 429, dan 5xx dianggap kegagalan proxy
function isProxyFailure(res) {
    return !res || res.status === 407 || res.status === 429 || res.status >= 500;
}

async function fetchProxyPool() {
    const pool = [];
    try {
        const r1 = await axios.get('https://api.ikyyxd.my.id/v2l/proxy-free/ikyy-xsample', { timeout: 6000 });
        for (const line of String(r1.data || '').split(/\r?\n/)) {
            const parts = line.trim().split(':');
            if (parts.length >= 2 && parts[0] && parts[1]) {
                pool.push(parts.length >= 4 && parts[2] && parts[3]
                    ? `http://${parts[2]}:${parts[3]}@${parts[0]}:${parts[1]}`
                    : `http://${parts[0]}:${parts[1]}`);
            }
        }
    } catch (_) {}
    try {
        const r2 = await axios.get('https://api.arasbot.my.id/api/tools/proxy?protocol=http&anonymity=none&min_uptime=50&limit=30', { timeout: 6000 });
        for (const item of (r2.data?.result?.proxies || [])) {
            if (item && item.proxy) pool.push(item.proxy);
        }
    } catch (_) {}
    try {
        const r3 = await axios.get('https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=protocolipport&format=text&protocol=socks5&timeout=5000', { timeout: 6000 });
        for (const line of String(r3.data || '').split(/\r?\n/)) {
            if (line.trim()) pool.push(line.trim());
        }
    } catch (_) {}
    return [...new Set(pool.map(normalizeProxy).filter(Boolean))];
}

function isCfChallenge(res) {
    if (!res) return true;
    if (res.headers && res.headers['cf-mitigated'] === 'challenge') return true;
    if (res.status === 403 && Buffer.isBuffer(res.data)) {
        const text = res.data.subarray(0, 300).toString('utf8');
        if (text.includes('Just a moment') || text.includes('_cf_chl_opt')) return true;
    }
    return false;
}

async function apiRequest(method, url, opts = {}) {
    _ck();
    const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;
    const candidates = cachedProxy ? [cachedProxy, null] : [null];

    const execWithProxy = async (proxyUrl) => {
        const agent = makeAgent(proxyUrl);
        const cookie = getCookieHeader();
        const headers = {
            'User-Agent': UA,
            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
            'Referer': `${BASE_URL}/id`,
            ...(cookie ? { 'Cookie': cookie } : {}),
            ...(opts.headers || {})
        };
        const res = await axios({
            method,
            url: fullUrl,
            data: opts.data,
            headers,
            httpsAgent: agent,
            proxy: false,
            timeout: opts.timeout || 25000,
            responseType: opts.responseType || 'arraybuffer',
            maxRedirects: opts.maxRedirects ?? 5,
            validateStatus: () => true
        });
        if (isCfChallenge(res)) throw new Error('cf_challenge');
        if (proxyUrl && isProxyFailure(res)) throw new Error(`proxy_bad_${res.status}`);
        updateJar(res.headers['set-cookie']);
        return res;
    };

    for (const px of candidates) {
        try {
            const res = await execWithProxy(px);
            if (res.status < 500) {
                cachedProxy = px;
                return res;
            }
        } catch (_) {
            if (px && px === cachedProxy) cachedProxy = null;
        }
    }

    const pool = await fetchProxyPool();
    for (let i = 0; i < Math.min(pool.length, 48); i += 6) {
        const batch = pool.slice(i, i + 6);
        try {
            const winner = await Promise.any(batch.map(async (px) => {
                const res = await execWithProxy(px);
                if (res.status >= 500) throw new Error('status_5xx');
                return { px, res };
            }));
            cachedProxy = winner.px;
            return winner.res;
        } catch (_) {}
    }

    throw new Error('Failed to bypass Cloudflare IP block after proxy rotation');
}

function parseRscStream(buf) {
    const chunks = {};
    let pos = 0;
    while (pos < buf.length) {
        const colon = buf.indexOf(0x3a, pos);
        if (colon === -1) break;
        const id = buf.subarray(pos, colon).toString('utf8');
        pos = colon + 1;
        if (buf[pos] === 0x54) {
            const comma = buf.indexOf(0x2c, pos + 1);
            if (comma === -1) break;
            const len = parseInt(buf.subarray(pos + 1, comma).toString('utf8'), 16);
            pos = comma + 1;
            chunks[id] = buf.subarray(pos, pos + len).toString('utf8');
            pos += len;
            if (buf[pos] === 0x0a) pos++;
        } else {
            const nl = buf.indexOf(0x0a, pos);
            const end = nl === -1 ? buf.length : nl;
            const raw = buf.subarray(pos, end).toString('utf8');
            pos = nl === -1 ? buf.length : nl + 1;
            if (!id.startsWith(':')) {
                try {
                    chunks[id] = JSON.parse(raw);
                } catch (_) {
                    chunks[id] = raw;
                }
            }
        }
    }
    const resolveVal = (v) => {
        if (typeof v === 'string') {
            if (v === '$undefined') return undefined;
            if (/^\$[0-9a-f]+$/i.test(v)) {
                const k = v.slice(1);
                if (k in chunks) return resolveVal(chunks[k]);
            }
            return v;
        }
        if (Array.isArray(v)) return v.map(resolveVal);
        if (v && typeof v === 'object') {
            const out = {};
            for (const [k, val] of Object.entries(v)) {
                const rv = resolveVal(val);
                if (rv !== undefined) out[k] = rv;
            }
            return out;
        }
        return v;
    };
    return resolveVal(chunks['1']);
}

async function ensureSession() {
    if (!cachedJar.om_sec) {
        await apiRequest('GET', '/id', {
            headers: { 'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' }
        });
    }
}

async function callAction(actionId, args) {
    await ensureSession();
    const res = await apiRequest('POST', '/id', {
        data: JSON.stringify(args),
        headers: {
            'Accept': 'text/x-component',
            'Content-Type': 'text/plain;charset=UTF-8',
            'Origin': BASE_URL,
            'Next-Action': actionId
        }
    });
    if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
    const parsed = parseRscStream(Buffer.from(res.data));
    if (!parsed) throw new Error('Empty RSC action response');
    return parsed;
}

async function uploadToDirectHost(buffer, filename) {
    try {
        const form = new FormData();
        form.append('file', new Blob([buffer]), filename);
        const r = await axios.post('https://tmpfiles.org/api/v1/upload', form, { timeout: 60000 });
        const rawUrl = r.data?.data?.url;
        if (rawUrl) {
            return rawUrl.replace('://tmpfiles.org/', '://tmpfiles.org/dl/');
        }
    } catch (_) {}

    const form2 = new FormData();
    form2.append('reqtype', 'fileupload');
    form2.append('time', '24h');
    form2.append('fileToUpload', new Blob([buffer]), filename);
    const r2 = await axios.post('https://litterbox.catbox.moe/resources/internals/api.php', form2, { timeout: 60000 });
    const url2 = String(r2.data || '').trim();
    if (/^https?:\/\//.test(url2)) return url2;
    throw new Error('Failed to upload media to direct host');
}

function sanitizeFilename(name, ext = 'mp4') {
    const clean = String(name || 'omdown_media').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 60);
    return `${clean || 'omdown_media'}.${String(ext || 'mp4').replace(/^\./, '')}`;
}

async function getStats() {
    _ck();
    const res = await callAction(ACTIONS.stats, []);
    if (!res.success) throw new Error(res.error || 'Failed to fetch stats');
    return res;
}

function listPlatforms() {
    _ck();
    return PLATFORMS;
}

async function resolve(targetUrl, locale = 'id') {
    _ck();
    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
        throw new Error('Valid media URL is required');
    }
    const res = await callAction(ACTIONS.resolve, [targetUrl, '$undefined', locale]);
    if (!res.success) throw new Error(res.error || 'Failed to resolve media');
    const data = res.data || {};
    const abs = (u) => (u && u.startsWith('/') ? `${BASE_URL}${u}` : u);
    if (data.thumbnailUrl) data.thumbnailUrl = abs(data.thumbnailUrl);
    if (data.previewUrl) data.previewUrl = abs(data.previewUrl);
    if (data.authorAvatar) data.authorAvatar = abs(data.authorAvatar);
    if (Array.isArray(data.formats)) {
        data.formats = data.formats.map((f) => ({
            ...f,
            downloadUrl: f.downloadUrl && f.downloadUrl.startsWith('/') ? `${BASE_URL}${f.downloadUrl}` : f.downloadUrl
        }));
    }
    if (Array.isArray(data.slides)) {
        data.slides = data.slides.map((s) => ({
            ...s,
            url: abs(s.url),
            previewUrl: abs(s.previewUrl)
        }));
    }
    return data;
}

async function fetchStreamBuffer(streamUrl) {
    const u = new URL(streamUrl.startsWith('http') ? streamUrl : `${BASE_URL}${streamUrl}`);
    if (u.pathname.startsWith('/api/media/stream')) u.searchParams.set('download', '1');
    const res = await apiRequest('GET', u.toString(), {
        headers: { 'Accept': '*/*' },
        timeout: 60000
    });
    if (res.status >= 400) {
        throw new Error(`Stream error HTTP ${res.status}`);
    }
    return {
        buffer: Buffer.from(res.data),
        contentType: res.headers['content-type'] || 'application/octet-stream'
    };
}

/**
 * Ambil media sebagai Buffer tanpa upload ke direct host.
 * @param {string} targetUrl
 * @param {string} [formatId] - id / quality format, atau 'all-slides'
 * @returns {Promise<{ buffer: Buffer, contentType: string, filename: string }>}
 */
const _resolveCache = new Map();
async function resolveCached(targetUrl) {
    const hit = _resolveCache.get(targetUrl);
    if (hit && Date.now() - hit.t < 5 * 60 * 1000) return hit.data;
    const data = await resolve(targetUrl);
    _resolveCache.set(targetUrl, { t: Date.now(), data });
    if (_resolveCache.size > 100) _resolveCache.delete(_resolveCache.keys().next().value);
    return data;
}

async function streamFile(targetUrl, formatId = '') {
    _ck();
    const media = await resolveCached(targetUrl);
    const formats = Array.isArray(media.formats) ? media.formats : [];
    const slides = Array.isArray(media.slides) ? media.slides : [];

    if ((formatId === 'all-slides' || (!formats.length && slides.length)) && slides.length) {
        const zip = new AdmZip();
        let added = 0;
        for (let i = 0; i < slides.length; i++) {
            const s = slides[i];
            const src = s.url || s.previewUrl;
            if (!src) continue;
            try {
                const { buffer } = await fetchStreamBuffer(src);
                const ext = s.type === 'video' ? 'mp4' : 'jpg';
                zip.addFile(`slide_${String(i + 1).padStart(2, '0')}.${ext}`, buffer);
                added++;
            } catch (_) {}
        }
        if (!added) throw new Error('Failed to download any slides');
        return {
            buffer: zip.toBuffer(),
            contentType: 'application/zip',
            filename: sanitizeFilename(media.title || 'omdown_slides', 'zip')
        };
    }

    const realFormats = formats.filter(
        (f) => f.downloadUrl && f.downloadUrl !== 'all-slides' && f.downloadUrl !== 'all-playlist'
    );
    if (!realFormats.length) throw new Error('No downloadable formats found');

    const chosen = formatId
        ? realFormats.find((f) => f.id === formatId || f.quality === formatId)
        : realFormats[0];
    if (!chosen) throw new Error(`Format "${formatId}" not found`);

    const { buffer, contentType } = await fetchStreamBuffer(chosen.downloadUrl);
    return {
        buffer,
        contentType,
        filename: sanitizeFilename(media.title || chosen.id, chosen.ext || 'mp4')
    };
}

async function download(targetUrl, formatId = '', outPath = '') {
    _ck();
    const media = await resolve(targetUrl);
    const formats = Array.isArray(media.formats) ? media.formats : [];
    const slides = Array.isArray(media.slides) ? media.slides : [];

    if ((formatId === 'all-slides' || (!formats.length && slides.length)) && slides.length) {
        const zip = new AdmZip();
        let added = 0;
        for (let i = 0; i < slides.length; i++) {
            const s = slides[i];
            const src = s.url || s.previewUrl;
            if (!src) continue;
            try {
                const { buffer } = await fetchStreamBuffer(src);
                const ext = s.type === 'video' ? 'mp4' : 'jpg';
                zip.addFile(`slide_${String(i + 1).padStart(2, '0')}.${ext}`, buffer);
                added++;
            } catch (_) {}
        }
        if (!added) throw new Error('Failed to download any slides');
        const zipBuf = zip.toBuffer();
        const filename = sanitizeFilename(media.title || 'omdown_slides', 'zip');
        if (outPath) fs.writeFileSync(outPath, zipBuf);
        const directUrl = await uploadToDirectHost(zipBuf, filename);
        return {
            platform: media.platform,
            title: media.title,
            filename,
            size: zipBuf.length,
            savedTo: outPath || undefined,
            directUrl
        };
    }

    const realFormats = formats.filter((f) => f.downloadUrl && f.downloadUrl !== 'all-slides' && f.downloadUrl !== 'all-playlist');
    if (!realFormats.length) throw new Error('No downloadable formats found');

    const chosen = formatId
        ? realFormats.find((f) => f.id === formatId || f.quality === formatId)
        : realFormats[0];
    if (!chosen) throw new Error(`Format "${formatId}" not found`);

    const { buffer, contentType } = await fetchStreamBuffer(chosen.downloadUrl);
    const filename = sanitizeFilename(media.title || chosen.id, chosen.ext || 'mp4');
    if (outPath) fs.writeFileSync(outPath, buffer);
    const directUrl = await uploadToDirectHost(buffer, filename);

    return {
        platform: media.platform,
        title: media.title,
        format: { id: chosen.id, label: chosen.label, quality: chosen.quality, ext: chosen.ext },
        contentType,
        filename,
        size: buffer.length,
        savedTo: outPath || undefined,
        directUrl
    };
}

function printUsage() {
    console.log([
        'Usage:',
        ' node omdown.js resolve <url>',
        ' node omdown.js download <url> [formatId] [outFile]',
        ' node omdown.js stream <url> [formatId] [outFile]',
        ' node omdown.js stats',
        ' node omdown.js platforms'
    ].join('\n'));
}

async function main() {
    const start = Date.now();
    const [cmd, arg1, arg2, arg3] = process.argv.slice(2);
    if (!cmd || ['help', '-h', '--help'].includes(cmd)) {
        printUsage();
        return;
    }

    try {
        let result;
        if (cmd === 'platforms') {
            result = listPlatforms();
        } else if (cmd === 'stats') {
            result = await getStats();
        } else if (cmd === 'resolve' || cmd === 'info') {
            if (!arg1) { printUsage(); return; }
            result = await resolve(arg1);
        } else if (cmd === 'download' || cmd === 'dl') {
            if (!arg1) { printUsage(); return; }
            result = await download(arg1, arg2 || '', arg3 || '');
        } else if (cmd === 'stream') {
            if (!arg1) { printUsage(); return; }
            const { buffer, contentType, filename } = await streamFile(arg1, arg2 || '');
            const out = arg3 || filename;
            fs.writeFileSync(out, buffer);
            result = { filename: out, size: buffer.length, contentType };
        } else {
            printUsage();
            return;
        }
        console.log(JSON.stringify({
            Creator: CREATOR,
            Saluran: SALURAN,
            time: `${Date.now() - start}ms`,
            status: true,
            result
        }, null, 2));
    } catch (err) {
        console.log(JSON.stringify({
            Creator: CREATOR,
            Saluran: SALURAN,
            time: `${Date.now() - start}ms`,
            status: false,
            error: err.message || String(err)
        }, null, 2));
        process.exitCode = 1;
    }
}

module.exports = {
    PLATFORMS,
    getStats,
    listPlatforms,
    resolve,
    resolveCached,
    download,
    streamFile
};

if (require.main === module) {
    main();
}
