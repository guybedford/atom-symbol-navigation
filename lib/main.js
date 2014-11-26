'use strict';

import {toNextIdentifier, selectAllIdentifiers} from './view';
import {toDefinition, toInFileDefinition} from './view';
import {createStatusBarView, clearStatusBar, clearHighlight, clearToggles} from './view';
import {highlightModules, clearModuleHighlights} from './view';
import {clearCache} from './cache';

module.exports = {
  activate: function(state) {
    atom.packages.once('activated', createStatusBarView);

    atom.config.set("ecmascript-navigation", {
      showScopeHighlights: true,
      es6Support: true
    });

    //clear caches on es6support config change
    atom.workspaceView.subscribe(atom.config.observe('ecmascript-navigation.es6Support', clearCache));

    atom.workspaceView.command("ecmascript-navigation:next-symbol", () => {
      toNextIdentifier(1);
    });

    atom.workspaceView.command("ecmascript-navigation:previous-symbol", () => {
      toNextIdentifier(-1);
    });

    atom.workspaceView.command("ecmascript-navigation:select-all-id", selectAllIdentifiers);

    atom.workspaceView.command("ecmascript-navigation:jump-to-definition-file", toDefinition);

    atom.workspaceView.command("ecmascript-navigation:jump-to-definition", toInFileDefinition);

    atom.workspace.onDidChangeActivePaneItem(clearStatusBar);

    atom.workspace.observeTextEditors((editor) => {
      if (editor.getGrammar().name == "JavaScript")
        highlightModules(editor);

      editor.onDidChangeCursorPosition(() => {
        clearStatusBar();
        clearHighlight();
        clearToggles();
      });

      editor.onDidChange(() => {
        clearModuleHighlights();
      });
    });
  }
};