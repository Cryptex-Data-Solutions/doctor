import { describe, it, expect, beforeAll } from 'vitest';
import { getPageData, loadHtml, getNavigationNodes, PageData } from '../helpers/sharepoint';

const SITE_URL = process.env.DOCTOR_E2E_SITE_URL!;

describe('Homepage', () => {
  let page: PageData;
  let $: ReturnType<typeof loadHtml>;

  beforeAll(() => {
    page = getPageData(SITE_URL, 'home.aspx');
    $ = loadHtml(page.canvasHtml);
  });

  it('should contain the doctor image', () => {
    expect($('p#logo img').length).toBeGreaterThan(0);
  });

  it('should have a heading with the right description', () => {
    expect($('h2').text()).toContain('Maintain your documentation on SharePoint without pain');
  });

  it('should have comments enabled', () => {
    expect(page.commentsDisabled).toBe(false);
  });
});

describe('Navigation', () => {
  let nodes: any[];

  beforeAll(() => {
    nodes = getNavigationNodes(SITE_URL, 'QuickLaunch');
  });

  it('should contain Doctor and Test pages links', () => {
    const titles = nodes.map((n: any) => n.Title);
    expect(titles).toContain('Doctor');
    expect(titles).toContain('Test pages');
  });

  it('should have Documentation under Doctor', () => {
    const doctorNode = nodes.find((n: any) => n.Title === 'Doctor');
    expect(doctorNode).toBeDefined();
    const children = doctorNode.Children || [];
    const childTitles = children.map((c: any) => c.Title);
    expect(childTitles).toContain('Documentation');
  });

  it('should have child items under Documentation', () => {
    const doctorNode = nodes.find((n: any) => n.Title === 'Doctor');
    const docNode = (doctorNode.Children || []).find((c: any) => c.Title === 'Documentation');
    expect(docNode).toBeDefined();
    const grandchildren = docNode.Children || [];
    const titles = grandchildren.map((c: any) => c.Title);
    expect(titles).toContain('Options');
    expect(titles).toContain('Installation');
    expect(titles).toContain('Commands');
  });
});
