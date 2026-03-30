import { describe, it, expect, beforeAll } from 'vitest';
import { getPageData, loadHtml, PageData } from '../helpers/sharepoint';

const SITE_URL = process.env.DOCTOR_E2E_SITE_URL!;

describe('Shortcodes', () => {
  let page: PageData;
  let $: ReturnType<typeof loadHtml>;

  beforeAll(() => {
    page = getPageData(SITE_URL, 'tests/shortcodes.aspx');
    $ = loadHtml(page.canvasHtml);
  });

  it('should contain 4 settings icons', () => {
    expect($('[data-icon-name*="settings"]').length).toBe(4);
  });

  it('should have 2 note callouts', () => {
    expect($('.callout-note').length).toBe(2);
  });

  it('should have 3 tip callouts', () => {
    expect($('.callout-tip').length).toBe(3);
  });

  it('should have tip callout with custom title', () => {
    expect($('.callout-tip h5').eq(1).text()).toContain('OVERRIDE THE TITLE');
  });

  it('should have 1 info callout', () => {
    expect($('.callout-info').length).toBe(1);
  });

  it('should have 1 caution callout', () => {
    expect($('.callout-caution').length).toBe(1);
  });

  it('should have 1 danger callout', () => {
    expect($('.callout-danger').length).toBe(1);
  });

  it('should contain custom shortcode content', () => {
    // The external sample shortcode renders as a plain div without a specific class
    // Verify the rendered output is present in the page HTML
    const html = page.canvasHtml;
    expect(html).toContain('Content of the external shortcode');
  });

  it('should support custom background and foreground colors', () => {
    const lastTip = $('.callout-tip').last();
    const style = lastTip.attr('style') || '';
    expect(style).toContain('background-color');
    expect(style).toContain('#462749');
    expect(style).toContain('#FDECEF');
  });
});
