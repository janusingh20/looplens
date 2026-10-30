import { describe, expect, it } from 'vitest';
import { href, parseRoute, type Route } from './route';

describe('hash routes', () => {
  const routes: Route[] = [
    { name: 'start' },
    { name: 'orientation' },
    { name: 'problem', index: 3 },
    { name: 'done' },
    { name: 'bank' },
    { name: 'try', id: 'P07' },
  ];
  it('round trip through plain #names', () => {
    for (const r of routes) {
      expect(href(r)).toMatch(/^#[a-z0-9-]+$/);
      expect(parseRoute(href(r))).toEqual(r);
    }
  });
  it('still understands the older #/path form', () => {
    expect(parseRoute('#/problem/2')).toEqual({ name: 'problem', index: 2 });
    expect(parseRoute('#/try/P05')).toEqual({ name: 'try', id: 'P05' });
    expect(parseRoute('#/bank')).toEqual({ name: 'bank' });
  });
  it('sends anything unknown to the start', () => {
    expect(parseRoute('')).toEqual({ name: 'start' });
    expect(parseRoute('#main')).toEqual({ name: 'start' });
    expect(parseRoute('#problem-x')).toEqual({ name: 'start' });
  });
});
