import { describe, it, expect, beforeAll } from 'vitest';
import { getPageData, loadHtml, PageData } from '../helpers/sharepoint';

const SITE_URL = process.env.DOCTOR_E2E_SITE_URL!;

describe('Table of contents', () => {
  let page: PageData;
  let $: ReturnType<typeof loadHtml>;

  beforeAll(() => {
    page = getPageData(SITE_URL, 'doctor/page-creation.aspx');
    $ = loadHtml(page.canvasHtml);
  });

  it('should have a table of contents', () => {
    expect($('.table-of-contents').length).toBeGreaterThan(0);
  });

  it('should contain 2 root elements', () => {
    expect($('.table-of-contents > ul > li').length).toBe(2);
  });

  it('should contain 2 sub-lists', () => {
    expect($('.table-of-contents > ul ul').length).toBe(2);
  });

  it('should have 6 total links', () => {
    expect($('.table-of-contents li').length).toBe(6);
  });

  it('should have anchor tags on headings', () => {
    expect($('h3#menu a.toc-anchor').length).toBeGreaterThan(0);
  });

  it('should position TOC on the right', () => {
    const toc = $('.doctor__container__toc');
    expect(toc.length).toBeGreaterThan(0);
    expect(toc.hasClass('doctor__container__toc_right')).toBe(true);
  });
});
