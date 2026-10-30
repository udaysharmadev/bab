// A green-marked recovery pocket in the existing wide bay after Whitewater.
// Coordinates are lateral/station, like the rest of the authored river.
export const RESCUE_EDDY = {id:'stillwater-rescue', x:-6, z:378, radiusX:4.5, radiusZ:12, angularSpeed:.42} as const;
const still = {x:0,z:0,weight:0};

export function sampleRescueCurrent(lateral:number,z:number) {
  const dx=(lateral-RESCUE_EDDY.x)/RESCUE_EDDY.radiusX, dz=(z-RESCUE_EDDY.z)/RESCUE_EDDY.radiusZ;
  const radius=dx*dx+dz*dz;
  if(radius>=1)return still;
  const weight=(1-radius)**2;
  // Elliptical curl: divergence-free in this local horizontal frame, with
  // zero velocity AND derivative at its rim. No radial suction or vertical lift.
  return {x:RESCUE_EDDY.angularSpeed*RESCUE_EDDY.radiusX*dz*weight,
    z:-RESCUE_EDDY.angularSpeed*RESCUE_EDDY.radiusZ*dx*weight,weight};
}
