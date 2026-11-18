# Reports

Every report reads the text of the active editor and opens its result as a new Markdown document. Your file is never changed and nothing is sent anywhere. The examples below come from the sample file (Open Sample File).

## Show Summary

Command: **Nginx Config Atlas: Show Summary**

Counts the directives (at any depth), server blocks, locations and upstreams, lists the ports the listen directives use, lists the files named by include directives, and gives the number of syntax problems found. The server lines inside an upstream block are members of the upstream, not server blocks.

Example (sample file):

> # Nginx Config Summary
>
> 44 directives, 3 server blocks, 6 locations, 2 upstreams.
>
> Listening on: 80, 443, 8080.
>
> Includes: mime.types.
>
> 0 syntax problems.

## Show Syntax Check

Command: **Nginx Config Atlas: Show Syntax Check**

Reads the file as nginx does and lists every syntax problem with its line: a directive that is not ended by a semicolon, a closing brace with no open block, and a block that is still open at the end of the file (with the line where it was opened). Comments start with # at the beginning of a word; quoted strings may hold semicolons, braces and # signs.

Example (sample file):

> # Syntax Check
>
> No syntax problems found.

## Show Server Blocks

Command: **Nginx Config Atlas: Show Server Blocks**

Lists every server block in file order with its line, its listen directives, its server names, its root, whether it serves TLS (a listen with ssl, or ssl on) and how many locations it contains at any depth.

Example (sample file):

> # Server Blocks
>
> 3 server blocks.
>
> | Line | Listen | Server names | Root | TLS | Locations |
> | ---: | --- | --- | --- | --- | ---: |
> | 24 | 80 | shop.example.test www\.shop.example.test | - | no | 0 |
> | 30 | 443 ssl http2 | shop.example.test | /var/www/shop | yes | 5 |
> | 64 | 8080 | admin.shop.example.test | - | no | 1 |

## Show Security Review (Pro)

Command: **Nginx Config Atlas: Show Security Review** (Pro; part of the 14-day trial)

Checks each server block for server_tokens (shown when it is on, and when the file leaves it to the nginx default), each ssl_protocols directive for SSLv2, SSLv3, TLSv1 and TLSv1.1, each TLS server for a Strict-Transport-Security header, each autoindex on, and each location whose own add_header stops the add_header directives of its server and http blocks. When a server includes other files, a header that may be set there is reported as not found in this file rather than as missing.

Example (sample file):

> # Security Review
>
> 6 findings.
>
> | Line | Check | Finding |
> | ---: | --- | --- |
> | 24 | server_tokens | server\_tokens is not set, so the nginx default \(on\) applies: the nginx version is shown in headers and error pages |
> | 30 | hsts | TLS server without a Strict-Transport-Security header |
> | 38 | ssl_protocols | outdated protocol TLSv1.1 is enabled |
> | 55 | autoindex | directory listing is enabled |
> | 58 | add_header | location /assets/ has its own add\_header, so add\_header directives from outer levels are not sent for it |
> | 64 | server_tokens | server\_tokens is not set, so the nginx default \(on\) applies: the nginx version is shown in headers and error pages |

## Show Proxy And Upstreams (Pro)

Command: **Nginx Config Atlas: Show Proxy And Upstreams** (Pro; part of the 14-day trial)

Lists every upstream block with its members, and every location with proxy_pass with its target and whether the proxy_set_header directives that apply to it (with nginx's inheritance) set Host and X-Forwarded-For. A location without a Host header sends the upstream's address instead of the name the client asked for, a common cause of wrong redirects and broken virtual hosts. When the headers may come from an included file such as proxy_params, the report says so instead of answering no.

Example (sample file):

> # Proxy and Upstreams
>
> ## Upstreams
>
> | Upstream | Servers | Members |
> | --- | ---: | --- |
> | shop\_app | 3 | 10.0.0.21:3000, 10.0.0.22:3000, 10.0.0.23:3000 backup |
> | search | 1 | 10.0.0.31:9200 |
>
> ## Proxied locations
>
> | Line | Location | Target | Host header | X-Forwarded-For |
> | ---: | --- | --- | --- | --- |
> | 44 | /api/ | http\:\/\/shop\_app | yes | yes |
> | 50 | /search/ | http\:\/\/search | no | no |
> | 67 | / | http\:\/\/127.0.0.1:9000 | no | no |
>
> 2 proxied locations do not set the Host header.
