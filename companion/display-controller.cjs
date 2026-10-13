'use strict';

// Pure guide logic. No OS access, timers, keyboard observer, or command execution.
const portable = require('../dist/portable-project.js');
const clone = value => JSON.parse(JSON.stringify(value));
const fields = (value, names) => value && typeof value === 'object' &&
  !Array.isArray(value) && Object.keys(value).length === names.length &&
  names.every(name => Object.hasOwn(value, name));

function createController(initialProject) {
  let project = portable.validate(initialProject);
  let pending = null, lastAt = null;
  let state = hidden('initial');

  function hidden(reason) {
    return {status:'hidden', reason, workspace:null, layer:null, rows:[], showAt:null};
  }
  function hide(reason) {
    pending = null;
    state = hidden(reason);
    return clone(state);
  }
  function snapshot() { return clone(state); }

  function replaceProject(value) {
    try { project = portable.validate(value); }
    catch { project = null; lastAt = null; return hide('invalid-project'); }
    lastAt = null;
    return hide('project-changed');
  }

  function step(sample) {
    const valid = fields(sample,['at','foreground','modifiers','workspace','paused']) &&
      typeof sample.at === 'number' && Number.isFinite(sample.at) && sample.at >= 0 &&
      fields(sample.foreground,['verifiedNx','minimized']) &&
      ['verifiedNx','minimized'].every(name => typeof sample.foreground[name] === 'boolean') &&
      fields(sample.modifiers,['ctrl','alt','shift']) &&
      ['ctrl','alt','shift'].every(name => typeof sample.modifiers[name] === 'boolean') &&
      ['modeling','sketch'].includes(sample.workspace) && typeof sample.paused === 'boolean';
    if (!valid) { lastAt = null; return hide('invalid-observation'); }
    if (lastAt !== null && sample.at < lastAt) {
      lastAt = sample.at;
      return hide('clock-reversed');
    }
    lastAt = sample.at;
    if (!project) return hide('invalid-project');
    if (sample.paused) return hide('paused');
    if (!sample.foreground.verifiedNx) return hide('not-nx-foreground');
    if (sample.foreground.minimized) return hide('nx-minimized');

    const layer = ['ctrl','alt','shift'].filter(name => sample.modifiers[name]).join('+') || 'none';
    const rows = portable.layerRows(project, sample.workspace, layer).map(row => ({
      ...row, unresolved:row.kind === 'journal'
    }));
    if (!rows.length) return hide('no-bindings');
    const signature = sample.workspace + ':' + layer;
    if (!pending || pending.signature !== signature) {
      pending = {signature, showAt:sample.at + project.overlay.showDelayMs};
    }
    if (sample.at < pending.showAt) {
      state = {status:'waiting', reason:'show-delay', workspace:sample.workspace,
        layer, rows:[], showAt:pending.showAt};
    } else {
      state = {status:'visible', reason:'ready', workspace:sample.workspace,
        layer, rows, showAt:pending.showAt};
    }
    // hideDelayMs never postpones safety hiding or keeps rows from another layer.
    return snapshot();
  }
  return {step, snapshot, replaceProject};
}

module.exports = {createController};
