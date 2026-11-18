'use strict';
// Builds an nginx configuration text of about `bytes` characters for the large-file test (invented servers).
function make(bytes) {
  const parts = ['http {\n    server_tokens off;\n    upstream app { server 10.0.0.1:8080; server 10.0.0.2:8080; }\n']; let size = parts[0].length, i = 0;
  while (size < bytes) {
    const s = '    server {\n        listen ' + (i % 2 ? '443 ssl' : '80') + ';\n        server_name site' + i + '.example.test;\n        root /var/www/site' + (i % 50) + ';\n' +
      '        location / { try_files $uri $uri/ =404; }\n        location /api/ { proxy_set_header Host $host; proxy_pass http://app; }\n        # ' + 'x'.repeat(120) + '\n    }\n';
    parts.push(s); size += s.length; i++;
  }
  parts.push('}\n');
  return parts.join('');
}
module.exports = { make };
