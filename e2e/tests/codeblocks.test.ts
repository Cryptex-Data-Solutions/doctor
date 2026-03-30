import { describe, it, expect, beforeAll } from 'vitest';
import { getPageData, loadHtml, PageData } from '../helpers/sharepoint';

const SITE_URL = process.env.DOCTOR_E2E_SITE_URL!;

describe('Code blocks', () => {
  let page: PageData;
  let $: ReturnType<typeof loadHtml>;

  beforeAll(() => {
    page = getPageData(SITE_URL, 'tests/codeblocks.aspx');
    $ = loadHtml(page.canvasHtml);
  });

  it('should render JavaScript codeblock with double quotes', () => {
    const pre = $('pre.javascript');
    expect(pre.length).toBeGreaterThan(0);
    expect(pre.text()).toContain('console.log("Hello from Doctor");');
  });

  it('should render TypeScript codeblock with single quotes', () => {
    const pre = $('pre.typescript');
    expect(pre.length).toBeGreaterThan(0);
    expect(pre.text()).toContain("console.log('Hello back Doctor');");
  });

  it('should render C# codeblock correctly', () => {
    const pre = $('pre.csharp');
    expect(pre.length).toBeGreaterThan(0);
    expect(pre.text()).toContain('console.log($"I\'m always {true}");');
  });
});
