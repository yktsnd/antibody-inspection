'use strict';
// Browser renderer test, not a replacement for VS Code extension-host validation.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {render}=require('../src/view');
const playwright=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.join(root,'work','visual-validation');fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(render("'self'",'/3Dmol-min.js'));}else if(req.url==='/3Dmol-min.js'){res.setHeader('Content-Type','application/javascript');res.end(fs.readFileSync(path.join(root,'media/3Dmol-min.js')));}else{res.statusCode=404;res.end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{
  browser=await playwright.chromium.launch({headless:true,channel:'chrome',args:['--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[],messages=[];
  page.on('pageerror',e=>errors.push(e.message));await page.exposeFunction('captureMessage',m=>messages.push(m));await page.addInitScript(()=>{window.acquireVsCodeApi=()=>({postMessage:m=>window.captureMessage(m)});});
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>document.getElementById('researchDemo'));
  const project=JSON.parse(fs.readFileSync(path.join(root,'examples/research-demo.inspection.json'),'utf8'));
  const themes={dark:{'editor-background':'#1e1e1e',foreground:'#cccccc','descriptionForeground':'#aaaaaa','sideBar-background':'#252526','panel-border':'#454545','button-secondaryBackground':'#3a3d41','button-background':'#0078d4','button-foreground':'#ffffff','input-background':'#3c3c3c','input-foreground':'#cccccc','focusBorder':'#007fd4','list-activeSelectionForeground':'#ffffff','list-activeSelectionBackground':'#094771','editor-selectionBackground':'#264f78'},light:{'editor-background':'#ffffff',foreground:'#333333','descriptionForeground':'#616161','sideBar-background':'#f3f3f3','panel-border':'#dddddd','button-secondaryBackground':'#e5e5e5','button-background':'#0078d4','button-foreground':'#ffffff','input-background':'#ffffff','input-foreground':'#333333','focusBorder':'#0090f1','list-activeSelectionForeground':'#ffffff','list-activeSelectionBackground':'#0060c0','editor-selectionBackground':'#add6ff'}};
  const checks=[];
  for(const [theme,vars] of Object.entries(themes)){
   await page.evaluate(({theme,vars})=>{document.body.className='vscode-'+theme;for(const [key,value] of Object.entries(vars))document.documentElement.style.setProperty('--vscode-'+key,value);},{theme,vars});
   for(const width of [1600,900,600]){
    await page.setViewportSize({width,height:1000});
    for(const index of [0,1,4,6]){
     project.view={...project.demo.steps[index].view,demoStep:index};await page.evaluate(p=>window.dispatchEvent(new MessageEvent('message',{data:{type:'project',project:p,selected:p.view.selectedRecordId,dirty:false}})),project);
     await page.locator('#demoGuide').waitFor({state:'visible'});
     if(index===4)await page.waitForFunction(()=>document.querySelector('#viewer canvas'));
     const dimensions=await page.evaluate(()=>{const m=document.querySelector('.main');return {client:m.clientWidth,scroll:m.scrollWidth,body:document.body.scrollWidth};});
     checks.push({theme,width,step:index+1,...dimensions});
     await page.screenshot({path:path.join(out,`${theme}-${width}-step${index+1}.png`)});
    }
   }
  }
  assert.deepEqual(errors,[],'webview script errors');fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors,messages:messages.map(m=>m.type)},null,2));
  const overflow=checks.filter(c=>c.scroll>c.client+2);assert.deepEqual(overflow,[],'main content horizontal overflow');console.log('Renderer checks passed: '+checks.length+' theme/width/observation combinations. Screenshots: '+out);
 }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});

