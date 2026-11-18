'use strict';
// Hostile and odd nginx configurations for the adversarial test (invented; the payloads must come out as plain escaped text).
const PAY = ['x|y', '<b>y</b>', '[link](https://evil.test)', '![t](https://evil.test/p.png)', '<img src=https://evil.test/i.png>', '`code`', '*b*', '_i_', '<script>alert(1)</script>', '$x$', 'www.evil.test', 'https://evil.test/a?b=c', '\|'];
const cases = [];
PAY.forEach((p, i) => {
  const q = JSON.stringify(p);
  cases.push({ name: 'payload ' + i, text: 'http {\n  include ' + q + ';\n  upstream ' + q + ' { server ' + q + ' ' + q + '; }\n  server {\n    listen ' + q + ' ssl;\n    server_name ' + q + ';\n    root ' + q + ';\n' +
    '    ssl_protocols TLSv1;\n    location ' + q + ' { proxy_pass ' + q + '; add_header ' + q + ' ' + q + '; autoindex on; }\n  }\n  ' + q + ' ' + q + '\n}\n' });
});
cases.push({ name: 'prototype names', text: 'constructor { __proto__ on; toString; }\nserver { listen hasOwnProperty; server_name valueOf; location __proto__ { proxy_pass constructor; } }\nupstream __proto__ { server constructor; }\n' });
cases.push({ name: 'deep nesting', text: 'location /a {'.repeat(20000) + 'return 200;' + '}'.repeat(20000) });
cases.push({ name: 'unclosed quote', text: 'server { listen 80; add_header X "never closed;\n}\n'.repeat(3) });
cases.push({ name: 'only braces', text: '{'.repeat(5000) + '}'.repeat(4000) + ';;;' });
cases.push({ name: 'huge word', text: 'server_name ' + 'a'.repeat(200000) + ';' });
cases.push({ name: 'dollar braces open', text: 'root ${' + 'x'.repeat(1000) + '\nserver { listen 80; }' });
module.exports = { cases };
