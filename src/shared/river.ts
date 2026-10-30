// Authored station/lateral coordinates map to world (x + centre(z), z).
// Bays between encounters stay straight, preserving canonical save poses.
export const RIVER_BENDS = [
  {id:'split-stone',start:176,end:244,offset:6},
  {id:'whitewater',start:278,end:364,offset:8},
  {id:'timber-works',start:398,end:482,offset:-8},
  {id:'iron-narrows',start:520,end:612,offset:8},
  {id:'last-descent',start:650,end:742,offset:-9},
] as const;

export function channelCenter(z:number):number {
  for(const bend of RIVER_BENDS)if(z>bend.start&&z<bend.end){
    const sine=Math.sin(Math.PI*(z-bend.start)/(bend.end-bend.start));
    return bend.offset*sine**4;
  }
  return 0;
}

export function channelSlope(z:number):number {
  for(const bend of RIVER_BENDS)if(z>bend.start&&z<bend.end){
    const phase=Math.PI*(z-bend.start)/(bend.end-bend.start);
    return bend.offset*4*Math.PI/(bend.end-bend.start)*Math.sin(phase)**3*Math.cos(phase);
  }
  return 0;
}

export const riverX=(lateral:number,z:number)=>lateral+channelCenter(z);
