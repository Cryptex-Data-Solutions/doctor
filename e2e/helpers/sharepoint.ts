import { execFileSync } from 'child_process';
import * as path from 'path';
import * as cheerio from 'cheerio';

const CLI = path.resolve(__dirname, '../../bin/localm365');
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 5000;

function sleep(ms: number): void {
  execFileSync('node', ['-e', `setTimeout(()=>{},${ms})`], { timeout: ms + 5000 });
}

function execCli(args: string[]): string {
  return execFileSync('node', [CLI, ...args], {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 30000,
  }).trim();
}

function execCliWithRetry(args: string[]): string {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return execCli(args);
    } catch (e) {
      lastError = e as Error;
      if (attempt < MAX_RETRIES) {
        const base = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
        const jitter = Math.floor(Math.random() * base * 0.5);
        const backoff = base + jitter;
        console.log(`  Retry ${attempt + 1}/${MAX_RETRIES} after ${backoff}ms...`);
        sleep(backoff);
      }
    }
  }
  throw lastError;
}

export interface PageData {
  title: string;
  commentsDisabled: boolean;
  layoutType: string;
  canvasHtml: string;
}

export interface NavigationNode {
  Id: number;
  Title: string;
  Url: string;
  Children?: NavigationNode[];
}

export function getPageData(webUrl: string, slug: string): PageData {
  const raw = execCliWithRetry(['spo', 'page', 'get', '--webUrl', webUrl, '--name', slug, '-o', 'json']);
  const data = JSON.parse(raw);

  let canvasHtml = '';
  if (data.canvasContentJson) {
    const controls =
      typeof data.canvasContentJson === 'string'
        ? JSON.parse(data.canvasContentJson)
        : data.canvasContentJson;

    const wp = controls.find(
      (c: any) => c.webPartData && c.webPartData.title === 'doctor-placeholder'
    );
    if (wp) {
      canvasHtml = wp.webPartData.serverProcessedContent.htmlStrings.html;
    }
  }

  return {
    title: data.title,
    commentsDisabled: data.commentsDisabled,
    layoutType: data.layoutType,
    canvasHtml,
  };
}

export function pageExists(webUrl: string, slug: string): boolean {
  try {
    execCliWithRetry(['spo', 'page', 'get', '--webUrl', webUrl, '--name', slug, '-o', 'json']);
    return true;
  } catch {
    return false;
  }
}

export function getNavigationNodes(
  webUrl: string,
  location: 'QuickLaunch' | 'TopNavigationBar'
): NavigationNode[] {
  const raw = execCliWithRetry([
    'request',
    '--url', `${webUrl}/_api/web/Navigation/${location}?$expand=Children,Children/Children`,
    '--accept', 'application/json;odata=nometadata',
    '-o', 'json',
  ]);
  const data = JSON.parse(raw);
  return data.value || data;
}

export function loadHtml(html: string) {
  return cheerio.load(html, { xmlMode: false, decodeEntities: true });
}
