"use strict";
Object.defineProperties(exports, {
  parseBuffer: {get: function() {
      return parseBuffer;
    }},
  __esModule: {value: true}
});
var $__esprima_45_fb__,
    $__escope__,
    $__estraverse__,
    $__util__;
'use strict';
var esprima = ($__esprima_45_fb__ = require("esprima-fb"), $__esprima_45_fb__ && $__esprima_45_fb__.__esModule && $__esprima_45_fb__ || {default: $__esprima_45_fb__}).default;
var escope = ($__escope__ = require("escope"), $__escope__ && $__escope__.__esModule && $__escope__ || {default: $__escope__}).default;
var estraverse = ($__estraverse__ = require("estraverse"), $__estraverse__ && $__estraverse__.__esModule && $__estraverse__ || {default: $__estraverse__}).default;
var getMemberExpressionString = ($__util__ = require("./util"), $__util__ && $__util__.__esModule && $__util__ || {default: $__util__}).getMemberExpressionString;
;
var resolverPath = atom.config.get("moduleResolver");
var resolver = require(resolverPath ? resolverPath : './resolve');
function parseBuffer(buffer, path) {
  var scopes;
  try {
    var syntaxTree = esprima.parse(buffer, {
      loc: true,
      tolerant: true
    });
    if (atom.config.get("es-navigation.es6Support"))
      scopes = escope.analyze(syntaxTree, {ecmaVersion: 6}).scopes;
    else
      scopes = escope.analyze(syntaxTree, {ecmaVersion: 5}).scopes;
  } catch (error) {
    console.warn("Error parsing AST/scopes: " + error + " in " + path + "\nPossibly not an ES6 module.");
    return null;
  }
  scopes.map((function(scope) {
    scope.path = path;
    scope.referencedSymbols = [];
    scope.importedSymbols = [];
    scope.exportedSymbols = [];
    scope.definedSymbols = [];
  }));
  scopes.map(decorateReferencedSymbols);
  scopes.map(decorateImportedSymbols);
  scopes.map(decorateExportedSymbols);
  scopes.map(decorateDefinedSymbols);
  scopes.map((function(scope) {
    scope.referencedSymbols = removeDuplicates(scope.referencedSymbols);
    scope.definedSymbols = removeDuplicates(scope.definedSymbols);
    scope.importedSymbols = removeDuplicates(scope.importedSymbols);
    scope.exportedSymbols = removeDuplicates(scope.exportedSymbols);
  }));
  return scopes;
  function removeDuplicates(array) {
    return array.filter((function(value, ind) {
      return array.indexOf(value) == ind;
    }));
  }
}
function decorateExportedSymbols(scope) {
  estraverse.traverse(scope.block, {enter: (function(node, parent) {
      if (node.type == "ExportDeclaration") {
        if (node.declaration) {
          var parsedDecl = parseExportDeclaration(node, scope);
          if (parsedDecl)
            scope.exportedSymbols.push(parsedDecl);
        } else {
          for (var $__4 = node.specifiers[$traceurRuntime.toProperty(Symbol.iterator)](),
              $__5; !($__5 = $__4.next()).done; ) {
            var specifier = $__5.value;
            {
              var parsedSpec = parseExportSpecifier(specifier, node, scope);
              if (parsedSpec)
                scope.exportedSymbols.push(parsedSpec);
            }
          }
        }
      }
    })});
  function parseExportDeclaration(decl, scope) {
    var result = {
      localName: null,
      exportName: null,
      importName: null,
      moduleRequest: null,
      location: null,
      type: null
    };
    if (decl.declaration.type == "VariableDeclaration") {
      result.exportName = decl.declaration.declarations[0].id.name;
      result.location = decl.declaration.declarations[0].id.loc;
      result.localName = result.exportName;
      scope.referencedSymbols.push(decl.declaration.declarations[0].id);
    } else {
      if (decl.declaration.id) {
        result.exportName = decl.declaration.id.name;
        result.location = decl.declaration.id.loc;
        result.localName = result.exportName;
        scope.referencedSymbols.push(decl.declaration.id);
      } else {
        result.localName = "*default*";
        result.location = decl.declaration.loc;
      }
    }
    result.type = "exportDeclaration";
    if (decl.default)
      result.exportName = "default";
    return result;
  }
  function parseExportSpecifier(spec, node, scope) {
    var result = {
      importName: null,
      exportName: null,
      localName: null,
      moduleRequest: null,
      moduleLocation: null,
      type: "export"
    };
    switch (spec.type) {
      case "ExportSpecifier":
        if (node.source) {
          result.importName = spec.id.name;
          result.moduleRequest = node.source.value;
          result.moduleLocation = node.source.loc;
        } else
          result.localName = spec.id.name;
        result.exportName = spec.name ? spec.name.name : spec.id.name;
        scope.referencedSymbols.push(spec.id);
        break;
      case "ExportBatchSpecifier":
        if (!node.source) {
          console.warn("Error: parsing export batch specifier without module source");
          return null;
        }
        result.importName = "*";
        result.moduleRequest = attemptModuleResolution(scope.path, node.source.value);
        result.moduleLocation = node.source.loc;
        break;
      default:
        console.warn("Unknown export specifier type: " + spec.type);
    }
    return result;
  }
}
function decorateDefinedSymbols(scope) {
  for (var $__6 = scope.variables[$traceurRuntime.toProperty(Symbol.iterator)](),
      $__7; !($__7 = $__6.next()).done; ) {
    var variable = $__7.value;
    {
      for (var $__4 = variable.defs[$traceurRuntime.toProperty(Symbol.iterator)](),
          $__5; !($__5 = $__4.next()).done; ) {
        var definition = $__5.value;
        {
          if (!definition.name)
            continue;
          scope.definedSymbols.push({
            localName: definition.name.name,
            location: definition.name.loc,
            type: "defined"
          });
        }
      }
    }
  }
}
function decorateImportedSymbols(scope) {
  estraverse.traverse(scope.block, {enter: (function(node, parent) {
      if (node.type == "ImportDeclaration") {
        if (node.specifiers.length === 0) {
          scope.importedSymbols.push({
            importName: "*emptyImport*",
            localName: "*emptyImport*",
            location: null,
            moduleLocation: null,
            moduleRequest: "notFound",
            importLocation: node.loc,
            type: "import"
          });
        }
        var $__12 = function() {
          var specifier = $__5.value;
          {
            var parsedSpec = parseImportSpecifier(specifier, scope);
            if (parsedSpec) {
              parsedSpec.importLocation = node.loc;
              parsedSpec.moduleLocation = node.source.loc;
              attemptModuleResolution(scope.path, node.source.value).then((function(resolvedPath) {
                parsedSpec.moduleRequest = resolvedPath;
              }));
              scope.importedSymbols.push(parsedSpec);
            }
          }
        };
        for (var $__4 = node.specifiers[$traceurRuntime.toProperty(Symbol.iterator)](),
            $__5; !($__5 = $__4.next()).done; ) {
          $__12();
        }
      }
    })});
  function parseImportSpecifier(spec, scope) {
    var parsedSpec = {
      importName: null,
      localName: null,
      location: null,
      moduleRequest: "notFound",
      type: "import"
    };
    switch (spec.type) {
      case "ImportDefaultSpecifier":
        parsedSpec.importName = "default";
        parsedSpec.localName = spec.id.name;
        scope.referencedSymbols.push(spec.id);
        break;
      case "ImportSpecifier":
        parsedSpec.importName = spec.id.name;
        parsedSpec.localName = spec.name ? spec.name.name : spec.id.name;
        scope.referencedSymbols.push(spec.name ? spec.name : spec.id);
        break;
      case "ImportNamespaceSpecifier":
        parsedSpec.importName = "*";
        parsedSpec.localName = spec.id.name;
        scope.referencedSymbols.push(spec.id);
        break;
      default:
        console.warn("Unknown import specifier type: " + spec.type);
    }
    if (parsedSpec.importName && parsedSpec.localName) {
      parsedSpec.location = spec.name ? spec.name.loc : spec.id.loc;
      return parsedSpec;
    } else
      return null;
  }
}
function decorateReferencedSymbols(scope) {
  for (var $__4 = scope.through[$traceurRuntime.toProperty(Symbol.iterator)](),
      $__5; !($__5 = $__4.next()).done; ) {
    var reference = $__5.value;
    scope.referencedSymbols.push(reference.identifier);
  }
  for (var $__10 = scope.variables[$traceurRuntime.toProperty(Symbol.iterator)](),
      $__11; !($__11 = $__10.next()).done; ) {
    var variable = $__11.value;
    {
      for (var $__6 = variable.references[$traceurRuntime.toProperty(Symbol.iterator)](),
          $__7; !($__7 = $__6.next()).done; ) {
        var reference$__13 = $__7.value;
        scope.referencedSymbols.push(reference$__13.identifier);
      }
      for (var $__8 = variable.identifiers[$traceurRuntime.toProperty(Symbol.iterator)](),
          $__9; !($__9 = $__8.next()).done; ) {
        var identifier = $__9.value;
        scope.referencedSymbols.push(identifier);
      }
    }
  }
  estraverse.traverse(scope.block, {enter: (function(node, parent) {
      if (node.type == 'MemberExpression') {
        var identifier = Object.create(node.property);
        identifier.property = getMemberExpressionString(node.property);
        identifier.object = getMemberExpressionString(node.object);
        identifier.name = identifier.object + "." + identifier.property;
        scope.referencedSymbols.push(identifier);
      }
    })});
}
function attemptModuleResolution(basePath, moduleString) {
  return new Promise((function(resolve, reject) {
    resolver.resolveModulePath(basePath, moduleString).then(resolve, reject);
  }));
}
