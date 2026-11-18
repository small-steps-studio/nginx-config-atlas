'use strict';
// Contract tests: written from the specification examples. Do not edit; fix src/core.js instead.
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../src/core');

const plain = (v) => JSON.parse(JSON.stringify(v === undefined ? null : v));

test('core exports every specified function', () => {
  for (const n of ["parseConfig", "parseListen", "listDirectives", "reportSummary", "reportSyntax", "reportServers", "reportSecurity", "reportProxy"]) assert.equal(typeof core[n], 'function', n);
});

test("parseConfig example 1", () => {
  assert.deepStrictEqual(plain(core.parseConfig("events { worker_connections 1024; }\nhttp {\n  server {\n    listen 80; # web\n    server_name example.com 'www.example.com';\n  }\n}")), {"directives": [{"name": "events", "args": [], "line": 1, "block": [{"name": "worker_connections", "args": ["1024"], "line": 1}]}, {"name": "http", "args": [], "line": 2, "block": [{"name": "server", "args": [], "line": 3, "block": [{"name": "listen", "args": ["80"], "line": 4}, {"name": "server_name", "args": ["example.com", "www.example.com"], "line": 5}]}]}], "errors": []});
});

test("parseConfig example 2", () => {
  assert.deepStrictEqual(plain(core.parseConfig("http {\n  server {\n    listen 80\n  }\n")), {"directives": [{"name": "http", "args": [], "line": 1, "block": [{"name": "server", "args": [], "line": 2, "block": [{"name": "listen", "args": ["80"], "line": 3}]}]}], "errors": [{"line": 3, "message": "missing ';' after 'listen'"}, {"line": 1, "message": "missing '}' for block 'http' opened on line 1"}]});
});

test("parseConfig example 3", () => {
  assert.deepStrictEqual(plain(core.parseConfig("}")), {"directives": [], "errors": [{"line": 1, "message": "unexpected '}'"}]});
});

test("parseListen example 1", () => {
  assert.deepStrictEqual(plain(core.parseListen(["80"])), {"address": "", "port": 80, "ssl": false, "http2": false, "defaultServer": false});
});

test("parseListen example 2", () => {
  assert.deepStrictEqual(plain(core.parseListen(["443", "ssl", "http2"])), {"address": "", "port": 443, "ssl": true, "http2": true, "defaultServer": false});
});

test("parseListen example 3", () => {
  assert.deepStrictEqual(plain(core.parseListen(["[::]:8080", "default_server"])), {"address": "[::]", "port": 8080, "ssl": false, "http2": false, "defaultServer": true});
});

test("parseListen example 4", () => {
  assert.deepStrictEqual(plain(core.parseListen(["unix:/run/app.sock"])), {"address": "unix:/run/app.sock", "port": 0, "ssl": false, "http2": false, "defaultServer": false});
});

test("listDirectives example 1", () => {
  assert.deepStrictEqual(plain(core.listDirectives("user nginx;\nworker_processes auto;\nevents { worker_connections 1024; }\nhttp {\n    include mime.types;\n    server_tokens on;\n    add_header X-Content-Type-Options nosniff;\n    upstream app {\n        server 10.0.0.5:8080;\n        server 10.0.0.6:8080 backup;\n    }\n    server {\n        listen 80;\n        server_name example.com;\n        return 301 https://$host$request_uri;\n    }\n    server {\n        listen 443 ssl http2;\n        server_name example.com www.example.com;\n        root /var/www/html;\n        ssl_protocols TLSv1 TLSv1.2;\n        location / {\n            try_files $uri $uri/ =404;\n        }\n        location /api/ {\n            proxy_pass http://app;\n            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n            add_header Cache-Control no-store;\n        }\n        location /files/ {\n            autoindex on;\n        }\n    }\n}\n", "listen")), [{"line": 13, "args": ["80"]}, {"line": 18, "args": ["443", "ssl", "http2"]}]);
});

