/**
 * Unit Tests for InputValidator
 * Tests XSS protection, URL validation, and input sanitization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Logger and DOM elements
global.Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

global.window = global;
global.document = {
  createElement: (tag) => {
    const el = {
      tagName: tag.toUpperCase(),
      textContent: '',
      innerHTML: '',
      classList: {
        add: vi.fn(),
        remove: vi.fn()
      },
      parentNode: {
        insertBefore: vi.fn(),
        querySelector: vi.fn(() => null)
      },
      addEventListener: vi.fn(),
      querySelectorAll: vi.fn(() => []),
      getElementById: vi.fn(() => null)
    };
    Object.defineProperty(el, 'textContent', {
      get() { return this._text || ''; },
      set(value) {
        this._text = value;
        // Simulate browser HTML escaping
        this.innerHTML = value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }
    });
    return el;
  },
  addEventListener: vi.fn(),
  querySelectorAll: vi.fn(() => []),
  getElementById: vi.fn(() => null)
};

Object.defineProperty(global, 'crypto', {
  value: {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    }
  },
  writable: true
});

// Mock window.location
global.window.location = {
  hostname: 'dashflow.app'
};

// Load InputValidator
const loadInputValidatorModule = () => {
  const fs = require('fs');
  const path = require('path');
  const moduleContent = fs.readFileSync(
    path.join(__dirname, '../../js/core/input-validator.js'),
    'utf8'
  );

  // Remove window exports
  const cleanContent = moduleContent
    .replace(/window\.inputValidator = new InputValidator\(\);/, '')
    .replace(/window\.validateAndSanitize = \{[\s\S]*?\};/, '');

  // Execute and return class
  const moduleFunc = new Function(cleanContent + '\nreturn InputValidator;');
  return moduleFunc();
};

const InputValidator = loadInputValidatorModule();

describe('InputValidator - HTML Sanitization', () => {
  let validator;

  beforeEach(() => {
    validator = new InputValidator();
  });

  describe('Basic XSS Prevention', () => {
    it('should escape basic HTML characters', () => {
      const input = '<script>alert("xss")</script>';
      const sanitized = validator.sanitizeHtml(input);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;'); // HTML escaped
    });

    it('should block javascript: protocol', () => {
      const input = '<a href="javascript:alert(1)">Click</a>';
      const sanitized = validator.sanitizeHtml(input);

      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toContain('javascript-blocked:');
    });

    it('should block data: protocol', () => {
      const input = '<img src="data:text/html,<script>alert(1)</script>">';
      const sanitized = validator.sanitizeHtml(input);

      expect(sanitized).not.toContain('data:');
      expect(sanitized).toContain('data-blocked:');
    });

    it('should block vbscript: protocol', () => {
      const input = '<img src="vbscript:msgbox(1)">';
      const sanitized = validator.sanitizeHtml(input);

      expect(sanitized).not.toContain('vbscript:');
      expect(sanitized).toContain('vbscript-blocked:');
    });

    it('should block inline event handlers', () => {
      const input = '<div onclick="alert(1)">Click me</div>';
      const sanitized = validator.sanitizeHtml(input);

      expect(sanitized).not.toContain('onclick=');
      expect(sanitized).toContain('on-event-blocked=');
    });

    it('should block various event handlers', () => {
      const tests = [
        '<img onload="alert(1)">',
        '<body onload="alert(1)">',
        '<input onfocus="alert(1)">',
        '<button onmouseover="alert(1)">',
        '<div onerror="alert(1)">'
      ];

      tests.forEach(input => {
        const sanitized = validator.sanitizeHtml(input);
        expect(sanitized).toContain('on-event-blocked=');
      });
    });
  });

  describe('Advanced XSS Prevention', () => {
    it('should block script tags with attributes', () => {
      const input = '<script type="text/javascript">alert(1)</script>';
      const sanitized = validator.sanitizeHtml(input);

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;'); // HTML escaped
    });

    it('should block iframe tags', () => {
      const input = '<iframe src="https://evil.com"></iframe>';
      const sanitized = validator.sanitizeHtml(input);

      expect(sanitized).not.toContain('<iframe');
      expect(sanitized).toContain('&lt;'); // HTML escaped
    });

    it('should block object tags', () => {
      const input = '<object data="https://evil.com"></object>';
      const sanitized = validator.sanitizeHtml(input);

      expect(sanitized).not.toContain('<object');
      expect(sanitized).toContain('&lt;'); // HTML escaped
    });

    it('should block embed tags', () => {
      const input = '<embed src="https://evil.com">';
      const sanitized = validator.sanitizeHtml(input);

      expect(sanitized).not.toContain('<embed');
      expect(sanitized).toContain('&lt;'); // HTML escaped
    });

    it('should block link tags', () => {
      const input = '<link rel="stylesheet" href="https://evil.com/styles.css">';
      const sanitized = validator.sanitizeHtml(input);

      expect(sanitized).not.toContain('<link');
      expect(sanitized).toContain('&lt;'); // HTML escaped
    });

    it('should block meta tags', () => {
      const input = '<meta http-equiv="refresh" content="0;url=https://evil.com">';
      const sanitized = validator.sanitizeHtml(input);

      expect(sanitized).not.toContain('<meta');
      expect(sanitized).toContain('&lt;'); // HTML escaped
    });

    it('should handle case-insensitive javascript: protocol', () => {
      const variants = [
        'JavaScript:alert(1)',
        'JAVASCRIPT:alert(1)',
        'JaVaScRiPt:alert(1)',
        'jAvAsCrIpT:alert(1)'
      ];

      variants.forEach(input => {
        const sanitized = validator.sanitizeHtml(input);
        expect(sanitized).not.toMatch(/javascript:/i);
        expect(sanitized).toContain('javascript-blocked:');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty strings', () => {
      expect(validator.sanitizeHtml('')).toBe('');
    });

    it('should handle null/undefined', () => {
      expect(validator.sanitizeHtml(null)).toBe('');
      expect(validator.sanitizeHtml(undefined)).toBe('');
    });

    it('should handle non-string inputs', () => {
      expect(validator.sanitizeHtml(123)).toBe('');
      expect(validator.sanitizeHtml({})).toBe('');
      expect(validator.sanitizeHtml([])).toBe('');
    });

    it('should preserve safe text', () => {
      const input = 'This is safe text with numbers 123 and symbols !@#';
      const sanitized = validator.sanitizeHtml(input);

      expect(sanitized).toBe(input);
    });

    it('should trim whitespace', () => {
      const input = '  text with spaces  ';
      const sanitized = validator.sanitizeHtml(input);

      expect(sanitized).toBe('text with spaces');
    });
  });
});

describe('InputValidator - URL Validation', () => {
  let validator;

  beforeEach(() => {
    validator = new InputValidator();
  });

  describe('Valid URLs', () => {
    it('should accept valid HTTP URLs', () => {
      expect(validator.validateUrl('http://example.com')).toBe(true);
      expect(validator.validateUrl('http://www.example.com')).toBe(true);
    });

    it('should accept valid HTTPS URLs', () => {
      expect(validator.validateUrl('https://example.com')).toBe(true);
      expect(validator.validateUrl('https://www.example.com')).toBe(true);
    });

    it('should accept URLs with paths', () => {
      expect(validator.validateUrl('https://example.com/path/to/page')).toBe(true);
    });

    it('should accept URLs with query strings', () => {
      expect(validator.validateUrl('https://example.com?foo=bar&baz=qux')).toBe(true);
    });

    it('should accept URLs with fragments', () => {
      expect(validator.validateUrl('https://example.com#section')).toBe(true);
    });

    it('should accept URLs with ports', () => {
      expect(validator.validateUrl('https://example.com:8080')).toBe(true);
    });
  });

  describe('Dangerous Protocols', () => {
    it('should block javascript: protocol', () => {
      expect(validator.validateUrl('javascript:alert(1)')).toBe(false);
    });

    it('should block data: protocol', () => {
      expect(validator.validateUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('should block vbscript: protocol', () => {
      expect(validator.validateUrl('vbscript:msgbox(1)')).toBe(false);
    });

    it('should block file: protocol', () => {
      expect(validator.validateUrl('file:///etc/passwd')).toBe(false);
    });

    it('should block ftp: protocol', () => {
      expect(validator.validateUrl('ftp://example.com')).toBe(false);
    });
  });

  describe('Private IP Ranges', () => {
    beforeEach(() => {
      // Set production environment (non-localhost)
      global.window.location.hostname = 'dashflow.app';
    });

    it('should block localhost', () => {
      expect(validator.validateUrl('http://localhost')).toBe(false);
      expect(validator.validateUrl('http://localhost:3000')).toBe(false);
    });

    it('should block 127.x.x.x addresses', () => {
      expect(validator.validateUrl('http://127.0.0.1')).toBe(false);
      expect(validator.validateUrl('http://127.0.0.1:8080')).toBe(false);
      expect(validator.validateUrl('http://127.1.1.1')).toBe(false);
    });

    it('should block 10.x.x.x addresses', () => {
      expect(validator.validateUrl('http://10.0.0.1')).toBe(false);
      expect(validator.validateUrl('http://10.255.255.255')).toBe(false);
    });

    it('should block 192.168.x.x addresses', () => {
      expect(validator.validateUrl('http://192.168.1.1')).toBe(false);
      expect(validator.validateUrl('http://192.168.0.1')).toBe(false);
    });

    it('should block 172.16-31.x.x addresses', () => {
      expect(validator.validateUrl('http://172.16.0.1')).toBe(false);
      expect(validator.validateUrl('http://172.31.255.255')).toBe(false);
    });

    it('should allow private IPs in development mode', () => {
      global.window.location.hostname = 'localhost';
      const validatorDev = new InputValidator();

      expect(validatorDev.validateUrl('http://localhost')).toBe(true);
      expect(validatorDev.validateUrl('http://127.0.0.1')).toBe(true);

      // Reset
      global.window.location.hostname = 'dashflow.app';
    });
  });

  describe('Invalid URLs', () => {
    it('should reject empty strings', () => {
      expect(validator.validateUrl('')).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(validator.validateUrl(null)).toBe(false);
      expect(validator.validateUrl(undefined)).toBe(false);
    });

    it('should reject malformed URLs', () => {
      expect(validator.validateUrl('not a url')).toBe(false);
      expect(validator.validateUrl('htp://missing-t.com')).toBe(false);
    });

    it('should reject URLs without protocol', () => {
      expect(validator.validateUrl('example.com')).toBe(false);
      expect(validator.validateUrl('www.example.com')).toBe(false);
    });
  });
});

describe('InputValidator - Text Validation', () => {
  let validator;

  beforeEach(() => {
    validator = new InputValidator();
  });

  describe('Basic Text Validation', () => {
    it('should accept valid text', () => {
      const result = validator.validateText('Valid text');

      expect(result.valid).toBe(true);
      expect(result.sanitized).toBe('Valid text');
    });

    it('should enforce minimum length', () => {
      const result = validator.validateText('abc', { minLength: 5 });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 5');
    });

    it('should enforce maximum length', () => {
      const longText = 'a'.repeat(600);
      const result = validator.validateText(longText, { maxLength: 500 });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('no more than 500');
    });

    it('should handle required fields', () => {
      const result = validator.validateText('', { required: true });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('required');
    });

    it('should allow empty optional fields', () => {
      const result = validator.validateText('', { required: false });

      expect(result.valid).toBe(true);
    });

    it('should sanitize input', () => {
      const result = validator.validateText('<script>alert(1)</script>');

      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).toContain('&lt;'); // HTML escaped
    });
  });

  describe('Specialized Text Validators', () => {
    it('should validate section names', () => {
      expect(validator.validateSectionName('Work').valid).toBe(true);
      expect(validator.validateSectionName('My-Section_123').valid).toBe(true);
      expect(validator.validateSectionName('').valid).toBe(false);
    });

    it('should validate link names', () => {
      expect(validator.validateLinkName('GitHub').valid).toBe(true);
      expect(validator.validateLinkName('My Link!').valid).toBe(true);
      expect(validator.validateLinkName('').valid).toBe(false);
    });

    it('should validate todo text', () => {
      expect(validator.validateTodoText('Buy groceries').valid).toBe(true);
      expect(validator.validateTodoText('').valid).toBe(false);

      const longText = 'a'.repeat(201);
      expect(validator.validateTodoText(longText).valid).toBe(false);
    });

    it('should validate todo notes (optional)', () => {
      expect(validator.validateTodoNotes('Some notes').valid).toBe(true);
      expect(validator.validateTodoNotes('').valid).toBe(true);

      const veryLongNotes = 'a'.repeat(1001);
      expect(validator.validateTodoNotes(veryLongNotes).valid).toBe(false);
    });

    it('should validate usernames', () => {
      expect(validator.validateUsername('john_doe').valid).toBe(true);
      expect(validator.validateUsername('user-123').valid).toBe(true);
      expect(validator.validateUsername('').valid).toBe(false);

      const longUsername = 'a'.repeat(31);
      expect(validator.validateUsername(longUsername).valid).toBe(false);
    });

    it('should validate search queries', () => {
      expect(validator.validateSearchQuery('search term').valid).toBe(true);
      expect(validator.validateSearchQuery('').valid).toBe(true);

      const longQuery = 'a'.repeat(101);
      expect(validator.validateSearchQuery(longQuery).valid).toBe(false);
    });
  });
});

describe('InputValidator - JSON Validation', () => {
  let validator;

  beforeEach(() => {
    validator = new InputValidator();
  });

  it('should validate valid JSON', () => {
    const json = JSON.stringify({ key: 'value' });
    const result = validator.validateJsonImport(json);

    expect(result.valid).toBe(true);
    expect(result.sanitized).toHaveProperty('key');
  });

  it('should reject invalid JSON', () => {
    const result = validator.validateJsonImport('not json{{{');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid JSON');
  });

  it('should reject non-object JSON', () => {
    const result = validator.validateJsonImport('"just a string"');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('structure');
  });

  it('should sanitize string values in JSON', () => {
    const json = JSON.stringify({
      title: '<script>alert(1)</script>',
      description: 'Safe text'
    });

    const result = validator.validateJsonImport(json);

    expect(result.valid).toBe(true);
    expect(result.sanitized.title).not.toContain('<script>');
    expect(result.sanitized.title).toContain('&lt;'); // HTML escaped
    expect(result.sanitized.description).toBe('Safe text');
  });

  it('should deep sanitize nested objects', () => {
    const json = JSON.stringify({
      level1: {
        level2: {
          dangerous: '<script>alert(1)</script>',
          safe: 'text'
        }
      }
    });

    const result = validator.validateJsonImport(json);

    expect(result.valid).toBe(true);
    expect(result.sanitized.level1.level2.dangerous).not.toContain('<script>');
    expect(result.sanitized.level1.level2.dangerous).toContain('&lt;'); // HTML escaped
    expect(result.sanitized.level1.level2.safe).toBe('text');
  });

  it('should sanitize arrays in JSON', () => {
    const json = JSON.stringify({
      items: [
        'safe item',
        '<script>alert(1)</script>',
        { nested: '<img onerror="alert(1)">' }
      ]
    });

    const result = validator.validateJsonImport(json);

    expect(result.valid).toBe(true);
    expect(result.sanitized.items[0]).toBe('safe item');
    expect(result.sanitized.items[1]).not.toContain('<script>');
    expect(result.sanitized.items[1]).toContain('&lt;'); // HTML escaped
    expect(result.sanitized.items[2].nested).not.toContain('<img');
  });

  it('should preserve non-string values', () => {
    const json = JSON.stringify({
      string: 'text',
      number: 123,
      boolean: true,
      null: null,
      array: [1, 2, 3]
    });

    const result = validator.validateJsonImport(json);

    expect(result.valid).toBe(true);
    expect(result.sanitized.number).toBe(123);
    expect(result.sanitized.boolean).toBe(true);
    expect(result.sanitized.null).toBeNull();
    expect(result.sanitized.array).toEqual([1, 2, 3]);
  });
});

describe('InputValidator - Deep Object Sanitization', () => {
  let validator;

  beforeEach(() => {
    validator = new InputValidator();
  });

  it('should sanitize simple strings', () => {
    const result = validator.deepSanitizeObject('<script>alert(1)</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;'); // HTML escaped
  });

  it('should sanitize arrays', () => {
    const input = ['safe', '<script>xss</script>', 'text'];
    const result = validator.deepSanitizeObject(input);

    expect(result[0]).toBe('safe');
    expect(result[1]).not.toContain('<script>');
    expect(result[1]).toContain('&lt;'); // HTML escaped
    expect(result[2]).toBe('text');
  });

  it('should sanitize nested objects', () => {
    const input = {
      safe: 'text',
      dangerous: '<img onerror="alert(1)">',
      nested: {
        deep: '<script>xss</script>'
      }
    };

    const result = validator.deepSanitizeObject(input);

    expect(result.safe).toBe('text');
    expect(result.dangerous).not.toContain('<img');
    expect(result.dangerous).toContain('&lt;'); // HTML escaped
    expect(result.nested.deep).not.toContain('<script>');
    expect(result.nested.deep).toContain('&lt;'); // HTML escaped
  });

  it('should sanitize object keys', () => {
    const input = {
      '<script>key</script>': 'value'
    };

    const result = validator.deepSanitizeObject(input);
    const keys = Object.keys(result);

    expect(keys[0]).not.toContain('<script>');
    expect(keys[0]).toContain('&lt;'); // HTML escaped
  });

  it('should preserve non-string primitive types', () => {
    const input = {
      num: 42,
      bool: true,
      nullVal: null,
      undef: undefined
    };

    const result = validator.deepSanitizeObject(input);

    expect(result.num).toBe(42);
    expect(result.bool).toBe(true);
    expect(result.nullVal).toBeNull();
    expect(result.undef).toBeUndefined();
  });

  it('should handle complex nested structures', () => {
    const input = {
      users: [
        {
          name: 'User 1',
          bio: '<script>xss</script>',
          tags: ['tag1', '<img onerror="xss">']
        },
        {
          name: 'User 2',
          bio: 'Safe bio',
          tags: ['safe']
        }
      ]
    };

    const result = validator.deepSanitizeObject(input);

    expect(result.users[0].name).toBe('User 1');
    expect(result.users[0].bio).not.toContain('<script>');
    expect(result.users[0].bio).toContain('&lt;'); // HTML escaped
    expect(result.users[0].tags[1]).not.toContain('<img');
    expect(result.users[1].bio).toBe('Safe bio');
  });
});

describe('InputValidator - CSP Helpers', () => {
  let validator;

  beforeEach(() => {
    validator = new InputValidator();
  });

  it('should generate CSP nonce', () => {
    const nonce = validator.generateCSPNonce();

    expect(nonce).toBeDefined();
    expect(nonce.length).toBe(32); // 16 bytes = 32 hex chars
    expect(nonce).toMatch(/^[0-9a-f]+$/);
  });

  it('should generate unique nonces', () => {
    const nonce1 = validator.generateCSPNonce();
    const nonce2 = validator.generateCSPNonce();

    expect(nonce1).not.toBe(nonce2);
  });
});
