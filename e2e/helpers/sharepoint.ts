import { execFileSync } from 'child_process';
import * as path from 'path';
import * as cheerio from 'cheerio';

const CLI = path.resolve(__dirname, '../../bin/localm365');

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

function execCli(args: string[]): string {
  return execFileSync('node', [CLI, ...args], {
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 30000,
  }).trim();
}

export function getPageData(webUrl: string, slug: string): PageData {
  const raw = execCli(['spo', 'page', 'get', '--webUrl', webUrl, '--name', slug, '-o', 'json']);
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
    execCli(['spo', 'page', 'get', '--webUrl', webUrl, '--name', slug, '-o', 'json']);
    return true;
  } catch {
    return false;
  }
}

export function getNavigationNodes(
  webUrl: string,
  location: 'QuickLaunch' | 'TopNavigationBar'
): NavigationNode[] {
  const raw = execCli([
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
