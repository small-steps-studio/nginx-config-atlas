'use strict';

// Whitespace as /\s/ sees it, by char code (the tokenizer runs once per character, so no regex per character).
function isSpace(ch) {
  return ch === 32 || (ch >= 9 && ch <= 13) || ch === 160 || ch === 0x1680 || (ch >= 0x2000 && ch <= 0x200a) || ch === 0x2028 || ch === 0x2029 || ch === 0x202f || ch === 0x205f || ch === 0x3000 || ch === 0xfeff;
}
function tokenize(text) {
  const out = []; let i = 0, line = 1; const s = String(text == null ? '' : text).replace(/^\uFEFF/, ''); const n = s.length;
  while (i < n) {
    const ch = s.charCodeAt(i);
    if (ch === 10) { line++; i++; continue; }
    if (isSpace(ch)) { i++; continue; }
    if (ch === 35) { const e = s.indexOf('\n', i); i = e < 0 ? n : e; continue; }                         // '#': comment to the end of the line
    if (ch === 59 || ch === 123 || ch === 125) { out.push({ t: s[i], line }); i++; continue; }           // ; { }
    const start = line;
    if (ch === 34 || ch === 39) {                                                                         // quoted string
      const q = s[i]; i++; const parts = []; let from = i;
      while (i < n && s[i] !== q) {
        if (s[i] === '\\' && i + 1 < n) { parts.push(s.slice(from, i), s[i + 1]); if (s[i + 1] === '\n') line++; i += 2; from = i; continue; }
        if (s[i] === '\n') line++; i++;
      }
      parts.push(s.slice(from, i)); i++; out.push({ w: parts.join(''), line: start }); continue;
    }
    const from = i;                                                                                       // plain word
    while (i < n) {
      const c2 = s.charCodeAt(i);
      if (isSpace(c2) || c2 === 59 || c2 === 125) break;
      if (c2 === 123) {                                                                                   // '{' ends the word unless it follows '$' (${var})
        if (i === from || s.charCodeAt(i - 1) !== 36) break;
        while (i < n && s[i] !== '}' && s[i] !== '\n') i++;
        if (s[i] === '}') i++;
        continue;
      }
      i++;
    }
    out.push({ w: s.slice(from, i), line: start });
  }
  return out;
}

function parseConfig(text) {
  const toks = tokenize(text); const root = []; const stack = [{ block: root }]; const errors = []; let cur = null;
  const top = () => stack[stack.length - 1];
  const flushMissing = () => { if (cur) { errors.push({ line: cur.line, message: "missing ';' after '" + cur.name + "'" }); top().block.push({ name: cur.name, args: cur.args, line: cur.line }); cur = null; } };
  for (const k of toks) {
    if (k.w !== undefined) { if (!cur) cur = { name: k.w, args: [], line: k.line }; else cur.args.push(k.w); continue; }
    if (k.t === ';') { if (cur) { top().block.push({ name: cur.name, args: cur.args, line: cur.line }); cur = null; } continue; }
    if (k.t === '{') { const d = cur ? { name: cur.name, args: cur.args, line: cur.line, block: [] } : { name: '', args: [], line: k.line, block: [] }; top().block.push(d); stack.push(d); cur = null; continue; }
    if (k.t === '}') { flushMissing(); if (stack.length === 1) errors.push({ line: k.line, message: "unexpected '}'" }); else stack.pop(); }
  }
  flushMissing();
  while (stack.length > 1) { const d = stack.pop(); errors.push({ line: d.line, message: "missing '}' for block '" + d.name + "' opened on line " + d.line }); }
  return { directives: root, errors };
}

function parseListen(args) {
  const list = Array.isArray(args) ? args.map(String) : [];
  const a = list[0] || ''; const rest = list.slice(1);
  let address = '', port = 80, m;
  if (a.startsWith('unix:')) { address = a; port = 0; } else if (/^\d+$/.test(a)) port = +a; else if ((m = /^(.*):(\d+)$/.exec(a))) { address = m[1]; port = +m[2]; } else address = a;
  return { address, port, ssl: rest.includes('ssl'), http2: rest.includes('http2'), defaultServer: rest.includes('default_server') || rest.includes('default') };
}

// Depth-first, file order, without recursion (a file may nest blocks deeper than the call stack).
function walk(list, fn, parents) {
  const stack = [{ list: list || [], i: 0, parents: parents || [] }];
  while (stack.length) {
    const f = stack[stack.length - 1];
    if (f.i >= f.list.length) { stack.pop(); continue; }
    const d = f.list[f.i++];
    fn(d, f.parents);
    // past 100 levels the ancestor list stops growing (real configurations nest a few levels; this keeps hostile files linear)
    if (d.block) stack.push({ list: d.block, i: 0, parents: f.parents.length < 100 ? f.parents.concat([d]) : f.parents });
  }
}
function listDirectives(text, name) { const out = []; walk(parseConfig(text).directives, (d) => { if (d.name === name) out.push({ line: d.line, args: d.args }); }); return out; }

