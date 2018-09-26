'use strict';

const RX_NAMESPACE = /\s*(@namespace\s+(?:\S+\s+)?url\(http:\/\/.*?\);)\s*/g;
const RX_CHARSET = /\s*@charset\s+(['"]).*?\1\s*;\s*/g;
const RX_CSS_COMMENTS = /\/\*[\s\S]*?(?:\*\/|$)/g;

function styleCodeEmpty(code) {
  // Collect the global section if it's not empty, not comment-only, not namespace-only.
  const cmtOpen = code && code.indexOf('/*');
  if (cmtOpen >= 0) {
    const cmtCloseLast = code.lastIndexOf('*/');
    if (cmtCloseLast < 0) {
      code = code.substr(0, cmtOpen);
    } else {
      code = code.substr(0, cmtOpen) +
        code.substring(cmtOpen, cmtCloseLast + 2).replace(RX_CSS_COMMENTS, '') +
        code.substr(cmtCloseLast + 2);
    }
  }
  if (!code || !code.trim()) return true;
  if (code.includes('@namespace')) code = code.replace(RX_NAMESPACE, '').trim();
  if (code.includes('@charset')) code = code.replace(RX_CHARSET, '').trim();
  return !code;
}

/**
 * @param {Style} a - first style object
 * @param {Style} b - second style object
 * @param {Object} options
 * @param {Boolean=} options.ignoreCode -
 *        true used by invalidateCache to determine if cached filters should be cleared
 * @param {Boolean=} options.checkSource -
 *        true used by update check to compare the server response
 *        instead of sections that depend on @preprocessor
 * @returns {Boolean|undefined}
 */
function styleSectionsEqual(a, b, {ignoreCode, checkSource} = {}) {
  if (checkSource &&
      typeof a.sourceCode === 'string' &&
      typeof b.sourceCode === 'string') {
    return a.sourceCode === b.sourceCode;
  }
  a = a.sections;
  b = b.sections;
  if (!a || !b) {
    return undefined;
  }
  if (a.length !== b.length) {
    return false;
  }
  // order of sections should be identical to account for the case of multiple
  // sections matching the same URL because the order of rules is part of cascading
  return a.every((sectionA, index) => propertiesEqual(sectionA, b[index]));

  function propertiesEqual(secA, secB) {
    for (const name of ['urlPrefixes', 'urls', 'domains', 'regexps']) {
      if (!equalOrEmpty(secA[name], secB[name], 'every', arrayMirrors)) {
        return false;
      }
    }
    return ignoreCode || equalOrEmpty(secA.code, secB.code, 'substr', (a, b) => a === b);
  }

  function equalOrEmpty(a, b, telltale, comparator) {
    const typeA = a && typeof a[telltale] === 'function';
    const typeB = b && typeof b[telltale] === 'function';
    return (
      (a === null || a === undefined || (typeA && !a.length)) &&
      (b === null || b === undefined || (typeB && !b.length))
    ) || typeA && typeB && a.length === b.length && comparator(a, b);
  }

  function arrayMirrors(array1, array2) {
    return (
      array1.every(el => array2.includes(el)) &&
      array2.every(el => array1.includes(el))
    );
  }
}
