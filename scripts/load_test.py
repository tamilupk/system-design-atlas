#!/usr/bin/env python3
"""One-file Python 3.9+ standard-library HTTP capacity finder.

  python3 load_test.py
  python3 load_test.py --start-users 1000 --max-users 32000 --resolution 50
  python3 load_test.py --json capacity.json
  python3 load_test.py --fixed --users 1000 --duration 15
  python3 load_test.py --mode browser --start-users 10 --max-users 100
  python3 load_test.py --inspect

Default target: http://192.168.1.251:30080/
Default stress workload: asyncio, one continuously requesting keep-alive HTTP/1.1
connection per virtual user, no reading pauses, no client cache. Every user cycles
through all discovered assets and home HTML. 1,000 users means up to 1,000
simultaneous HTTP requests, not 1,000 mostly idle human readers. --connections
multiplies that concurrency. This measures sustained HTTP load, not human users.

Search: 1,000 -> 2,000 -> 4,000 ... until failure or --max-users (32,000).
Once bracketed, bisect the highest passing / lowest failing counts until the gap
is <= --resolution (50). If the first stage fails, halve until a pass is found.
No requests are issued at zero users. Each stage has a 3s ramp, 3s warmup, and
2 x 10s measurement windows. Both must pass or fail; mixed/undersampled results
stop as INCONCLUSIVE. A 3s cooldown separates stages. Ctrl-C saves partial results.
Assumed request budgets: p50 <= 200ms, p95 <= 500ms, p99 <= 1000ms, 0% errors.
Override with --p50-ms / --p95-ms / --p99-ms / --max-error-rate.

Windows use all completed samples in a 1ms histogram rounded up; minimum 100
samples. Requests begun before a window are excluded from its completion stats.
A window also fails when >1% of completed-plus-pending requests are still pending
past the p99 budget. Warmup/ramp errors are reported but excluded from decisions.
Network errors, non-2xx responses, truncated bodies and invalid asset MIME types
count as errors. No hidden retries, external-origin requests or cache-busting.

The stress engine uses asynchronous sockets, not one OS thread per user. It
raises this process's soft file-descriptor limit within its existing hard limit
where supported. Descriptor/port exhaustion and excessive event-loop lag are
reported as generator limits, not server limits. Generator CPU (cores), event-loop
lag, throughput and actual in-flight requests appear in the dashboard. Run on a
separate machine; network or client CPU can become the bottleneck before nginx.
A maximum passing stage is a lower bound. A bracket is workload-specific and
assumes capacity is approximately monotonic; it is not an exact human-user limit.

--mode browser retains the recorded Chromium journeys for this deployment,
including per-session asset caching and default 1-3s reading pauses. --mode sweep
uses the earlier cold asset tour with pauses. These two modes use threads and
are intended for smaller visitor counts. Explicit --think-min/--think-max override
pauses in browser/sweep. Stress always has zero pauses and no client cache.
--fixed performs a single duration test, without capacity inference.
--rps and --returning only apply to --fixed browser/sweep.

gzip supported; no Brotli, rendering or HTTP/2. Bytes are encoded body bytes,
not total wire bytes. Discovery is excluded from measurements. Latency measures
connection/TLS through body download, excluding queue/rate-limit wait. Live
stage percentiles use the last 20,000 requests; decisions use full windows.
Exit: 0 no failure reached, 1 failure bracket found, 2 inconclusive, 130 interrupted.
"""
import argparse
import asyncio
import base64
from collections import Counter, deque
from concurrent.futures import ThreadPoolExecutor
import gzip
import errno
from html.parser import HTMLParser
import http.client
import json
import math
import os
import random
import re
import signal
import shutil
import ssl
import sys
import threading
import time
from urllib.parse import urljoin, urlsplit, urlunsplit
import zlib

DEFAULT_URL = 'http://192.168.1.251:30080/'
# Real Chromium cold-navigation resource sets; compressed only to keep one file small.
RECORDED = 'eJzt3Ftv2yAUAOD/kucRq6nWpntb4jbtmqVp1ps2TROGE4fGBgbktmn/fTjtpiZqG1eLhyqdxwgI4fDZGAP5WYtq777UImotOBsJyWFO5vu0ObrcUfVbW3uzlhbLo+45TNM6sw8Tj1UOfZoCaR8wNU3S89WyFjJgThlL4nw2GE/fdlfTdUYXJOZafMy/N1eT/n7zQN+SeUebtZozlSoSJ/2DQXoq6naaPkhLhRtNEpJTMyatA9i/GBzxupbLLEM6FUzJZYmvRRHDRuAWGmw0MRmxI2UcSDBbCU8XrFVy2YyYD66yWUxWS18YykENhxc0yXyepmRqqNxzeRYnp7PdHmk9WlNbSQdzR1rjmx0Heb90tDd11IOGtLnVZ992zrbUHythHPfPGififHe18k8OdFvlWkmQzpLW7lhfNa4nz2aKk8Zeby+9XvuVd9W0b7qzGU/In8SyJiLrK7GRge8TYSAvKtoKE99tDLS7Cy98TpPO4YenLrQnLofNHdRT7khNJF/m+ZGl3bjX4Wt5ygWxFMjHI73N66Ji8sFAv1Aj1YJw6ihKRIlhJSbUt0RIQIkoMaxEwUlafKROKIkckWNYjoz6ZGSIDMMytIz64TlFiAgxLETjHxNpIjLhFogRMYbF6O5Dha9ykGLw+yKjGhkiw//HkI2ow6WOl7nfSj/Gh82GYzfH21/q2NDbuIiBt5zqqZZDiGsXCDAoQFyyQIBBASrDweBLOQQYCqCfcyopfQtQIAoMIlAbsODZEE8RhMbpCEoMJBEXyNBfSH8j5YhRKidDKtUER2R0GGhSou+3TuFQjARDTUusyETxWIgEkWAQgrgxAAWGvgnifgDUV70+dqfDRrlvcBGy6t5Kv79Mb5XpVLQ1oATz0OcUy5jaBOdfzjo+h+dJF34olJayYkpAM+Knpomaow20Udio6HADYniNGIrNHMWaOlkWQxWoQi+DRjlJaEb95+38sQKiePUoBAdfmwPJKjgEgiReC4lfvwEjMkiT'


