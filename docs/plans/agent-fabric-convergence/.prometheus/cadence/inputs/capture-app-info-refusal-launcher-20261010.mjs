import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {launchBoss as launch} from './boss-launch-main-window-20261010.mjs'

export async function launchBoss(options) {
  const wrapper=path.join(path.dirname(options.scenario),'app-info-refusal-observer.mjs')
  const observations=path.join(path.dirname(options.scenario),'ipc-refusal-observations.jsonl')
  const source='import fs from "node:fs"\nimport original from '+JSON.stringify(pathToFileURL(options.scenario).href)+'\n'+
    'export default context=>original({...context,evaluate:async expression=>{\n'+
    'const result=await context.evaluate(expression);\n'+
    'const prefix="window.api.ipcApi.request(";\n'+
    'const argument=expression.startsWith(prefix)?expression.slice(prefix.length):"";\n'+
    'const quote=String.fromCharCode(34);\n'+
    'const channel=argument.startsWith(quote)?JSON.parse(argument.slice(0,argument.indexOf(quote,1)+1)):null;\n'+
    'if(channel&&(!result?.ok||result.data?.ok===false)){\n'+
    'const known=["FORBIDDEN_SENDER","ROUTE_NOT_FOUND","VALIDATION_FAILED","INTERNAL"];\n'+
    'const code=!result?"NO_RESULT":known.includes(result.error?.code)?result.error.code:"UNRECOGNIZED_ERROR";\n'+
    'fs.appendFileSync('+JSON.stringify(observations)+',JSON.stringify({observedAt:new Date().toISOString(),channel,code,envelopeOk:result?.ok===true,dataRejected:result?.data?.ok===false})+"\\n",{mode:0o600});\n'+
    '}return result;}})\n'
  fs.writeFileSync(wrapper,source,{flag:'wx',mode:0o600})
  return launch({...options,scenario:wrapper})
}
