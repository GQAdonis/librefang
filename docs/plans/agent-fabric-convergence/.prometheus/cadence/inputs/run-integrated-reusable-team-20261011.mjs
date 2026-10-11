import {operate} from './operate-integrated-reusable-team-20261010.mjs'
try {const result=await operate();process.stdout.write(JSON.stringify(result)+'\n');process.exitCode=result.status==='success'?0:1;}catch(error){process.stderr.write(JSON.stringify({status:'blocked',code:/^C15_[A-Z0-9_]+$/.test(error.code??'')?error.code:'C15_INTEGRATED_PREREQUISITE_UNAVAILABLE'})+'\n');process.exitCode=1;}