class HTMLAssets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.assets = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('script', 'img', 'source', 'video', 'audio') and attrs.get('src'):
            self.assets.add(attrs['src'])
        if tag == 'link' and set(attrs.get('rel', '').split()) & {
                'stylesheet', 'modulepreload', 'preload', 'icon'} and attrs.get('href'):
            self.assets.add(attrs['href'])


def path_of(url):
    parts = urlsplit(url)
    return urlunsplit(('', '', parts.path or '/', parts.query, ''))


class Client:
    """One connection per worker thread; full bodies read before reuse."""
    def __init__(self, base, timeout):
        self.base = base
        self.parts = urlsplit(base)
        self.timeout = timeout
        self.context = ssl.create_default_context() if self.parts.scheme == 'https' else None
        self.local = threading.local()
        self.connections = []
        self.lock = threading.Lock()

    def get(self, path, capture=False):
        conn = getattr(self.local, 'connection', None)
        if conn is None:
            cls = http.client.HTTPSConnection if self.parts.scheme == 'https' else http.client.HTTPConnection
            options = {'timeout': self.timeout}
            if self.parts.scheme == 'https':
                options['context'] = self.context
            conn = cls(self.parts.hostname, self.parts.port, **options)
            self.local.connection = conn
            with self.lock:
                self.connections.append(conn)
        deadline = time.monotonic() + self.timeout
        try:
            conn.request('GET', path, headers={
                'User-Agent': 'AtlasLoadTest/1.0 (Python stdlib; browser-resource replay)',
                'Accept': '*/*', 'Accept-Encoding': 'gzip',
                'Referer': self.base, 'Connection': 'keep-alive',
            })
            response = conn.getresponse()
            headers = dict((key.lower(), value) for key, value in response.getheaders())
            size, chunks = 0, []
            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise TimeoutError('response body deadline exceeded')
                if conn.sock:
                    conn.sock.settimeout(remaining)
                chunk = response.read1(65536)
                if not chunk:
                    break
                size += len(chunk)
                if capture:
                    if size > 16 * 1024 * 1024:
                        raise ValueError('discovery response exceeds 16 MiB')
                    chunks.append(chunk)
            if response.length not in (None, 0):
                raise http.client.IncompleteRead(b'', response.length)
            response.close()
            if conn.sock:
                conn.sock.settimeout(self.timeout)
            return response.status, headers, size, b''.join(chunks)
        except Exception:
            conn.close()
            raise  # No hidden retries: failed requests must remain visible.

    def close(self):
        for conn in self.connections:
            conn.close()


def is_success(path, status, headers):
    if not 200 <= status < 300:
        return False
    # Many SPA hosts return their HTML fallback with status 200 for missing chunks.
    kind = headers.get('content-type', '').lower()
    suffix = urlsplit(path).path.rsplit('.', 1)[-1].lower()
    if suffix in ('js', 'mjs'):
        return 'javascript' in kind or 'ecmascript' in kind
    if suffix == 'css':
        return 'text/css' in kind
    if suffix in ('svg', 'png', 'jpg', 'jpeg', 'webp', 'ico', 'woff', 'woff2'):
        return 'text/html' not in kind
    return True


def discover(base, timeout):
    """Vite-specific asset scan, not a general JavaScript interpreter."""
    client = Client(base, timeout)
    seen, pending, total = {}, deque(['/']), 0
    origin = urlsplit(base)
    external = set()
    try:
        while pending:
            path = pending.popleft()
            if path in seen:
                continue
            if len(seen) >= 1000:
                raise ValueError('discovery limit reached (1,000 resources)')
            status, headers, size, body = client.get(path, capture=True)
            if not is_success(path, status, headers):
                raise ValueError('discovery failed: {} status={} type={}'.format(
                    path, status, headers.get('content-type', '?')))
            seen[path] = {'bytes': size, 'type': headers.get('content-type', '')}
            total += size
            if headers.get('content-encoding') == 'gzip':
                body = gzip.decompress(body)
            text = body.decode('utf-8', errors='replace')
            refs = set()
            if path == '/':
                parser = HTMLAssets()
                parser.feed(text)
                refs.update(parser.assets)
            elif urlsplit(path).path.endswith(('.js', '.mjs')):
                # Includes static/dynamic imports and Vite's assets/... mapDeps table.
                refs.update(re.findall(
                    r'''["']((?:\./|\.\./|/assets/|assets/)[^"'\s<>]+?\.(?:js|mjs|css|svg|png|jpg|jpeg|webp|ico|woff2?)(?:\?[^"'\s]*)?)["']''', text))
            elif urlsplit(path).path.endswith('.css'):
                refs.update(match[1] for match in re.findall(
                    r'''url\(\s*(["']?)([^\s)"']+)\1\s*\)''', text))
                refs.update(re.findall(r'''@import\s+["']([^"']+)["']''', text))
            for ref in sorted(refs):
                if ref.startswith(('data:', 'blob:', '#')):
                    continue
                # Vite dependency table paths are relative to the deployment root.
                url = urljoin(base if ref.startswith('assets/') else urljoin(base, path), ref)
                parts = urlsplit(url)
                if (parts.scheme, parts.netloc) != (origin.scheme, origin.netloc):
                    external.add(url)
                    continue
                candidate = path_of(url)
                if candidate not in seen:
                    pending.append(candidate)
    finally:
        client.close()
    return seen, total, external


