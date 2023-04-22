'use strict';

const { debuglog } = require('util');
const Walker = require('node-source-walk');
const sass = require('gonzales-pe');

const debug = debuglog('detective-scss');

/**
 * Extract the @import statements from a given scss file's content
 *
 * @param  {String} fileContent
 * @param  {Object} options
 * @param  {Boolean} options.url - detect any url() references to images, fonts, etc.
 * @return {String[]}
 */
module.exports = function detective(fileContent, options) {
  if (typeof fileContent === 'undefined') throw new Error('content not given');
  if (typeof fileContent !== 'string') throw new Error('content is not a string');

  const isUrlEnabled = options && options.url;
  let ast = {};

  try {
    debug('content: %s', fileContent);
    ast = sass.parse(fileContent, { syntax: 'scss' });
  } catch (error) {
    debug('parse error: %s', error.message);
  }

  detective.ast = ast;

  const walker = new Walker();
  let dependencies = [];

  walker.walk(ast, node => {
    if (isImportStatement(node)) {
      dependencies = [...dependencies, ...extractDependencies(node)];
      return;
    }

    if (isUrlEnabled && isUrlNode(node)) {
      dependencies = [...dependencies, ...extractUriDependencies(node)];
    }
  });

  return dependencies;
};

function isImportStatement(node) {
  if (!node || node.type !== 'atrule') return false;
  if (node.content.length === 0 || node.content[0].type !== 'atkeyword') return false;

  const atKeyword = node.content[0];

  if (atKeyword.content.length === 0) return false;

  const importKeyword = atKeyword.content[0];

  return ['ident', 'import'].includes(importKeyword.type);
}

function isUrlNode(node) {
  return node.type === 'uri';
}

function extractDependencies(importStatementNode) {
  return importStatementNode.content
    .filter(innerNode => ['string', 'ident'].includes(innerNode.type))
    .map(identifierNode => identifierNode.content.replace(/["']/g, ''));
}

function extractUriDependencies(importStatementNode) {
  return importStatementNode.content
    .filter(innerNode => ['string', 'ident', 'raw'].includes(innerNode.type))
    .map(identifierNode => identifierNode.content.replace(/["']/g, ''));
}
