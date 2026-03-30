import { describe, it, expect } from 'vitest';
import { pageExists } from '../helpers/sharepoint';

const SITE_URL = process.env.DOCTOR_E2E_SITE_URL!;

describe('Page existence', () => {
  const pages = [
    'home.aspx',
    'doctor/commands.aspx',
    'doctor/documentation.aspx',
    'doctor/installation.aspx',
    'doctor/options.aspx',
    'doctor/page-creation.aspx',
    'doctor/table-of-contents.aspx',
    'tests/shortcodes.aspx',
    'tests/characters.aspx',
    'tests/codeblocks.aspx',
  ];

  for (const slug of pages) {
    it(`should have published ${slug}`, () => {
      expect(pageExists(SITE_URL, slug)).toBe(true);
    });
  }
});