class Metrics:
    def __init__(self):
        self.lock = threading.Lock()
        self.active = self.inflight = self.peak = self.requests = self.errors = 0
        self.sessions = self.visits = self.cached = self.bytes = 0
        self.latency_sum = 0.0
        self.latencies = deque(maxlen=20000)
        self.statuses, self.failures, self.paths = Counter(), Counter(), Counter()
        self.pending = {}
        self.generator_errors = 0
        self.loop_lag_ms = 0.0
        self.window_loop_lags = []
        self.window_start = None
        self.window_histogram = Counter()
        self.window_errors = self.window_bytes = 0

    def begin(self, started, key=None):
        with self.lock:
            self.inflight += 1
            self.peak = max(self.peak, self.inflight)
            self.pending[threading.get_ident() if key is None else key] = started

    def reset_window(self):
        with self.lock:
            self.window_start = time.monotonic()
            self.window_histogram.clear()
            self.window_loop_lags.clear()
            self.window_errors = self.window_bytes = 0
            return self.window_start

    def window(self, budgets):
        with self.lock:
            now = time.monotonic()
            # Include old pending requests in stall detection, even if their
            # eventual completions are excluded from this window's histogram.
            overdue = sum((now - begin) * 1000 > budgets.p99_ms
                          for begin in self.pending.values())
            count = sum(self.window_histogram.values())
            return {
                'requests': count, 'errors': self.window_errors,
                'error_pct': 100 * self.window_errors / max(1, count),
                'p50_ms': histogram_percentile(self.window_histogram, .5),
                'p95_ms': histogram_percentile(self.window_histogram, .95),
                'p99_ms': histogram_percentile(self.window_histogram, .99),
                'overdue_requests': overdue,
                'pending_requests': len(self.pending),
                'loop_lag_p95_ms': percentile(sorted(self.window_loop_lags), .95),
                'bytes': self.window_bytes,
                'seconds': now - self.window_start if self.window_start is not None else 0,
            }


    def change(self, **values):
        with self.lock:
            for name, value in values.items():
                setattr(self, name, getattr(self, name) + value)
            self.peak = max(self.peak, self.inflight)

    def record(self, path, status, size, elapsed, error, key=None):
        with self.lock:
            started = self.pending.pop(threading.get_ident() if key is None else key, None)
            self.inflight -= 1
            self.requests += 1
            self.bytes += size
            self.latency_sum += elapsed
            self.latencies.append(elapsed * 1000)
            if status == 'GENERATOR':
                self.generator_errors += 1
            if self.window_start is not None and started is not None and started >= self.window_start:
                self.window_histogram[math.ceil(elapsed * 1000)] += 1
                self.window_errors += bool(error)
                self.window_bytes += size
            self.statuses[str(status)] += 1
            self.paths[path] += 1
            if error:
                self.errors += 1
                self.failures[error] += 1

    def snapshot(self):
        with self.lock:
            return {name: (value.copy() if isinstance(value, Counter) else
                           list(value) if isinstance(value, deque) else value)
                    for name, value in vars(self).items()
                    if name not in ('lock', 'pending', 'window_histogram', 'window_loop_lags')}


class Limiter:
    def __init__(self, rps, stop):
        self.interval = 1 / rps if rps else 0
        self.next = 0.0
        self.lock, self.stop = threading.Lock(), stop

    def wait(self):
        with self.lock:
            now = time.monotonic()
            slot = max(now, self.next)
            self.next = slot + self.interval
        return not self.stop.wait(max(0, slot - now))


def user_loop(number, args, profiles, inventory, metrics, stop, limiter, started):
    delay = args.ramp * number / max(1, args.users - 1) if args.users > 1 else 0
    if stop.wait(max(0, started + delay - time.monotonic())):
        return
    client = Client(args.url, args.timeout)
    cache = set()
    rng = random.Random(number + time.time_ns())
    metrics.change(active=1)

    def fetch(path):
        if stop.is_set() or not limiter.wait():
            return None
        begin = time.monotonic()
        metrics.begin(begin)
        status, size, error = 'EXC', 0, None
        try:
            status, headers, size, _ = client.get(path)
            if not is_success(path, status, headers):
                error = '{} {} ({})'.format(status, path, headers.get('content-type', '?'))
        except Exception as exc:
            local_errnos = {errno.EMFILE, errno.ENFILE, errno.ENOMEM, errno.ENOBUFS,
                            errno.EAGAIN, errno.EADDRNOTAVAIL}
            if isinstance(exc, RuntimeError) or getattr(exc, 'errno', None) in local_errnos:
                status = 'GENERATOR'
            error = '{}: {}'.format(type(exc).__name__, str(exc)[:120])
        metrics.record(path, status, size, time.monotonic() - begin, error)
        return path if error is None else None

    try:
        with ThreadPoolExecutor(max_workers=args.connections) as pool:
            while not stop.is_set():
                if not args.returning:
                    cache.clear()
                if args.mode == 'sweep':
                    entry = '/'
                    assets = sorted(set(inventory) - {'/'})
                    rng.shuffle(assets)
                    batches = [assets[i:i + args.connections] for i in range(0, len(assets), args.connections)]
                else:
                    chapters = sorted({p.split('/')[2] for p in profiles if p.startswith('/archetypes/')})
                    chapter = rng.choice(chapters)
                    overview = '/archetypes/' + chapter
                    journey = ['/', overview] + [p for p in profiles if p.startswith(overview + '/steps/')]
                    concepts = [p for p in profiles if p.startswith('/concepts/')]
                    if concepts:
                        journey.append(rng.choice(concepts))
                    if rng.random() < .25:
                        journey = journey[rng.randrange(len(journey)):]
                    entry = journey[0]
                    batches = [profiles[p] for p in journey]
                # Only the landing navigation requests an HTML document.
                if pool.submit(fetch, entry).result() is None:
                    stop.wait(1)
                    continue
                completed = True
                for batch in batches:
                    if stop.is_set():
                        completed = False
                        break
                    needed = list(dict.fromkeys(p for p in batch if p not in cache))
                    metrics.change(cached=len(set(batch)) - len(needed), visits=1)
                    for result in pool.map(fetch, needed):
                        if result:
                            cache.add(result)
                        else:
                            completed = False
                    if stop.wait(rng.uniform(args.think_min, args.think_max)):
                        completed = False
                        break
                if completed:
                    metrics.change(sessions=1)
    finally:
        client.close()
        metrics.change(active=-1)



