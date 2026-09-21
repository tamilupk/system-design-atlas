import{c as l}from"./index-C1ZAryQn.js";/**
 * @license lucide-react v0.469.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const u=l("Play",[["polygon",{points:"6 3 20 12 6 21 6 3",key:"1oa8hb"}]]);function f(t,e,s){const i=t.archetypes[e];if(!i)return{visited:0,completed:0,total:s.length,percentage:0};let a=0,n=0;for(const p of s){const r=i.steps[p];r&&(r.visitedAt&&a++,r.completedAt&&n++)}const o=s.length,c=o===0?0:Math.round(n/o*100);return{visited:a,completed:n,total:o,percentage:c}}function h(t,e){return t.archetypes[e]?.lastStepId||null}function g(t,e,s){return!!t.archetypes[e]?.steps[s]?.completedAt}function y(t){return t.lastVisited?{archetypeId:t.lastVisited.archetypeId,stepId:t.lastVisited.stepId}:null}export{u as P,y as a,h as b,f as g,g as i};