test("listDirectives example 2", () => {
  assert.deepStrictEqual(plain(core.listDirectives("user nginx;\nworker_processes auto;\nevents { worker_connections 1024; }\nhttp {\n    include mime.types;\n    server_tokens on;\n    add_header X-Content-Type-Options nosniff;\n    upstream app {\n        server 10.0.0.5:8080;\n        server 10.0.0.6:8080 backup;\n    }\n    server {\n        listen 80;\n        server_name example.com;\n        return 301 https://$host$request_uri;\n    }\n    server {\n        listen 443 ssl http2;\n        server_name example.com www.example.com;\n        root /var/www/html;\n        ssl_protocols TLSv1 TLSv1.2;\n        location / {\n            try_files $uri $uri/ =404;\n        }\n        location /api/ {\n            proxy_pass http://app;\n            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n            add_header Cache-Control no-store;\n        }\n        location /files/ {\n            autoindex on;\n        }\n    }\n}\n", "gzip")), []);
});

test("reportSummary example 1", () => {
  const md = core.reportSummary("user nginx;\nworker_processes auto;\nevents { worker_connections 1024; }\nhttp {\n    include mime.types;\n    server_tokens on;\n    add_header X-Content-Type-Options nosniff;\n    upstream app {\n        server 10.0.0.5:8080;\n        server 10.0.0.6:8080 backup;\n    }\n    server {\n        listen 80;\n        server_name example.com;\n        return 301 https://$host$request_uri;\n    }\n    server {\n        listen 443 ssl http2;\n        server_name example.com www.example.com;\n        root /var/www/html;\n        ssl_protocols TLSv1 TLSv1.2;\n        location / {\n            try_files $uri $uri/ =404;\n        }\n        location /api/ {\n            proxy_pass http://app;\n            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n            add_header Cache-Control no-store;\n        }\n        location /files/ {\n            autoindex on;\n        }\n    }\n}\n");
  assert.equal(typeof md, 'string');
  for (const s of ["# Nginx Config Summary", "28 directives, 2 server blocks, 3 locations, 1 upstream.", "Listening on: 80, 443.", "Includes: mime.types.", "0 syntax problems."]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportSummary example 2", () => {
  const md = core.reportSummary("   \n");
  assert.equal(typeof md, 'string');
  for (const s of ["# Nginx Config Summary", "The file contains no directives."]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportSyntax example 1", () => {
  const md = core.reportSyntax("http {\n  server {\n    listen 80\n  }\n");
  assert.equal(typeof md, 'string');
  for (const s of ["# Syntax Check", "2 syntax problems.", "| 1 | missing '\\}' for block 'http' opened on line 1 |", "| 3 | missing ';' after 'listen' |"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportSyntax example 2", () => {
  const md = core.reportSyntax("user nginx;\nworker_processes auto;\nevents { worker_connections 1024; }\nhttp {\n    include mime.types;\n    server_tokens on;\n    add_header X-Content-Type-Options nosniff;\n    upstream app {\n        server 10.0.0.5:8080;\n        server 10.0.0.6:8080 backup;\n    }\n    server {\n        listen 80;\n        server_name example.com;\n        return 301 https://$host$request_uri;\n    }\n    server {\n        listen 443 ssl http2;\n        server_name example.com www.example.com;\n        root /var/www/html;\n        ssl_protocols TLSv1 TLSv1.2;\n        location / {\n            try_files $uri $uri/ =404;\n        }\n        location /api/ {\n            proxy_pass http://app;\n            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n            add_header Cache-Control no-store;\n        }\n        location /files/ {\n            autoindex on;\n        }\n    }\n}\n");
  assert.equal(typeof md, 'string');
  for (const s of ["# Syntax Check", "No syntax problems found."]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportServers example 1", () => {
  const md = core.reportServers("user nginx;\nworker_processes auto;\nevents { worker_connections 1024; }\nhttp {\n    include mime.types;\n    server_tokens on;\n    add_header X-Content-Type-Options nosniff;\n    upstream app {\n        server 10.0.0.5:8080;\n        server 10.0.0.6:8080 backup;\n    }\n    server {\n        listen 80;\n        server_name example.com;\n        return 301 https://$host$request_uri;\n    }\n    server {\n        listen 443 ssl http2;\n        server_name example.com www.example.com;\n        root /var/www/html;\n        ssl_protocols TLSv1 TLSv1.2;\n        location / {\n            try_files $uri $uri/ =404;\n        }\n        location /api/ {\n            proxy_pass http://app;\n            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n            add_header Cache-Control no-store;\n        }\n        location /files/ {\n            autoindex on;\n        }\n    }\n}\n");
  assert.equal(typeof md, 'string');
  for (const s of ["# Server Blocks", "2 server blocks.", "| 12 | 80 | example.com | - | no | 0 |", "| 17 | 443 ssl http2 | example.com www\\.example.com | /var/www/html | yes | 3 |"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportServers example 2", () => {
  const md = core.reportServers("");
  assert.equal(typeof md, 'string');
  for (const s of ["# Server Blocks", "The file contains no directives."]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportSecurity example 1", () => {
  const md = core.reportSecurity("user nginx;\nworker_processes auto;\nevents { worker_connections 1024; }\nhttp {\n    include mime.types;\n    server_tokens on;\n    add_header X-Content-Type-Options nosniff;\n    upstream app {\n        server 10.0.0.5:8080;\n        server 10.0.0.6:8080 backup;\n    }\n    server {\n        listen 80;\n        server_name example.com;\n        return 301 https://$host$request_uri;\n    }\n    server {\n        listen 443 ssl http2;\n        server_name example.com www.example.com;\n        root /var/www/html;\n        ssl_protocols TLSv1 TLSv1.2;\n        location / {\n            try_files $uri $uri/ =404;\n        }\n        location /api/ {\n            proxy_pass http://app;\n            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n            add_header Cache-Control no-store;\n        }\n        location /files/ {\n            autoindex on;\n        }\n    }\n}\n");
  assert.equal(typeof md, 'string');
  for (const s of ["# Security Review", "6 findings.", "| 12 | server_tokens | server\\_tokens is on: the nginx version is shown in headers and error pages |", "| 17 | hsts | TLS server without a Strict-Transport-Security header |", "| 21 | ssl_protocols | outdated protocol TLSv1 is enabled |", "| 25 | add_header | location /api/ has its own add\\_header, so add\\_header directives from outer levels are not sent for it |", "| 31 | autoindex | directory listing is enabled |"]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportSecurity example 2", () => {
  const md = core.reportSecurity("");
  assert.equal(typeof md, 'string');
  for (const s of ["# Security Review", "The file contains no directives."]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportProxy example 1", () => {
  const md = core.reportProxy("user nginx;\nworker_processes auto;\nevents { worker_connections 1024; }\nhttp {\n    include mime.types;\n    server_tokens on;\n    add_header X-Content-Type-Options nosniff;\n    upstream app {\n        server 10.0.0.5:8080;\n        server 10.0.0.6:8080 backup;\n    }\n    server {\n        listen 80;\n        server_name example.com;\n        return 301 https://$host$request_uri;\n    }\n    server {\n        listen 443 ssl http2;\n        server_name example.com www.example.com;\n        root /var/www/html;\n        ssl_protocols TLSv1 TLSv1.2;\n        location / {\n            try_files $uri $uri/ =404;\n        }\n        location /api/ {\n            proxy_pass http://app;\n            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n            add_header Cache-Control no-store;\n        }\n        location /files/ {\n            autoindex on;\n        }\n    }\n}\n");
  assert.equal(typeof md, 'string');
  for (const s of ["# Proxy and Upstreams", "| app | 2 | 10.0.0.5:8080, 10.0.0.6:8080 backup |", "| 25 | /api/ | http\\:\\/\\/app | no | yes |", "1 proxied location does not set the Host header."]) assert.ok(md.includes(s), 'missing: ' + s);
});

test("reportProxy example 2", () => {
  const md = core.reportProxy("");
  assert.equal(typeof md, 'string');
  for (const s of ["# Proxy and Upstreams", "The file contains no directives."]) assert.ok(md.includes(s), 'missing: ' + s);
});