class AsyncHTTP:
    """Minimal streaming HTTP/1.1 GET client, one request per connection at a time."""
    def __init__(self, target, context):
        self.target, self.context = target, context
        self.reader = self.writer = None

    async def close(self):
        writer, self.writer = self.writer, None
        self.reader = None
        if writer is not None:
            writer.close()
            try:
                await asyncio.wait_for(writer.wait_closed(), 1)
            except Exception:
                pass

    async def get(self, path):
        if self.writer is None or self.writer.is_closing() or self.reader.at_eof():
            await self.close()
            self.reader, self.writer = await asyncio.open_connection(
                self.target.hostname, self.target.port or (443 if self.context else 80),
                ssl=self.context, limit=65536)
        request = ('GET {} HTTP/1.1\r\nHost: {}\r\n'
                   'User-Agent: AtlasLoadTest/2.0\r\nAccept: */*\r\n'
                   'Accept-Encoding: gzip\r\nConnection: keep-alive\r\n\r\n').format(
                       path, self.target.netloc).encode('ascii')
        self.writer.write(request)
        await self.writer.drain()
        for _ in range(6):
            raw = await self.reader.readuntil(b'\r\n\r\n')
            lines = raw.decode('iso-8859-1').split('\r\n')
            version, code, *_ = lines[0].split()
            status = int(code)
            if version not in ('HTTP/1.0', 'HTTP/1.1'):
                raise ValueError('Invalid HTTP version')
            headers = {}
            for line in lines[1:]:
                if line:
                    name, value = line.split(':', 1)
                    name = name.strip().lower()
                    if name == 'content-length' and name in headers and headers[name] != value.strip():
                        raise ValueError('Conflicting Content-Length headers')
                    headers[name] = value.strip()
            if status >= 200:
                break
            if status == 101:
                raise ValueError('Unexpected protocol upgrade')
        else:
            raise ValueError('Too many interim responses')
        size = 0
        close = headers.get('connection', '').lower() == 'close' or version == 'HTTP/1.0'

        async def consume(length):
            nonlocal size
            while length:
                chunk = await self.reader.read(min(65536, length))
                if not chunk:
                    raise EOFError('Truncated HTTP response body')
                length -= len(chunk)
                size += len(chunk)

        if status in (204, 304):
            pass
        elif 'transfer-encoding' in headers:
            if headers['transfer-encoding'].lower() != 'chunked':
                raise ValueError('Unsupported Transfer-Encoding')
            while True:
                line = await self.reader.readuntil(b'\r\n')
                length = int(line.split(b';', 1)[0].strip(), 16)
                if length < 0:
                    raise ValueError('Negative chunk length')
                if not length:
                    trailer_size = 0
                    while True:
                        trailer = await self.reader.readuntil(b'\r\n')
                        trailer_size += len(trailer)
                        if trailer_size > 65536:
                            raise ValueError('Oversized HTTP trailers')
                        if trailer == b'\r\n':
                            break
                    break
                await consume(length)
                if await self.reader.readexactly(2) != b'\r\n':
                    raise ValueError('Invalid chunk terminator')
        elif 'content-length' in headers:
            length = int(headers['content-length'])
            if length < 0:
                raise ValueError('Negative Content-Length')
            await consume(length)
        else:
            close = True
            while True:
                chunk = await self.reader.read(65536)
                if not chunk:
                    break
                size += len(chunk)
        if close:
            await self.close()
        return status, headers, size


