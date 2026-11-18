'use strict';
// The sample files of the Open Sample commands. All data is invented for this product; it names no real company, person or system.

const SAMPLES = {
 "openSample": {
  "title": "Open Sample File",
  "fileName": "shop.nginx.conf",
  "languageId": "plaintext",
  "text": "# Invented example configuration for a small web shop.\nuser www-data;\nworker_processes auto;\n\nevents {\n    worker_connections 1024;\n}\n\nhttp {\n    include mime.types;\n    sendfile on;\n    add_header X-Content-Type-Options nosniff;\n\n    upstream shop_app {\n        server 10.0.0.21:3000;\n        server 10.0.0.22:3000;\n        server 10.0.0.23:3000 backup;\n    }\n\n    upstream search {\n        server 10.0.0.31:9200;\n    }\n\n    server {\n        listen 80;\n        server_name shop.example.test www.shop.example.test;\n        return 301 https://$host$request_uri;\n    }\n\n    server {\n        listen 443 ssl http2;\n        server_name shop.example.test;\n        root /var/www/shop;\n        server_tokens off;\n\n        ssl_certificate /etc/ssl/certs/shop.pem;\n        ssl_certificate_key /etc/ssl/private/shop.key;\n        ssl_protocols TLSv1.1 TLSv1.2 TLSv1.3;\n\n        location / {\n            try_files $uri $uri/ /index.html;\n        }\n\n        location /api/ {\n            proxy_set_header Host $host;\n            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n            proxy_pass http://shop_app;\n        }\n\n        location /search/ {\n            proxy_pass http://search;\n        }\n\n        location /downloads/ {\n            autoindex on;\n        }\n\n        location /assets/ {\n            add_header Cache-Control \"public, max-age=604800\";\n            expires 7d;\n        }\n    }\n\n    server {\n        listen 8080;\n        server_name admin.shop.example.test;\n        location / {\n            proxy_pass http://127.0.0.1:9000;\n        }\n    }\n}\n"
 }
};

/** The sample with the given id, or null. */
function sampleFor(id) { return SAMPLES[id] || null; }

module.exports = { sampleFor: sampleFor, SAMPLE_IDS: Object.keys(SAMPLES) };
