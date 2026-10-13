/* MTX edits are scoped to explicit requests and checked against the source role. */
(function (global) {
  'use strict';
  const children = (node, tag) => Array.from(node?.children || []).filter(n => !tag || n.tagName === tag);
  const one = (node, tag) => children(node, tag)[0];
  const named = (node, tag, name) => children(node, tag).find(n => n.getAttribute('name') === name);
  const SCOPE = 'UG_APP_SKETCH_TASK';
  function parse(text) {
    if (typeof text !== 'string' || text.length > 10 * 1024 * 1024) throw Error('Role must be an XML file under 10 MB.');
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw Error('DTD and entity declarations are not supported.');
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    if (xml.querySelector('parsererror') || xml.documentElement.tagName !== 'NX_PROFILES') throw Error('Choose an NX_PROFILES .mtx role.');
    validate(xml);
    return xml;
  }
  function unique(nodes, attribute, label) {
    const ids = new Set();
    for (const node of nodes) {
      const id = node.getAttribute(attribute);
      if (!id || ids.has(id)) throw Error('Missing or duplicate ' + label + ': ' + id);
      ids.add(id);
    }
  }
  function shortcutContent(owner) {
    const sections=children(owner,'Content');
    return sections.find(c=>c.getAttribute('mode')==='edit') || (sections.length===1?sections[0]:null);
  }
  function containers(xml) {
    const root = xml.documentElement;
    return [{scope:'repository', node:one(shortcutContent(one(root,'Repository')),'Actions')},
      ...children(root,'Profile').map(p => ({scope:p.getAttribute('name'),node:one(shortcutContent(p),'Actions')}))];
  }
  function validate(xml) {
    const root = xml.documentElement;
    const single=(node,tags)=>{for(const tag of tags)if(children(node,tag).length>1)throw Error('Ambiguous duplicate '+tag+' container.');};
    single(root,['Repository','SessionSettings','TouchSessionSettings']);
    for(const owner of [...children(root,'Repository'),...children(root,'Profile')]) {
      single(owner,['Layout']);single(one(owner,'Layout'),['ActionLists']);
      const sections=children(owner,'Content');
      if(sections.length>1) {
        if(sections.length!==2 || sections.some(c=>!['create','edit'].includes(c.getAttribute('mode'))) || new Set(sections.map(c=>c.getAttribute('mode'))).size!==2)throw Error('Ambiguous duplicate Content container: only one create and one edit section are supported.');
      }
      for(const section of sections) {
        single(section,['Actions']);const actions=one(section,'Actions');
        if(actions){unique(children(actions,'Action'),'name','command');for(const action of children(actions,'Action'))single(action,['Accelerators']);}
      }
    }
    unique(children(root,'Profile'),'name','application profile');
    for (const profile of children(root,'Profile')) {
      const lists = one(one(profile,'Layout'),'ActionLists');
      if (lists) {
        unique(children(lists,'ActionList'),'name','tab/toolbar');
        for(const tab of children(lists,'ActionList')) {single(tab,['BarInfo']);single(one(tab,'BarInfo'),['RibbonStackInfo']);}
      }
    }
    for (const section of ['SessionSettings','TouchSessionSettings']) {
      const settings = one(root,section);
      if (!settings) continue;
      unique(children(settings,'Setting'),'name','setting');
      const resource = named(settings,'Setting','ResourceBar');
      if (resource) {
        unique(children(resource,'Tab'),'id','sidebar tab');
        for (const tab of children(resource,'Tab')) unique(children(tab,'State'),'app','sidebar state');
      }
    }
  }
  function key(value) {
    if (typeof value !== 'string') throw Error('Shortcut must be text.');
    if (!value) return '';
    const parts = value.split('+'), terminal = parts.pop(), order = ['Ctrl','Alt','Shift','Meta'];
    if (parts.some(p => !order.includes(p)) || new Set(parts).size !== parts.length || !terminal || terminal.length > 24) throw Error('Unsupported shortcut: ' + value);
    return [...order.filter(m => parts.includes(m)), terminal.length === 1 ? terminal.toUpperCase() : terminal].join('+');
  }
  function checkModelingOverrides(xml) {
    const all=containers(xml),general=all.find(c=>c.scope==='repository')?.node,local=all.find(c=>c.scope==='UG_APP_MODELING')?.node;
    const globals=new Map();
    for(const a of children(general,'Action'))for(const k of children(one(a,'Accelerators'),'Accel'))globals.set(key(k.getAttribute('name')).toUpperCase(),a.getAttribute('name'));
    for(const a of children(local,'Action'))for(const k of children(one(a,'Accelerators'),'Accel')) {
      const combo=key(k.getAttribute('name')).toUpperCase(),other=globals.get(combo);
      if(other && other!==a.getAttribute('name'))throw Error('Modeling has a local override for '+combo+' ('+a.getAttribute('name')+'). Resolve this conflict in NX before exporting.');
    }
  }
  function commandItems(node, catalog) {
    return children(node,'Action').map(action => ({id:action.getAttribute('name'),
      type:action.getAttribute('type') || 'button',
      label:catalog.find(x => x.id === action.getAttribute('name'))?.label || action.getAttribute('name'),
      key:one(one(action,'Accelerators'),'Accel')?.getAttribute('name') || ''}));
  }
  function shortcuts(xml,catalog=[]) {
    const all = containers(xml);
    return {modeling:commandItems(all.find(x=>x.scope==='repository')?.node,catalog),
      sketch:commandItems(all.find(x=>x.scope===SCOPE)?.node,catalog)};
  }
  // NX's native docked-tab toggle changes the nested stack flag, not BarInfo.
  // Other ribbon modes are intentionally unsupported until native verification.
  function ribbonTarget(tab) {
    if(tab?.getAttribute('type')!=='ribbontab')return null;
    const bar=one(tab,'BarInfo'),stack=one(bar,'RibbonStackInfo');
    const boolean=node=>['0','1'].includes(node?.getAttribute('visibility'));
    if(stack)return stack.getAttribute('detached')==='0' && stack.getAttribute('detachedFullScreen')==='0' && boolean(stack)?stack:null;
    return boolean(bar)?bar:null;
  }
  function requireShortcutEditMode(actions) {
    const content=actions?.parentElement,owner=content?.parentElement;
    if(content?.getAttribute('mode')!=='edit' || !['Repository','Profile'].includes(owner?.tagName) || owner.parentElement?.tagName!=='NX_PROFILES' || shortcutContent(owner)!==content)throw Error('Shortcut changes require an existing Content mode="edit" container. This role contains command definitions or an unsupported content mode. Save a shortcut in the matching NX workspace and export that role again; tab-only and unchanged exports are still available.');
  }
  function visibility(xml,section='SessionSettings') {
    const ribbon={},side={};
    for (const p of children(xml.documentElement,'Profile')) {
      const scope=p.getAttribute('name'); ribbon[scope]={};
      for (const tab of children(one(one(p,'Layout'),'ActionLists'),'ActionList').filter(n=>n.getAttribute('type')==='ribbontab')) {
        const target=ribbonTarget(tab); if(target) ribbon[scope][tab.getAttribute('name')]=target.getAttribute('visibility')==='1';
      }
    }
    const resource=named(one(xml.documentElement,section),'Setting','ResourceBar');
    for (const tab of children(resource,'Tab')) for (const state of children(tab,'State')) {
      const scope=state.getAttribute('app'); side[scope] ||= {};
      if(state.hasAttribute('suppressed')) side[scope][tab.getAttribute('id')]=state.getAttribute('suppressed')!=='1';
    }
    return {ribbon,side};
  }
  // Stable structural representation includes comments, unknown nodes and attributes.
  function snapshot(node) {
    if(node.nodeType===9) return snapshot(node.documentElement);
    if(node.nodeType===1) return [node.tagName,Array.from(node.attributes).map(a=>[a.name,a.value]).sort((a,b)=>a[0].localeCompare(b[0])),
      Array.from(node.childNodes).filter(n=>n.nodeType!==3 || n.nodeValue.trim()).map(snapshot)];
    return [node.nodeType,node.nodeValue];
  }
  function path(node) {
    const result=[];
    while(node.parentElement) {result.unshift(children(node.parentElement).indexOf(node));node=node.parentElement;}
    return result;
  }
  function at(xml,route) {return route.reduce((n,i)=>children(n)[i],xml.documentElement);}
  function allowedAttribute(node,attr) {
    if(node.tagName==='NX_PROFILES') return ['name','title'].includes(attr);
    if(['BarInfo','RibbonStackInfo'].includes(node.tagName) && attr==='visibility') {
      const tab=node.tagName==='BarInfo'?node.parentElement:node.parentElement?.parentElement;
      return tab?.tagName==='ActionList' && tab.parentElement?.tagName==='ActionLists' && tab.parentElement.parentElement?.tagName==='Layout' && tab.parentElement.parentElement.parentElement?.tagName==='Profile' && ribbonTarget(tab)===node;
    }
    if(node.tagName==='State' && attr==='suppressed') return node.parentElement?.tagName==='Tab' && node.parentElement.parentElement?.tagName==='Setting' && node.parentElement.parentElement.getAttribute('name')==='ResourceBar' && ['SessionSettings','TouchSessionSettings'].includes(node.parentElement.parentElement.parentElement?.tagName);
    return false;
  }
  function validAccelerators(node) {
    return node.tagName==='Accelerators' && node.attributes.length===0 && Array.from(node.childNodes).every(n=>n.nodeType===3 && !n.nodeValue.trim() || n.nodeType===1 && n.tagName==='Accel' && n.attributes.length===1 && n.hasAttribute('name') && n.childNodes.length===0 && key(n.getAttribute('name')));
  }
  function verify(source,output,operations) {
    validate(output);
    const reverted=output.cloneNode(true);
    for(const op of [...operations].reverse()) {
      const node=at(reverted,op.path);
      if(!node) throw Error('Export verification failed: missing target.');
      if(op.kind==='attribute') {
        if(!allowedAttribute(node,op.attribute) || node.getAttribute(op.attribute)!==op.after) throw Error('Unexpected attribute change.');
        if(op.before===null) node.removeAttribute(op.attribute); else node.setAttribute(op.attribute,op.before);
      } else if(op.kind==='accelerators') {
        if(node.tagName!=='Action' || node.parentElement?.tagName!=='Actions' || node.parentElement.parentElement?.tagName!=='Content') throw Error('Unsupported shortcut target.');
        requireShortcutEditMode(node.parentElement);
        const acc=children(node,'Accelerators');
        if(acc.length>1 || acc.some(a=>!validAccelerators(a)) || JSON.stringify(acc.map(snapshot))!==op.after) throw Error('Invalid accelerator edit.');
        acc.forEach(a=>a.remove());
        if(op.original) node.insertBefore(reverted.importNode(op.original,true),node.childNodes[op.index] || null);
      } else if(op.kind==='action-add') {
        if(node.tagName!=='Action' || node.parentElement?.tagName!=='Actions' || node.parentElement.parentElement?.tagName!=='Content' || node.attributes.length!==2 || node.getAttribute('name')!==op.id || node.getAttribute('type')!==op.type || children(node).length!==1 || !validAccelerators(one(node,'Accelerators')) || JSON.stringify(snapshot(node))!==op.after) throw Error('Invalid added command.');
        requireShortcutEditMode(node.parentElement);node.remove();
      } else throw Error('Unknown export operation.');
    }
    if(JSON.stringify(snapshot(reverted))!==JSON.stringify(snapshot(source))) throw Error('Export blocked: unrelated role settings changed.');
    return true;
  }
  function patch(source,request={}) {
    validate(source);
    const xml=source.cloneNode(true),operations=[],changes=[],skipped=[];
    function attr(node,attribute,value,label) {
      const before=node.getAttribute(attribute); if(before===value)return;
      operations.push({kind:'attribute',path:path(node),attribute,before,after:value});
      node.setAttribute(attribute,value);changes.push(label+': '+before+' → '+value);
    }
    const original=containers(source),target=containers(xml);
    for(const [scope,items] of Object.entries(request.shortcuts || {})) {
      const old=original.find(c=>c.scope===scope)?.node,newContainer=target.find(c=>c.scope===scope)?.node;
      if(!old || !newContainer) throw Error('The uploaded role has no shortcut container for '+scope+'. Save a shortcut in that NX workspace and export the role again.');
      const supplied=new Map(),assigned=new Set();
      for(const item of items) {
        if(!/^[A-Za-z0-9_.:-]{1,128}$/.test(item.id) || item.id==='NX_SHORTCUT_STUDIO_TOGGLE_REFERENCE_GEOMETRY' || supplied.has(item.id)) throw Error('Invalid, placeholder, or duplicate command ID: '+item.id);
        const shortcut=key(item.key);if(shortcut && assigned.has(shortcut.toUpperCase()))throw Error('Duplicate shortcut: '+shortcut);
        if(shortcut)assigned.add(shortcut.toUpperCase());supplied.set(item.id,{...item,key:shortcut});
      }
      // Submitted list replaces accelerators in this container; preserve extra
      // accelerators when the first displayed key is unchanged.
      for(const action of children(newContainer,'Action')) {
        const id=action.getAttribute('name'),item=supplied.get(id),acc=one(action,'Accelerators');
        const before=one(acc,'Accel')?.getAttribute('name') || '',after=item?.key || '';
        if(key(before)===after) {supplied.delete(id);continue;}
        requireShortcutEditMode(newContainer);
        const op={kind:'accelerators',path:path(action),original:acc?.cloneNode(true),index:acc?Array.from(action.childNodes).indexOf(acc):0};
        if(acc)acc.remove();
        if(after) {const a=xml.createElement('Accelerators'),k=xml.createElement('Accel');k.setAttribute('name',after);a.append(k);action.insertBefore(a,action.childNodes[op.index] || null);}
        op.after=JSON.stringify(children(action,'Accelerators').map(snapshot));operations.push(op);
        changes.push(scope+' / '+id+': '+(before||'(none)')+' → '+(after||'(none)'));supplied.delete(id);
      }
      for(const item of supplied.values()) if(item.key) {
        requireShortcutEditMode(newContainer);
        const action=xml.createElement('Action'),acc=xml.createElement('Accelerators'),k=xml.createElement('Accel');
        action.setAttribute('name',item.id);action.setAttribute('type',item.type || 'button');k.setAttribute('name',item.key);acc.append(k);action.append(acc);newContainer.append(action);
        operations.push({kind:'action-add',path:path(action),id:item.id,type:item.type||'button',after:JSON.stringify(snapshot(action))});
        changes.push(scope+' / '+item.id+': (new) → '+item.key);
      }
    }
    for(const [scope,tabs] of Object.entries(request.visibility?.ribbon || {})) for(const [id,visible] of Object.entries(tabs)) {
      const p=named(xml.documentElement,'Profile',scope),tab=named(one(one(p,'Layout'),'ActionLists'),'ActionList',id),target=ribbonTarget(tab);
      if(!target) {skipped.push(scope+' / '+id+': ribbon visibility target missing or mode unsupported');continue;}
      attr(target,'visibility',visible?'1':'0',scope+' / '+id+' / '+target.tagName);
    }
    for(const section of request.sidebarSections || ['SessionSettings']) {
      if(!['SessionSettings','TouchSessionSettings'].includes(section))throw Error('Unknown sidebar mode.');
      const resource=named(one(xml.documentElement,section),'Setting','ResourceBar');
      for(const [scope,tabs] of Object.entries(request.visibility?.side || {})) for(const [id,visible] of Object.entries(tabs)) {
        const tab=children(resource,'Tab').find(t=>t.getAttribute('id')===id),state=children(tab,'State').find(t=>t.getAttribute('app')===scope);
        if(!state?.hasAttribute('suppressed')) {skipped.push(section+' / '+scope+' / '+id+': exact sidebar state missing');continue;}
        attr(state,'suppressed',visible?'0':'1',section+' / '+scope+' / '+id);
      }
    }
    if(changes.length && request.identity) {
      attr(xml.documentElement,'name',request.identity.name,'Role identifier');attr(xml.documentElement,'title',request.identity.title,'Role title');
    }
    if(request.shortcuts?.repository)checkModelingOverrides(xml);
    verify(source,xml,operations);
    return {xml,changes,skipped,operations};
  }
  global.NX_ROLE_PATCH={parse,patch,verify,shortcuts,visibility,snapshot};
})(typeof window==='undefined'?globalThis:window);