async def stress_loop(args, inventory, metrics, stop, started):
    target = urlsplit(args.url)
    context = ssl.create_default_context() if target.scheme == 'https' else None
    paths = sorted(inventory)
    local_errnos = {errno.EMFILE, errno.ENFILE, errno.ENOMEM, errno.ENOBUFS,
                    errno.EAGAIN, errno.EADDRNOTAVAIL}

    async def lane(user, connection):
        delay = args.ramp * user / max(1, args.users - 1)
        await asyncio.sleep(max(0, started + delay - time.monotonic()))
        if stop.is_set():
            return
        if connection == 0:
            metrics.change(active=1)
        client = AsyncHTTP(target, context)
        key = (user, connection)
        offset = (user * args.connections + connection) % len(paths)
        try:
            while not stop.is_set():
                path = paths[offset]
                offset = (offset + 1) % len(paths)
                begin = time.monotonic()
                metrics.begin(begin, key)
                status, size, error = 'EXC', 0, None
                try:
                    status, headers, size = await asyncio.wait_for(client.get(path), args.timeout)
                    if not is_success(path, status, headers):
                        error = '{} {} ({})'.format(status, path, headers.get('content-type', '?'))
                except Exception as exc:
                    if isinstance(exc, (MemoryError, RuntimeError)) or getattr(exc, 'errno', None) in local_errnos:
                        status = 'GENERATOR'
                    error = '{}: {}'.format(type(exc).__name__, str(exc)[:120])
                    await client.close()
                metrics.record(path, status, size, time.monotonic() - begin, error, key)
                if status == 'GENERATOR':
                    return
                # Yield fairly even when responses are already buffered.
                # This is scheduler fairness, not a reading pause or RPS limit.
                await asyncio.sleep(.01 if error else 0)
        finally:
            await client.close()
            if connection == 0:
                metrics.change(active=-1)

    async def monitor():
        while not stop.is_set():
            due = time.monotonic() + .1
            await asyncio.sleep(.1)
            lag = max(0, time.monotonic() - due) * 1000
            with metrics.lock:
                metrics.loop_lag_ms = lag
                if metrics.window_start is not None:
                    metrics.window_loop_lags.append(lag)

    monitor_task = asyncio.create_task(monitor())
    tasks = [asyncio.create_task(lane(user, connection))
             for user in range(args.users) for connection in range(args.connections)]
    try:
        await asyncio.gather(*tasks)
    finally:
        stop.set()
        monitor_task.cancel()
        await asyncio.gather(monitor_task, return_exceptions=True)
        for task in tasks:
            if not task.done():
                task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


def ensure_descriptors(users, connections):
    """Only adjust this process's soft limit, never a system-wide setting."""
    try:
        import resource
    except ImportError:
        return
    soft, hard = resource.getrlimit(resource.RLIMIT_NOFILE)
    needed = users * connections + 128
    if soft == resource.RLIM_INFINITY or soft >= needed:
        return
    if hard != resource.RLIM_INFINITY and hard < needed:
        raise RuntimeError('Generator needs {} file descriptors; hard limit is {}. '
                           'Raise your shell limit or use another load generator.'.format(needed, hard))
    try:
        resource.setrlimit(resource.RLIMIT_NOFILE, (needed, hard))
    except (OSError, ValueError) as exc:
        raise RuntimeError('Cannot raise generator file-descriptor limit to {}: {}'.format(needed, exc))


