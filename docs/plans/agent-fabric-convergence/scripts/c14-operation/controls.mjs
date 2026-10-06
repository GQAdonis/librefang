import { ipc } from './setup.mjs'
import { waitFor } from './io.mjs'

const query = (selector) => `[...document.querySelectorAll(${JSON.stringify(selector)})].find(node => node.getClientRects().length)`

export async function click(evaluate, signal, selector, code) {
  return waitFor(signal, () => evaluate(`(() => {
    const node=${query(selector)};
    if(!node || node.disabled || node.getAttribute('aria-disabled')==='true' || !node.getClientRects().length)return false;
    node.scrollIntoView({block:'center'});node.focus();
    if(node.getAttribute('role')==='combobox')node.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
    else if(node.getAttribute('data-slot')==='select-item')node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
    else node.click();return true;
  })()`), code)
}

export async function fill(evaluate, signal, selector, value, code) {
  return waitFor(signal, () => evaluate(`(() => {
    const node=${query(selector)};if(!node || node.disabled)return false;
    const prototype=node.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype,'value').set.call(node,${JSON.stringify(value)});
    node.dispatchEvent(new Event('input',{bubbles:true}));node.dispatchEvent(new Event('change',{bubbles:true}));return true;
  })()`), code)
}

export async function selectOption(evaluate, signal, selector, optionExpression, code) {
  await click(evaluate, signal, selector, code + '_MENU')
  await waitFor(signal, () => evaluate(`(() => {
    const node=${optionExpression};if(!node || !node.getClientRects().length || node.getAttribute('aria-disabled')==='true')return false;
    node.scrollIntoView({block:'center'});node.focus();
    node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));return true;
  })()`), code + '_OPTION')
}

export async function chooseCodingTeam(evaluate, signal, preset, binding) {
  await selectOption(evaluate, signal, '[data-ui~="teams-definition"]',
    `document.querySelector('[role="option"][data-definition-id="' + ${JSON.stringify(preset.id)} + '"][data-definition-digest="' + ${JSON.stringify(preset.digest)} + '"]')`,
    'C14_WORK_CODING_DEFINITION_UNAVAILABLE')
  await selectOption(evaluate, signal, '[data-ui~="teams-binding"]',
    `[...document.querySelectorAll('[role="option"]')].find(node=>node.innerText.startsWith(${JSON.stringify(binding.id)} + ' ·'))`,
    'C14_WORK_SCOPED_CODING_BINDING_UNAVAILABLE')
}

export async function openCodingSetup(evaluate, signal) {
  await waitFor(signal, () => evaluate(`(() => {
    const details=document.querySelector('[data-ui~="teams-coding-preset"]')?.closest('details');
    if(!details)return false;if(!details.open)details.querySelector('summary').click();return true;
  })()`), 'C14_WORK_CODING_PRESET_SECTION_UNAVAILABLE')
}

export async function openWork(evaluate, signal) {
  await waitFor(signal, () => evaluate(`(() => {
    const later=[...document.querySelectorAll('button')].find(node=>node.innerText.trim()==='Set up later');
    if(later)later.click();return Boolean(document.querySelector('#app-sidebar'));
  })()`), 'C14_APPLICATION_ONBOARDING_UNAVAILABLE')
  const workVisible = await evaluate(`[...document.querySelectorAll('[data-ui~="work-mode-teams"]')].some(node => node.getClientRects().length)`)
  if (!workVisible) await ipc(evaluate, 'navigation.open_route_in_main', { path: '/app/agents' })
  await click(evaluate, signal, '[data-ui~="work-mode-teams"]', 'C14_WORK_TEAMS_ENTRY_UNAVAILABLE')
}

export async function selectWorkspace(evaluate, signal, workspaceId) {
  await click(evaluate, signal, '[data-ui~="teams-workspace"]', 'C14_WORK_WORKSPACE_MENU_UNAVAILABLE')
  await click(evaluate, signal, `[data-option-id="${workspaceId}"]`, 'C14_WORK_ISOLATED_WORKSPACE_UNAVAILABLE')
}

export async function reopen(evaluate, signal, setup, instanceId) {
  const previousTimeOrigin = await evaluate('performance.timeOrigin')
  await evaluate('setTimeout(() => location.reload(), 50); true')
  const reloaded = await waitFor(signal, () => evaluate(`(() => {
    const timeOrigin=performance.timeOrigin;
    return timeOrigin!==${JSON.stringify(previousTimeOrigin)} && document.readyState==='complete' && {timeOrigin};
  })()`).catch(() => false), 'C14_RENDERER_DOCUMENT_RELOAD_NOT_OBSERVED')
  await openWork(evaluate, signal)
  await selectWorkspace(evaluate, signal, setup.workspaceId)
  await selectOption(evaluate, signal, '[data-ui~="teams-instance"]',
    `document.querySelector('[role="option"][data-team-id="' + ${JSON.stringify(instanceId)} + '"]')`,
    'C14_WORK_PERSISTED_INSTANCE_UNAVAILABLE')
  return { previousTimeOrigin, reloadedTimeOrigin: reloaded.timeOrigin }
}
