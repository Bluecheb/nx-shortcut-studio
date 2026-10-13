(()=>{
'use strict';
const panel=document.createElement('section');panel.id='advisorPanel';panel.className='advisor-panel';
panel.innerHTML=`<div class="section-title"><div><span class="eyebrow">NX UI/UX ADVISOR · EVIDENCE CATALOG</span><h2>What would you like to change?</h2><p>Describe your goal. This small, local catalog suggests verified possibilities—not every NX setting, an AI diagnosis, or automatic changes.</p></div></div><form id="advisorForm"><label for="advisorQuery">Your UI/UX goal</label><textarea id="advisorQuery" maxlength="1000" rows="3" placeholder="I want dimensions to stay the same screen size when I zoom"></textarea><div class="advisor-tools"><label>NX release<input id="advisorRelease" value="2606" maxlength="4" inputmode="numeric" pattern="[0-9]{4}" required></label><button class="primary" type="submit">Find possibilities</button></div></form><div class="advisor-examples" id="advisorExamples" role="group" aria-label="Example requests"></div><p class="advisor-note">Nothing is applied to NX or your shortcut editor. Questions stay on this page: no AI API, upload, or saved question history.</p><p id="advisorStatus" role="status"></p><div id="advisorResults" class="advisor-results"></div>`;
document.getElementById('buddyPanel').after(panel);
// Typing a goal must not be captured by an armed shortcut recorder elsewhere.
for(const eventName of ['keydown','keyup'])panel.addEventListener(eventName,event=>{if(event.target.matches('input,textarea,select'))event.stopPropagation();},true);
const $=id=>document.getElementById(id);
const paragraph=(parent,title,text)=>{const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=title+' ';p.append(strong,document.createTextNode(text));parent.append(p);};
function render(){
 const results=$('advisorResults');results.replaceChildren();
 try{
  const items=window.NX_ADVISOR.search($('advisorQuery').value,$('advisorRelease').value);
  $('advisorStatus').textContent=items.length?items.length+' possibilities from a '+window.NX_ADVISOR.catalog().length+'-topic catalog. Relevance is keyword matching, not a guarantee.':'No verified match in this small catalog. Try a more specific goal; no settings were changed.';
  for(const item of items){
   const card=document.createElement('article');card.className='advisor-card';card.dataset.adviceId=item.id;
   const tag=document.createElement('p');tag.className='advisor-badge';tag.textContent=item.category+' · '+item.evidenceStatus;
   const title=document.createElement('h3');title.textContent=item.title;card.append(tag,title);
   if(!item.releaseMatches)paragraph(card,'Compatibility warning:','The observations below are for NX 2606. Verify this guidance in your release; compatibility is not established.');
   paragraph(card,'Effect:',item.effect);paragraph(card,'Scope:',item.scope);
   const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Steps, risks, rollback and evidence';detail.append(summary);
   const list=document.createElement('ol');for(const step of item.steps){const li=document.createElement('li');li.textContent=step;list.append(li);}detail.append(list);
   paragraph(detail,'Risk:',item.risk);paragraph(detail,'Undo:',item.rollback);paragraph(detail,'Limit:',item.limits);
   const sources=document.createElement('ul');sources.className='advisor-sources';
   for(const source of item.sources){const li=document.createElement('li');if(source.url){const parsed=new URL(source.url);if(parsed.protocol!=='https:')throw Error('Unsupported evidence link.');const a=document.createElement('a');a.href=source.url;a.textContent=source.label;a.target='_blank';a.rel='noopener noreferrer';li.append(a);}else li.textContent=source.label;if(source.note)li.append(document.createTextNode(' — '+source.note));sources.append(li);}detail.append(sources);card.append(detail);results.append(card);
  }
 }catch(error){$('advisorStatus').textContent='Guidance unavailable: '+error.message;}
}
for(const [name,query] of [['Dimension zoom','dimensions stay same size when I zoom'],['Fewer ribbons','hide ribbon tabs'],['Sidebar','part navigator sidebar'],['Restore role','restore my role'],['Shortcuts only','shortcuts without changing UI'],['Reference toggle','reference geometry journal toggle'],['Shortcut guide','overlay buddy press shift']]){const button=document.createElement('button');button.type='button';button.className='subtle';button.textContent=name;button.onclick=()=>{$('advisorQuery').value=query;render();};$('advisorExamples').append(button);}
$('advisorForm').onsubmit=event=>{event.preventDefault();render();};render();
})();
