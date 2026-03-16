// server.js
import http from 'http';

const server = http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('Hello, Node.js Server!');
});

server.listen(3000, () => {
    console.log('서버 실행 중 → http://localhost:3000');
});
