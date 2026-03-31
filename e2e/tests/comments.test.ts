import { describe, it, expect, beforeAll } from 'vitest';
import { getPageData, PageData } from '../helpers/sharepoint';

const SITE_URL = process.env.DOCTOR_E2E_SITE_URL!;

describe('Comments', () => {
  it('should have comments disabled on documentation page', () => {
    const page = getPageData(SITE_URL, 'doctor/documentation.aspx');
    expect(page.commentsDisabled).toBe(true);
  });

  it('should have comments enabled on home page', () => {
    const page = getPageData(SITE_URL, 'home.aspx');
    expect(page.commentsDisabled).toBe(false);
  });
});
