import { describe, it, expect, beforeAll } from 'vitest';
import { getPageData, loadHtml, PageData } from '../helpers/sharepoint';

const SITE_URL = process.env.DOCTOR_E2E_SITE_URL!;

describe('Special characters', () => {
  let page: PageData;
  let $: ReturnType<typeof loadHtml>;

  beforeAll(() => {
    page = getPageData(SITE_URL, 'tests/characters.aspx');
    $ = loadHtml(page.canvasHtml);
  });

  it('should have the doctor container', () => {
    expect($('.doctor__container').length).toBeGreaterThan(0);
  });

  it('should render backslash correctly', () => {
    expect($('.doctor__container').text()).toContain('domain\\sp');
  });

  it('should render asterisks correctly', () => {
    expect($('.doctor__container').text()).toContain('* */15 * * * *');
  });

  it('should render square brackets correctly', () => {
    expect($('.doctor__container').text()).toContain('[array]');
  });
});
