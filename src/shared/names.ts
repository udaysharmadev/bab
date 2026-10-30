// Small display handles, including non-Latin names. Keep controls, markup and
// bidi formatting out of both the wire state and labels; never interpret HTML.
export function playerName(value:unknown):string|undefined {
  if(typeof value!=='string'||value.length>80)return;
  const name=value.normalize('NFC').trim().replace(/\s+/gu,' ');
  if(!name||Array.from(name).length>20||!/^['’\p{L}\p{M}\p{N} ._-]+$/u.test(name))return;
  return name;
}
