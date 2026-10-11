import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {launchBoss as launch} from '/Users/gqadonis/Projects/prometheus/worktrees/cadence-nested-source-full/skills/process/delivery-cadence/scripts/boss-launch.mjs'

export async function launchBoss(options) {
  const wrapper=path.join(path.dirname(options.scenario),'app-info-refusal-observer.mjs')
  const source='import original from '+JSON.stringify(pathToFileURL(options.scenario).href)+'\n'+
    'export default context=>original({...context,evaluate:async expression=>{\n'+
    'const result=await context.evaluate(expression);\n'+
    'if(expression.includes("app.get_info")&&!result?.ok){\n'+
    'const known=["FORBIDDEN_SENDER","ROUTE_NOT_FOUND","VALIDATION_FAILED","INTERNAL"];\n'+
    'const code=!result?"NO_RESULT":known.includes(result.error?.code)?result.error.code:"UNRECOGNIZED_ERROR";\n'+
    'throw Object.assign(new Error("ADMISSION_V2_IPC_REFUSED:"+code),{code:"ADMISSION_V2_IPC_REFUSED:"+code});\n'+
    '}return result;}})\n'
  fs.writeFileSync(wrapper,source,{flag:'wx',mode:0o600})
  return launch({...options,scenario:wrapper})
}