def next_user_count(current, passed, failed, maximum, resolution):
    """Exponential bracketing, then bisection. None means search is done."""
    if failed is None:
        return min(maximum, current * 2) if current < maximum else None
    if passed is None:
        return max(1, failed // 2) if failed > 1 else None
    if failed - passed <= resolution:
        return None
    return (passed + failed) // 2

def percentile(values, pct):
    return values[max(0, math.ceil(len(values) * pct) - 1)] if values else 0


def histogram_percentile(histogram, pct):
    rank = math.ceil(sum(histogram.values()) * pct)
    cumulative = 0
    for milliseconds, count in sorted(histogram.items()):
        cumulative += count
        if cumulative >= rank:
            return milliseconds
    return 0


def evaluate_window(window, args):
    """Pure decision function, shared by output and capacity control."""
    reasons = []
    if window['overdue_requests'] > .01 * (window['requests'] + window['pending_requests']):
        reasons.append('{} pending requests older than p99 budget (>1% of observed requests)'.format(window['overdue_requests']))
    if window['errors'] and args.max_error_rate == 0:
        reasons.append('{} request errors; budget allows none'.format(window['errors']))
    if window['requests'] < args.min_samples:
        # No statistical pass or latency inference from a tiny sample.
        # Active stalls can nevertheless conclusively fail the window.
        return ('FAIL', reasons) if reasons else ('INSUFFICIENT', [
            '{} samples; need {}'.format(window['requests'], args.min_samples)])
    for key in ('p50_ms', 'p95_ms', 'p99_ms'):
        if window[key] > getattr(args, key):
            reasons.append('{} {} > {} ms'.format(key[:-3], window[key], getattr(args, key)))
    if args.max_error_rate > 0 and window['error_pct'] > args.max_error_rate:
        reasons.append('errors {:.2f}% > {:.2f}%'.format(window['error_pct'], args.max_error_rate))
    return ('FAIL', reasons) if reasons else ('PASS', [])


class Dashboard:
    def __init__(self, color):
        self.color = color
        self.lines_shown = 0

    def paint(self, text, code):
        return '\033[{}m{}\033[0m'.format(code, text) if self.color else text

    def draw(self, lines):
        if sys.stdout.isatty():
            width = max(20, shutil.get_terminal_size((100, 24)).columns - 1)
            if self.lines_shown:
                sys.stdout.write('\033[{}A'.format(self.lines_shown))
            for line in lines:
                plain = re.sub(r'\x1b\[[0-9;]*m', '', line)
                fitted = line if len(plain) <= width else plain[:width - 1] + '…'
                sys.stdout.write('\033[2K' + fitted + '\n')
            sys.stdout.flush()
            self.lines_shown = len(lines)
        else:
            print(' | '.join(lines), flush=True)

    def log(self, text):
        self.lines_shown = 0
        print(text, flush=True)


def run_stage(args, profiles, inventory, dashboard, interrupted):
    metrics, stop = Metrics(), threading.Event()
    limiter = Limiter(args.rps, stop)
    started, cpu_started = time.monotonic(), time.process_time()
    previous_time, previous_requests = started, 0
    last_display = -math.inf
    windows, worker_errors = [], []
    window_start = ready_at = None
    consecutive_failures = 0
    phase, verdict = 'RAMP / WARMUP', 'INCONCLUSIVE'
    reason = 'Measurement did not finish'
    executor = ThreadPoolExecutor(max_workers=1 if args.mode == 'stress' else args.users)
    futures = []
    try:
        try:
            if args.mode == 'stress':
                ensure_descriptors(args.users, args.connections)
                futures.append(executor.submit(asyncio.run, stress_loop(args, inventory, metrics, stop, started)))
            else:
                for i in range(args.users):
                    futures.append(executor.submit(user_loop, i, args, profiles, inventory,
                                                   metrics, stop, limiter, started))
        except Exception as exc:
            worker_errors.append(repr(exc))
        while not stop.is_set():
            now = time.monotonic()
            snapshot = metrics.snapshot()
            if interrupted.is_set():
                verdict, reason = 'INTERRUPTED', 'Stopped by user'
                break
            if worker_errors or snapshot['generator_errors'] or any(f.done() for f in futures):
                reason = 'Load generator could not maintain the requested users; not a server capacity result'
                break
            if args.fixed:
                phase = 'FIXED LOAD'
                if now - started >= args.duration:
                    verdict = 'FAIL' if snapshot['errors'] else 'PASS'
                    reason = 'Fixed duration completed (latency budgets not evaluated)'
                    break
            else:
                if ready_at is None and snapshot['active'] == args.users:
                    ready_at = now
                if ready_at is None and now - started > args.ramp + args.timeout + 10:
                    reason = 'Requested active user count not reached'
                    break
                if ready_at is not None and window_start is None and now - ready_at >= args.warmup:
                    window_start = metrics.reset_window()
                    phase = 'MEASURE {}/{}'.format(len(windows) + 1, args.windows)
                if window_start is not None and now - window_start >= args.window:
                    measured = metrics.window(args)
                    measured['status'], measured['reasons'] = evaluate_window(measured, args)
                    if args.mode == 'stress' and measured['loop_lag_p95_ms'] > args.max_loop_lag_ms:
                        measured['status'] = 'GENERATOR_LIMIT'
                        measured['reasons'] = ['Generator event-loop p95 lag {:.1f} ms exceeds {:.1f} ms'.format(
                            measured['loop_lag_p95_ms'], args.max_loop_lag_ms)]
                    windows.append(measured)
                    dashboard.log(dashboard.paint(
                        '  Window {}: {} | {} requests | p50/p95/p99 {}/{}/{} ms | errors {:.2f}%{}'.format(
                            len(windows), measured['status'], measured['requests'], measured['p50_ms'],
                            measured['p95_ms'], measured['p99_ms'], measured['error_pct'],
                            ' | ' + '; '.join(measured['reasons']) if measured['reasons'] else ''),
                        '32' if measured['status'] == 'PASS' else '33'))
                    consecutive_failures = consecutive_failures + 1 if measured['status'] == 'FAIL' else 0
                    if consecutive_failures >= args.fail_windows:
                        verdict, reason = 'FAIL', 'Sustained threshold breach: ' + '; '.join(measured['reasons'])
                        break
                    if measured['status'] == 'GENERATOR_LIMIT':
                        reason = '; '.join(measured['reasons']) + '; not a server limit'
                        break
                    if measured['status'] == 'INSUFFICIENT':
                        reason = 'Too few samples; increase --window or reduce --min-samples'
                        break
                    if len(windows) >= args.windows:
                        if all(w['status'] == 'PASS' for w in windows):
                            verdict, reason = 'PASS', 'Every measurement window passed'
                        else:
                            reason = 'Mixed windows; no stable pass or sustained failure. Repeat this user count.'
                        break
                    window_start = metrics.reset_window()
                    phase = 'MEASURE {}/{}'.format(len(windows) + 1, args.windows)
            if now - last_display >= (1 if sys.stdout.isatty() else 5):
                live = metrics.window(args) if window_start is not None else None
                samples = sorted(snapshot['latencies'])
                latency = [live[key] for key in ('p50_ms', 'p95_ms', 'p99_ms')] if live else [
                    percentile(samples, pct) for pct in (.5, .95, .99)]
                rps = (snapshot['requests'] - previous_requests) / max(.001, now - previous_time)
                previous_time, previous_requests = now, snapshot['requests']
                dashboard.draw([
                    dashboard.paint('{} | {:.1f}s | target {} users'.format(phase, now - started, args.users), '1;36'),
                    'Active users: {} | HTTP in-flight: {} (peak {})'.format(
                        snapshot['active'], snapshot['inflight'], snapshot['peak']),
                    'Requests: {:,} | RPS: {:.1f} | Errors: {}'.format(snapshot['requests'], rps, snapshot['errors']),
                    'p50 / p95 / p99: {:.1f} / {:.1f} / {:.1f} ms{}'.format(*latency, ' [window]' if live else ' [overall]'),
                    'Downloaded: {:.1f} MiB | Client CPU: {:.2f} cores | Loop lag: {:.1f} ms'.format(
                        snapshot['bytes'] / 1048576, (time.process_time() - cpu_started) / max(.001, now - started),
                        snapshot['loop_lag_ms']),
                ])
                last_display = now
            interrupted.wait(.1)
    finally:
        stop.set()
        dashboard.log('Draining in-flight requests...')
        while not all(f.done() for f in futures):
            time.sleep(.1)
        executor.shutdown(wait=True)
        for future in futures:
            try:
                future.result()
            except Exception as exc:
                worker_errors.append(repr(exc))
    snapshot = metrics.snapshot()
    if worker_errors or snapshot['generator_errors']:
        verdict = 'INCONCLUSIVE'
        reason = 'Load generator failure; not a server capacity result'
    if interrupted.is_set():
        verdict, reason = 'INTERRUPTED', 'Stopped by user'
    elapsed = time.monotonic() - started
    samples = sorted(snapshot.pop('latencies'))
    snapshot.update(users=args.users, verdict=verdict, reason=reason, windows=windows,
                    elapsed_seconds=elapsed, mean_rps=snapshot['requests'] / max(.001, elapsed),
                    p50_ms=percentile(samples, .5), p95_ms=percentile(samples, .95),
                    p99_ms=percentile(samples, .99), percentile_sample_count=len(samples),
                    mean_latency_ms=snapshot['latency_sum'] * 1000 / max(1, snapshot['requests']),
                    generator_cpu_cores=(time.process_time() - cpu_started) / max(.001, elapsed),
                    worker_errors=worker_errors)
    dashboard.log(dashboard.paint('{} users: {} — {}'.format(args.users, verdict, reason),
                                  '32' if verdict == 'PASS' else '31' if verdict == 'FAIL' else '33'))
    dashboard.log('  {:,} requests | {:.1f} req/s incl. drain | peak {} in-flight | {:.1f} MiB | {} errors'.format(
        snapshot['requests'], snapshot['mean_rps'], snapshot['peak'], snapshot['bytes'] / 1048576, snapshot['errors']))
    for error, count in snapshot['failures'].most_common(5):
        dashboard.log('  {}x {}'.format(count, error))
    for error in worker_errors:
        dashboard.log('  Generator: ' + error)
    return snapshot


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--url', default=DEFAULT_URL)
    parser.add_argument('--users', '--start-users', dest='users', type=int, default=1000)
    parser.add_argument('--resolution', type=int, default=50, help='stop when failing-passing gap is <= this many users')
    parser.add_argument('--cooldown', type=float, default=3)
    parser.add_argument('--max-loop-lag-ms', type=float, default=100)
    parser.add_argument('--max-users', type=int, default=32000)
    parser.add_argument('--ramp', type=float, default=3, help='per-stage ramp seconds')
    parser.add_argument('--warmup', type=float, default=3)
    parser.add_argument('--window', type=float, default=10, help='seconds per measurement window')
    parser.add_argument('--windows', type=int, default=2, help='maximum windows per stage')
    parser.add_argument('--fail-windows', type=int, default=2, help='consecutive failing windows needed to stop')
    parser.add_argument('--min-samples', type=int, default=100, help='minimum requests per window')
    parser.add_argument('--p50-ms', type=float, default=200)
    parser.add_argument('--p95-ms', type=float, default=500)
    parser.add_argument('--p99-ms', type=float, default=1000)
    parser.add_argument('--max-error-rate', type=float, default=0, help='allowed percent errors (0 = none)')
    parser.add_argument('--fixed', action='store_true', help='original fixed-user test; no capacity search')
    parser.add_argument('--duration', type=float, default=60, help='--fixed only: seconds including ramp')
    parser.add_argument('--connections', type=int, default=1)
    parser.add_argument('--timeout', type=float, default=10)
    parser.add_argument('--think-min', type=float, default=1)
    parser.add_argument('--think-max', type=float, default=3)
    parser.add_argument('--rps', type=float, default=0, help='--fixed only: global request-start ceiling')
    parser.add_argument('--mode', choices=('stress', 'browser', 'sweep'), default='stress')
    parser.add_argument('--returning', action='store_true', help='--fixed only: retain cache across sessions')
    parser.add_argument('--inspect', action='store_true')
    parser.add_argument('--json', metavar='FILE')
    parser.add_argument('--no-color', action='store_true')
    args = parser.parse_args()
    numeric = [value for value in vars(args).values() if isinstance(value, (float, int))]
    if not all(math.isfinite(value) for value in numeric):
        parser.error('numeric options must be finite')
    if min(args.users, args.resolution, args.max_users, args.connections, args.min_samples,
           args.windows, args.fail_windows) < 1:
        parser.error('user counts, connections, sample counts and window counts must be positive')
    if min(args.duration, args.timeout, args.window, args.p50_ms, args.p95_ms, args.p99_ms, args.max_loop_lag_ms) <= 0:
        parser.error('duration, timeout, window and latency budgets must be positive')
    if not 0 <= args.think_min <= args.think_max or min(args.ramp, args.warmup, args.rps, args.cooldown) < 0:
        parser.error('invalid think times, ramp, warmup or RPS')
    if not args.p50_ms <= args.p95_ms <= args.p99_ms or not 0 <= args.max_error_rate <= 100:
        parser.error('require p50 <= p95 <= p99 and 0 <= max-error-rate <= 100')
    if args.fixed and args.ramp >= args.duration:
        parser.error('--fixed requires ramp < duration')
    if args.mode == 'stress' and (args.rps or args.returning):
        parser.error('--rps/--returning are only supported in --fixed browser/sweep mode')
    if not args.fixed:
        if args.max_users < args.users or args.fail_windows > args.windows:
            parser.error('require max-users >= start-users and fail-windows <= windows')
        if args.rps or args.returning:
            parser.error('--rps and --returning require --fixed; they can hide capacity saturation')
    target = urlsplit(args.url)
    if target.scheme not in ('http', 'https') or not target.hostname or target.username or target.password or target.query or target.fragment or target.path not in ('', '/'):
        parser.error('--url must be an HTTP(S) origin without credentials, subpath, query or fragment')
    args.url = args.url.rstrip('/') + '/'
    dashboard = Dashboard(sys.stdout.isatty() and not args.no_color and 'NO_COLOR' not in os.environ)
    interrupted = threading.Event()
    signal.signal(signal.SIGINT, lambda *_: interrupted.set())
    signal.signal(signal.SIGTERM, lambda *_: interrupted.set())
    dashboard.log(dashboard.paint('SYSTEM DESIGN ATLAS | ' + ('FIXED LOAD' if args.fixed else 'CAPACITY SEARCH'), '1;36'))
    dashboard.log('Target: ' + args.url)
    dashboard.log('Discovering current assets (excluded from measurements)...')
    inventory, size, external = discover(args.url, args.timeout)
    profiles = json.loads(zlib.decompress(base64.b64decode(RECORDED)))
    dashboard.log('{} resources, {:.2f} MiB; {} external references skipped.'.format(len(inventory), size / 1048576, len(external)))
    if interrupted.is_set():
        return 130
    if args.inspect:
        for path, info in inventory.items():
            print('{:>9,d}  {}'.format(info['bytes'], path))
        return 0
    if args.mode == 'browser':
        missing = set(path for paths in profiles.values() for path in paths) - set(inventory)
        if missing:
            raise ValueError('Deployment differs from recorded profiles ({} missing assets). Use --mode sweep.'.format(len(missing)))
    if args.mode == 'stress':
        args.think_min = args.think_max = 0
        dashboard.log('STRESS: no reading pauses/cache; {} async HTTP connection(s) per user.'.format(args.connections))
    else:
        dashboard.log('Workload: {} | {} connections/user | reading pause {}–{}s'.format(
            args.mode, args.connections, args.think_min, args.think_max))
    if not args.fixed:
        dashboard.log('Budgets: p50 <= {} ms, p95 <= {} ms, p99 <= {} ms; errors <= {}%'.format(
            args.p50_ms, args.p95_ms, args.p99_ms, args.max_error_rate))
        dashboard.log('{} windows × {}s per stage; {} consecutive failures stop; {} samples/window minimum.'.format(
            args.windows, args.window, args.fail_windows, args.min_samples))
    if not args.fixed:
        dashboard.log('Search: double until failure, then binary search (resolution {} users). Ctrl-C stops.'.format(args.resolution))
    settings = vars(args).copy()
    stages, highest_pass, lowest_fail, first_fail = [], None, None, None
    while not interrupted.is_set():
        dashboard.log('\nTesting {} users | passing={} | failing={}'.format(args.users, highest_pass, lowest_fail))
        result = run_stage(args, profiles, inventory, dashboard, interrupted)
        stages.append(result)
        if result['verdict'] == 'PASS':
            highest_pass = max(highest_pass or 0, args.users)
        elif result['verdict'] == 'FAIL':
            lowest_fail = min(lowest_fail, args.users) if lowest_fail is not None else args.users
            if first_fail is None:
                first_fail = args.users
        else:
            break
        if args.fixed:
            break
        candidate = next_user_count(args.users, highest_pass, lowest_fail, args.max_users, args.resolution)
        if candidate is None:
            break
        dashboard.log('Next: {} users. Cooling down for {}s...'.format(candidate, args.cooldown))
        if interrupted.wait(args.cooldown):
            break
        args.users = candidate
    last_verdict = stages[-1]['verdict'] if stages else 'INCONCLUSIVE'
    verdict = ('INTERRUPTED' if interrupted.is_set() else 'INCONCLUSIVE' if last_verdict == 'INCONCLUSIVE'
               else 'FAIL' if lowest_fail is not None else last_verdict)
    dashboard.log('\n' + dashboard.paint('RESULT', '1;36'))
    if args.fixed:
        dashboard.log('Fixed test: {} (no concurrency limit inferred).'.format(verdict))
    elif verdict in ('INCONCLUSIVE', 'INTERRUPTED'):
        dashboard.log('{}: search stopped before refinement finished.'.format(verdict))
        dashboard.log('Partial observations: highest passing={}, lowest failing={}.'.format(highest_pass, lowest_fail))
    elif lowest_fail is not None:
        if highest_pass is not None:
            dashboard.log('Highest passing: {} users | Lowest failing: {} users | Gap: {}'.format(
                highest_pass, lowest_fail, lowest_fail - highest_pass))
            dashboard.log('Boundary found for this workload. Lower --resolution to refine further.')
        else:
            dashboard.log('Even 1 user failed the configured budgets; no passing baseline found.')
    else:
        dashboard.log('At least {} users passed; failure NOT reached. Increase --max-users.'.format(highest_pass))
    dashboard.log('Stress users are continuously active HTTP clients, not mostly idle human readers.')
    dashboard.log('Check server AND generator CPU/network: either side can limit this measurement.')
    report = {'target': args.url, 'verdict': verdict, 'highest_passing_users': highest_pass,
              'first_failing_users': first_fail, 'lowest_failing_users': lowest_fail,
              'search_complete': verdict not in ('INCONCLUSIVE', 'INTERRUPTED'),
              'settings': settings, 'stages': stages}
    if args.json:
        with open(args.json, 'w', encoding='utf-8') as output:
            json.dump(report, output, indent=2)
        dashboard.log('Saved report: ' + args.json)
    return 130 if verdict == 'INTERRUPTED' else 1 if verdict == 'FAIL' else 0 if verdict == 'PASS' else 2


if __name__ == '__main__':
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
    except Exception as error:
        print('ERROR: {}'.format(error), file=sys.stderr)
        sys.exit(2)
