from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial
import json,base64,argparse
ROOT=Path(__file__).resolve().parent
class Handler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path!='/qa-report' or self.headers.get('X-Office-QA')!='dev001':
            self.send_error(404);return
        origin=self.headers.get('Origin','')
        if origin not in {'http://127.0.0.1:8781','http://localhost:8781'}:
            self.send_error(403);return
        size=int(self.headers.get('Content-Length','0'))
        if size>3000000:
            self.send_error(413);return
        try:
            data=json.loads(self.rfile.read(size))
            for species,asset in data.pop('assets',{}).items():
                if species not in {'bullfrog','treefrog','capybara','lunamoth','octopus'}:raise ValueError('species')
                png=base64.b64decode(asset['png'].split(',',1)[1],validate=True)
                if not png.startswith(b'\x89PNG\r\n\x1a\n'):raise ValueError('png')
                (ROOT/'assets'/f'{species}-atlas.png').write_bytes(png)
                (ROOT/'assets'/f'{species}-frames.json').write_text(json.dumps(asset['frames'],indent=2),encoding='utf-8')
            world=base64.b64decode(data.pop('world').split(',',1)[1],validate=True)
            if not world.startswith(b'\x89PNG\r\n\x1a\n'):raise ValueError('world')
            width=int(data['viewport']['width']);height=int(data['viewport']['height'])
            (ROOT/'qa'/f'world-{width}x{height}.png').write_bytes(world)
            (ROOT/'qa'/f'browser-{width}x{height}.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
        except (ValueError,KeyError,TypeError):
            self.send_error(400);return
        self.send_response(200);self.end_headers();self.wfile.write(b'OK')
    def end_headers(self):
        self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');super().end_headers()
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8781);args=parser.parse_args()
    print(f'Office DEV 001: http://127.0.0.1:{args.port}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),partial(Handler,directory=str(ROOT))).serve_forever()