const escMd = (s) => String(s).replace(/[\r\n]+/g, ' ').replace(/([\\`*_{}\[\]()#+!|<>~&$])/g, '\\$1')
  .split('://').join('\\:\\/\\/').replace(/(^|[^A-Za-z0-9])www\./gi, (m, pre) => pre + m.slice(pre.length, pre.length + 3) + '\\.');
function escapeCell(str) {
  if (str === null || str === undefined) return '-';
  const s = String(str);
  if (s === '') return '-';
  return escMd(s);
}

function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural;
}

function countDirectives(dirs) {
  let count = 0;
  for (const d of dirs) {
    count++;
    if (d.block) {
      count += countDirectives(d.block);
    }
  }
  return count;
}

function findServerBlocks(dirs) {
  const result = [];
  for (const d of dirs) {
    if (d.name === 'server' && d.block) {
      result.push(d);
    }
    if (d.block) {
      result.push(...findServerBlocks(d.block));
    }
  }
  return result;
}

function findLocations(dirs) {
  const result = [];
  for (const d of dirs) {
    if (d.name === 'location') {
      result.push(d);
    }
    if (d.block) {
      result.push(...findLocations(d.block));
    }
  }
  return result;
}

function findUpstreams(dirs) {
  const result = [];
  for (const d of dirs) {
    if (d.name === 'upstream' && d.block) {
      result.push(d);
    }
    if (d.block) {
      result.push(...findUpstreams(d.block));
    }
  }
  return result;
}

function getEffectiveValue(dirs, name, defaultValue) {
  for (let i = dirs.length - 1; i >= 0; i--) {
    const d = dirs[i];
    if (d.name === name) {
      return d.args[0];
    }
  }
  return defaultValue;
}

function getEffectiveAddHeaders(dirs) {
  for (let i = dirs.length - 1; i >= 0; i--) {
    const d = dirs[i];
    if (d.name === 'add_header') {
      return d.args;
    }
  }
  return [];
}

function getEffectiveProxySetHeaders(dirs) {
  for (let i = dirs.length - 1; i >= 0; i--) {
    const d = dirs[i];
    if (d.name === 'proxy_set_header') {
      return d.args;
    }
  }
  return [];
}

// True when the file holds no directive at all (empty, whitespace or comments only).
function noDirectives(text, orErrors) { const p = parseConfig(text); let n = 0; walk(p.directives, () => n++); return n === 0 && (!orErrors || p.errors.length === 0); }

function reportSummary(text) {
  try {
    if (noDirectives(text)) {
      return '# Nginx Config Summary\n\nThe file contains no directives.';
    }

    const { directives, errors } = parseConfig(text);
    const totalDirectives = countDirectives(directives);
    const serverBlocks = findServerBlocks(directives);
    const locations = findLocations(directives);
    const upstreams = findUpstreams(directives);

    const ports = new Set();
    const listenDirs = listDirectives(text, 'listen');
    for (const l of listenDirs) {
      const info = parseListen(l.args);
      if (info.port > 0) {
        ports.add(info.port);
      }
    }
    const portList = Array.from(ports).sort((a, b) => a - b).join(', ');
    const listeningLine = portList ? `Listening on: ${portList}.` : 'Listening on: none.';

    const includeArgs = [];
    const includeDirs = listDirectives(text, 'include');
    for (const inc of includeDirs) {
      includeArgs.push(...inc.args);
    }
    const includesLine = includeArgs.length > 0 ? `Includes: ${includeArgs.map(escMd).join(', ')}.` : 'No include directives.';

    const errorCount = errors.length;
    const errorLine = `${errorCount} syntax ${pluralize(errorCount, 'problem', 'problems')}.`;

    return [
      '# Nginx Config Summary',
      '',
      `${totalDirectives} ${pluralize(totalDirectives, 'directive', 'directives')}, ${serverBlocks.length} server ${pluralize(serverBlocks.length, 'block', 'blocks')}, ` +
        `${locations.length} ${pluralize(locations.length, 'location', 'locations')}, ${upstreams.length} ${pluralize(upstreams.length, 'upstream', 'upstreams')}.`,
      '',
      listeningLine,
      '',
      includesLine,
      '',
      errorLine
    ].join('\n');
  } catch (e) {
    return '# Nginx Config Summary\n\nAn error occurred while generating the summary.';
  }
}

function reportSyntax(text) {
  try {
    if (noDirectives(text, true)) {
      return '# Syntax Check\n\nThe file contains no directives.';
    }

    const { errors } = parseConfig(text);

    if (errors.length === 0) {
      return '# Syntax Check\n\nNo syntax problems found.';
    }

    const sorted = errors.slice().sort((a, b) => a.line - b.line);
    const lines = [
      '# Syntax Check',
      '',
      `${errors.length} syntax ${pluralize(errors.length, 'problem', 'problems')}.`,
      '',
      '| Line | Problem |',
      '| ---: | --- |'
    ];

    for (const err of sorted) {
      lines.push(`| ${err.line} | ${escapeCell(err.message)} |`);
    }

    return lines.join('\n');
  } catch (e) {
    return '# Syntax Check\n\nAn error occurred while checking syntax.';
  }
}

function reportServers(text) {
  try {
    if (noDirectives(text)) {
      return '# Server Blocks\n\nThe file contains no directives.';
    }

    const { directives } = parseConfig(text);
    const serverBlocks = findServerBlocks(directives);
    if (!serverBlocks.length) return '# Server Blocks\n\n0 server blocks.';

    const lines = [
      '# Server Blocks',
      '',
      `${serverBlocks.length} server ${pluralize(serverBlocks.length, 'block', 'blocks')}.`,
      '',
      '| Line | Listen | Server names | Root | TLS | Locations |',
      '| ---: | --- | --- | --- | --- | ---: |'
    ];

    for (const server of serverBlocks) {
      const listenArgs = [];
      const serverNameArgs = [];
      let root = '';
      let hasSsl = false;
      let hasSslOn = false;

      for (const d of server.block) {
        if (d.name === 'listen') {
          listenArgs.push(d.args.join(' '));
          const info = parseListen(d.args);
          if (info.ssl) hasSsl = true;
        } else if (d.name === 'server_name') {
          serverNameArgs.push(d.args.join(' '));
        } else if (d.name === 'root') {
          root = d.args[0];
        } else if (d.name === 'ssl') {
          if (d.args[0] === 'on') hasSslOn = true;
        }
      }

      const listenStr = listenArgs.length > 0 ? listenArgs.join(', ') : '';
      const serverNamesStr = serverNameArgs.length > 0 ? serverNameArgs.join(' ') : '';
      const rootStr = root || '';
      const tlsStr = (hasSsl || hasSslOn) ? 'yes' : 'no';
      const locCount = findLocations(server.block).length;

      lines.push(`| ${server.line} | ${escapeCell(listenStr)} | ${escapeCell(serverNamesStr)} | ${escapeCell(rootStr)} | ${tlsStr} | ${locCount} |`);
    }

    return lines.join('\n');
  } catch (e) {
    return '# Server Blocks\n\nAn error occurred while listing server blocks.';
  }
}

// Security and proxy reports: nginx inheritance (a level inherits add_header / proxy_set_header only when it has none of its own)
// and settings that may come from nginx.conf or included files.
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
const cell = (s) => { s = String(s == null ? '' : s); return s === '' ? '-' : escMd(s); };
function load(text, title) { const p = parseConfig(text); let n = 0; walk(p.directives, () => n++); return n ? { p, n } : { md: '# ' + title + '\n\nThe file contains no directives.' }; }
const isServer = (d, parents) => d.name === 'server' && d.block && !parents.some((x) => x.name === 'upstream');
function servers(dirs) { const out = []; walk(dirs, (d, ps) => { if (isServer(d, ps)) out.push({ d, ps }); }); return out; }
// A block's own directives by name, indexed once per block (an http block may hold thousands of servers; scanning it for
// every server and location would be quadratic).
const OWN = new WeakMap();
function own(d, name) {
  if (!d.block) return [];
  let ix = OWN.get(d);
  if (!ix) { ix = new Map(); for (const x of d.block) { if (!ix.has(x.name)) ix.set(x.name, []); ix.get(x.name).push(x); } OWN.set(d, ix); }
  return ix.get(name) || [];
}
function effective(levels, name) { for (let i = levels.length - 1; i >= 0; i--) { const o = own(levels[i], name); if (o.length) return o; } return []; }
// Files included at these levels (from the server block inwards): settings in them are not visible in this file.
function includesIn(levels) { const out = []; levels.forEach((l) => own(l, 'include').forEach((x) => out.push(...x.args))); return out; }
const tls = (s) => own(s, 'listen').some((l) => parseListen(l.args).ssl) || own(s, 'ssl').some((x) => x.args[0] === 'on');

function reportSecurity(text) {
  const L = load(text, 'Security Review'); if (L.md) return L.md; const f = [];
  servers(L.p.directives).forEach(({ d, ps }) => {
    const lv = ps.concat([d]); const st = effective(lv, 'server_tokens');
    if (!st.length) f.push([d.line, 'server_tokens', ps.some((x) => x.name === 'http')
      ? 'server_tokens is not set, so the nginx default (on) applies: the nginx version is shown in headers and error pages'
      : 'server_tokens is not set to off in this file (the nginx default is on): unless nginx.conf turns it off, the nginx version is shown in headers and error pages']);
    else if (st[st.length - 1].args[0] !== 'off') f.push([d.line, 'server_tokens', 'server_tokens is on: the nginx version is shown in headers and error pages']);
    if (tls(d) && !effective(lv, 'add_header').some((h) => String(h.args[0]).toLowerCase() === 'strict-transport-security')) {
      const inc = includesIn([d]);
      f.push([d.line, 'hsts', inc.length ? 'TLS server without a Strict-Transport-Security header in this file; it includes ' + inc.join(', ') + ', which is not checked'
        : 'TLS server without a Strict-Transport-Security header']);
    }
  });
  walk(L.p.directives, (d, ps) => {
    if (d.name === 'ssl_protocols') d.args.filter((a) => ['SSLv2', 'SSLv3', 'TLSv1', 'TLSv1.1'].includes(a)).forEach((a) => f.push([d.line, 'ssl_protocols', 'outdated protocol ' + a + ' is enabled']));
    if (d.name === 'autoindex' && d.args[0] === 'on') f.push([d.line, 'autoindex', 'directory listing is enabled']);
    if (d.name === 'location' && own(d, 'add_header').length && ps.some((x) => (x.name === 'server' || x.name === 'http') && own(x, 'add_header').length))
      f.push([d.line, 'add_header', 'location ' + d.args.join(' ') + ' has its own add_header, so add_header directives from outer levels are not sent for it']);
  });
  if (!f.length) return '# Security Review\n\nNo findings.';
  f.sort((a, b) => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));
  return '# Security Review\n\n' + plural(f.length, 'finding') + '.\n\n| Line | Check | Finding |\n| ---: | --- | --- |\n' + f.map((x) => '| ' + x[0] + ' | ' + x[1] + ' | ' + cell(x[2]) + ' |').join('\n');
}

function reportProxy(text) {
  const L = load(text, 'Proxy and Upstreams'); if (L.md) return L.md; const ups = [], locs = [];
  walk(L.p.directives, (d, ps) => { if (d.name === 'upstream' && d.block) ups.push(d); if (d.name === 'location' && own(d, 'proxy_pass').length) locs.push({ d, ps }); });
  let md = '# Proxy and Upstreams\n\n## Upstreams\n\n' + (ups.length ? '| Upstream | Servers | Members |\n| --- | ---: | --- |\n' +
    ups.map((u) => { const m = own(u, 'server'); return '| ' + cell(u.args.join(' ')) + ' | ' + m.length + ' | ' + cell(m.map((x) => x.args.join(' ')).join(', ')) + ' |'; }).join('\n') : 'No upstream blocks.');
  md += '\n\n## Proxied locations\n\n';
  if (!locs.length) return md + 'No proxied locations.';
  let k = 0, u = 0;
  md += '| Line | Location | Target | Host header | X-Forwarded-For |\n| ---: | --- | --- | --- | --- |\n' + locs.map(({ d, ps }) => {
    const levels = ps.concat([d]);
    const hs = effective(levels, 'proxy_set_header').map((h) => String(h.args[0]).toLowerCase());
    // Only includes that can still change the effective set matter: those from the innermost level that has its own
    // proxy_set_header (outer levels are then not inherited) inwards; with none at all, those from the server block inwards.
    const srv = Math.max(0, levels.findIndex((x) => x.name === 'server'));
    let from = srv; for (let i = levels.length - 1; i >= srv; i--) if (own(levels[i], 'proxy_set_header').length) { from = i; break; }
    const inc = includesIn(levels.slice(from));
    const val = (has) => (has ? 'yes' : inc.length ? 'not in this file' : 'no');
    const host = hs.includes('host'), xff = hs.includes('x-forwarded-for');
    if (!host) { if (inc.length) u++; else k++; }
    return '| ' + d.line + ' | ' + cell(d.args.join(' ')) + ' | ' + cell(own(d, 'proxy_pass')[0].args[0]) + ' | ' + val(host) + ' | ' + val(xff) + ' |'; }).join('\n');
  md += '\n\n' + (k === 1 ? '1 proxied location does not set the Host header.' : k + ' proxied locations do not set the Host header.');
  if (u) md += '\n\n' + (u === 1 ? '1 proxied location takes its headers from included files, which are not checked.' : u + ' proxied locations take their headers from included files, which are not checked.');
  return md;
}

module.exports = {
  parseConfig,
  parseListen,
  listDirectives,
  reportSummary,
  reportSyntax,
  reportServers,
  reportSecurity,
  reportProxy
};
