import { describe, it, expect, beforeAll } from 'vitest';
import { getPageData, loadHtml, PageData } from '../helpers/sharepoint';

const SITE_URL = process.env.DOCTOR_E2E_SITE_URL!;

describe('Options page content', () => {
  let page: PageData;
  let $: ReturnType<typeof loadHtml>;

  beforeAll(() => {
    page = getPageData(SITE_URL, 'doctor/options.aspx');
    $ = loadHtml(page.canvasHtml);
  });

  it('should contain the Options heading', () => {
    const heading = $('h2#options');
    expect(heading.length).toBeGreaterThan(0);
    expect(heading.text()).toContain('Options');
  });

  it('should contain the Navigation heading', () => {
    const heading = $('h2#navigation');
    expect(heading.length).toBeGreaterThan(0);
  });
});
